/**
 * CRM Integration Service for Intake
 *
 * Automatically creates CRM records (Accounts, Contacts, Opportunities)
 * from approved intake submissions.
 */

import { prisma } from '../../../prisma/client';
import { AccountType, ContactLifecycle } from '@prisma/client';
import { scoreSubmission } from '../scoring';

// ============================================================================
// TYPES
// ============================================================================

export interface CRMIntegrationResult {
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
  actions: string[];
  errors: string[];
}

export interface IntakeFieldMapping {
  // Account mappings
  companyName?: string;
  industry?: string;
  website?: string;
  companyPhone?: string;
  companyAddress?: string;

  // Contact mappings
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;

  // Opportunity mappings
  projectName?: string;
  projectDescription?: string;
  budget?: string;
  timeline?: string;
  source?: string;
}

export interface CRMIntegrationConfig {
  createAccount: boolean;
  createContact: boolean;
  createOpportunity: boolean;
  fieldMappings: IntakeFieldMapping;
  defaultPipelineId?: number;
  defaultStageId?: number;
  assignToUserId?: number;
}

// ============================================================================
// DEFAULT FIELD MAPPINGS
// ============================================================================

const DEFAULT_FIELD_MAPPINGS: IntakeFieldMapping = {
  // Account
  companyName: 'company_name,business_name,organization,company',
  industry: 'industry,sector,business_type',
  website: 'website,url,web_address',
  companyPhone: 'company_phone,business_phone,office_phone',
  companyAddress: 'company_address,business_address,office_address,address',

  // Contact
  firstName: 'first_name,firstname,given_name',
  lastName: 'last_name,lastname,surname,family_name',
  fullName: 'full_name,name,client_name,contact_name',
  email: 'email,email_address',
  phone: 'phone,phone_number,mobile,cell_phone',
  title: 'title,job_title,position,role',

  // Opportunity
  projectName: 'project_name,matter_name,case_name,service_needed',
  projectDescription: 'description,project_description,details,notes,message',
  budget: 'budget,estimated_budget,project_value,value',
  timeline: 'timeline,timeframe,start_date,expected_start',
  source: 'source,referral_source,how_did_you_hear,lead_source',
};

// ============================================================================
// MAIN INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Process an approved intake submission and create CRM records
 */
