/**
 * Account Health Score Service
 *
 * Provides health scoring functionality for Accounts in the CRM.
 * Implements a weighted scoring system similar to Gainsight's health scoring.
 * Replaces the legacy CustomerHealthScore service with Account-centric approach.
 *
 * Scoring Dimensions:
 * - Usage Score (default 40%): Product adoption, feature usage, login frequency
 * - Support Score (default 25%): Ticket volume, resolution time, escalations
 * - Engagement Score (default 20%): Meeting attendance, response time, executive involvement
 * - Sentiment Score (default 15%): NPS, CSAT, conversation sentiment
 * - Financial Score (optional): Payment history, ARR changes
 */

import { Prisma, HealthScoreCategory } from '@prisma/client';
import prisma from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

export interface AccountHealthScoreInput {
  accountId: number;
  usageScore?: number;
  supportScore?: number;
  engagementScore?: number;
  sentimentScore?: number;
  financialScore?: number;
  usageWeight?: number;
  supportWeight?: number;
  engagementWeight?: number;
  sentimentWeight?: number;
  financialWeight?: number;
  calculationNotes?: string;
}

export interface AccountHealthScoreResult {
  id: number;
  accountId: number;
  tenantId: string;
  overallScore: number;
  category: HealthScoreCategory;
  usageScore: number | null;
  supportScore: number | null;
  engagementScore: number | null;
  sentimentScore: number | null;
  financialScore: number | null;
  churnRisk: number | null;
  expansionPotential: number | null;
  scoreTrend: string | null;
  trendPercentage: number | null;
  calculatedAt: Date;
}

export interface HealthScoreHistoryItem {
  date: Date;
  score: number;
  category: HealthScoreCategory;
  usageScore: number | null;
  supportScore: number | null;
  engagementScore: number | null;
  sentimentScore: number | null;
  financialScore: number | null;
}

/**
 * Calculate health score category based on overall score
 */
function getHealthCategory(score: number): HealthScoreCategory {
  if (score >= 71) return 'HEALTHY';
  if (score >= 31) return 'AT_RISK';
  return 'CRITICAL';
}

/**
 * Calculate weighted overall score from dimension scores
 */
function calculateOverallScore(
  usageScore: number | null,
  supportScore: number | null,
  engagementScore: number | null,
  sentimentScore: number | null,
  financialScore: number | null,
  weights: {
    usage: number;
    support: number;
    engagement: number;
    sentiment: number;
    financial: number;
  },
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  if (usageScore !== null && weights.usage > 0) {
    weightedSum += usageScore * weights.usage;
    totalWeight += weights.usage;
  }
  if (supportScore !== null && weights.support > 0) {
    weightedSum += supportScore * weights.support;
    totalWeight += weights.support;
  }
  if (engagementScore !== null && weights.engagement > 0) {
    weightedSum += engagementScore * weights.engagement;
    totalWeight += weights.engagement;
  }
  if (sentimentScore !== null && weights.sentiment > 0) {
    weightedSum += sentimentScore * weights.sentiment;
    totalWeight += weights.sentiment;
  }
  if (financialScore !== null && weights.financial > 0) {
    weightedSum += financialScore * weights.financial;
    totalWeight += weights.financial;
  }

  if (totalWeight === 0) return 50; // Default score if no dimensions available

  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate churn risk based on health score and trends
 * Returns a probability between 0 and 1
 */
function calculateChurnRisk(
  overallScore: number,
  previousScore: number | null,
): number {
  // Base risk from score
  let risk = (100 - overallScore) / 100;

  // Amplify risk if score is declining
  if (previousScore !== null && overallScore < previousScore) {
    const decline = (previousScore - overallScore) / 100;
    risk = Math.min(1, risk + decline * 0.5);
  }

  return Math.round(risk * 100) / 100;
}

/**
 * Calculate expansion potential based on health score
 */
function calculateExpansionPotential(overallScore: number): number {
  if (overallScore >= 80) return 0.8;
  if (overallScore >= 70) return 0.5;
  if (overallScore >= 60) return 0.3;
  return 0.1;
}

/**
 * Get current health score for an account
 */
export async function getAccountHealthScore(
  accountId: number,
): Promise<AccountHealthScoreResult | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      tenantId: true,
      healthScore: true,
      engagementScore: true,
      churnRisk: true,
    },
  });

  if (!account) return null;

  // Get the most recent health score history for full dimension breakdown
  const latestHistory = await prisma.accountHealthScoreHistory.findFirst({
    where: { accountId },
    orderBy: { calculatedAt: 'desc' },
  });

  return {
    id: latestHistory?.id ?? 0,
    accountId,
    tenantId: account.tenantId,
    overallScore: account.healthScore ?? 50,
    category: getHealthCategory(account.healthScore ?? 50),
    usageScore: latestHistory?.usageScore ?? null,
    supportScore: latestHistory?.supportScore ?? null,
    engagementScore:
      latestHistory?.engagementScore ?? account.engagementScore ?? null,
    sentimentScore: latestHistory?.sentimentScore ?? null,
    financialScore: latestHistory?.financialScore ?? null,
    churnRisk: account.churnRisk ?? latestHistory?.churnRisk ?? null,
    expansionPotential: latestHistory?.expansionPotential ?? null,
    scoreTrend: latestHistory?.scoreTrend ?? null,
    trendPercentage: latestHistory?.trendPercentage ?? null,
    calculatedAt: latestHistory?.calculatedAt ?? new Date(),
  };
}

