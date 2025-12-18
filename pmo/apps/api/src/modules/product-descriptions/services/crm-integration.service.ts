/**
 * CRM Integration Service for Product Descriptions
 *
 * Integrates product description activities with the CRM system:
 * - Logs description generation as CRM activities
 * - Tracks description performance metrics
 * - Links product catalogs to accounts
 * - Provides activity timeline integration
 */

import { prisma } from '../../../prisma/client';
import {
  CRMActivityType,
  CRMActivityStatus,
  Marketplace,
} from '@prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductDescriptionActivity {
  type:
    | 'description_generated'
    | 'description_updated'
    | 'bulk_job_started'
    | 'bulk_job_completed'
    | 'compliance_flagged'
    | 'compliance_approved'
    | 'seo_optimized'
    | 'translated';
  accountId?: number;
  productId?: number;
  descriptionId?: number;
  bulkJobId?: number;
  metadata?: Record<string, unknown>;
  userId?: number;
}

export interface AccountProductStats {
  accountId: number;
  accountName: string;
  totalProducts: number;
  totalDescriptions: number;
  avgSeoScore: number;
  complianceStatus: {
    approved: number;
    pending: number;
    flagged: number;
    requiresReview: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Log a product description activity to the CRM timeline
 */
export async function logProductDescriptionActivity(
  activity: ProductDescriptionActivity,
): Promise<{ success: boolean; activityId?: number; error?: string }> {
  try {
    // Skip if no tenant context available (e.g., in some background jobs)
    if (!hasTenantContext()) {
      return {
        success: false,
        error: 'No tenant context available for CRM activity logging',
      };
    }

    const tenantId = getTenantId();

    // Get account ID from config if not provided
    let accountId = activity.accountId;
    if (!accountId && activity.productId) {
      const product = await prisma.product.findUnique({
        where: { id: activity.productId },
        include: {
          config: {
            select: { accountId: true },
          },
        },
      });
      accountId = product?.config?.accountId || undefined;
    }

    if (!accountId) {
      // Cannot log activity without an account
      return {
        success: false,
        error: 'No account associated with this product',
      };
    }

    // Get account owner for activity ownership
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { ownerId: true },
    });

    if (!account?.ownerId) {
      return {
        success: false,
        error: 'Account has no owner assigned',
      };
    }

    // Build activity details
    const { subject, description } = buildActivityDetails(activity);

    // Create CRM activity
    const crmActivity = await prisma.cRMActivity.create({
      data: {
        tenantId,
        accountId,
        type: mapToActivityType(activity.type),
        subject,
        description,
        status: CRMActivityStatus.COMPLETED,
        completedAt: new Date(),
        ownerId: account.ownerId,
        createdById: account.ownerId,
        // Store product description data in metadata
        metadata: {
          source: 'product_descriptions',
          eventType: activity.type,
          productId: activity.productId,
          descriptionId: activity.descriptionId,
          bulkJobId: activity.bulkJobId,
          ...activity.metadata,
        },
      },
    });

    return { success: true, activityId: crmActivity.id };
  } catch (error) {
    console.error('Error logging CRM activity:', error);
    return {
      success: false,
      error: `Failed to log activity: ${(error as Error).message}`,
    };
  }
}

/**
 * Log bulk job activity
 */
export async function logBulkJobActivity(
  configId: number,
  jobId: number,
  status: 'started' | 'completed' | 'failed',
  stats?: {
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    marketplace?: Marketplace;
  },
): Promise<void> {
  const config = await prisma.productDescriptionConfig.findUnique({
    where: { id: configId },
    select: { accountId: true },
  });

  if (!config?.accountId) return;

  const activityType =
    status === 'started' ? 'bulk_job_started' : 'bulk_job_completed';

  await logProductDescriptionActivity({
    type: activityType,
    accountId: config.accountId,
    bulkJobId: jobId,
    metadata: {
      status,
      ...stats,
    },
  });
}

/**
 * Log description generation
 */
export async function logDescriptionGeneration(
  productId: number,
  descriptionId: number,
  marketplace: Marketplace,
  isVariant: boolean,
): Promise<void> {
  await logProductDescriptionActivity({
    type: 'description_generated',
    productId,
    descriptionId,
    metadata: {
      marketplace,
      isVariant,
    },
  });
}

/**
 * Log compliance status change
 */
