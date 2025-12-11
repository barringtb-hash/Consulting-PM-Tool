/**
 * Opportunity Service
 *
 * Business logic for Opportunity (Deal) management.
 * Opportunities represent potential revenue from accounts,
 * tracked through a customizable pipeline.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { getTenantId } from '../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateOpportunityInput {
  name: string;
  description?: string;
  accountId: number;
  pipelineId?: number;
  stageId: number;
  amount?: number;
  probability?: number;
  currency?: string;
  expectedCloseDate?: Date;
  leadSource?: string;
  campaignId?: number;
  ownerId: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
  contactIds?: number[];
}

export interface UpdateOpportunityInput {
  name?: string;
  description?: string;
  accountId?: number;
  pipelineId?: number;
  stageId?: number;
  amount?: number;
  probability?: number;
  currency?: string;
  expectedCloseDate?: Date;
  leadSource?: string;
  campaignId?: number;
  ownerId?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface OpportunityFilters {
  status?: 'OPEN' | 'WON' | 'LOST';
  pipelineId?: number;
  stageId?: number;
  accountId?: number;
  ownerId?: number;
  expectedCloseFrom?: Date;
  expectedCloseTo?: Date;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  tags?: string[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new opportunity.
 */
export async function createOpportunity(input: CreateOpportunityInput) {
  const tenantId = getTenantId();

  // Calculate weighted amount
  const weightedAmount =
    input.amount && input.probability
      ? (input.amount * input.probability) / 100
      : null;

  return prisma.$transaction(async (tx) => {
    // Create opportunity
    const opportunity = await tx.opportunity.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        accountId: input.accountId,
        pipelineId: input.pipelineId,
        stageId: input.stageId,
        amount: input.amount,
        probability: input.probability,
        weightedAmount,
        currency: input.currency || 'USD',
        expectedCloseDate: input.expectedCloseDate,
        leadSource: input.leadSource as
          | Prisma.EnumCRMLeadSourceNullableFilter
          | undefined,
        campaignId: input.campaignId,
        ownerId: input.ownerId,
        tags: input.tags || [],
        customFields: input.customFields as Prisma.InputJsonValue,
        status: 'OPEN',
      },
      include: {
        account: { select: { id: true, name: true } },
        stage: true,
        pipeline: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Add contacts if provided
    if (input.contactIds && input.contactIds.length > 0) {
      await tx.opportunityContact.createMany({
        data: input.contactIds.map((contactId, index) => ({
          opportunityId: opportunity.id,
          contactId,
          isPrimary: index === 0,
        })),
      });
    }

    // Create initial stage history entry
    await tx.opportunityStageHistory.create({
      data: {
        opportunityId: opportunity.id,
        toStageId: input.stageId,
        changedById: input.ownerId,
      },
    });

    return opportunity;
  });
}

/**
 * Get opportunity by ID.
 */
export async function getOpportunityById(id: number) {
  const tenantId = getTenantId();

  return prisma.opportunity.findFirst({
    where: { id, tenantId },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          website: true,
          industry: true,
          healthScore: true,
        },
      },
      stage: true,
      pipeline: {
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
      },
      owner: { select: { id: true, name: true, email: true } },
      contacts: {
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
            },
          },
        },
      },
      lineItems: true,
      stageHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          fromStage: { select: { id: true, name: true } },
          toStage: { select: { id: true, name: true } },
          changedBy: { select: { id: true, name: true } },
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          owner: { select: { id: true, name: true } },
        },
      },
    },
  });
}

/**
 * List opportunities with filtering and pagination.
 */
