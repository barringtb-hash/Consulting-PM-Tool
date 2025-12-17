/**
 * Account Service
 *
 * Business logic for Account (Company/Organization) management.
 * Accounts are the core entity in the CRM representing companies
 * that are prospects, customers, partners, or competitors.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { getTenantId } from '../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateAccountInput {
  name: string;
  website?: string;
  phone?: string;
  parentAccountId?: number;
  type?:
    | 'PROSPECT'
    | 'CUSTOMER'
    | 'PARTNER'
    | 'COMPETITOR'
    | 'CHURNED'
    | 'OTHER';
  industry?: string;
  employeeCount?:
    | 'SOLO'
    | 'MICRO'
    | 'SMALL'
    | 'MEDIUM'
    | 'LARGE'
    | 'ENTERPRISE';
  annualRevenue?: number;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  ownerId: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateAccountInput {
  name?: string;
  website?: string;
  phone?: string;
  parentAccountId?: number | null;
  type?:
    | 'PROSPECT'
    | 'CUSTOMER'
    | 'PARTNER'
    | 'COMPETITOR'
    | 'CHURNED'
    | 'OTHER';
  industry?: string;
  employeeCount?:
    | 'SOLO'
    | 'MICRO'
    | 'SMALL'
    | 'MEDIUM'
    | 'LARGE'
    | 'ENTERPRISE';
  annualRevenue?: number;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  healthScore?: number;
  engagementScore?: number;
  churnRisk?: number;
  ownerId?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
  archived?: boolean;
}

export interface AccountFilters {
  type?: string;
  industry?: string;
  ownerId?: number;
  archived?: boolean;
  healthScoreMin?: number;
  healthScoreMax?: number;
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
 * Create a new account.
 */
export async function createAccount(input: CreateAccountInput) {
  const tenantId = getTenantId();

  return prisma.account.create({
    data: {
      tenantId,
      name: input.name,
      website: input.website,
      phone: input.phone,
      parentAccountId: input.parentAccountId,
      type: input.type || 'PROSPECT',
      industry: input.industry,
      employeeCount: input.employeeCount,
      annualRevenue: input.annualRevenue,
      billingAddress: input.billingAddress as Prisma.InputJsonValue,
      shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
      ownerId: input.ownerId,
      tags: input.tags || [],
      customFields: input.customFields as Prisma.InputJsonValue,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      parentAccount: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          crmContacts: true,
          opportunities: true,
        },
      },
    },
  });
}

/**
 * Get account by ID.
 */
export async function getAccountById(id: number) {
  const tenantId = getTenantId();

  return prisma.account.findFirst({
    where: { id, tenantId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      parentAccount: {
        select: { id: true, name: true },
      },
      childAccounts: {
        select: { id: true, name: true, type: true },
      },
      crmContacts: {
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          lifecycle: true,
        },
      },
      opportunities: {
        where: { tenantId, status: 'OPEN' },
        orderBy: { expectedCloseDate: 'asc' },
        take: 5,
        include: {
          stage: { select: { id: true, name: true, color: true } },
        },
      },
      _count: {
        select: {
          crmContacts: true,
          opportunities: true,
          activities: true,
        },
      },
    },
  });
}

/**
 * List accounts with filtering and pagination.
 */