export async function processIntakeForCRM(
  submissionId: number,
  config?: Partial<CRMIntegrationConfig>,
): Promise<CRMIntegrationResult> {
  const result: CRMIntegrationResult = {
    actions: [],
    errors: [],
  };

  // Get submission with related data including client for tenantId
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    include: {
      form: true,
      config: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!submission) {
    result.errors.push('Submission not found');
    return result;
  }

  if (submission.status !== 'APPROVED') {
    result.errors.push('Submission must be approved before CRM integration');
    return result;
  }

  const formData = (submission.formData as Record<string, unknown>) || {};
  const fieldMappings = { ...DEFAULT_FIELD_MAPPINGS, ...config?.fieldMappings };

  // Get tenantId from the Client linked to IntakeConfig
  const client = submission.config.client;
  if (!client?.tenantId) {
    result.errors.push('No tenant associated with intake config');
    return result;
  }
  const tenantId = client.tenantId;

  // Get default config
  const integrationConfig: CRMIntegrationConfig = {
    createAccount: config?.createAccount ?? true,
    createContact: config?.createContact ?? true,
    createOpportunity: config?.createOpportunity ?? true,
    fieldMappings,
    defaultPipelineId: config?.defaultPipelineId,
    defaultStageId: config?.defaultStageId,
    assignToUserId: config?.assignToUserId,
  };

  try {
    // Extract mapped values from form data
    const mappedData = extractMappedValues(formData, fieldMappings);

    // Create Account
    if (integrationConfig.createAccount && mappedData.companyName) {
      const account = await createOrFindAccount(tenantId, mappedData, formData);
      result.accountId = account.id;
      result.actions.push(
        `Account ${account.wasCreated ? 'created' : 'found'}: ${account.name}`,
      );
    }

    // Create Contact
    if (integrationConfig.createContact && mappedData.email) {
      const contact = await createOrFindContact(
        tenantId,
        result.accountId,
        mappedData,
        formData,
      );
      result.contactId = contact.id;
      result.actions.push(
        `Contact ${contact.wasCreated ? 'created' : 'found'}: ${contact.email}`,
      );
    }

    // Create Opportunity
    if (integrationConfig.createOpportunity && result.accountId) {
      const opportunity = await createOpportunity(
        tenantId,
        result.accountId,
        result.contactId,
        mappedData,
        formData,
        submissionId,
        integrationConfig,
      );
      result.opportunityId = opportunity.id;
      result.actions.push(`Opportunity created: ${opportunity.name}`);
    }

    // Link submission to CRM records
    await prisma.intakeSubmission.update({
      where: { id: submissionId },
      data: {
        // Store CRM references in custom fields or a new field
        formData: {
          ...formData,
          _crmIntegration: {
            accountId: result.accountId,
            contactId: result.contactId,
            opportunityId: result.opportunityId,
            processedAt: new Date().toISOString(),
          },
        },
      },
    });

    result.actions.push('CRM integration completed');
  } catch (error) {
    console.error('CRM integration error:', error);
    result.errors.push(
      `Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  return result;
}

/**
 * Extract values from form data using field mappings
 */
function extractMappedValues(
  formData: Record<string, unknown>,
  mappings: IntakeFieldMapping,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const [targetField, sourceFields] of Object.entries(mappings)) {
    if (!sourceFields) continue;

    const possibleFields = sourceFields.split(',').map((f: string) => f.trim());

    for (const field of possibleFields) {
      const value = formData[field];
      if (value !== undefined && value !== null && value !== '') {
        result[targetField] = String(value);
        break;
      }
    }
  }

  return result;
}

/**
 * Create or find an existing Account
 */
async function createOrFindAccount(
  tenantId: string,
  mappedData: Record<string, string | undefined>,
  formData: Record<string, unknown>,
): Promise<{ id: number; name: string; wasCreated: boolean }> {
  const name = mappedData.companyName!;

  // Check if account already exists
  const existing = await prisma.account.findFirst({
    where: {
      tenantId,
      name: { equals: name, mode: 'insensitive' },
    },
  });

  if (existing) {
    return { id: existing.id, name: existing.name, wasCreated: false };
  }

  // Create new account
  // Get first admin user as owner (or use configured owner)
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const ownerId = adminUser?.id ?? 1;

  const account = await prisma.account.create({
    data: {
      tenantId,
      name,
      type: AccountType.PROSPECT,
      industry: mappedData.industry || null,
      website: mappedData.website || null,
      phone: mappedData.companyPhone || null,
      billingAddress: mappedData.companyAddress
        ? { street: mappedData.companyAddress }
        : undefined,
      healthScore: 50, // Default score
      ownerId,
      customFields: {
        source: 'intake',
        intakeData: formData,
      },
    },
  });

  return { id: account.id, name: account.name, wasCreated: true };
}

/**
 * Create or find an existing Contact
 */
async function createOrFindContact(
  tenantId: string,
  accountId: number | undefined,
  mappedData: Record<string, string | undefined>,
  formData: Record<string, unknown>,
): Promise<{ id: number; email: string; wasCreated: boolean }> {
  const email = mappedData.email!;

  // Check if contact already exists
  const existing = await prisma.cRMContact.findFirst({
    where: {
      tenantId,
      email: { equals: email, mode: 'insensitive' },
    },
  });

  if (existing) {
    // Update account link if not set
    if (accountId && !existing.accountId) {
      await prisma.cRMContact.update({
        where: { id: existing.id },
        data: { accountId },
      });
    }
    return {
      id: existing.id,
      email: existing.email || email,
      wasCreated: false,
    };
  }

  // Parse name
  let firstName = mappedData.firstName;
  let lastName = mappedData.lastName;

  if (!firstName && !lastName && mappedData.fullName) {
    const nameParts = mappedData.fullName.split(' ');
    firstName = nameParts[0];
    lastName = nameParts.slice(1).join(' ') || undefined;
  }

  // Create new contact
  const contact = await prisma.cRMContact.create({
    data: {
      tenantId,
      accountId: accountId || null,
      firstName: firstName || 'Unknown',
      lastName: lastName || '',
      email,
      phone: mappedData.phone || null,
      jobTitle: mappedData.title || null,
      lifecycle: ContactLifecycle.LEAD,
      leadSource: 'INBOUND', // Intake forms are inbound leads
      customFields: {
        source: mappedData.source || 'intake',
        intakeData: formData,
      },
    },
  });

  return { id: contact.id, email: contact.email || email, wasCreated: true };
}

/**
 * Create a new Opportunity
 */
async function createOpportunity(
  tenantId: string,
  accountId: number,
  contactId: number | undefined,
  mappedData: Record<string, string | undefined>,
  formData: Record<string, unknown>,
  submissionId: number,
  config: CRMIntegrationConfig,
): Promise<{ id: number; name: string }> {
  // Get default pipeline and stage
  let pipelineId = config.defaultPipelineId;
  let stageId = config.defaultStageId;

  if (!pipelineId) {
    // Find or create default pipeline
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        tenantId,
        isDefault: true,
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    });

    if (pipeline) {
      pipelineId = pipeline.id;
      stageId = stageId || pipeline.stages[0]?.id;
    }
  }

  if (!pipelineId || !stageId) {
    throw new Error('No pipeline or stage available');
  }

  // Parse budget
  let amount = 0;
  if (mappedData.budget) {
    const budgetMatch = mappedData.budget.match(/[\d,]+\.?\d*/);
    if (budgetMatch) {
      amount = parseFloat(budgetMatch[0].replace(/,/g, ''));
    }
  }

  // Get lead score for probability estimation
  let probability = 25; // Default
  try {
    const scoreResult = await scoreSubmission(submissionId);
    if (scoreResult.priority === 'hot') {
      probability = 75;
    } else if (scoreResult.priority === 'warm') {
      probability = 50;
    }
  } catch {
    // Use default probability
  }

  // Calculate expected close date (default: 30 days from now)
  const expectedCloseDate = new Date();
  expectedCloseDate.setDate(expectedCloseDate.getDate() + 30);

  // Generate opportunity name
  const name =
    mappedData.projectName ||
    `Intake: ${mappedData.companyName || 'New Lead'} - ${new Date().toLocaleDateString()}`;

  // Get owner - use config owner, or find first admin
  let ownerId = config.assignToUserId;
  if (!ownerId) {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    ownerId = adminUser?.id ?? 1;
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      tenantId,
      accountId,
      pipelineId,
      stageId,
      name,
      description: mappedData.projectDescription || null,
      amount,
      probability,
      weightedAmount: amount * (probability / 100),
      expectedCloseDate,
      leadSource: 'INBOUND',
      ownerId,
      customFields: {
        source: mappedData.source || 'intake',
        submissionId,
        intakeData: formData,
      },
    },
  });

  // Link contact to opportunity if available
  if (contactId) {
    try {
      await prisma.opportunityContact.create({
        data: {
          opportunityId: opportunity.id,
          contactId,
          role: 'Primary Contact',
          isPrimary: true,
        },
      });
    } catch {
      // Ignore if already exists
    }
  }

  // Create initial activity
  try {
    await prisma.cRMActivity.create({
      data: {
        tenantId,
        accountId,
        opportunityId: opportunity.id,
        contactId: contactId || null,
        type: 'NOTE',
        subject: 'Intake Form Submitted',
        description: `Opportunity created from intake submission #${submissionId}`,
        status: 'COMPLETED',
        completedAt: new Date(),
        ownerId,
        createdById: ownerId,
      },
    });
  } catch {
    // Ignore activity creation errors
  }

  return { id: opportunity.id, name: opportunity.name };
}

