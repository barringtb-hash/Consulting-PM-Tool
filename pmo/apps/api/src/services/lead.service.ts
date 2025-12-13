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
 * Maps legacy LeadSource enum to CRM LeadSource for Opportunity creation
 */
const LEAD_SOURCE_TO_CRM: Record<LeadSource, CRMLeadSource> = {
  [LeadSource.WEBSITE]: CRMLeadSource.WEBSITE,
  [LeadSource.WEBSITE_CONTACT]: CRMLeadSource.WEBSITE,
  [LeadSource.REFERRAL]: CRMLeadSource.REFERRAL,
  [LeadSource.LINKEDIN]: CRMLeadSource.SOCIAL_MEDIA,
  [LeadSource.CONFERENCE]: CRMLeadSource.EVENT,
  [LeadSource.DIRECT]: CRMLeadSource.OUTBOUND,
  [LeadSource.PARTNER]: CRMLeadSource.PARTNER,
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

export const createPublicLead = async (data: PublicLeadCreateInput) => {
  // Get tenant context for multi-tenant isolation (if available)
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

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

  return prisma.inboundLead.update({
    where: { id },
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
    let clientId = conversion.clientId || lead.clientId;
    let contactId = lead.primaryContactId;
    let projectId: number | undefined;
    let opportunityId: number | undefined;
    let accountId: number | undefined;

    // Create or use existing client
    if (conversion.createClient && !clientId && lead.company) {
      const client = await tx.client.create({
        data: {
          name: lead.company,
          notes: `Created from lead: ${lead.email}`,
        },
      });
      clientId = client.id;
    }

    // Create contact if requested and we have a client
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

    // Create project for delivery tracking (no pipeline fields)
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
          // Note: Pipeline fields removed - use Opportunity for sales tracking
        },
      });
      projectId = project.id;
    }

    // Create opportunity for sales pipeline tracking
    // Check for createOpportunity flag or legacy pipelineStage/pipelineValue
    const shouldCreateOpportunity =
      conversion.createOpportunity ||
      conversion.pipelineStage ||
      conversion.pipelineValue;

    if (shouldCreateOpportunity && tenantId) {
      const opportunityOwnerId = conversion.ownerId || lead.ownerUserId;

      if (!opportunityOwnerId) {
        throw new Error(
          'Opportunity owner not specified. Please provide an ownerId or ensure the lead has an assigned owner.',
        );
      }

      // Get or create Account linked to Client
      let account = clientId
        ? await tx.account.findFirst({
            where: {
              tenantId,
              OR: [
                {
                  customFields: { path: ['legacyClientId'], equals: clientId },
                },
                {
                  name: lead.company || lead.email,
                },
              ],
            },
          })
        : null;

      if (!account) {
        // Get client details if we have one
        const clientDetails = clientId
          ? await tx.client.findUnique({
              where: { id: clientId },
              select: { name: true, industry: true },
            })
          : null;

        account = await tx.account.create({
          data: {
            tenantId,
            name: clientDetails?.name || lead.company || lead.email,
            industry: clientDetails?.industry,
            type: 'PROSPECT',
            ownerId: opportunityOwnerId,
            customFields: clientId
              ? {
                  legacyClientId: clientId,
                  createdFrom: 'lead-conversion',
                  leadId: id,
                }
              : {
                  createdFrom: 'lead-conversion',
                  leadId: id,
                },
          },
        });
      }
      accountId = account.id;

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
    where: { id },
  });
};
