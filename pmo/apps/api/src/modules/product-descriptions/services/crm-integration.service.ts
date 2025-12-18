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
import { ActivityType, ActivityStatus, Marketplace } from '@prisma/client';

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

    // Build activity details
    const { subject, description } = buildActivityDetails(activity);

    // Create CRM activity
    const crmActivity = await prisma.cRMActivity.create({
      data: {
        accountId,
        type: mapToActivityType(activity.type),
        subject,
        description,
        status: ActivityStatus.COMPLETED,
        completedAt: new Date(),
        // Store product description metadata in customFields
        customFields: {
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
          customFields: {
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
          customFields: true,
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
        ((a.customFields as Record<string, unknown>)?.eventType as string) ||
        'unknown',
      description: a.description || a.subject,
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
  const configs = await prisma.productDescriptionConfig.findMany({
    where: {
      accountId: { not: null },
    },
    include: {
      account: {
        select: { id: true, name: true },
      },
      _count: {
        select: { products: true },
      },
    },
  });

  return configs
    .filter((c) => c.account)
    .map((c) => ({
      accountId: c.account!.id,
      accountName: c.account!.name,
      configId: c.id,
      productCount: c._count.products,
      lastActivity: c.updatedAt,
    }));
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
        customFields: true,
      },
    }),
    prisma.cRMActivity.count({ where }),
  ]);

  return {
    activities: activities.map((a) => ({
      id: a.id,
      type:
        ((a.customFields as Record<string, unknown>)?.eventType as string) ||
        'unknown',
      subject: a.subject,
      description: a.description || '',
      timestamp: a.createdAt,
      metadata: (a.customFields as Record<string, unknown>) || {},
    })),
    total,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapToActivityType(
  eventType: ProductDescriptionActivity['type'],
): ActivityType {
  // Map product description events to CRM activity types
  switch (eventType) {
    case 'description_generated':
    case 'description_updated':
    case 'bulk_job_started':
    case 'bulk_job_completed':
    case 'translated':
      return ActivityType.TASK;
    case 'compliance_flagged':
    case 'compliance_approved':
      return ActivityType.NOTE;
    case 'seo_optimized':
      return ActivityType.OTHER;
    default:
      return ActivityType.OTHER;
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
