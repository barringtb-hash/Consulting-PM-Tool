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
 * Returns null if the account is not found.
 */
export async function updateAccount(id: number, input: UpdateAccountInput) {
  const tenantId = getTenantId();

  try {
    return await prisma.account.update({
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Archive an account (soft delete).
 * Returns null if the account is not found.
 */
export async function archiveAccount(id: number) {
  const tenantId = getTenantId();

  try {
    return await prisma.account.update({
      where: { id, tenantId },
      data: {
        archived: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Restore an archived account.
 * Returns null if the account is not found.
 */
export async function restoreAccount(id: number) {
  const tenantId = getTenantId();

  try {
    return await prisma.account.update({
      where: { id, tenantId },
      data: {
        archived: false,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Delete an account permanently.
 * Use with caution - this cascades to all related data.
 * Returns false if the account is not found.
 */
export async function deleteAccount(id: number): Promise<boolean> {
  const tenantId = getTenantId();

  try {
    await prisma.account.delete({
      where: { id, tenantId },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return false;
    }
    throw error;
  }
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
 */
export async function getAccountStats() {
  const tenantId = getTenantId();

  const baseWhere = { tenantId, archived: false };

  const [
    totalAccounts,
    byType,
    healthyCount,
    atRiskCount,
    criticalCount,
    _unknownHealthCount,
    recentlyEngaged,
  ] = await Promise.all([
    // Total accounts
    prisma.account.count({
      where: baseWhere,
    }),

    // By type
    prisma.account.groupBy({
      by: ['type'],
      where: baseWhere,
      _count: true,
    }),

    // Health score: healthy (>= 80)
    prisma.account.count({
      where: { ...baseWhere, healthScore: { gte: 80 } },
    }),

    // Health score: at_risk (50-79)
    prisma.account.count({
      where: { ...baseWhere, healthScore: { gte: 50, lt: 80 } },
    }),

    // Health score: critical (< 50, not null)
    prisma.account.count({
      where: { ...baseWhere, healthScore: { lt: 50, not: null } },
    }),

    // Health score: unknown (null)
    prisma.account.count({
      where: { ...baseWhere, healthScore: null },
    }),

    // Recently engaged - count accounts with recent activities
    prisma.account.count({
      where: {
        ...baseWhere,
        activities: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
    }),
  ]);

  // Transform health score counts to match expected format
  const healthDistribution = {
    healthy: healthyCount,
    atRisk: atRiskCount,
    critical: criticalCount,
  };

  return {
    total: totalAccounts,
    byType,
    healthDistribution,
    recentlyActive: recentlyEngaged,
  };
}
