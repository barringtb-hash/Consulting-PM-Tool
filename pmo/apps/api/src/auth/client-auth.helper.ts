/**
 * Client Authorization Helper
 *
 * Provides utilities for checking if a user has access to a specific client's data.
 * A user has access to a client if:
 * 1. They are authenticated, AND
 * 2. The client exists
 *
 * Note: Authorization was simplified to allow all authenticated users to access
 * any client's data, matching the frontend behavior where all clients are visible
 * to all users. This is appropriate for consulting teams where collaboration is key.
 */

import { prisma } from '../prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Check if a Prisma error is due to a missing column (typically from pending migration)
 * Uses Prisma error code P2022 for more reliable detection than string matching
 */
function isMissingColumnError(error: unknown, columnName: string): boolean {
  // Check for PrismaClientKnownRequestError with code P2022 (column does not exist)
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2022'
  ) {
    // Check if the meta contains the column name
    const meta = error.meta as
      | { column?: string; column_name?: string }
      | undefined;
    if (meta?.column === columnName || meta?.column_name === columnName) {
      return true;
    }
  }

  // Fallback: check error message for cases where error code isn't set correctly
  const errorMessage = (error as Error).message || '';
  return (
    errorMessage.includes(columnName) && errorMessage.includes('does not exist')
  );
}

/**
 * Check if a user has access to a client
 * @param userId - The authenticated user's ID
 * @param clientId - The client ID to check access for
 * @returns true if user has access, false otherwise
 *
 * Access is granted if the user is authenticated and the client exists.
 *
 * Note: This was updated to be more permissive because the frontend
 * displays all clients to all authenticated users, so restricting
 * AI tool configuration to only project owners was too restrictive.
 * For consulting teams where collaboration is expected, any authenticated
 * user can access any client's data.
 */
export async function hasClientAccess(
  userId: number,
  clientId: number,
): Promise<boolean> {
  // Defensive check: verify user exists (requireAuth middleware should have already validated this,
  // but this provides an additional safety check for direct function calls)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return false;
  }

  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });

  // Grant access if both user and client exist
  return client !== null;
}

/**
 * Get all client IDs a user has access to
 * @param userId - The authenticated user's ID
 * @returns Array of client IDs the user can access, or null if user is admin (meaning all)
 */
export async function getAccessibleClientIds(
  userId: number,
): Promise<number[] | null> {
  // First check if user is an admin - they have access to all clients
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    // Return null to indicate "all clients" - caller should not filter
    return null;
  }

  try {
    // Get all unique account IDs from projects owned by this user
    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      select: { accountId: true },
      distinct: ['accountId'],
    });

    // Filter out null accountIds and return only valid numbers
    return projects
      .map((p: { accountId: number | null }) => p.accountId)
      .filter((id: number | null): id is number => id !== null);
  } catch (error) {
    if (isMissingColumnError(error, 'accountId')) {
      console.warn(
        '[ClientAuth] Project.accountId column not found in database, falling back to clientId query. Run pending migrations to resolve.',
      );
      // Fall back to clientId
      const projects = await prisma.project.findMany({
        where: { ownerId: userId },
        select: { clientId: true },
        distinct: ['clientId'],
      });
      return projects
        .map((p: { clientId: number | null }) => p.clientId)
        .filter((id: number | null): id is number => id !== null);
    }
    throw error;
  }
}

/**
 * Get the client ID from a document analyzer config
 */
export async function getClientIdFromDocumentAnalyzerConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.documentAnalyzerConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from a content generator config
 */
export async function getClientIdFromContentGeneratorConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from a lead scoring config
 */
export async function getClientIdFromLeadScoringConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.leadScoringConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from a prior auth config
 */
export async function getClientIdFromPriorAuthConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.priorAuthConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from an analyzed document
 */
export async function getClientIdFromAnalyzedDocument(
  documentId: number,
): Promise<number | null> {
  const document = await prisma.analyzedDocument.findUnique({
    where: { id: documentId },
    select: { config: { select: { clientId: true } } },
  });
  return document?.config?.clientId ?? null;
}

/**
 * Get the client ID from an extraction template
 */
export async function getClientIdFromExtractionTemplate(
  templateId: number,
): Promise<number | null> {
  const template = await prisma.extractionTemplate.findUnique({
    where: { id: templateId },
    select: { config: { select: { clientId: true } } },
  });
  return template?.config?.clientId ?? null;
}

/**
 * Get the client ID from a batch job
 */
export async function getClientIdFromBatchJob(
  jobId: number,
): Promise<number | null> {
  const job = await prisma.documentBatchJob.findUnique({
    where: { id: jobId },
    select: { config: { select: { clientId: true } } },
  });
  return job?.config?.clientId ?? null;
}

/**
 * Get the client ID from a document integration
 */
export async function getClientIdFromDocumentIntegration(
  integrationId: number,
): Promise<number | null> {
  const integration = await prisma.documentIntegration.findUnique({
    where: { id: integrationId },
    select: { config: { select: { clientId: true } } },
  });
  return integration?.config?.clientId ?? null;
}

/**
 * Get the client ID from generated content
 */
export async function getClientIdFromGeneratedContent(
  contentId: number,
): Promise<number | null> {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
    select: { config: { select: { clientId: true } } },
  });
  return content?.config?.clientId ?? null;
}

/**
 * Get the client ID from a content template
 */
export async function getClientIdFromContentTemplate(
  templateId: number,
): Promise<number | null> {
  const template = await prisma.contentTemplate.findUnique({
    where: { id: templateId },
    select: { config: { select: { clientId: true } } },
  });
  return template?.config?.clientId ?? null;
}

/**
 * Get the client ID from a content approval workflow
 */
