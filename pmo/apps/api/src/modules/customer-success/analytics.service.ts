/**
 * Customer Success Analytics Service
 *
 * Provides analytics and reporting for the Customer Success Platform.
 * Generates insights on portfolio health, trends, and performance metrics.
 */

import { SuccessPlanStatus } from '@prisma/client';
import prisma from '../../prisma/client';

export interface PortfolioAnalytics {
  healthDistribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
  healthTrend: Array<{
    date: string;
    avgScore: number;
    healthyCount: number;
    atRiskCount: number;
    criticalCount: number;
  }>;
  churnRiskAnalysis: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    avgChurnRisk: number;
  };
  expansionOpportunities: number;
}

export interface CTAAnalytics {
  totalCTAs: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  overdueCount: number;
  avgResolutionTime: number;
  completionRate: number;
  trendsLast30Days: Array<{
    date: string;
    created: number;
    completed: number;
  }>;
}

export interface CSMPerformanceMetrics {
  userId: number;
  userName: string;
  totalClients: number;
  avgHealthScore: number;
  ctasCompleted: number;
  ctasOverdue: number;
  successPlansActive: number;
  meetingsLast30Days: number;
}

export interface TimeToValueMetrics {
  avgOnboardingDays: number;
  avgFirstValueDays: number;
  avgTimeToHealthy: number;
  onboardingFunnel: {
    stage: string;
    count: number;
    avgDays: number;
  }[];
}

/**
 * Get portfolio-level analytics
 */
export async function getPortfolioAnalytics(
  days: number = 30,
): Promise<PortfolioAnalytics> {
  // Get current health distribution
  const healthScores = await prisma.customerHealthScore.findMany({
    where: { projectId: null },
    select: {
      category: true,
      overallScore: true,
      churnRisk: true,
      expansionPotential: true,
    },
  });

  const healthDistribution = {
    healthy: healthScores.filter((s) => s.category === 'HEALTHY').length,
    atRisk: healthScores.filter((s) => s.category === 'AT_RISK').length,
    critical: healthScores.filter((s) => s.category === 'CRITICAL').length,
  };

  // Get health trend over time
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const healthHistory = await prisma.healthScoreHistory.findMany({
    where: {
      snapshotDate: { gte: startDate },
    },
    select: {
      snapshotDate: true,
      overallScore: true,
      category: true,
    },
    orderBy: { snapshotDate: 'asc' },
  });

  // Group by date
  const trendByDate = new Map<
    string,
    { scores: number[]; healthy: number; atRisk: number; critical: number }
  >();

  for (const h of healthHistory) {
    const dateKey = h.snapshotDate.toISOString().split('T')[0];
    if (!trendByDate.has(dateKey)) {
      trendByDate.set(dateKey, {
        scores: [],
        healthy: 0,
        atRisk: 0,
        critical: 0,
      });
    }
    const entry = trendByDate.get(dateKey)!;
    entry.scores.push(h.overallScore);
    if (h.category === 'HEALTHY') entry.healthy++;
    else if (h.category === 'AT_RISK') entry.atRisk++;
    else entry.critical++;
  }

  const healthTrend = Array.from(trendByDate.entries()).map(([date, data]) => ({
    date,
    avgScore: Math.round(
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
    ),
    healthyCount: data.healthy,
    atRiskCount: data.atRisk,
    criticalCount: data.critical,
  }));

  // Churn risk analysis
  const churnRisks = healthScores
    .map((s) => s.churnRisk)
    .filter((r): r is number => r !== null);

  const churnRiskAnalysis = {
    highRisk: churnRisks.filter((r) => r >= 0.7).length,
    mediumRisk: churnRisks.filter((r) => r >= 0.3 && r < 0.7).length,
    lowRisk: churnRisks.filter((r) => r < 0.3).length,
    avgChurnRisk:
      churnRisks.length > 0
        ? Math.round(
            (churnRisks.reduce((a, b) => a + b, 0) / churnRisks.length) * 100,
          ) / 100
        : 0,
  };

  // Expansion opportunities
  const expansionOpportunities = healthScores.filter(
    (s) => (s.expansionPotential ?? 0) >= 0.5,
  ).length;

  return {
    healthDistribution,
    healthTrend,
    churnRiskAnalysis,
    expansionOpportunities,
  };
}

/**
 * Get CTA analytics
 */