export async function logComplianceChange(
  descriptionId: number,
  newStatus: 'APPROVED' | 'FLAGGED' | 'REQUIRES_REVIEW',
  violations?: string[],
): Promise<void> {
  const description = await prisma.productDescription.findUnique({
    where: { id: descriptionId },
    select: { productId: true },
  });

  if (!description) return;

  const activityType =
    newStatus === 'APPROVED' ? 'compliance_approved' : 'compliance_flagged';

  await logProductDescriptionActivity({
    type: activityType,
    productId: description.productId,
    descriptionId,
    metadata: {
      newStatus,
      violations,
    },
  });
}

/**
 * Log translation
 */
export async function logTranslation(
  sourceDescriptionId: number,
  newDescriptionId: number,
  targetLanguage: string,
): Promise<void> {
  const description = await prisma.productDescription.findUnique({
    where: { id: sourceDescriptionId },
    select: { productId: true, language: true },
  });

  if (!description) return;

  await logProductDescriptionActivity({
    type: 'translated',
    productId: description.productId,
    descriptionId: newDescriptionId,
    metadata: {
      sourceDescriptionId,
      sourceLanguage: description.language,
      targetLanguage,
    },
  });
}

// ============================================================================
// ACCOUNT INTEGRATION
// ============================================================================

/**
 * Get product description stats for an account
 */
export async function getAccountProductStats(
  accountId: number,
): Promise<AccountProductStats | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, name: true },
  });

  if (!account) return null;

  // Get config for this account
  const config = await prisma.productDescriptionConfig.findFirst({
    where: { accountId },
  });

  if (!config) {
    return {
      accountId: account.id,
      accountName: account.name,
      totalProducts: 0,
      totalDescriptions: 0,
      avgSeoScore: 0,
      complianceStatus: {
        approved: 0,
        pending: 0,
        flagged: 0,
        requiresReview: 0,
      },
      recentActivity: [],
    };
  }

  // Get stats
  const [productCount, descriptionStats, complianceCounts, recentActivities] =
    await Promise.all([
      prisma.product.count({
        where: { configId: config.id, isActive: true },
      }),
      prisma.productDescription.aggregate({
        where: { product: { configId: config.id } },
        _count: true,
        _avg: { seoScore: true },
      }),
      prisma.productDescription.groupBy({
        by: ['complianceStatus'],
        where: { product: { configId: config.id } },
        _count: true,
      }),
      prisma.cRMActivity.findMany({
        where: {
          accountId,
          metadata: {
            path: ['source'],
            equals: 'product_descriptions',
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          subject: true,
          description: true,
          createdAt: true,
          metadata: true,
        },
      }),
    ]);

  // Build compliance status
  const complianceStatus = {
    approved: 0,
    pending: 0,
    flagged: 0,
    requiresReview: 0,
  };
  for (const c of complianceCounts) {
    switch (c.complianceStatus) {
      case 'APPROVED':
        complianceStatus.approved = c._count;
        break;
      case 'PENDING':
        complianceStatus.pending = c._count;
        break;
      case 'FLAGGED':
        complianceStatus.flagged = c._count;
        break;
      case 'REQUIRES_REVIEW':
        complianceStatus.requiresReview = c._count;
        break;
    }
  }

  return {
    accountId: account.id,
    accountName: account.name,
    totalProducts: productCount,
    totalDescriptions: descriptionStats._count,
    avgSeoScore: descriptionStats._avg.seoScore || 0,
    complianceStatus,
    recentActivity: recentActivities.map((a) => ({
      type:
        ((a.metadata as Record<string, unknown>)?.eventType as string) ||
        'unknown',
      description: a.description || a.subject || '',
      timestamp: a.createdAt,
    })),
  };
}

/**
 * Get accounts with product description configs
 */
export async function getAccountsWithProductDescriptions(): Promise<
  Array<{
    accountId: number;
    accountName: string;
    configId: number;
    productCount: number;
    lastActivity?: Date;
  }>
> {
  // Get configs that have an accountId set
  const configs = await prisma.productDescriptionConfig.findMany({
    where: {
      accountId: { not: undefined },
    },
  });

  // Get product counts and account info for each config
  const results: Array<{
    accountId: number;
    accountName: string;
    configId: number;
    productCount: number;
    lastActivity?: Date;
  }> = [];

  for (const config of configs) {
    const [productCount, account] = await Promise.all([
      prisma.product.count({ where: { configId: config.id } }),
      prisma.account.findUnique({
        where: { id: config.accountId },
        select: { id: true, name: true },
      }),
    ]);

    if (account) {
      results.push({
        accountId: account.id,
        accountName: account.name,
        configId: config.id,
        productCount,
        lastActivity: config.updatedAt,
      });
    }
  }

  return results;
}

