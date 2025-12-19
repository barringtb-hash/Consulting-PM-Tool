/**
 * Predictive Analytics Service
 *
 * Provides forecasting and trend analysis for AI costs and usage.
 * Uses statistical methods to predict future patterns.
 */

import { prisma } from '../../prisma/client';
import { logger } from '../../utils/logger';
import { AI_COST_THRESHOLDS } from './ai-pricing.config';

// ============================================================================
// Types
// ============================================================================

export interface CostForecast {
  currentMonthActual: number;
  currentMonthProjected: number;
  nextMonthForecast: number;
  dailyAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  daysRemaining: number;
  budgetStatus: 'safe' | 'warning' | 'critical';
  confidenceLevel: number;
  warnings: string[];
}

export interface UsageForecast {
  currentDailyAverage: number;
  projectedDailyNext7Days: number;
  projectedDailyNext30Days: number;
  peakUsageDay: string;
  lowUsageDay: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
}

export interface ToolUsagePrediction {
  toolId: string;
  currentUsage: number;
  projectedUsage: number;
  projectedCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  anomalyRisk: 'low' | 'medium' | 'high';
}

export interface SeasonalPattern {
  dayOfWeek: Record<string, number>; // Average usage by day of week
  hourOfDay: Record<number, number>; // Average usage by hour
  weeklyTrend: number[]; // Last 4 weeks trend
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate linear regression for trend analysis
 */
function linearRegression(data: number[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i];
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  for (let i = 0; i < n; i++) {
    const yPredicted = intercept + slope * i;
    ssRes += (data[i] - yPredicted) ** 2;
    ssTot += (data[i] - yMean) ** 2;
  }

  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Calculate exponential moving average
 */
function exponentialMovingAverage(data: number[], alpha: number = 0.3): number {
  if (data.length === 0) return 0;

  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = alpha * data[i] + (1 - alpha) * ema;
  }
  return ema;
}

/**
 * Determine trend direction
 */
function getTrend(
  slope: number,
  threshold: number = 0.05,
): 'increasing' | 'decreasing' | 'stable' {
  if (slope > threshold) return 'increasing';
  if (slope < -threshold) return 'decreasing';
  return 'stable';
}

// ============================================================================
// Cost Forecasting
// ============================================================================

/**
 * Get cost forecast for a tenant
 */
export async function getCostForecast(
  tenantId?: string,
): Promise<CostForecast> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const currentDay = now.getDate();
  const daysRemaining = daysInMonth - currentDay;

  // Get daily costs for the last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dailySummaries = await prisma.aIUsageSummary.findMany({
    where: {
      ...(tenantId && { tenantId }),
      periodType: 'DAILY',
      periodStart: { gte: thirtyDaysAgo },
    },
    orderBy: { periodStart: 'asc' },
  });

  // Calculate current month actual
  const currentMonthSummaries = dailySummaries.filter(
    (s) => s.periodStart >= startOfMonth,
  );
  const currentMonthActual = currentMonthSummaries.reduce(
    (sum, s) => sum + s.totalCost,
    0,
  );

  // Calculate daily average
  const dailyCosts = dailySummaries.map((s) => s.totalCost);
  const dailyAverage =
    dailyCosts.length > 0
      ? dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length
      : 0;

  // Linear regression for trend
  const { slope, r2 } = linearRegression(dailyCosts);
  const trend = getTrend(slope / (dailyAverage || 1));
  const trendPercentage = dailyAverage > 0 ? (slope / dailyAverage) * 100 : 0;

  // Project current month
  const ema = exponentialMovingAverage(dailyCosts);
  const currentMonthProjected = currentMonthActual + ema * daysRemaining;

  // Forecast next month using trend
  const nextMonthForecast = ema * daysInMonth * (1 + trendPercentage / 100);

  // Determine budget status
  let budgetStatus: 'safe' | 'warning' | 'critical' = 'safe';
  const warnings: string[] = [];

  if (currentMonthProjected >= AI_COST_THRESHOLDS.criticalMonthly) {
    budgetStatus = 'critical';
    warnings.push(
      `Projected to exceed critical threshold (${AI_COST_THRESHOLDS.criticalMonthly}) by end of month`,
    );
  } else if (currentMonthProjected >= AI_COST_THRESHOLDS.warningMonthly) {
    budgetStatus = 'warning';
    warnings.push(
      `Projected to exceed warning threshold (${AI_COST_THRESHOLDS.warningMonthly}) by end of month`,
    );
  }

  if (trend === 'increasing' && trendPercentage > 10) {
    warnings.push(
      `Costs increasing at ${trendPercentage.toFixed(1)}% daily rate`,
    );
  }

  return {
    currentMonthActual,
    currentMonthProjected,
    nextMonthForecast,
    dailyAverage,
    trend,
    trendPercentage,
    daysRemaining,
    budgetStatus,
    confidenceLevel: r2,
    warnings,
  };
}

// ============================================================================
// Usage Forecasting
// ============================================================================

/**
 * Get usage forecast for a tenant
 */