/**
 * Calculate and update health score for an account
 */
export async function calculateAccountHealthScore(
  input: AccountHealthScoreInput,
): Promise<AccountHealthScoreResult> {
  const { accountId } = input;

  // Get account and tenant context
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { tenantId: true, healthScore: true },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const tenantId = account.tenantId;
  const previousScore = account.healthScore ?? null;

  // Use provided weights or defaults
  const weights = {
    usage: input.usageWeight ?? 40,
    support: input.supportWeight ?? 25,
    engagement: input.engagementWeight ?? 20,
    sentiment: input.sentimentWeight ?? 15,
    financial: input.financialWeight ?? 0,
  };

  // Calculate overall score
  const overallScore = calculateOverallScore(
    input.usageScore ?? null,
    input.supportScore ?? null,
    input.engagementScore ?? null,
    input.sentimentScore ?? null,
    input.financialScore ?? null,
    weights,
  );

  const category = getHealthCategory(overallScore);
  const churnRisk = calculateChurnRisk(overallScore, previousScore);
  const expansionPotential = calculateExpansionPotential(overallScore);

  // Calculate trend
  let scoreTrend: string | null = null;
  let trendPercentage: number | null = null;

  if (previousScore !== null) {
    const diff = overallScore - previousScore;
    trendPercentage =
      previousScore > 0 ? Math.round((diff / previousScore) * 100) : 0;
    if (diff > 0) scoreTrend = 'UP';
    else if (diff < 0) scoreTrend = 'DOWN';
    else scoreTrend = 'STABLE';
  }

  // Update Account's health fields
  await prisma.account.update({
    where: { id: accountId },
    data: {
      healthScore: overallScore,
      engagementScore: input.engagementScore ?? undefined,
      churnRisk,
    },
  });

  // Create history snapshot
  const historyRecord = await prisma.accountHealthScoreHistory.create({
    data: {
      tenantId,
      accountId,
      overallScore,
      category,
      usageScore: input.usageScore ?? null,
      supportScore: input.supportScore ?? null,
      engagementScore: input.engagementScore ?? null,
      sentimentScore: input.sentimentScore ?? null,
      financialScore: input.financialScore ?? null,
      usageWeight: weights.usage,
      supportWeight: weights.support,
      engagementWeight: weights.engagement,
      sentimentWeight: weights.sentiment,
      financialWeight: weights.financial,
      previousScore,
      scoreTrend,
      trendPercentage,
      churnRisk,
      expansionPotential,
      calculationNotes: input.calculationNotes,
    },
  });

  return {
    id: historyRecord.id,
    accountId,
    tenantId,
    overallScore,
    category,
    usageScore: input.usageScore ?? null,
    supportScore: input.supportScore ?? null,
    engagementScore: input.engagementScore ?? null,
    sentimentScore: input.sentimentScore ?? null,
    financialScore: input.financialScore ?? null,
    churnRisk,
    expansionPotential,
    scoreTrend,
    trendPercentage,
    calculatedAt: historyRecord.calculatedAt,
  };
}

/**
 * Auto-calculate health score based on available data
 * Uses CRM activities, opportunities, and other Account data
 */
