/**
 * Tenant Health Monitoring Service
 *
 * Provides health metrics, usage tracking, and alerting for tenants.
 */

import { prisma } from '../prisma/client';
import { getTenantId } from '../tenant/tenant.context';

/**
 * Plan limits for different subscription tiers
 */
export const PLAN_LIMITS = {
  TRIAL: {
    maxUsers: 3,
    maxAccounts: 50,
    maxContacts: 100,
    maxOpportunities: 25,
    maxStorageMB: 100,
    maxApiCallsPerDay: 500,
  },
  STARTER: {
    maxUsers: 5,
    maxAccounts: 500,
    maxContacts: 1000,
    maxOpportunities: 100,
    maxStorageMB: 1000,
    maxApiCallsPerDay: 5000,
  },
  PROFESSIONAL: {
    maxUsers: 25,
    maxAccounts: 5000,
    maxContacts: 10000,
    maxOpportunities: 1000,
    maxStorageMB: 10000,
    maxApiCallsPerDay: 50000,
  },
  ENTERPRISE: {
    maxUsers: -1, // Unlimited
    maxAccounts: -1,
    maxContacts: -1,
    maxOpportunities: -1,
    maxStorageMB: -1,
    maxApiCallsPerDay: -1,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export interface HealthAlert {
  type: 'warning' | 'critical';
  category: 'usage' | 'engagement' | 'billing' | 'security';
  message: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
}

export interface UsageMetrics {
  users: {
    total: number;
    active: number;
    limit: number;
    percentage: number;
  };
  accounts: {
    total: number;
    limit: number;
    percentage: number;
  };
  contacts: {
    total: number;
    limit: number;
    percentage: number;
  };
  opportunities: {
    total: number;
    limit: number;
    percentage: number;
  };
  storage: {
    usedMB: number;
    limitMB: number;
    percentage: number;
  };
  apiCalls: {
    today: number;
    thisMonth: number;
    dailyLimit: number;
    percentage: number;
  };
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  lastActivityAt: Date | null;
  activitiesCreatedThisWeek: number;
  opportunitiesUpdatedThisWeek: number;
}

export interface TenantHealthSummary {
  tenantId: string;
  tenantName: string;
  plan: string;
  status: string;
  healthScore: number;
  usage: UsageMetrics;
  engagement: EngagementMetrics;
  alerts: HealthAlert[];
  recordedAt: Date;
}

/**
 * Calculate percentage with limit handling
 */
function calculatePercentage(current: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return current > 0 ? 100 : 0;
  return Math.round((current / limit) * 100);
}

/**
 * Get plan limits for a tenant
 */
function getPlanLimits(plan: string): (typeof PLAN_LIMITS)[PlanType] {
  const planKey = plan.toUpperCase() as PlanType;
  return PLAN_LIMITS[planKey] || PLAN_LIMITS.TRIAL;
}

/**
 * Get comprehensive health summary for a tenant
 */
export async function getTenantHealth(
  tenantId?: string,
): Promise<TenantHealthSummary> {
  const effectiveTenantId = tenantId || getTenantId();

  if (!effectiveTenantId) {
    throw new Error('Tenant ID is required');
  }

  // Fetch tenant info
  const tenant = await prisma.tenant.findUnique({
    where: { id: effectiveTenantId },
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const limits = getPlanLimits(tenant.plan);

  // Gather usage metrics
  const [
    accountCount,
    contactCount,
    opportunityCount,
    recentActivities,
    recentOpportunityUpdates,
  ] = await Promise.all([
    prisma.account.count({ where: { tenantId: effectiveTenantId } }),
    prisma.cRMContact.count({ where: { tenantId: effectiveTenantId } }),
    prisma.opportunity.count({ where: { tenantId: effectiveTenantId } }),
    // Activities created this week
    prisma.cRMActivity.count({
      where: {
        tenantId: effectiveTenantId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Opportunities updated this week
    prisma.opportunity.count({
      where: {
        tenantId: effectiveTenantId,
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  // Get latest health metrics record for API calls and user activity
  const latestMetrics = await prisma.tenantHealthMetrics.findFirst({
    where: { tenantId: effectiveTenantId },
    orderBy: { recordedAt: 'desc' },
  });

  // Calculate active users (users with activity in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get user IDs from audit logs for activity tracking
  const [dailyActiveUserIds, weeklyActiveUserIds, monthlyActiveUserIds] =
    await Promise.all([
      prisma.auditLog
        .findMany({
          where: {
            tenantId: effectiveTenantId,
            createdAt: { gte: oneDayAgo },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((logs) => logs.map((l) => l.userId)),
      prisma.auditLog
        .findMany({
          where: {
            tenantId: effectiveTenantId,
            createdAt: { gte: sevenDaysAgo },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((logs) => logs.map((l) => l.userId)),
      prisma.auditLog
        .findMany({
          where: {
            tenantId: effectiveTenantId,
            createdAt: { gte: thirtyDaysAgo },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((logs) => logs.map((l) => l.userId)),
    ]);

  // Get last activity timestamp
  const lastActivity = await prisma.auditLog.findFirst({
    where: { tenantId: effectiveTenantId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const totalUsers = tenant.users.length;
  const activeUsers = monthlyActiveUserIds.length;

  // Build usage metrics
  const usage: UsageMetrics = {
    users: {
      total: totalUsers,
      active: activeUsers,
      limit: limits.maxUsers,
      percentage: calculatePercentage(totalUsers, limits.maxUsers),
    },
    accounts: {
      total: accountCount,
      limit: limits.maxAccounts,
      percentage: calculatePercentage(accountCount, limits.maxAccounts),
    },
    contacts: {
      total: contactCount,
      limit: limits.maxContacts,
      percentage: calculatePercentage(contactCount, limits.maxContacts),
    },
    opportunities: {
      total: opportunityCount,
      limit: limits.maxOpportunities,
      percentage: calculatePercentage(
        opportunityCount,
        limits.maxOpportunities,
      ),
    },
    storage: {
      usedMB: latestMetrics?.storageUsedMB || 0,
      limitMB: limits.maxStorageMB,
      percentage: calculatePercentage(
        latestMetrics?.storageUsedMB || 0,
        limits.maxStorageMB,
      ),
    },
    apiCalls: {
      today: latestMetrics?.apiCallsToday || 0,
      thisMonth: latestMetrics?.apiCallsMonth || 0,
      dailyLimit: limits.maxApiCallsPerDay,
      percentage: calculatePercentage(
        latestMetrics?.apiCallsToday || 0,
        limits.maxApiCallsPerDay,
      ),
    },
  };

  // Build engagement metrics
  const engagement: EngagementMetrics = {
    dailyActiveUsers: dailyActiveUserIds.length,
    weeklyActiveUsers: weeklyActiveUserIds.length,
    monthlyActiveUsers: monthlyActiveUserIds.length,
    avgSessionDuration: 0, // Would require session tracking
    lastActivityAt: lastActivity?.createdAt || null,
    activitiesCreatedThisWeek: recentActivities,
    opportunitiesUpdatedThisWeek: recentOpportunityUpdates,
  };

  // Generate alerts
  const alerts: HealthAlert[] = [];

  // Usage alerts
  if (usage.users.percentage >= 90 && limits.maxUsers !== -1) {
    alerts.push({
      type: usage.users.percentage >= 100 ? 'critical' : 'warning',
      category: 'usage',
      message: `User limit almost reached (${usage.users.total}/${usage.users.limit})`,
      metric: 'users',
      currentValue: usage.users.total,
      threshold: usage.users.limit,
    });
  }

  if (usage.accounts.percentage >= 80 && limits.maxAccounts !== -1) {
    alerts.push({
      type: usage.accounts.percentage >= 95 ? 'critical' : 'warning',
      category: 'usage',
      message: `Account limit approaching (${usage.accounts.total}/${usage.accounts.limit})`,
      metric: 'accounts',
      currentValue: usage.accounts.total,
      threshold: usage.accounts.limit,
    });
  }

  if (usage.storage.percentage >= 80 && limits.maxStorageMB !== -1) {
    alerts.push({
      type: usage.storage.percentage >= 95 ? 'critical' : 'warning',
      category: 'usage',
      message: `Storage limit approaching (${usage.storage.usedMB}MB/${usage.storage.limitMB}MB)`,
      metric: 'storage',
      currentValue: usage.storage.usedMB,
      threshold: usage.storage.limitMB,
    });
  }

  if (usage.apiCalls.percentage >= 80 && limits.maxApiCallsPerDay !== -1) {
    alerts.push({
      type: usage.apiCalls.percentage >= 95 ? 'critical' : 'warning',
      category: 'usage',
      message: `Daily API limit approaching (${usage.apiCalls.today}/${usage.apiCalls.dailyLimit})`,
      metric: 'apiCalls',
      currentValue: usage.apiCalls.today,
      threshold: usage.apiCalls.dailyLimit,
    });
  }

  // Engagement alerts
  if (engagement.dailyActiveUsers === 0 && totalUsers > 0) {
    alerts.push({
      type: 'warning',
      category: 'engagement',
      message: 'No user activity in the last 24 hours',
    });
  }

  if (
    engagement.lastActivityAt &&
    Date.now() - engagement.lastActivityAt.getTime() > 7 * 24 * 60 * 60 * 1000
  ) {
    alerts.push({
      type: 'critical',
      category: 'engagement',
      message: 'No tenant activity in over a week',
    });
  }

  // Calculate health score (0-100)
  const healthScore = calculateHealthScore(usage, engagement, totalUsers);

  return {
    tenantId: effectiveTenantId,
    tenantName: tenant.name,
    plan: tenant.plan,
    status: tenant.status,
    healthScore,
    usage,
    engagement,
    alerts,
    recordedAt: new Date(),
  };
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(
  usage: UsageMetrics,
  engagement: EngagementMetrics,
  totalUsers: number,
): number {
  let score = 100;

  // Deduct for high usage (approaching limits)
  if (usage.users.percentage > 90) score -= 15;
  else if (usage.users.percentage > 75) score -= 5;

  if (usage.accounts.percentage > 90) score -= 10;
  else if (usage.accounts.percentage > 75) score -= 3;

  if (usage.storage.percentage > 90) score -= 15;
  else if (usage.storage.percentage > 75) score -= 5;

  if (usage.apiCalls.percentage > 90) score -= 15;
  else if (usage.apiCalls.percentage > 75) score -= 5;

  // Deduct for low engagement
  if (totalUsers > 0) {
    const engagementRate = engagement.monthlyActiveUsers / totalUsers;
    if (engagementRate < 0.2) score -= 20;
    else if (engagementRate < 0.5) score -= 10;
    else if (engagementRate < 0.7) score -= 5;
  }

  // Deduct for inactivity
  if (engagement.lastActivityAt) {
    const daysSinceActivity =
      (Date.now() - engagement.lastActivityAt.getTime()) /
      (24 * 60 * 60 * 1000);
    if (daysSinceActivity > 14) score -= 25;
    else if (daysSinceActivity > 7) score -= 15;
    else if (daysSinceActivity > 3) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Record health metrics snapshot (call from cron job)
 */
export async function recordHealthMetrics(tenantId: string): Promise<void> {
  // Get current counts
  const [
    accountCount,
    contactCount,
    opportunityCount,
    activityCount,
    documentsCount,
    userCount,
  ] = await Promise.all([
    prisma.account.count({ where: { tenantId } }),
    prisma.cRMContact.count({ where: { tenantId } }),
    prisma.opportunity.count({ where: { tenantId } }),
    prisma.cRMActivity.count({ where: { tenantId } }),
    // AnalyzedDocument doesn't have tenantId directly - query through config.account
    prisma.analyzedDocument.count({
      where: { config: { account: { tenantId } } },
    }),
    prisma.tenantUser.count({ where: { tenantId } }),
  ]);

  // Get active user counts
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dailyActive, weeklyActive] = await Promise.all([
    prisma.auditLog
      .findMany({
        where: {
          tenantId,
          createdAt: { gte: oneDayAgo },
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((logs) => logs.length),
    prisma.auditLog
      .findMany({
        where: {
          tenantId,
          createdAt: { gte: sevenDaysAgo },
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((logs) => logs.length),
  ]);

  // Get last activity
  const lastActivity = await prisma.auditLog.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  // Get previous metrics for API call tracking
  const previousMetrics = await prisma.tenantHealthMetrics.findFirst({
    where: { tenantId },
    orderBy: { recordedAt: 'desc' },
  });

  // Create new metrics record
  await prisma.tenantHealthMetrics.create({
    data: {
      tenantId,
      activeUsers: dailyActive,
      totalUsers: userCount,
      accountCount,
      contactCount,
      opportunityCount,
      activityCount,
      storageUsedMB: previousMetrics?.storageUsedMB || 0,
      documentsCount,
      apiCallsToday: 0, // Reset daily counter
      apiCallsMonth:
        new Date().getDate() === 1 ? 0 : previousMetrics?.apiCallsMonth || 0,
      dailyActiveUsers: dailyActive,
      weeklyActiveUsers: weeklyActive,
      lastActivityAt: lastActivity?.createdAt,
    },
  });
}

/**
 * Get health metrics history for a tenant
 */
export async function getHealthHistory(
  tenantId?: string,
  days: number = 30,
): Promise<
  {
    recordedAt: Date;
    activeUsers: number;
    totalUsers: number;
    accountCount: number;
    contactCount: number;
    opportunityCount: number;
    apiCallsToday: number;
  }[]
> {
  const effectiveTenantId = tenantId || getTenantId();

  if (!effectiveTenantId) {
    throw new Error('Tenant ID is required');
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const metrics = await prisma.tenantHealthMetrics.findMany({
    where: {
      tenantId: effectiveTenantId,
      recordedAt: { gte: startDate },
    },
    orderBy: { recordedAt: 'asc' },
    select: {
      recordedAt: true,
      activeUsers: true,
      totalUsers: true,
      accountCount: true,
      contactCount: true,
      opportunityCount: true,
      apiCallsToday: true,
    },
  });

  return metrics;
}

/**
 * Increment API call counter for tenant
 */
export async function incrementApiCalls(tenantId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find or create today's metrics record
  const existingMetrics = await prisma.tenantHealthMetrics.findFirst({
    where: {
      tenantId,
      recordedAt: { gte: today },
    },
    orderBy: { recordedAt: 'desc' },
  });

  if (existingMetrics) {
    await prisma.tenantHealthMetrics.update({
      where: { id: existingMetrics.id },
      data: {
        apiCallsToday: { increment: 1 },
        apiCallsMonth: { increment: 1 },
      },
    });
  }
}

/**
 * Get all tenants' health summaries (for admin dashboard)
 *
 * OPTIMIZED: Batch fetches all tenant data in a few queries instead of
 * calling getTenantHealth() per tenant which executed 11+ queries each.
 * For 10 tenants, this reduces queries from 110+ to ~8.
 */
export async function getAllTenantsHealth(): Promise<
  {
    tenantId: string;
    tenantName: string;
    plan: string;
    status: string;
    healthScore: number;
    alertCount: number;
    lastActivityAt: Date | null;
  }[]
> {
  // BATCH QUERY 1: Get all active tenants with user counts
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      plan: true,
      status: true,
      users: { select: { id: true } },
    },
  });

  if (tenants.length === 0) {
    return [];
  }

  const tenantIds = tenants.map((t) => t.id);

  // BATCH QUERY 2: Get entity counts grouped by tenant
  const [accountCounts, contactCounts, opportunityCounts] = await Promise.all([
    prisma.account.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.cRMContact.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.opportunity.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
  ]);

  // Create lookup maps for entity counts
  const accountCountMap = new Map(
    accountCounts.map((c) => [c.tenantId, c._count]),
  );
  const contactCountMap = new Map(
    contactCounts.map((c) => [c.tenantId, c._count]),
  );
  const opportunityCountMap = new Map(
    opportunityCounts.map((c) => [c.tenantId, c._count]),
  );

  // BATCH QUERY 3: Get latest health metrics for all tenants
  // Using a subquery approach to get the most recent per tenant
  const latestMetrics = await prisma.tenantHealthMetrics.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { recordedAt: 'desc' },
    distinct: ['tenantId'],
  });
  const metricsMap = new Map(latestMetrics.map((m) => [m.tenantId, m]));

  // BATCH QUERY 4: Get active user counts from audit logs (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch distinct user counts per tenant
  const activeUsersByTenant = await prisma.auditLog.findMany({
    where: {
      tenantId: { in: tenantIds },
      createdAt: { gte: thirtyDaysAgo },
      userId: { not: null },
    },
    select: { tenantId: true, userId: true },
    distinct: ['tenantId', 'userId'],
  });

  // Count unique users per tenant
  const activeUserCountMap = new Map<string, number>();
  for (const entry of activeUsersByTenant) {
    if (entry.tenantId) {
      const current = activeUserCountMap.get(entry.tenantId) ?? 0;
      activeUserCountMap.set(entry.tenantId, current + 1);
    }
  }

  // BATCH QUERY 5: Get last activity per tenant
  const lastActivities = await prisma.auditLog.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { createdAt: 'desc' },
    distinct: ['tenantId'],
    select: { tenantId: true, createdAt: true },
  });
  const lastActivityMap = new Map(
    lastActivities.map((a) => [a.tenantId, a.createdAt]),
  );

  // Build results in-memory (no more queries)
  const summaries = tenants.map((tenant) => {
    const limits = getPlanLimits(tenant.plan);
    const totalUsers = tenant.users.length;
    const activeCount = activeUserCountMap.get(tenant.id) ?? 0;
    const accountCount = accountCountMap.get(tenant.id) ?? 0;
    const contactCount = contactCountMap.get(tenant.id) ?? 0;
    const opportunityCount = opportunityCountMap.get(tenant.id) ?? 0;
    const metrics = metricsMap.get(tenant.id);
    const lastActivityAt = lastActivityMap.get(tenant.id) ?? null;

    // Build usage metrics for health score calculation
    const usage: UsageMetrics = {
      users: {
        total: totalUsers,
        active: activeCount,
        limit: limits.maxUsers,
        percentage: calculatePercentage(totalUsers, limits.maxUsers),
      },
      accounts: {
        total: accountCount,
        limit: limits.maxAccounts,
        percentage: calculatePercentage(accountCount, limits.maxAccounts),
      },
      contacts: {
        total: contactCount,
        limit: limits.maxContacts,
        percentage: calculatePercentage(contactCount, limits.maxContacts),
      },
      opportunities: {
        total: opportunityCount,
        limit: limits.maxOpportunities,
        percentage: calculatePercentage(
          opportunityCount,
          limits.maxOpportunities,
        ),
      },
      storage: {
        usedMB: metrics?.storageUsedMB ?? 0,
        limitMB: limits.maxStorageMB,
        percentage: calculatePercentage(
          metrics?.storageUsedMB ?? 0,
          limits.maxStorageMB,
        ),
      },
      apiCalls: {
        today: metrics?.apiCallsToday ?? 0,
        thisMonth: metrics?.apiCallsMonth ?? 0,
        dailyLimit: limits.maxApiCallsPerDay,
        percentage: calculatePercentage(
          metrics?.apiCallsToday ?? 0,
          limits.maxApiCallsPerDay,
        ),
      },
    };

    // Build minimal engagement metrics for health score
    const engagement: EngagementMetrics = {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: activeCount,
      avgSessionDuration: 0,
      lastActivityAt,
      activitiesCreatedThisWeek: 0,
      opportunitiesUpdatedThisWeek: 0,
    };

    // Calculate health score
    const healthScore = calculateHealthScore(usage, engagement, totalUsers);

    // Count alerts
    let alertCount = 0;
    if (usage.users.percentage >= 90 && limits.maxUsers !== -1) alertCount++;
    if (usage.accounts.percentage >= 80 && limits.maxAccounts !== -1)
      alertCount++;
    if (usage.storage.percentage >= 80 && limits.maxStorageMB !== -1)
      alertCount++;
    if (usage.apiCalls.percentage >= 80 && limits.maxApiCallsPerDay !== -1)
      alertCount++;
    if (activeCount === 0 && totalUsers > 0) alertCount++;
    if (
      lastActivityAt &&
      Date.now() - lastActivityAt.getTime() > 7 * 24 * 60 * 60 * 1000
    ) {
      alertCount++;
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      healthScore,
      alertCount,
      lastActivityAt,
    };
  });

  return summaries;
}