export async function getUsageForecast(
  tenantId?: string,
): Promise<UsageForecast> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dailySummaries = await prisma.aIUsageSummary.findMany({
    where: {
      ...(tenantId && { tenantId }),
      periodType: 'DAILY',
      periodStart: { gte: thirtyDaysAgo },
    },
    orderBy: { periodStart: 'asc' },
  });

  const dailyCalls = dailySummaries.map((s) => s.totalCalls);
  const currentDailyAverage =
    dailyCalls.length > 0
      ? dailyCalls.reduce((a, b) => a + b, 0) / dailyCalls.length
      : 0;

  // Find peak and low usage days
  const usageByDay: Record<string, number[]> = {};
  dailySummaries.forEach((s) => {
    const dayName = s.periodStart.toLocaleDateString('en-US', {
      weekday: 'long',
    });
    if (!usageByDay[dayName]) usageByDay[dayName] = [];
    usageByDay[dayName].push(s.totalCalls);
  });

  const avgByDay = Object.entries(usageByDay).map(([day, calls]) => ({
    day,
    avg: calls.reduce((a, b) => a + b, 0) / calls.length,
  }));

  const peakUsageDay =
    avgByDay.length > 0
      ? avgByDay.reduce((a, b) => (a.avg > b.avg ? a : b)).day
      : 'Unknown';
  const lowUsageDay =
    avgByDay.length > 0
      ? avgByDay.reduce((a, b) => (a.avg < b.avg ? a : b)).day
      : 'Unknown';

  // Trend analysis
  const { slope } = linearRegression(dailyCalls);
  const trend = getTrend(slope / (currentDailyAverage || 1));
  const trendPercentage =
    currentDailyAverage > 0 ? (slope / currentDailyAverage) * 100 : 0;

  // Project next 7 and 30 days
  const ema = exponentialMovingAverage(dailyCalls);
  const projectedDailyNext7Days = ema * (1 + (trendPercentage / 100) * 7);
  const projectedDailyNext30Days = ema * (1 + (trendPercentage / 100) * 30);

  return {
    currentDailyAverage,
    projectedDailyNext7Days,
    projectedDailyNext30Days,
    peakUsageDay,
    lowUsageDay,
    trend,
    trendPercentage,
  };
}

// ============================================================================
// Tool-level Predictions
// ============================================================================

/**
 * Get predictions for each AI tool
 */
export async function getToolPredictions(
  tenantId?: string,
): Promise<ToolUsagePrediction[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get recent summaries by tool
  const recentSummaries = await prisma.aIUsageSummary.findMany({
    where: {
      ...(tenantId && { tenantId }),
      periodType: 'DAILY',
      periodStart: { gte: fourteenDaysAgo },
    },
    orderBy: { periodStart: 'asc' },
  });

  // Group by tool
  const byTool: Record<
    string,
    { recent: typeof recentSummaries; older: typeof recentSummaries }
  > = {};

  recentSummaries.forEach((s) => {
    if (!s.toolId) return;
    if (!byTool[s.toolId]) byTool[s.toolId] = { recent: [], older: [] };
    if (s.periodStart >= sevenDaysAgo) {
      byTool[s.toolId].recent.push(s);
    } else {
      byTool[s.toolId].older.push(s);
    }
  });

  const predictions: ToolUsagePrediction[] = [];

  for (const [toolId, data] of Object.entries(byTool)) {
    const recentCalls = data.recent.reduce((sum, s) => sum + s.totalCalls, 0);
    const recentCost = data.recent.reduce((sum, s) => sum + s.totalCost, 0);
    const olderCalls = data.older.reduce((sum, s) => sum + s.totalCalls, 0);

    // Calculate averages
    const recentDays = data.recent.length || 1;
    const olderDays = data.older.length || 1;
    const recentAvg = recentCalls / recentDays;
    const olderAvg = olderCalls / olderDays;

    // Determine trend
    const changePercent =
      olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend = getTrend(changePercent, 10);

    // Project next week
    const projectedUsage = Math.round(
      recentAvg * 7 * (1 + changePercent / 100),
    );
    const projectedCost =
      (recentCost / recentDays) * 7 * (1 + changePercent / 100);

    // Assess anomaly risk
    let anomalyRisk: 'low' | 'medium' | 'high' = 'low';
    if (Math.abs(changePercent) > 50) {
      anomalyRisk = 'high';
    } else if (Math.abs(changePercent) > 25) {
      anomalyRisk = 'medium';
    }

    predictions.push({
      toolId,
      currentUsage: recentCalls,
      projectedUsage,
      projectedCost,
      trend,
      anomalyRisk,
    });
  }

  return predictions.sort((a, b) => b.projectedCost - a.projectedCost);
}

// ============================================================================
// Seasonal Patterns
// ============================================================================

/**
 * Analyze seasonal patterns in usage
 */