export async function autoCalculateAccountHealthScore(
  accountId: number,
): Promise<AccountHealthScoreResult> {
  // Run all score calculations in parallel
  const [engagementScore, supportScore, sentimentScore, usageScore] =
    await Promise.all([
      calculateEngagementScoreFromAccountData(accountId),
      calculateSupportScoreFromAccountData(accountId),
      calculateSentimentScoreFromAccountData(accountId),
      calculateUsageScoreFromAccountData(accountId),
    ]);

  return calculateAccountHealthScore({
    accountId,
    usageScore,
    supportScore,
    engagementScore,
    sentimentScore,
    calculationNotes: 'Auto-calculated from CRM data',
  });
}

/**
 * Calculate engagement score from CRM activities and meetings
 */
async function calculateEngagementScoreFromAccountData(
  accountId: number,
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count CRM activities in last 30 days
  const activitiesCount = await prisma.cRMActivity.count({
    where: {
      accountId,
      createdAt: { gte: thirtyDaysAgo },
      type: { in: ['MEETING', 'CALL', 'EMAIL'] },
    },
  });

  // Score based on activity frequency
  if (activitiesCount >= 10) return 90;
  if (activitiesCount >= 5) return 70;
  if (activitiesCount >= 2) return 50;
  if (activitiesCount >= 1) return 35;
  return 20;
}

/**
 * Calculate support score from activities marked as support-related
 */
async function calculateSupportScoreFromAccountData(
  accountId: number,
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count activities (using NOTE type as proxy for support interactions)
  const supportActivities = await prisma.cRMActivity.count({
    where: {
      accountId,
      createdAt: { gte: thirtyDaysAgo },
      type: 'NOTE',
    },
  });

  // Lower support activity is better (fewer issues)
  if (supportActivities === 0) return 90;
  if (supportActivities <= 2) return 70;
  if (supportActivities <= 5) return 50;
  return 30;
}

/**
 * Calculate sentiment from opportunity outcomes
 */
async function calculateSentimentScoreFromAccountData(
  accountId: number,
): Promise<number> {
  // Get recent opportunities for the account
  const opportunities = await prisma.opportunity.findMany({
    where: {
      accountId,
      actualCloseDate: { not: null },
    },
    select: {
      stage: {
        select: { type: true },
      },
    },
    orderBy: { actualCloseDate: 'desc' },
    take: 5,
  });

  if (opportunities.length === 0) return 50; // Neutral if no data

  const wonCount = opportunities.filter((o) => o.stage?.type === 'WON').length;
  const _lostCount = opportunities.filter(
    (o) => o.stage?.type === 'LOST',
  ).length;

  const winRate = wonCount / opportunities.length;

  if (winRate >= 0.8) return 90;
  if (winRate >= 0.6) return 70;
  if (winRate >= 0.4) return 50;
  if (winRate >= 0.2) return 30;
  return 20;
}

/**
 * Calculate usage score from recent account activity
 */
