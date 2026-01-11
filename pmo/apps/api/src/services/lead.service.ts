/**
 * Lead Service
 *
 * Manages inbound leads from website forms, referrals, and other sources.
 * Provides the primary entry point for the sales funnel.
 *
 * Lead Lifecycle:
 * 1. NEW → Initial capture from public form or manual entry
 * 2. CONTACTED → First outreach made
 * 3. QUALIFIED → Meets qualification criteria
 * 4. CONVERTED → Converted to Account + Opportunity (and optionally Project)
 * 5. REJECTED → Not a fit / spam / duplicate
 *
 * Conversion Workflow (convertLead):
 * The convertLead function transforms a qualified lead into CRM entities:
 *
 * ┌───────────────┐
 * │     Lead      │
 * │ (InboundLead) │
 * └───────┬───────┘
 *        │ convertLead()
 *        ▼
 * ┌──────────────────────────────────────────┐
 * │              Transaction                  │
 * │  ┌─────────────┐    ┌─────────────┐     │
 * │  │   Account   │◄───│ Get/Create  │     │
 * │  │   (CRM)     │    │ from company│     │
 * │  └──────┬──────┘    └─────────────┘     │
 * │         │                                │
 * │         ▼                                │
 * │  ┌─────────────┐    ┌─────────────┐     │
 * │  │ Opportunity │◄───│Get/Create   │     │
 * │  │  (Pipeline) │    │   Pipeline  │     │
 * │  └─────────────┘    └─────────────┘     │
 * │         │                                │
 * │         ▼ (optional, if createProject)   │
 * │  ┌─────────────┐                         │
 * │  │   Project   │                         │
 * │  │ (Delivery)  │                         │
 * │  └─────────────┘                         │
 * └──────────────────────────────────────────┘
 *
 * @module services/lead
 */

import { LeadSource, LeadStatus, Prisma, CRMLeadSource } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  LeadCreateInput,
  LeadUpdateInput,
  LeadConvertInput,
  PublicLeadCreateInput,
} from '../validation/lead.schema';

/**
 * Maps legacy LeadSource enum to CRM LeadSource for Opportunity creation.
 * Used during lead conversion to set the source on the resulting Opportunity.
 */
const LEAD_SOURCE_TO_CRM: Record<LeadSource, CRMLeadSource> = {
  [LeadSource.WEBSITE_CONTACT]: CRMLeadSource.WEBSITE,
  [LeadSource.WEBSITE_DOWNLOAD]: CRMLeadSource.WEBSITE,
  [LeadSource.REFERRAL]: CRMLeadSource.REFERRAL,
  [LeadSource.LINKEDIN]: CRMLeadSource.LINKEDIN,
  [LeadSource.OUTBOUND]: CRMLeadSource.OUTBOUND,
  [LeadSource.EVENT]: CRMLeadSource.EVENT,
  [LeadSource.OTHER]: CRMLeadSource.OTHER,
};

export interface ListLeadsParams {
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
  ownerUserId?: number;
  accessFilter?: { OR: Array<Record<string, unknown>> } | Record<string, never>;
}

export const listLeads = async ({
  search,
  source,
  status,
  ownerUserId,
  accessFilter,
}: ListLeadsParams) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const where: Prisma.InboundLeadWhereInput = {
    tenantId,
    source,
    status,
    ownerUserId,
  };

  // Apply access filter (authorization scoping)
  if (accessFilter && 'OR' in accessFilter) {
    where.AND = [accessFilter];
  }

  if (search) {
    const searchFilter: Prisma.StringFilter = {
      contains: search,
      mode: 'insensitive',
    };
    // If there's already an AND from access filter, add search to it
    if (where.AND) {
      (where.AND as Prisma.InboundLeadWhereInput[]).push({
        OR: [
          { name: searchFilter },
          { email: searchFilter },
          { company: searchFilter },
          { message: searchFilter },
        ],
      });
    } else {
      where.OR = [
        { name: searchFilter },
        { email: searchFilter },
        { company: searchFilter },
        { message: searchFilter },
      ];
    }
  }

  return prisma.inboundLead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      primaryContact: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getLeadById = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.inboundLead.findFirst({
    where: { id, tenantId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      client: true,
      primaryContact: true,
    },
  });
};