export async function getClientIdFromContentApprovalWorkflow(
  workflowId: number,
): Promise<number | null> {
  const workflow = await prisma.contentApprovalWorkflow.findUnique({
    where: { id: workflowId },
    select: { config: { select: { clientId: true } } },
  });
  return workflow?.config?.clientId ?? null;
}

/**
 * Get the client ID from a scored lead
 */
export async function getClientIdFromScoredLead(
  leadId: number,
): Promise<number | null> {
  const lead = await prisma.scoredLead.findUnique({
    where: { id: leadId },
    select: { config: { select: { clientId: true } } },
  });
  return lead?.config?.clientId ?? null;
}

/**
 * Get the client ID from a nurture sequence
 */
export async function getClientIdFromNurtureSequence(
  sequenceId: number,
): Promise<number | null> {
  const sequence = await prisma.nurtureSequence.findUnique({
    where: { id: sequenceId },
    select: { config: { select: { clientId: true } } },
  });
  return sequence?.config?.clientId ?? null;
}

/**
 * Get the client ID from a PA request
 */
export async function getClientIdFromPARequest(
  requestId: number,
): Promise<number | null> {
  const request = await prisma.pARequest.findUnique({
    where: { id: requestId },
    select: { config: { select: { clientId: true } } },
  });
  return request?.config?.clientId ?? null;
}

/**
 * Get the client ID from a PA appeal
 */
export async function getClientIdFromPAAppeal(
  appealId: number,
): Promise<number | null> {
  const appeal = await prisma.pAAppeal.findUnique({
    where: { id: appealId },
    select: { request: { select: { config: { select: { clientId: true } } } } },
  });
  return appeal?.request?.config?.clientId ?? null;
}

/**
 * Get the client ID from a payer rule
 */
export async function getClientIdFromPayerRule(
  ruleId: number,
): Promise<number | null> {
  const rule = await prisma.payerRule.findUnique({
    where: { id: ruleId },
    select: { config: { select: { clientId: true } } },
  });
  return rule?.config?.clientId ?? null;
}

/**
 * Get the client ID from a PA template
 */
export async function getClientIdFromPATemplate(
  templateId: number,
): Promise<number | null> {
  const template = await prisma.pATemplate.findUnique({
    where: { id: templateId },
    select: { config: { select: { clientId: true } } },
  });
  return template?.config?.clientId ?? null;
}

// ============ PHASE 3 AI TOOLS - Inventory Forecasting ============

/**
 * Get the client ID from an inventory forecast config
 */
export async function getClientIdFromInventoryForecastConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.inventoryForecastConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

// ============ PHASE 3 AI TOOLS - Compliance Monitor ============

/**
 * Get the client ID from a compliance monitor config
 */
export async function getClientIdFromComplianceMonitorConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.complianceMonitorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

// ============ PHASE 3 AI TOOLS - Predictive Maintenance ============

/**
 * Get the client ID from a predictive maintenance config
 */
export async function getClientIdFromPredictiveMaintenanceConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.predictiveMaintenanceConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

// ============ PHASE 3 AI TOOLS - Revenue Management ============

/**
 * Get the client ID from a revenue management config
 */
export async function getClientIdFromRevenueManagementConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.revenueManagementConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

// ============ PHASE 3 AI TOOLS - Safety Monitor ============

/**
 * Get the client ID from a safety monitor config
 */
export async function getClientIdFromSafetyMonitorConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.safetyMonitorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

// ============ INTAKE MODULE ============

/**
 * Get the client ID from an intake config
 */
export async function getClientIdFromIntakeConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.intakeConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from an intake form
 */
export async function getClientIdFromIntakeForm(
  formId: number,
): Promise<number | null> {
  const form = await prisma.intakeForm.findUnique({
    where: { id: formId },
    select: { config: { select: { clientId: true } } },
  });
  return form?.config?.clientId ?? null;
}

/**
 * Get the client ID from an intake submission
 */
export async function getClientIdFromIntakeSubmission(
  submissionId: number,
): Promise<number | null> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    select: { form: { select: { config: { select: { clientId: true } } } } },
  });
  return submission?.form?.config?.clientId ?? null;
}

// ============ LEAD MANAGEMENT ============

/**
 * Check if a user has access to a lead
 * User has access if they are:
 * 1. An admin, OR
 * 2. The owner of the lead, OR
 * 3. Have access to the client the lead is associated with
 */
export async function hasLeadAccess(
  userId: number,
  leadId: number,
): Promise<boolean> {
  // First check if user is an admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    return true;
  }

  // Get the lead with owner and client info
  const lead = await prisma.inboundLead.findUnique({
    where: { id: leadId },
    select: { ownerUserId: true, clientId: true },
  });

  if (!lead) {
    return false;
  }

  // Check if user is the owner
  if (lead.ownerUserId === userId) {
    return true;
  }

  // Check if user has access via client relationship
  if (lead.clientId) {
    return hasClientAccess(userId, lead.clientId);
  }

  return false;
}

/**
 * Get leads accessible to a user
 * Returns a Prisma where clause filter for leads the user can access
 */
export async function getLeadAccessFilter(
  userId: number,
): Promise<{ OR: Array<Record<string, unknown>> } | Record<string, never>> {
  // Check if user is an admin - they can access all leads
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    // No filter needed - admin can see all
    return {};
  }

  // Get all client IDs the user has access to
  const accessibleClientIds = await getAccessibleClientIds(userId);

  // Build OR filter: owned leads OR leads for accessible clients
  const filters: Array<Record<string, unknown>> = [
    { ownerUserId: userId }, // Leads owned by this user
  ];

  if (accessibleClientIds && accessibleClientIds.length > 0) {
    filters.push({ clientId: { in: accessibleClientIds } }); // Leads for accessible clients
  }

  return { OR: filters };
}