export async function listAccounts(
  filters: AccountFilters = {},
  pagination: PaginationOptions = {},
) {
  const tenantId = getTenantId();
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 50, 100);
  const skip = (page - 1) * limit;
  const sortBy = pagination.sortBy || 'createdAt';
  const sortOrder = pagination.sortOrder || 'desc';

  // Build where clause
  const where: Prisma.AccountWhereInput = {
    tenantId,
    archived: filters.archived ?? false,
  };

  if (filters.type) {
    where.type = filters.type as Prisma.EnumAccountTypeFilter;
  }

  if (filters.industry) {
    where.industry = filters.industry;
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  if (
    filters.healthScoreMin !== undefined ||
    filters.healthScoreMax !== undefined
  ) {
    where.healthScore = {
      gte: filters.healthScoreMin,
      lte: filters.healthScoreMax,
    };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { website: { contains: filters.search, mode: 'insensitive' } },
      { industry: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }

  // Execute query with count
  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            crmContacts: true,
            opportunities: true,
          },
        },
      },
    }),
    prisma.account.count({ where }),
  ]);

  return {
    data: accounts,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update an account.
 */
export async function updateAccount(id: number, input: UpdateAccountInput) {
  const tenantId = getTenantId();

  return prisma.account.update({
    where: { id, tenantId },
    data: {
      name: input.name,
      website: input.website,
      phone: input.phone,
      parentAccountId: input.parentAccountId,
      type: input.type,
      industry: input.industry,
      employeeCount: input.employeeCount,
      annualRevenue: input.annualRevenue,
      billingAddress: input.billingAddress as Prisma.InputJsonValue,
      shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
      healthScore: input.healthScore,
      engagementScore: input.engagementScore,
      churnRisk: input.churnRisk,
      ownerId: input.ownerId,
      tags: input.tags,
      customFields: input.customFields as Prisma.InputJsonValue,
      archived: input.archived,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Archive an account (soft delete).
 */
export async function archiveAccount(id: number) {
  const tenantId = getTenantId();

  return prisma.account.update({
    where: { id, tenantId },
    data: {
      archived: true,
    },
  });
}

/**
 * Restore an archived account.
 */
export async function restoreAccount(id: number) {
  const tenantId = getTenantId();

  return prisma.account.update({
    where: { id, tenantId },
    data: {
      archived: false,
    },
  });
}

/**
 * Delete an account permanently.
 * Use with caution - this cascades to all related data.
 */
export async function deleteAccount(id: number) {
  const tenantId = getTenantId();

  return prisma.account.delete({
    where: { id, tenantId },
  });
}

// ============================================================================
// ACCOUNT HIERARCHY
// ============================================================================

/**
 * Get account hierarchy (parent and children).
 */
export async function getAccountHierarchy(id: number) {
  const tenantId = getTenantId();

  const account = await prisma.account.findFirst({
    where: { id, tenantId },
    include: {
      parentAccount: {
        include: {
          parentAccount: {
            select: { id: true, name: true },
          },
        },
      },
      childAccounts: {
        include: {
          childAccounts: {
            select: { id: true, name: true, type: true },
          },
          _count: {
            select: { opportunities: true },
          },
        },
      },
    },
  });

  return account;
}

// ============================================================================
// ACCOUNT TIMELINE
// ============================================================================

/**
 * Get unified activity timeline for an account.
 */
export async function getAccountTimeline(
  id: number,
  options: { limit?: number; offset?: number } = {},
) {
  const tenantId = getTenantId();
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const activities = await prisma.cRMActivity.findMany({
    where: {
      tenantId,
      accountId: id,
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: {
      owner: {
        select: { id: true, name: true },
      },
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
      opportunity: {
        select: { id: true, name: true },
      },
    },
  });

  return activities;
}

// ============================================================================
// ACCOUNT MERGE
// ============================================================================

/**
 * Merge two accounts (combine into one, delete the other).
 * Moves all contacts, opportunities, and activities to the target account.
 */
export async function mergeAccounts(
  targetAccountId: number,
  sourceAccountId: number,
) {
  const tenantId = getTenantId();

  return prisma.$transaction(async (tx) => {
    // Move contacts
    await tx.cRMContact.updateMany({
      where: { accountId: sourceAccountId, tenantId },
      data: { accountId: targetAccountId },
    });

    // Move opportunities
    await tx.opportunity.updateMany({
      where: { accountId: sourceAccountId, tenantId },
      data: { accountId: targetAccountId },
    });

    // Move activities
    await tx.cRMActivity.updateMany({
      where: { accountId: sourceAccountId, tenantId },
      data: { accountId: targetAccountId },
    });

    // Move child accounts
    await tx.account.updateMany({
      where: { parentAccountId: sourceAccountId, tenantId },
      data: { parentAccountId: targetAccountId },
    });

    // Delete source account
    await tx.account.delete({
      where: { id: sourceAccountId, tenantId },
    });

    // Return updated target account
    return tx.account.findUnique({
      where: { id: targetAccountId },
      include: {
        _count: {
          select: {
            crmContacts: true,
            opportunities: true,
            activities: true,
          },
        },
      },
    });
  });
}

// ============================================================================
// ACCOUNT STATS
// ============================================================================

/**
 * Get account statistics for dashboard.
 *
 * OPTIMIZED: Fetches all accounts once and calculates stats in-memory
 * instead of running 7 separate count queries.
 */
export async function getAccountStats() {
  const tenantId = getTenantId();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // SINGLE QUERY: Fetch all non-archived accounts with activity count
  const accounts = await prisma.account.findMany({
    where: { tenantId, archived: false },
    select: {
      id: true,
      type: true,
      healthScore: true,
      _count: {
        select: {
          activities: {
            where: { createdAt: { gte: thirtyDaysAgo } },
          },
        },
      },
    },
  });

  // Calculate all stats in a single pass through the data
  let healthyCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;
  let recentlyEngagedCount = 0;
  const byType: { type: string; _count: number }[] = [];
  const typeCountMap = new Map<string, number>();

  for (const account of accounts) {
    // Health distribution
    if (account.healthScore === null) {
      // Unknown - not counted in distribution
    } else if (account.healthScore >= 80) {
      healthyCount++;
    } else if (account.healthScore >= 50) {
      atRiskCount++;
    } else {
      criticalCount++;
    }

    // Type distribution
    const currentTypeCount = typeCountMap.get(account.type) ?? 0;
    typeCountMap.set(account.type, currentTypeCount + 1);

    // Recently engaged (has activities in last 30 days)
    if (account._count.activities > 0) {
      recentlyEngagedCount++;
    }
  }

  // Convert type map to array format expected by API
  for (const [type, count] of typeCountMap) {
    byType.push({ type, _count: count });
  }

  return {
    total: accounts.length,
    byType,
    healthDistribution: {
      healthy: healthyCount,
      atRisk: atRiskCount,
      critical: criticalCount,
    },
    recentlyActive: recentlyEngagedCount,
  };
}