export async function listOpportunities(
  filters: OpportunityFilters = {},
  pagination: PaginationOptions = {},
) {
  const tenantId = getTenantId();
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 50, 100);
  const skip = (page - 1) * limit;
  const sortBy = pagination.sortBy || 'createdAt';
  const sortOrder = pagination.sortOrder || 'desc';

  // Build where clause
  const where: Prisma.OpportunityWhereInput = { tenantId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.pipelineId) {
    where.pipelineId = filters.pipelineId;
  }

  if (filters.stageId) {
    where.stageId = filters.stageId;
  }

  if (filters.accountId) {
    where.accountId = filters.accountId;
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  if (filters.expectedCloseFrom || filters.expectedCloseTo) {
    where.expectedCloseDate = {
      gte: filters.expectedCloseFrom,
      lte: filters.expectedCloseTo,
    };
  }

  if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
    where.amount = {
      gte: filters.amountMin,
      lte: filters.amountMax,
    };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }

  // Execute query with count
  const [opportunities, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        account: { select: { id: true, name: true } },
        stage: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.opportunity.count({ where }),
  ]);

  return {
    data: opportunities,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update an opportunity.
 */
export async function updateOpportunity(
  id: number,
  input: UpdateOpportunityInput,
) {
  const tenantId = getTenantId();

  // Calculate weighted amount if amount or probability changed
  let weightedAmount: number | null | undefined = undefined;
  if (input.amount !== undefined || input.probability !== undefined) {
    const current = await prisma.opportunity.findFirst({
      where: { id, tenantId },
      select: { amount: true, probability: true },
    });

    if (current) {
      const amount =
        input.amount ?? (current.amount !== null ? Number(current.amount) : 0);
      const probability = input.probability ?? current.probability ?? 0;
      weightedAmount = (amount * probability) / 100;
    }
  }

  return prisma.opportunity.update({
    where: { id, tenantId },
    data: {
      name: input.name,
      description: input.description,
      accountId: input.accountId,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      amount: input.amount,
      probability: input.probability,
      weightedAmount,
      currency: input.currency,
      expectedCloseDate: input.expectedCloseDate,
      leadSource: input.leadSource as
        | Prisma.EnumCRMLeadSourceNullableFilter
        | undefined,
      campaignId: input.campaignId,
      ownerId: input.ownerId,
      tags: input.tags,
      customFields: input.customFields as Prisma.InputJsonValue,
    },
    include: {
      account: { select: { id: true, name: true } },
      stage: true,
      owner: { select: { id: true, name: true } },
    },
  });
}

/**
 * Move opportunity to a different stage.
 */
export async function moveOpportunityStage(
  id: number,
  newStageId: number,
  changedById: number,
) {
  const tenantId = getTenantId();

  return prisma.$transaction(async (tx) => {
    // Get current opportunity
    const current = await tx.opportunity.findFirst({
      where: { id, tenantId },
      select: { stageId: true, createdAt: true },
    });

    if (!current) {
      throw new Error('Opportunity not found');
    }

    // Get new stage to check type
    const newStage = await tx.pipelineStage.findUnique({
      where: { id: newStageId },
    });

    if (!newStage) {
      throw new Error('Stage not found');
    }

    // Calculate duration in previous stage
    const durationMinutes = Math.floor(
      (Date.now() - current.createdAt.getTime()) / (1000 * 60),
    );

    // Create stage history
    await tx.opportunityStageHistory.create({
      data: {
        opportunityId: id,
        fromStageId: current.stageId,
        toStageId: newStageId,
        changedById,
        duration: durationMinutes,
      },
    });

    // Update opportunity
    const updateData: Prisma.OpportunityUpdateInput = {
      stageId: newStageId,
      probability: newStage.probability,
    };

    // Update status based on stage type
    if (newStage.type === 'WON') {
      updateData.status = 'WON';
      updateData.actualCloseDate = new Date();
    } else if (newStage.type === 'LOST') {
      updateData.status = 'LOST';
      updateData.actualCloseDate = new Date();
    } else {
      updateData.status = 'OPEN';
    }

    // Recalculate weighted amount
    const opportunity = await tx.opportunity.findFirst({
      where: { id, tenantId },
      select: { amount: true },
    });

    if (opportunity?.amount) {
      updateData.weightedAmount =
        (Number(opportunity.amount) * newStage.probability) / 100;
    }

    return tx.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        stage: true,
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });
  });
}

/**
 * Mark opportunity as won.
 */