export const createLead = async (data: LeadCreateInput) => {
  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.inboundLead.create({
    data: {
      ...data,
      tenantId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const createPublicLead = async (
  data: Omit<PublicLeadCreateInput, 'tenantSlug'>,
  tenantId: string,
) => {
  return prisma.inboundLead.create({
    data: {
      ...data,
      tenantId,
      status: LeadStatus.NEW,
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      serviceInterest: true,
      source: true,
      status: true,
      createdAt: true,
    },
  });
};

export const updateLead = async (id: number, data: LeadUpdateInput) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.inboundLead.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  // Use the tenantId in the where clause for proper multi-tenant isolation
  return prisma.inboundLead.update({
    where: { id, tenantId },
    data,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      primaryContact: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

/**
 * Converts a qualified lead into CRM entities (Account, Opportunity, optionally Project).
 *
 * This is the primary sales funnel conversion function. It performs the following
 * operations in a single transaction:
 *
 * 1. **Account Creation/Lookup**: Finds existing Account by company name or creates new one
 * 2. **Pipeline Setup**: Ensures default sales pipeline exists with standard stages
 * 3. **Opportunity Creation**: Creates Opportunity linked to Account in first pipeline stage
 * 4. **Stage History**: Records initial stage for pipeline analytics
 * 5. **Project Creation** (optional): Creates delivery Project if createProject=true
 * 6. **Lead Update**: Marks lead as CONVERTED with links to created entities
 *
 * Default Behavior:
 * - createOpportunity defaults to true (recommended path for sales tracking)
 * - createProject defaults to false (only needed for immediate delivery tracking)
 *
 * @param id - The lead ID to convert
 * @param conversion - Conversion options including:
 *   - ownerId: User ID to own the created entities
 *   - createOpportunity: Whether to create Opportunity (default: true)
 *   - opportunityName: Custom name for the Opportunity
 *   - opportunityAmount: Deal value
 *   - opportunityProbability: Win probability override
 *   - expectedCloseDate: Expected close date for forecasting
 *   - createProject: Whether to create Project (default: false)
 *   - projectName: Custom name for the Project
 *   - createContact: Whether to create Contact from lead data
 *   - contactRole: Role for the created Contact
 *   - clientId: Legacy client ID (for backward compatibility)
 * @returns Object containing:
 *   - lead: Updated lead with CONVERTED status
 *   - accountId: ID of created/found Account
 *   - opportunityId: ID of created Opportunity (if createOpportunity=true)
 *   - projectId: ID of created Project (if createProject=true)
 *   - clientId: Legacy client ID
 *   - contactId: ID of created/existing Contact
 * @throws {Error} If lead not found, already converted, or missing required owner
 */
export const convertLead = async (id: number, conversion: LeadConvertInput) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const lead = await prisma.inboundLead.findFirst({
    where: { id, tenantId },
    include: { client: true, primaryContact: true },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  if (lead.status === LeadStatus.CONVERTED) {
    throw new Error('Lead already converted');
  }

  return prisma.$transaction(async (tx) => {
    // Legacy: clientId still tracked for backward compatibility with existing projects
    const clientId = conversion.clientId || lead.clientId;
    let contactId = lead.primaryContactId;
    let projectId: number | undefined;
    let opportunityId: number | undefined;
    let accountId: number | undefined;
    let crmContactId: number | undefined;

    // Note: Client creation removed - Accounts are now the primary entity
    // Legacy createClient flag is ignored; use Accounts instead

    // Create legacy contact if requested and we have a legacy client
    // Note: CRMContact is now created below when Account is created
    if (conversion.createContact && clientId && !contactId) {
      const contact = await tx.contact.create({
        data: {
          clientId,
          name: lead.name || lead.email,
          email: lead.email,
          role: conversion.contactRole,
          notes: `Created from lead`,
        },
      });
      contactId = contact.id;
    }

    // Create opportunity for sales pipeline tracking (default behavior)
    // Opportunity creation is now the primary conversion path
    const shouldCreateOpportunity = conversion.createOpportunity !== false; // Default to true

    if (shouldCreateOpportunity && tenantId) {
      const opportunityOwnerId = conversion.ownerId || lead.ownerUserId;

      if (!opportunityOwnerId) {
        throw new Error(
          'Opportunity owner not specified. Please provide an ownerId or ensure the lead has an assigned owner.',
        );
      }

      // Get or create Account (primary CRM entity)
      let account = await tx.account.findFirst({
        where: {
          tenantId,
          OR: [
            // Match by legacy client link
            ...(clientId
              ? [
                  {
                    customFields: {
                      path: ['legacyClientId'],
                      equals: clientId,
                    },
                  },
                ]
              : []),
            // Match by company name
            { name: lead.company || lead.email },
          ],
        },
      });

      if (!account) {
        account = await tx.account.create({
          data: {
            tenantId,
            name: lead.company || lead.email,
            type: 'PROSPECT',
            ownerId: opportunityOwnerId,
            customFields: {
              createdFrom: 'lead-conversion',
              leadId: id,
              ...(clientId ? { legacyClientId: clientId } : {}),
            },
          },
        });
      }
      accountId = account.id;

      // Create CRMContact linked to Account (primary contact from lead)
      if (lead.email) {
        // Check if a CRMContact already exists for this email in this tenant
        const existingCrmContact = await tx.cRMContact.findUnique({
          where: {
            tenantId_email: {
              tenantId,
              email: lead.email,
            },
          },
        });

        if (!existingCrmContact) {
          // Parse name into firstName/lastName
          const nameParts = (lead.name || '').trim().split(/\s+/);
          const firstName = nameParts[0] || lead.email.split('@')[0];
          const lastName = nameParts.slice(1).join(' ') || '';

          const crmContact = await tx.cRMContact.create({
            data: {
              tenantId,
              accountId: account.id,
              firstName,
              lastName,
              email: lead.email,
              jobTitle: conversion.contactRole || null,
              lifecycle: 'CUSTOMER',
              leadSource: lead.source ? LEAD_SOURCE_TO_CRM[lead.source] : null,
              isPrimary: true,
              ownerId: opportunityOwnerId,
              customFields: {
                createdFrom: 'lead-conversion',
                leadId: id,
              },
            },
          });
          crmContactId = crmContact.id;
        } else {
          crmContactId = existingCrmContact.id;
          if (!existingCrmContact.accountId) {
            // Link existing contact to this account if not already linked
            await tx.cRMContact.update({
              where: { id: existingCrmContact.id },
              data: { accountId: account.id },
            });
          }
        }
      }

      // Get or create default pipeline with stages
      let pipeline = await tx.pipeline.findFirst({
        where: { tenantId, isDefault: true },
        include: { stages: { orderBy: { order: 'asc' } } },
      });

      if (!pipeline) {
        // Create default pipeline
        pipeline = await tx.pipeline.create({
          data: {
            tenantId,
            name: 'Default Pipeline',
            description: 'Default sales pipeline',
            isDefault: true,
            isActive: true,
            stages: {
              create: [
                {
                  name: 'New Lead',
                  order: 1,
                  probability: 10,
                  type: 'OPEN',
                  color: '#3b82f6',
                },
                {
                  name: 'Qualified',
                  order: 2,
                  probability: 30,
                  type: 'OPEN',
                  color: '#3b82f6',
                },
                {
                  name: 'Proposal',
                  order: 3,
                  probability: 50,
                  type: 'OPEN',
                  color: '#3b82f6',
                },
                {
                  name: 'Negotiation',
                  order: 4,
                  probability: 75,
                  type: 'OPEN',
                  color: '#3b82f6',
                },
                {
                  name: 'Closed Won',
                  order: 5,
                  probability: 100,
                  type: 'WON',
                  color: '#22c55e',
                },
                {
                  name: 'Closed Lost',
                  order: 6,
                  probability: 0,
                  type: 'LOST',
                  color: '#ef4444',
                },
              ],
            },
          },
          include: { stages: { orderBy: { order: 'asc' } } },
        });
      }

      // Find the first open stage
      const firstStage =
        pipeline.stages.find((s) => s.type === 'OPEN') || pipeline.stages[0];

      // Get opportunity amount from new or legacy fields
      const amount =
        conversion.opportunityAmount ?? conversion.pipelineValue ?? null;
      const probability =
        conversion.opportunityProbability ?? firstStage.probability;
      const weightedAmount =
        amount && probability ? (amount * probability) / 100 : null;

      // Create opportunity
      const opportunity = await tx.opportunity.create({
        data: {
          tenantId,
          name:
            conversion.opportunityName ||
            `${lead.company || lead.email} - ${lead.serviceInterest}`,
          description: `Created from lead conversion`,
          accountId: account.id,
          pipelineId: pipeline.id,
          stageId: firstStage.id,
          amount,
          probability,
          weightedAmount,
          currency: 'USD',
          status: 'OPEN',
          expectedCloseDate: conversion.expectedCloseDate
            ? new Date(conversion.expectedCloseDate)
            : null,
          leadSource: lead.source ? LEAD_SOURCE_TO_CRM[lead.source] : null,
          ownerId: opportunityOwnerId,
          customFields: {
            legacyLeadId: id,
            createdFrom: 'lead-conversion',
          },
        },
      });

      opportunityId = opportunity.id;

      // Create initial stage history
      await tx.opportunityStageHistory.create({
        data: {
          opportunityId: opportunity.id,
          toStageId: firstStage.id,
          changedById: opportunityOwnerId,
        },
      });

      // Link CRMContact to Opportunity via OpportunityContact junction table
      if (crmContactId) {
        await tx.opportunityContact.create({
          data: {
            opportunityId: opportunity.id,
            contactId: crmContactId,
            isPrimary: true,
            role: conversion.contactRole || 'Primary Contact',
          },
        });
      }
    }

    // Create project for delivery tracking (legacy - requires existing clientId)
    // Note: Projects require a Client; if no clientId, skip project creation
    if (conversion.createProject && clientId) {
      const projectOwnerId = conversion.ownerId || lead.ownerUserId;

      if (!projectOwnerId) {
        throw new Error(
          'Project owner not specified. Please provide an ownerId or ensure the lead has an assigned owner.',
        );
      }

      const project = await tx.project.create({
        data: {
          clientId,
          ownerId: projectOwnerId,
          name:
            conversion.projectName ||
            `${lead.company || lead.email} - ${lead.serviceInterest}`,
          status: 'PLANNING',
        },
      });
      projectId = project.id;
    }

    // Update lead to converted status
    const updatedLead = await tx.inboundLead.update({
      where: { id },
      data: {
        status: LeadStatus.CONVERTED,
        clientId,
        primaryContactId: contactId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: true,
        primaryContact: true,
      },
    });

    return {
      lead: updatedLead,
      clientId,
      contactId,
      projectId,
      accountId,
      opportunityId,
      crmContactId,
    };
  });
};

export const deleteLead = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.inboundLead.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  return prisma.inboundLead.delete({
    where: { id, tenantId },
  });
};