export async function getCTAAnalytics(
  days: number = 30,
): Promise<CTAAnalytics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all CTAs
  const ctas = await prisma.cTA.findMany({
    select: {
      id: true,
      status: true,
      type: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      completedAt: true,
    },
  });

  // Status breakdown
  const byStatus: Record<string, number> = {};
  for (const cta of ctas) {
    byStatus[cta.status] = (byStatus[cta.status] || 0) + 1;
  }

  // Type breakdown
  const byType: Record<string, number> = {};
  for (const cta of ctas) {
    byType[cta.type] = (byType[cta.type] || 0) + 1;
  }

  // Priority breakdown
  const byPriority: Record<string, number> = {};
  for (const cta of ctas) {
    byPriority[cta.priority] = (byPriority[cta.priority] || 0) + 1;
  }

  // Overdue count
  const now = new Date();
  const overdueCount = ctas.filter(
    (cta) =>
      cta.dueDate &&
      cta.dueDate < now &&
      cta.status !== 'COMPLETED' &&
      cta.status !== 'CANCELLED',
  ).length;

  // Average resolution time (in hours)
  const completedCTAs = ctas.filter((cta) => cta.completedAt);
  const resolutionTimes = completedCTAs.map((cta) => {
    const start = cta.createdAt.getTime();
    const end = cta.completedAt!.getTime();
    return (end - start) / (1000 * 60 * 60); // hours
  });
  const avgResolutionTime =
    resolutionTimes.length > 0
      ? Math.round(
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length,
        )
      : 0;

  // Completion rate
  const completionRate =
    ctas.length > 0
      ? Math.round(
          (ctas.filter((c) => c.status === 'COMPLETED').length / ctas.length) *
            100,
        )
      : 0;

  // Trends last 30 days
  const trendsMap = new Map<string, { created: number; completed: number }>();

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    trendsMap.set(dateKey, { created: 0, completed: 0 });
  }

  for (const cta of ctas) {
    const createdKey = cta.createdAt.toISOString().split('T')[0];
    if (trendsMap.has(createdKey)) {
      trendsMap.get(createdKey)!.created++;
    }
    if (cta.completedAt) {
      const completedKey = cta.completedAt.toISOString().split('T')[0];
      if (trendsMap.has(completedKey)) {
        trendsMap.get(completedKey)!.completed++;
      }
    }
  }

  const trendsLast30Days = Array.from(trendsMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCTAs: ctas.length,
    byStatus,
    byType,
    byPriority,
    overdueCount,
    avgResolutionTime,
    completionRate,
    trendsLast30Days,
  };
}

/**
 * Get CSM performance metrics
 * Uses Success Plans and CTAs to determine CSM ownership since health scores don't have owners
 */
export async function getCSMPerformanceMetrics(): Promise<
  CSMPerformanceMetrics[]