export async function markOpportunityWon(id: number, changedById: number) {
  const tenantId = getTenantId();

  // Get the WON stage for this opportunity's pipeline
  const opportunity = await prisma.opportunity.findFirst({
    where: { id, tenantId },
    include: {
      pipeline: {
        include: {
          stages: {
            where: { type: 'WON' },
            take: 1,
          },
        },
      },
    },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  const wonStage = opportunity.pipeline?.stages[0];
  if (!wonStage) {
    throw new Error('No WON stage found in pipeline');
  }

  return moveOpportunityStage(id, wonStage.id, changedById);
}

/**
 * Mark opportunity as lost.
 */
export async function markOpportunityLost(
  id: number,
  changedById: number,
  lostReason?: string,
  lostReasonDetail?: string,
  competitorId?: number,
) {
  const tenantId = getTenantId();

  // Get the LOST stage for this opportunity's pipeline
  const opportunity = await prisma.opportunity.findFirst({
    where: { id, tenantId },
    include: {
      pipeline: {
        include: {
          stages: {
            where: { type: 'LOST' },
            take: 1,
          },
        },
      },
    },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  const lostStage = opportunity.pipeline?.stages[0];
  if (!lostStage) {
    throw new Error('No LOST stage found in pipeline');
  }

  // Update with lost details first
  await prisma.opportunity.update({
    where: { id, tenantId },
    data: {
      lostReason,
      lostReasonDetail,
      competitorId,
    },
  });

  return moveOpportunityStage(id, lostStage.id, changedById);
}

/**
 * Delete an opportunity.
 */
export async function deleteOpportunity(id: number) {
  const tenantId = getTenantId();

  return prisma.opportunity.delete({
    where: { id, tenantId },
  });
}

// ============================================================================
// OPPORTUNITY CONTACTS
// ============================================================================

/**
 * Add contact to opportunity.
 */
export async function addContactToOpportunity(
  opportunityId: number,
  contactId: number,
  role?: string,
  isPrimary?: boolean,
) {
  return prisma.opportunityContact.create({
    data: {
      opportunityId,
      contactId,
      role,
      isPrimary: isPrimary || false,
    },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
        },
      },
    },
  });
}

/**
 * Remove contact from opportunity.
 */
export async function removeContactFromOpportunity(
  opportunityId: number,
  contactId: number,
) {
  return prisma.opportunityContact.delete({
    where: {
      opportunityId_contactId: {
        opportunityId,
        contactId,
      },
    },
  });
}

// ============================================================================
// PIPELINE STATS
// ============================================================================

/**
 * Get pipeline statistics.
 */
export async function getPipelineStats(pipelineId?: number) {
  const tenantId = getTenantId();

  const where: Prisma.OpportunityWhereInput = {
    tenantId,
    status: 'OPEN',
  };

  if (pipelineId) {
    where.pipelineId = pipelineId;
  }

  const [byStage, totalValue, weightedValue, avgDealSize] = await Promise.all([
    // By stage
    prisma.opportunity.groupBy({
      by: ['stageId'],
      where,
      _count: true,
      _sum: {
        amount: true,
        weightedAmount: true,
      },
    }),

    // Total value
    prisma.opportunity.aggregate({
      where,
      _sum: { amount: true },
    }),

    // Weighted value
    prisma.opportunity.aggregate({
      where,
      _sum: { weightedAmount: true },
    }),

    // Average deal size
    prisma.opportunity.aggregate({
      where,
      _avg: { amount: true },
    }),
  ]);

  // Get stage names
  const stageIds = byStage.map((s) => s.stageId);
  const stages = await prisma.pipelineStage.findMany({
    where: { id: { in: stageIds } },
    select: { id: true, name: true, color: true, order: true },
  });

  const stageMap = new Map(stages.map((s) => [s.id, s]));

  return {
    byStage: byStage
      .map((s) => ({
        stage: stageMap.get(s.stageId),
        count: s._count,
        totalAmount: s._sum.amount,
        weightedAmount: s._sum.weightedAmount,
      }))
      .sort((a, b) => (a.stage?.order || 0) - (b.stage?.order || 0)),
    totalValue: totalValue._sum.amount,
    weightedValue: weightedValue._sum.weightedAmount,
    avgDealSize: avgDealSize._avg.amount,
  };
}

/**
 * Get opportunities closing soon (next 30 days).
 */
export async function getOpportunitiesClosingSoon(days: number = 30) {
  const tenantId = getTenantId();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return prisma.opportunity.findMany({
    where: {
      tenantId,
      status: 'OPEN',
      expectedCloseDate: {
        gte: new Date(),
        lte: futureDate,
      },
    },
    orderBy: { expectedCloseDate: 'asc' },
    include: {
      account: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true, color: true } },
      owner: { select: { id: true, name: true } },
    },
  });
}