// ============================================================================
// ADDITIONAL UTILITIES
// ============================================================================

/**
 * Get CRM integration status for a submission
 */
export async function getIntegrationStatus(submissionId: number): Promise<{
  isIntegrated: boolean;
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
  processedAt?: string;
}> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return { isIntegrated: false };
  }

  const formData = submission.formData as Record<string, unknown> | null;
  const integration = formData?._crmIntegration as
    | {
        accountId?: number;
        contactId?: number;
        opportunityId?: number;
        processedAt?: string;
      }
    | undefined;

  if (!integration) {
    return { isIntegrated: false };
  }

  return {
    isIntegrated: true,
    ...integration,
  };
}

/**
 * Validate field mappings
 */
export function validateFieldMappings(
  formData: Record<string, unknown>,
  mappings: IntakeFieldMapping,
): { valid: boolean; missing: string[]; found: string[] } {
  const found: string[] = [];
  const missing: string[] = [];

  for (const [targetField, sourceFields] of Object.entries(mappings)) {
    if (!sourceFields) continue;

    const possibleFields = sourceFields.split(',').map((f: string) => f.trim());
    let hasMatch = false;

    for (const field of possibleFields) {
      if (formData[field] !== undefined && formData[field] !== '') {
        found.push(targetField);
        hasMatch = true;
        break;
      }
    }

    if (
      !hasMatch &&
      ['email', 'fullName', 'companyName'].includes(targetField)
    ) {
      missing.push(targetField);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    found,
  };
}