> {
  // Get all users who own CTAs or success plans
  const users = await prisma.user.findMany({
    where: {
      OR: [{ ownedCTAs: { some: {} } }, { ownedSuccessPlans: { some: {} } }],
    },
    select: {
      id: true,
      name: true,
    },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const metrics: CSMPerformanceMetrics[] = [];

  for (const user of users) {
    // Get unique clients this user manages (via success plans)
    const successPlans = await prisma.successPlan.findMany({
      where: { ownerId: user.id },
      select: { clientId: true, status: true },
    });

    const uniqueClientIds = [...new Set(successPlans.map((sp) => sp.clientId))];

    // Get health scores for those clients
    const healthScores = await prisma.customerHealthScore.findMany({
      where: {
        clientId: { in: uniqueClientIds },
        projectId: null,
      },
      select: { overallScore: true },
    });

    const avgHealthScore =
      healthScores.length > 0
        ? Math.round(
            healthScores.reduce((sum, s) => sum + s.overallScore, 0) /
              healthScores.length,
          )
        : 0;

    // Get CTA stats
    const ctaStats = await prisma.cTA.groupBy({
      by: ['status'],
      where: { ownerId: user.id },
      _count: true,
    });

    const ctasCompleted =
      ctaStats.find((s) => s.status === 'COMPLETED')?._count ?? 0;

    const overdueCTAs = await prisma.cTA.count({
      where: {
        ownerId: user.id,
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    // Get active success plans
    const successPlansActive = successPlans.filter(
      (sp) => sp.status === SuccessPlanStatus.ACTIVE,
    ).length;

    // Get meetings in last 30 days for this user's clients
    const meetingsLast30Days = await prisma.meeting.count({
      where: {
        project: {
          clientId: { in: uniqueClientIds },
        },
        date: { gte: thirtyDaysAgo },
      },
    });

    metrics.push({
      userId: user.id,
      userName: user.name,
      totalClients: uniqueClientIds.length,
      avgHealthScore,
      ctasCompleted,
      ctasOverdue: overdueCTAs,
      successPlansActive,
      meetingsLast30Days,
    });
  }

  return metrics.sort((a, b) => b.avgHealthScore - a.avgHealthScore);
}

/**
 * Get time-to-value metrics
 */
export async function getTimeToValueMetrics(): Promise<TimeToValueMetrics> {
  // Get projects with their creation date and first "healthy" health score date
  const projects = await prisma.project.findMany({
    include: {
      client: {
        include: {
          healthScores: {
            where: { category: 'HEALTHY' },
            orderBy: { lastCalculatedAt: 'asc' },
            take: 1,
          },
        },
      },
    },
  });

  const onboardingTimes: number[] = [];
  const timeToHealthy: number[] = [];

  for (const project of projects) {
    const startDate = project.startDate || project.createdAt;

    // Time to healthy (if achieved)
    if (project.client.healthScores.length > 0) {
      const healthyDate = project.client.healthScores[0].lastCalculatedAt;
      const days = Math.floor(
        (healthyDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days >= 0) {
        timeToHealthy.push(days);
      }
    }

    // Onboarding time (from creation to first task completion)
    const firstCompletedTask = await prisma.task.findFirst({
      where: { projectId: project.id, status: 'DONE' },
      orderBy: { updatedAt: 'asc' },
    });

    if (firstCompletedTask) {
      const days = Math.floor(
        (firstCompletedTask.updatedAt.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (days >= 0) {
        onboardingTimes.push(days);
      }
    }
  }

  const avgOnboardingDays =
    onboardingTimes.length > 0
      ? Math.round(
          onboardingTimes.reduce((a, b) => a + b, 0) / onboardingTimes.length,
        )
      : 0;

  const avgTimeToHealthy =
    timeToHealthy.length > 0
      ? Math.round(
          timeToHealthy.reduce((a, b) => a + b, 0) / timeToHealthy.length,
        )
      : 0;

  // Simplified onboarding funnel
  const onboardingFunnel = [
    {
      stage: 'Project Created',
      count: projects.length,
      avgDays: 0,
    },
    {
      stage: 'First Task Completed',
      count: onboardingTimes.length,
      avgDays: avgOnboardingDays,
    },
    {
      stage: 'Healthy Status',
      count: timeToHealthy.length,
      avgDays: avgTimeToHealthy,
    },
  ];

  return {
    avgOnboardingDays,
    avgFirstValueDays: avgOnboardingDays, // Same as onboarding for now
    avgTimeToHealthy,
    onboardingFunnel,
  };
}

/**
 * Get dashboard summary metrics
 */
export async function getDashboardSummary(): Promise<{
  portfolioHealth: {
    avgScore: number;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
  };
  ctaMetrics: {
    open: number;
    overdue: number;
    completedThisWeek: number;
  };
  engagementMetrics: {
    totalContacts: number;
    champions: number;
    recentInteractions: number;
  };
  renewalMetrics: {
    upcomingRenewals: number;
    atRiskRenewals: number;
  };
}> {
  // Portfolio health
  const healthScores = await prisma.customerHealthScore.findMany({
    where: { projectId: null },
    select: { overallScore: true, scoreTrend: true, trendPercentage: true },
  });

  const avgScore =
    healthScores.length > 0
      ? Math.round(
          healthScores.reduce((sum, s) => sum + s.overallScore, 0) /
            healthScores.length,
        )
      : 0;

  const upCount = healthScores.filter((s) => s.scoreTrend === 'UP').length;
  const downCount = healthScores.filter((s) => s.scoreTrend === 'DOWN').length;
  const trend =
    upCount > downCount ? 'up' : downCount > upCount ? 'down' : 'stable';

  const trendPercents = healthScores
    .map((s) => s.trendPercentage)
    .filter((t): t is number => t !== null);
  const trendPercent =
    trendPercents.length > 0
      ? Math.round(
          trendPercents.reduce((a, b) => a + b, 0) / trendPercents.length,
        )
      : 0;

  // CTA metrics
  const ctaStats = await prisma.cTA.groupBy({
    by: ['status'],
    _count: true,
  });

  const openCTAs =
    (ctaStats.find((s) => s.status === 'OPEN')?._count ?? 0) +
    (ctaStats.find((s) => s.status === 'IN_PROGRESS')?._count ?? 0);

  const overdueCTAs = await prisma.cTA.count({
    where: {
      dueDate: { lt: new Date() },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const completedThisWeek = await prisma.cTA.count({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: weekAgo },
    },
  });

  // Engagement metrics
  const totalContacts = await prisma.contact.count();
  const champions = await prisma.contactEngagement.count({
    where: { isChampion: true },
  });

  const recentInteractions = await prisma.contactEngagement.count({
    where: { lastContactDate: { gte: weekAgo } },
  });

  // Renewal metrics (based on projects with upcoming renewal dates or end dates)
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const upcomingRenewals = await prisma.project.count({
    where: {
      OR: [
        {
          renewalDate: {
            gte: new Date(),
            lte: threeMonthsFromNow,
          },
        },
        {
          endDate: {
            gte: new Date(),
            lte: threeMonthsFromNow,
          },
        },
      ],
      status: 'IN_PROGRESS',
    },
  });

  const atRiskRenewals = await prisma.project.count({
    where: {
      OR: [
        {
          renewalDate: {
            gte: new Date(),
            lte: threeMonthsFromNow,
          },
        },
        {
          endDate: {
            gte: new Date(),
            lte: threeMonthsFromNow,
          },
        },
      ],
      status: 'IN_PROGRESS',
      client: {
        healthScores: {
          some: {
            category: { in: ['AT_RISK', 'CRITICAL'] },
          },
        },
      },
    },
  });

  return {
    portfolioHealth: { avgScore, trend, trendPercent },
    ctaMetrics: { open: openCTAs, overdue: overdueCTAs, completedThisWeek },
    engagementMetrics: { totalContacts, champions, recentInteractions },
    renewalMetrics: { upcomingRenewals, atRiskRenewals },
  };
}
