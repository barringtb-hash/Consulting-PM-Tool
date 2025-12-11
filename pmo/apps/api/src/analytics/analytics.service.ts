/**
 * Analytics Service
 *
 * Core analytics queries and metrics calculations.
 */

import { prisma } from '../prisma/client';
import type {
  DateRange,
  MetricDataPoint,
  SalesDashboardData,
  ActivityDashboardData,
  AccountDashboardData,
  TeamDashboardData,
} from './analytics.types';

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get date range for common periods.
 */
export function getDateRange(
  period:
    | 'TODAY'
    | 'YESTERDAY'
    | 'THIS_WEEK'
    | 'LAST_WEEK'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'THIS_YEAR'
    | 'CUSTOM',
  customRange?: DateRange,
): DateRange {
  const now = new Date();

  switch (period) {
    case 'TODAY':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: now,
      };
    case 'YESTERDAY': {
      const yesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
      );
      return {
        start: yesterday,
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }
    case 'THIS_WEEK': {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: now };
    }
    case 'LAST_WEEK': {
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      return { start: startOfLastWeek, end: endOfLastWeek };
    }
    case 'THIS_MONTH':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
    case 'LAST_MONTH':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case 'THIS_QUARTER': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterMonth, 1),
        end: now,
      };
    }
    case 'THIS_YEAR':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
      };
    case 'CUSTOM':
      if (!customRange) {
        throw new Error('Custom range required');
      }
      return customRange;
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
  }
}

// ============================================================================
// SALES DASHBOARD
// ============================================================================

/**
 * Get sales dashboard data.
 */
export async function getSalesDashboard(
  tenantId: string,
  dateRange: DateRange,
): Promise<SalesDashboardData> {
  const [pipelineData, dealMetrics, activityMetrics, trends] =
    await Promise.all([
      getPipelineMetrics(tenantId, dateRange),
      getDealMetrics(tenantId, dateRange),
      getActivityMetrics(tenantId, dateRange),
      getSalesTrends(tenantId, dateRange),
    ]);

  return {
    pipeline: pipelineData,
    deals: dealMetrics,
    activities: activityMetrics,
    trends,
  };
}

/**
 * Get pipeline metrics.
 */
async function getPipelineMetrics(tenantId: string, _dateRange: DateRange) {
  const opportunities = await prisma.opportunity.findMany({
    where: {
      tenantId,
      status: 'OPEN',
    },
    include: {
      stage: true,
    },
  });

  const total = opportunities.reduce(
    (sum: number, opp) => sum + (opp.amount || 0),
    0,
  );
  const weighted = opportunities.reduce(
    (sum: number, opp) => sum + (opp.weightedAmount || 0),
    0,
  );

  // Group by stage
  const byStage = new Map<string, { count: number; value: number }>();
  for (const opp of opportunities) {
    const stageName = opp.stage?.name || 'Unknown';
    const current = byStage.get(stageName) || { count: 0, value: 0 };
    current.count += 1;
    current.value += opp.amount || 0;
    byStage.set(stageName, current);
  }

  return {
    total,
    weighted,
    byStage: Array.from(byStage.entries()).map(([stage, data]) => ({
      stage,
      ...data,
    })),
  };
}

/**
 * Get deal metrics.
 */