async function calculateUsageScoreFromAccountData(
  accountId: number,
): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Count recent activities as proxy for engagement
  const recentActivity = await prisma.cRMActivity.count({
    where: {
      accountId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  // Score based on recent activity
  if (recentActivity >= 5) return 90;
  if (recentActivity >= 3) return 70;
  if (recentActivity >= 1) return 50;
  return 30;
}

/**
 * Get health score history for trend analysis
 */
export async function getAccountHealthScoreHistory(
  accountId: number,
  days: number = 30,
): Promise<HealthScoreHistoryItem[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await prisma.accountHealthScoreHistory.findMany({
    where: {
      accountId,
      calculatedAt: { gte: startDate },
    },
    select: {
      calculatedAt: true,
      overallScore: true,
      category: true,
      usageScore: true,
      supportScore: true,
      engagementScore: true,
      sentimentScore: true,
      financialScore: true,
    },
    orderBy: { calculatedAt: 'asc' },
  });

  return history.map((h) => ({
    date: h.calculatedAt,
    score: h.overallScore,
    category: h.category,
    usageScore: h.usageScore,
    supportScore: h.supportScore,
    engagementScore: h.engagementScore,
    sentimentScore: h.sentimentScore,
    financialScore: h.financialScore,
  }));
}

/**
 * Get portfolio health summary across all accounts
 */
export async function getPortfolioHealthSummary(tenantId?: string): Promise<{
  totalAccounts: number;
  healthyCount: number;
  atRiskCount: number;
  criticalCount: number;
  averageScore: number;
  averageChurnRisk: number;
}> {
  const effectiveTenantId =
    tenantId ?? (hasTenantContext() ? getTenantId() : undefined);

  const where: Prisma.AccountWhereInput = {
    archived: false,
    ...(effectiveTenantId && { tenantId: effectiveTenantId }),
  };

  const accounts = await prisma.account.findMany({
    where,
    select: {
      healthScore: true,
      churnRisk: true,
    },
  });

  const totalAccounts = accounts.length;

  // Single-pass aggregation
  let healthyCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;
  let scoreSum = 0;
  let churnRiskSum = 0;

  for (const account of accounts) {
    const score = account.healthScore ?? 50;
    const category = getHealthCategory(score);

    switch (category) {
      case 'HEALTHY':
        healthyCount++;
        break;
      case 'AT_RISK':
        atRiskCount++;
        break;
      case 'CRITICAL':
        criticalCount++;
        break;
    }

    scoreSum += score;
    churnRiskSum += account.churnRisk ?? 0;
  }

  const averageScore =
    totalAccounts > 0 ? Math.round(scoreSum / totalAccounts) : 0;
  const averageChurnRisk =
    totalAccounts > 0
      ? Math.round((churnRiskSum / totalAccounts) * 100) / 100
      : 0;

  return {
    totalAccounts,
    healthyCount,
    atRiskCount,
    criticalCount,
    averageScore,
    averageChurnRisk,
  };
}

/**
 * List accounts by health status with filtering
 */
export async function listAccountsByHealth(options: {
  tenantId?: string;
  category?: HealthScoreCategory;
  minScore?: number;
  maxScore?: number;
  minChurnRisk?: number;
  sortBy?: 'healthScore' | 'churnRisk' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{
  data: Array<{
    id: number;
    name: string;
    type: string;
    healthScore: number | null;
    churnRisk: number | null;
    category: HealthScoreCategory;
  }>;
  total: number;
}> {
  const effectiveTenantId =
    options.tenantId ?? (hasTenantContext() ? getTenantId() : undefined);

  const where: Prisma.AccountWhereInput = {
    archived: false,
    ...(effectiveTenantId && { tenantId: effectiveTenantId }),
    ...(options.minScore !== undefined && {
      healthScore: { gte: options.minScore },
    }),
    ...(options.maxScore !== undefined && {
      healthScore: { lte: options.maxScore },
    }),
    ...(options.minChurnRisk !== undefined && {
      churnRisk: { gte: options.minChurnRisk },
    }),
  };

  // Apply category filter via score ranges
  if (options.category === 'HEALTHY') {
    where.healthScore = { gte: 71 };
  } else if (options.category === 'AT_RISK') {
    where.healthScore = { gte: 31, lt: 71 };
  } else if (options.category === 'CRITICAL') {
    where.healthScore = { lt: 31 };
  }

  const orderBy: Prisma.AccountOrderByWithRelationInput = {};
  if (options.sortBy === 'healthScore') {
    orderBy.healthScore = options.sortOrder ?? 'desc';
  } else if (options.sortBy === 'churnRisk') {
    orderBy.churnRisk = options.sortOrder ?? 'desc';
  } else {
    orderBy.name = options.sortOrder ?? 'asc';
  }

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy,
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      select: {
        id: true,
        name: true,
        type: true,
        healthScore: true,
        churnRisk: true,
      },
    }),
    prisma.account.count({ where }),
  ]);

  return {
    data: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      healthScore: a.healthScore,
      churnRisk: a.churnRisk,
      category: getHealthCategory(a.healthScore ?? 50),
    })),
    total,
  };
}

/**
 * Recalculate health scores for all accounts in a tenant
 */
export async function recalculateAllAccountHealthScores(
  tenantId?: string,
): Promise<{ processed: number; errors: number }> {
  const effectiveTenantId =
    tenantId ?? (hasTenantContext() ? getTenantId() : undefined);

  const accounts = await prisma.account.findMany({
    where: {
      archived: false,
      ...(effectiveTenantId && { tenantId: effectiveTenantId }),
    },
    select: { id: true },
  });

  let processed = 0;
  let errors = 0;

  for (const account of accounts) {
    try {
      await autoCalculateAccountHealthScore(account.id);
      processed++;
    } catch (error) {
      errors++;
      console.error(
        `Error calculating health score for account ${account.id}:`,
        error,
      );
    }
  }

  return { processed, errors };
}