export async function getSeasonalPatterns(
  tenantId?: string,
): Promise<SeasonalPattern> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get hourly summaries for the last 30 days
  const hourlySummaries = await prisma.aIUsageSummary.findMany({
    where: {
      ...(tenantId && { tenantId }),
      periodType: 'HOURLY',
      periodStart: { gte: thirtyDaysAgo },
    },
  });

  // Get daily summaries for weekly trend
  const dailySummaries = await prisma.aIUsageSummary.findMany({
    where: {
      ...(tenantId && { tenantId }),
      periodType: 'DAILY',
      periodStart: { gte: thirtyDaysAgo },
    },
    orderBy: { periodStart: 'asc' },
  });

  // Analyze by day of week
  const dayOfWeekData: Record<string, number[]> = {};
  dailySummaries.forEach((s) => {
    const day = s.periodStart.toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayOfWeekData[day]) dayOfWeekData[day] = [];
    dayOfWeekData[day].push(s.totalCalls);
  });

  const dayOfWeek: Record<string, number> = {};
  for (const [day, values] of Object.entries(dayOfWeekData)) {
    dayOfWeek[day] = values.reduce((a, b) => a + b, 0) / values.length;
  }

  // Analyze by hour of day
  const hourOfDayData: Record<number, number[]> = {};
  hourlySummaries.forEach((s) => {
    const hour = s.periodStart.getHours();
    if (!hourOfDayData[hour]) hourOfDayData[hour] = [];
    hourOfDayData[hour].push(s.totalCalls);
  });

  const hourOfDay: Record<number, number> = {};
  for (const [hour, values] of Object.entries(hourOfDayData)) {
    hourOfDay[parseInt(hour)] =
      values.reduce((a, b) => a + b, 0) / values.length;
  }

  // Weekly trend (last 4 weeks)
  const weeklyTrend: number[] = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(
      now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
    );
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekTotal = dailySummaries
      .filter((s) => s.periodStart >= weekStart && s.periodStart < weekEnd)
      .reduce((sum, s) => sum + s.totalCalls, 0);
    weeklyTrend.unshift(weekTotal);
  }

  return {
    dayOfWeek,
    hourOfDay,
    weeklyTrend,
  };
}

// ============================================================================
// Budget Recommendations
// ============================================================================

export interface BudgetRecommendation {
  currentBudget: { warning: number; critical: number };
  recommendedBudget: { warning: number; critical: number };
  reasoning: string[];
  savingsOpportunities: string[];
}

/**
 * Generate budget recommendations based on usage patterns
 */
export async function getBudgetRecommendations(
  tenantId?: string,
): Promise<BudgetRecommendation> {
  const forecast = await getCostForecast(tenantId);
  const toolPredictions = await getToolPredictions(tenantId);

  const reasoning: string[] = [];
  const savingsOpportunities: string[] = [];

  // Analyze current usage
  const monthlyProjected = forecast.currentMonthProjected;
  const _trend = forecast.trend;

  // Recommend new thresholds
  let recommendedWarning = AI_COST_THRESHOLDS.warningMonthly;
  let recommendedCritical = AI_COST_THRESHOLDS.criticalMonthly;

  if (monthlyProjected > AI_COST_THRESHOLDS.criticalMonthly * 1.2) {
    // Usage significantly exceeds budget - may need to increase
    recommendedWarning = Math.ceil((monthlyProjected * 0.8) / 10) * 10;
    recommendedCritical = Math.ceil((monthlyProjected * 1.1) / 10) * 10;
    reasoning.push(
      `Projected costs (${monthlyProjected.toFixed(2)}) significantly exceed current critical threshold`,
    );
    reasoning.push(
      `Consider increasing thresholds or implementing cost controls`,
    );
  } else if (monthlyProjected < AI_COST_THRESHOLDS.warningMonthly * 0.5) {
    // Usage well under budget - can tighten
    recommendedWarning = Math.ceil((monthlyProjected * 1.5) / 10) * 10;
    recommendedCritical = Math.ceil((monthlyProjected * 2) / 10) * 10;
    reasoning.push(`Usage is well under current thresholds`);
    reasoning.push(`Consider tightening thresholds for better cost awareness`);
  } else {
    reasoning.push(`Current thresholds are appropriate for usage levels`);
  }

  // Identify savings opportunities
  const highCostTools = toolPredictions.filter(
    (t) => t.projectedCost > monthlyProjected * 0.3,
  );
  if (highCostTools.length > 0) {
    highCostTools.forEach((t) => {
      savingsOpportunities.push(
        `${t.toolId}: Accounts for significant cost - review usage patterns`,
      );
    });
  }

  const increasingTools = toolPredictions.filter(
    (t) => t.trend === 'increasing',
  );
  if (increasingTools.length > 0) {
    increasingTools.forEach((t) => {
      savingsOpportunities.push(
        `${t.toolId}: Usage increasing - monitor for unexpected growth`,
      );
    });
  }

  if (forecast.trend === 'increasing' && forecast.trendPercentage > 5) {
    savingsOpportunities.push(
      `Overall costs trending up ${forecast.trendPercentage.toFixed(1)}% - review all AI usage`,
    );
  }

  return {
    currentBudget: {
      warning: AI_COST_THRESHOLDS.warningMonthly,
      critical: AI_COST_THRESHOLDS.criticalMonthly,
    },
    recommendedBudget: {
      warning: recommendedWarning,
      critical: recommendedCritical,
    },
    reasoning,
    savingsOpportunities,
  };
}

logger.info('Predictive analytics service initialized');