async function getDealMetrics(tenantId: string, dateRange: DateRange) {
  const [open, won, lost] = await Promise.all([
    prisma.opportunity.count({
      where: { tenantId, status: 'OPEN' },
    }),
    prisma.opportunity.count({
      where: {
        tenantId,
        status: 'WON',
        closedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    prisma.opportunity.count({
      where: {
        tenantId,
        status: 'LOST',
        closedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
  ]);

  const wonDeals = await prisma.opportunity.findMany({
    where: {
      tenantId,
      status: 'WON',
      closedAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: { amount: true },
  });

  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((sum: number, d) => sum + (d.amount || 0), 0) /
        wonDeals.length
      : 0;

  const totalClosed = won + lost;
  const winRate = totalClosed > 0 ? (won / totalClosed) * 100 : 0;

  return {
    open,
    won,
    lost,
    avgDealSize,
    winRate,
  };
}

/**
 * Get activity metrics for sales dashboard.
 */
async function getActivityMetrics(tenantId: string, dateRange: DateRange) {
  const activities = await prisma.cRMActivity.findMany({
    where: {
      tenantId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: {
      type: true,
      status: true,
    },
  });

  const total = activities.length;
  const completed = activities.filter(
    (a: { type: string; status: string }) => a.status === 'COMPLETED',
  ).length;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  // Group by type
  const byType = new Map<string, number>();
  for (const activity of activities) {
    byType.set(activity.type, (byType.get(activity.type) || 0) + 1);
  }

  return {
    total,
    byType: Array.from(byType.entries()).map(([type, count]) => ({
      type,
      count,
    })),
    completionRate,
  };
}

/**
 * Get sales trends.
 */
async function getSalesTrends(tenantId: string, dateRange: DateRange) {
  // Generate daily data points
  const days = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const pipelineHistory: MetricDataPoint[] = [];
  const dealsClosedHistory: MetricDataPoint[] = [];
  const revenueHistory: MetricDataPoint[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(dateRange.start);
    date.setDate(date.getDate() + i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get pipeline value at end of day
    const pipelineValue = await prisma.opportunity.aggregate({
      where: {
        tenantId,
        status: 'OPEN',
        createdAt: { lte: nextDate },
      },
      _sum: { amount: true },
    });

    // Get deals closed that day
    const dealsClosedThatDay = await prisma.opportunity.count({
      where: {
        tenantId,
        status: 'WON',
        closedAt: { gte: date, lt: nextDate },
      },
    });

    // Get revenue that day
    const revenueThatDay = await prisma.opportunity.aggregate({
      where: {
        tenantId,
        status: 'WON',
        closedAt: { gte: date, lt: nextDate },
      },
      _sum: { amount: true },
    });

    pipelineHistory.push({ date, value: pipelineValue._sum.amount || 0 });
    dealsClosedHistory.push({ date, value: dealsClosedThatDay });
    revenueHistory.push({ date, value: revenueThatDay._sum.amount || 0 });
  }

  return {
    pipelineHistory,
    dealsClosedHistory,
    revenueHistory,
  };
}

// ============================================================================
// ACTIVITY DASHBOARD
// ============================================================================

/**
 * Get activity dashboard data.
 */
export async function getActivityDashboard(
  tenantId: string,
  dateRange: DateRange,
): Promise<ActivityDashboardData> {
  const now = new Date();

  // Summary metrics
  const [total, completed, overdue, upcoming] = await Promise.all([
    prisma.cRMActivity.count({
      where: {
        tenantId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    prisma.cRMActivity.count({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    prisma.cRMActivity.count({
      where: {
        tenantId,
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
    }),
    prisma.cRMActivity.count({
      where: {
        tenantId,
        status: 'PLANNED',
        dueDate: { gte: now },
      },
    }),
  ]);

  // By type
  const activitiesByType = await prisma.cRMActivity.groupBy({
    by: ['type'],
    where: {
      tenantId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    _count: true,
  });

  const byType = activitiesByType.map((a) => ({
    type: a.type,
    count: a._count,
    percentage: total > 0 ? (a._count / total) * 100 : 0,
  }));

  // By user
  const activitiesByUser = await prisma.cRMActivity.groupBy({
    by: ['ownerId'],
    where: {
      tenantId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    _count: true,
  });

  const userIds = activitiesByUser.map((a) => a.ownerId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const byUser = activitiesByUser.map((a) => ({
    userId: a.ownerId,
    userName: userMap.get(a.ownerId) || 'Unknown',
    count: a._count,
  }));

  // Trends (simplified)
  const trends = {
    dailyActivities: [] as MetricDataPoint[],
    completionRate: [] as MetricDataPoint[],
  };

  return {
    summary: {
      totalActivities: total,
      completedActivities: completed,
      overdueActivities: overdue,
      upcomingActivities: upcoming,
    },
    byType,
    byUser,
    trends,
  };
}

// ============================================================================
// ACCOUNT DASHBOARD
// ============================================================================

/**
 * Get account dashboard data.
 */
export async function getAccountDashboard(
  tenantId: string,
): Promise<AccountDashboardData> {
  // Summary
  const [totalAccounts, customers, prospects] = await Promise.all([
    prisma.account.count({ where: { tenantId } }),
    prisma.account.count({ where: { tenantId, type: 'CUSTOMER' } }),
    prisma.account.count({ where: { tenantId, type: 'PROSPECT' } }),
  ]);

  const avgHealthScore = await prisma.account.aggregate({
    where: { tenantId },
    _avg: { healthScore: true },
  });

  // By type
  const accountsByType = await prisma.account.groupBy({
    by: ['type'],
    where: { tenantId },
    _count: true,
  });

  const byType = accountsByType.map((a) => ({
    type: a.type,
    count: a._count,
  }));

  // By industry
  const accountsByIndustry = await prisma.account.groupBy({
    by: ['industry'],
    where: { tenantId, industry: { not: null } },
    _count: true,
  });

  const byIndustry = accountsByIndustry.map((a) => ({
    industry: a.industry || 'Unknown',
    count: a._count,
  }));

  // Health distribution
  const allAccounts = await prisma.account.findMany({
    where: { tenantId },
    select: { healthScore: true },
  });

  const healthRanges = [
    { range: '0-20', min: 0, max: 20, count: 0 },
    { range: '21-40', min: 21, max: 40, count: 0 },
    { range: '41-60', min: 41, max: 60, count: 0 },
    { range: '61-80', min: 61, max: 80, count: 0 },
    { range: '81-100', min: 81, max: 100, count: 0 },
  ];

  for (const account of allAccounts) {
    const score = account.healthScore || 50;
    const range = healthRanges.find((r) => score >= r.min && score <= r.max);
    if (range) range.count++;
  }

  const healthDistribution = healthRanges.map((r) => ({
    range: r.range,
    count: r.count,
  }));

  // At risk accounts
  const atRiskAccounts = await prisma.account.findMany({
    where: {
      tenantId,
      OR: [{ healthScore: { lt: 50 } }, { churnRisk: { gt: 0.5 } }],
    },
    select: {
      id: true,
      name: true,
      healthScore: true,
      churnRisk: true,
    },
    orderBy: { churnRisk: 'desc' },
    take: 10,
  });

  return {
    summary: {
      totalAccounts,
      customers,
      prospects,
      avgHealthScore: avgHealthScore._avg.healthScore || 0,
    },
    byType,
    byIndustry,
    healthDistribution,
    atRisk: atRiskAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      healthScore: a.healthScore || 0,
      churnRisk: a.churnRisk || 0,
    })),
  };
}

// ============================================================================
// TEAM DASHBOARD
// ============================================================================

/**
 * Get team dashboard data.
 */
export async function getTeamDashboard(
  tenantId: string,
  dateRange: DateRange,
): Promise<TeamDashboardData> {
  // Get all team members
  const tenantUsers = await prisma.tenantUser.findMany({
    where: { tenantId },
    include: { user: true },
  });

  // Leaderboard - deals won and revenue
  const leaderboardData: TeamDashboardData['leaderboard'] = [];

  for (const tu of tenantUsers) {
    const [dealsWon, revenue, activities, totalDeals] = await Promise.all([
      prisma.opportunity.count({
        where: {
          tenantId,
          ownerId: tu.userId,
          status: 'WON',
          closedAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),
      prisma.opportunity.aggregate({
        where: {
          tenantId,
          ownerId: tu.userId,
          status: 'WON',
          closedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _sum: { amount: true },
      }),
      prisma.cRMActivity.count({
        where: {
          tenantId,
          ownerId: tu.userId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),
      prisma.opportunity.count({
        where: {
          tenantId,
          ownerId: tu.userId,
          closedAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),
    ]);

    leaderboardData.push({
      userId: tu.userId,
      userName: tu.user.name || 'Unknown',
      dealsWon,
      revenue: revenue._sum.amount || 0,
      activities,
      winRate: totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0,
    });
  }

  // Sort leaderboard by revenue
  leaderboardData.sort((a, b) => b.revenue - a.revenue);

  // Activity metrics by user
  const activityMetrics: TeamDashboardData['activityMetrics'] = [];

  for (const tu of tenantUsers) {
    const activities = await prisma.cRMActivity.groupBy({
      by: ['type'],
      where: {
        tenantId,
        ownerId: tu.userId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: true,
    });

    const activityMap = new Map(activities.map((a) => [a.type, a._count]));

    activityMetrics.push({
      userId: tu.userId,
      userName: tu.user.name || 'Unknown',
      calls: activityMap.get('CALL') || 0,
      emails: activityMap.get('EMAIL') || 0,
      meetings: activityMap.get('MEETING') || 0,
      tasks: activityMap.get('TASK') || 0,
    });
  }

  return {
    leaderboard: leaderboardData,
    quotaAttainment: [], // Would need quota data in the schema
    activityMetrics,
  };
}

// ============================================================================
// GENERIC METRIC QUERIES
// ============================================================================

/**
 * Get metric value for a specific entity and aggregation.
 */
export async function getMetricValue(
  tenantId: string,
  entity: string,
  aggregation: 'COUNT' | 'SUM' | 'AVG',
  field?: string,
  filters?: Record<string, unknown>,
): Promise<number> {
  const where = { tenantId, ...filters };

  switch (entity) {
    case 'opportunities':
      if (aggregation === 'COUNT') {
        return prisma.opportunity.count({ where });
      }
      if (field) {
        const result = await prisma.opportunity.aggregate({
          where,
          _sum: aggregation === 'SUM' ? { [field]: true } : undefined,
          _avg: aggregation === 'AVG' ? { [field]: true } : undefined,
        } as Record<string, unknown>);
        return (result._sum?.[field] || result._avg?.[field] || 0) as number;
      }
      return 0;

    case 'accounts':
      if (aggregation === 'COUNT') {
        return prisma.account.count({ where });
      }
      return 0;

    case 'activities':
      if (aggregation === 'COUNT') {
        return prisma.cRMActivity.count({ where });
      }
      return 0;

    default:
      return 0;
  }
}