/**
 * Link a product description config to an account
 */
export async function linkConfigToAccount(
  configId: number,
  accountId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Update config
    await prisma.productDescriptionConfig.update({
      where: { id: configId },
      data: { accountId },
    });

    // Log the linking activity
    await logProductDescriptionActivity({
      type: 'description_updated',
      accountId,
      metadata: {
        action: 'config_linked',
        configId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error linking config to account:', error);
    return {
      success: false,
      error: `Failed to link config: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// ACTIVITY TIMELINE
// ============================================================================

/**
 * Get product description activity timeline for an account
 */
export async function getProductDescriptionTimeline(
  accountId: number,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<{
  activities: Array<{
    id: number;
    type: string;
    subject: string;
    description: string;
    timestamp: Date;
    metadata: Record<string, unknown>;
  }>;
  total: number;
}> {
  const { limit = 50, offset = 0, startDate, endDate } = options;

  const where = {
    accountId,
    customFields: {
      path: ['source'],
      equals: 'product_descriptions',
    },
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  const [activities, total] = await Promise.all([
    prisma.cRMActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        subject: true,
        description: true,
        createdAt: true,
        metadata: true,
      },
    }),
    prisma.cRMActivity.count({ where }),
  ]);

  return {
    activities: activities.map((a) => ({
      id: a.id,
      type:
        ((a.metadata as Record<string, unknown>)?.eventType as string) ||
        'unknown',
      subject: a.subject || '',
      description: a.description || '',
      timestamp: a.createdAt,
      metadata: (a.metadata as Record<string, unknown>) || {},
    })),
    total,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapToActivityType(
  eventType: ProductDescriptionActivity['type'],
): CRMActivityType {
  // Map product description events to CRM activity types
  switch (eventType) {
    case 'description_generated':
    case 'description_updated':
    case 'bulk_job_started':
    case 'bulk_job_completed':
    case 'translated':
      return CRMActivityType.TASK;
    case 'compliance_flagged':
    case 'compliance_approved':
      return CRMActivityType.NOTE;
    case 'seo_optimized':
      return CRMActivityType.OTHER;
    default:
      return CRMActivityType.OTHER;
  }
}

function buildActivityDetails(activity: ProductDescriptionActivity): {
  subject: string;
  description: string;
} {
  switch (activity.type) {
    case 'description_generated':
      return {
        subject: 'Product Description Generated',
        description: `A new product description was generated${activity.metadata?.marketplace ? ` for ${activity.metadata.marketplace}` : ''}${activity.metadata?.isVariant ? ' (A/B test variant)' : ''}.`,
      };
    case 'description_updated':
      return {
        subject: 'Product Description Updated',
        description: 'An existing product description was modified.',
      };
    case 'bulk_job_started':
      return {
        subject: 'Bulk Generation Job Started',
        description: `A bulk description generation job was started${activity.metadata?.totalItems ? ` for ${activity.metadata.totalItems} products` : ''}.`,
      };
    case 'bulk_job_completed': {
      const stats = activity.metadata as {
        status?: string;
        successfulItems?: number;
        failedItems?: number;
      };
      return {
        subject: 'Bulk Generation Job Completed',
        description: `Bulk job completed. ${stats?.successfulItems || 0} successful, ${stats?.failedItems || 0} failed.`,
      };
    }
    case 'compliance_flagged':
      return {
        subject: 'Compliance Issue Detected',
        description: `A product description was flagged for compliance review${activity.metadata?.violations ? `: ${(activity.metadata.violations as string[]).join(', ')}` : ''}.`,
      };
    case 'compliance_approved':
      return {
        subject: 'Description Approved',
        description: 'A product description passed compliance review.',
      };
    case 'seo_optimized':
      return {
        subject: 'SEO Optimization Applied',
        description: 'A product description was optimized for SEO.',
      };
    case 'translated':
      return {
        subject: 'Description Translated',
        description: `A product description was translated${activity.metadata?.targetLanguage ? ` to ${activity.metadata.targetLanguage}` : ''}.`,
      };
    default:
      return {
        subject: 'Product Description Activity',
        description: 'A product description-related activity occurred.',
      };
  }
}
