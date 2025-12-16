/**
 * Financial Forecasting Service
 *
 * Provides spending forecasts and budget recommendations using
 * time series analysis and AI-powered predictions.
 */

import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface ForecastResult {
  period: string;
  startDate: string;
  endDate: string;
  predictedAmount: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  method: 'MOVING_AVERAGE' | 'LINEAR_REGRESSION' | 'AI_PREDICTION';
}

export interface SpendingForecast {
  forecasts: ForecastResult[];
  summary: {
    totalPredicted: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    trendPercentage: number;
    confidence: number;
  };
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    predictedAmount: number;
    percentageOfTotal: number;
  }>;
}

export interface BudgetRecommendation {
  categoryId: number;
  categoryName: string;
  currentBudget: number | null;
  recommendedBudget: number;
  rationale: string;
  historicalSpending: {
    average: number;
    trend: number;
    variability: number;
  };
  confidence: number;
}

export interface CashFlowProjection {
  date: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  runningBalance: number;
  recurringCosts: Array<{
    id: number;
    name: string;
    amount: number;
    dueDate: string;
  }>;
}

// ============================================================================
// FORECASTING SERVICE
// ============================================================================

/**
 * Generate spending forecast for upcoming periods
 */
export async function generateSpendingForecast(params: {
  periods?: number; // Number of periods to forecast (default: 3)
  periodType?: 'MONTH' | 'QUARTER'; // Default: MONTH
  categoryId?: number; // Optional category filter
}): Promise<SpendingForecast> {
  const tenantId = getTenantId();
  const { periods = 3, periodType = 'MONTH', categoryId } = params;

  // Get historical spending data (last 12 months)
  const historicalData = await getHistoricalSpending(tenantId, 12, categoryId);

  if (historicalData.length < 3) {
    throw new Error(
      'Insufficient historical data for forecasting. Need at least 3 months.',
    );
  }

  // Generate forecasts using multiple methods
  const forecasts: ForecastResult[] = [];
  const now = new Date();

  for (let i = 0; i < periods; i++) {
    const periodStart = new Date(now);
    const periodEnd = new Date(now);

    if (periodType === 'MONTH') {
      periodStart.setMonth(periodStart.getMonth() + i + 1);
      periodStart.setDate(1);
      periodEnd.setMonth(periodEnd.getMonth() + i + 2);
      periodEnd.setDate(0);
    } else {
      periodStart.setMonth(periodStart.getMonth() + (i + 1) * 3);
      periodStart.setDate(1);
      periodEnd.setMonth(periodEnd.getMonth() + (i + 2) * 3);
      periodEnd.setDate(0);
    }

    // Use weighted moving average for prediction
    const prediction = calculateWeightedMovingAverage(
      historicalData.map((d) => d.amount),
    );

    // Apply trend adjustment
    const trendFactor = calculateTrendFactor(
      historicalData.map((d) => d.amount),
    );
    const adjustedPrediction =
      prediction * Math.pow(1 + trendFactor / 100, i + 1);

    // Calculate confidence interval (based on historical variability)
    const stdDev = calculateStdDev(historicalData.map((d) => d.amount));
    const confidenceMultiplier = 1.96; // 95% confidence

    forecasts.push({
      period: `${periodType === 'MONTH' ? 'Month' : 'Quarter'} ${i + 1}`,
      startDate: periodStart.toISOString().split('T')[0],
      endDate: periodEnd.toISOString().split('T')[0],
      predictedAmount: Math.round(adjustedPrediction * 100) / 100,
      confidenceInterval: {
        low: Math.max(
          0,
          Math.round(
            (adjustedPrediction - confidenceMultiplier * stdDev) * 100,
          ) / 100,
        ),
        high:
          Math.round(
            (adjustedPrediction + confidenceMultiplier * stdDev) * 100,
          ) / 100,
      },
      method: 'MOVING_AVERAGE',
    });
  }

  // Calculate summary
  const totalPredicted = forecasts.reduce(
    (sum, f) => sum + f.predictedAmount,
    0,
  );
  const trendPercentage = calculateTrendFactor(
    historicalData.map((d) => d.amount),
  );

  // Get category breakdown for first forecast period
  const categoryBreakdown = await getCategoryBreakdownForecast(
    tenantId,
    forecasts[0]?.predictedAmount || 0,
  );

  return {
    forecasts,
    summary: {
      totalPredicted,
      trend:
        trendPercentage > 5
          ? 'INCREASING'
          : trendPercentage < -5
            ? 'DECREASING'
            : 'STABLE',
      trendPercentage: Math.round(trendPercentage * 100) / 100,
      confidence: Math.min(0.95, 0.5 + historicalData.length * 0.05),
    },
    byCategory: categoryBreakdown,
  };
}

/**
 * Get historical spending data by month
 */
async function getHistoricalSpending(
  tenantId: string,
  months: number,
  categoryId?: number,
): Promise<Array<{ period: string; amount: number }>> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);

  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      status: { in: ['APPROVED', 'PAID'] },
      date: { gte: startDate },
      ...(categoryId && { categoryId }),
    },
    select: {
      amount: true,
      date: true,
    },
  });

  // Group by month
  const monthlyTotals = new Map<string, number>();

  for (const expense of expenses) {
    const monthKey = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTotals.set(
      monthKey,
      (monthlyTotals.get(monthKey) || 0) + Number(expense.amount),
    );
  }

  // Convert to sorted array
  return [...monthlyTotals.entries()]
    .map(([period, amount]) => ({ period, amount }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Calculate weighted moving average (more weight on recent data)
 */
function calculateWeightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;

  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < values.length; i++) {
    // More weight on recent values
    const weight = i + 1;
    weightedSum += values[i] * weight;
    weightSum += weight;
  }

  return weightedSum / weightSum;
}

/**
 * Calculate trend factor (percentage change per period)
 */
function calculateTrendFactor(values: number[]): number {
  if (values.length < 2) return 0;

  // Simple linear regression
  const n = values.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgValue = sumY / n;

  // Return percentage change per period
  return avgValue > 0 ? (slope / avgValue) * 100 : 0;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Get category breakdown forecast based on historical distribution
 */
async function getCategoryBreakdownForecast(
  tenantId: string,
  totalForecast: number,
): Promise<
  Array<{
    categoryId: number;
    categoryName: string;
    predictedAmount: number;
    percentageOfTotal: number;
  }>
> {
  // Get historical category distribution (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const categorySpending = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      tenantId,
      status: { in: ['APPROVED', 'PAID'] },
      date: { gte: sixMonthsAgo },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const totalHistorical = categorySpending.reduce(
    (sum, c) => sum + Number(c._sum.amount || 0),
    0,
  );

  if (totalHistorical === 0) {
    return [];
  }

  // Get category names
  const categoryIds = categorySpending.map((c) => c.categoryId);
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return categorySpending.slice(0, 10).map((c) => {
    const percentage = Number(c._sum.amount || 0) / totalHistorical;
    return {
      categoryId: c.categoryId,
      categoryName: categoryMap.get(c.categoryId) || 'Unknown',
      predictedAmount: Math.round(totalForecast * percentage * 100) / 100,
      percentageOfTotal: Math.round(percentage * 10000) / 100,
    };
  });
}

/**
 * Generate budget recommendations based on historical data
 */
export async function generateBudgetRecommendations(): Promise<
  BudgetRecommendation[]
> {
  const tenantId = getTenantId();

  // Get all active categories with their historical spending
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const categorySpending = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      tenantId,
      status: { in: ['APPROVED', 'PAID'] },
      date: { gte: sixMonthsAgo },
    },
    _avg: { amount: true },
    _count: true,
  });

  // Get detailed monthly data for trend analysis
  const recommendations: BudgetRecommendation[] = [];

  for (const category of categorySpending) {
    if (category._count < 3) continue; // Need at least 3 expenses

    const categoryDetails = await prisma.expenseCategory.findUnique({
      where: { id: category.categoryId },
      select: { id: true, name: true },
    });

    if (!categoryDetails) continue;

    // Get monthly spending for this category
    const monthlyData = await getHistoricalSpending(
      tenantId,
      6,
      category.categoryId,
    );

    if (monthlyData.length < 2) continue;

    const amounts = monthlyData.map((d) => d.amount);
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const trend = calculateTrendFactor(amounts);
    const stdDev = calculateStdDev(amounts);
    const variability = average > 0 ? (stdDev / average) * 100 : 0;

    // Get current budget for this category
    const currentBudget = await prisma.budget.findFirst({
      where: {
        tenantId,
        categoryId: category.categoryId,
        status: 'ACTIVE',
      },
      select: { amount: true },
    });

    // Calculate recommended budget (average + buffer for growth + variability)
    const growthBuffer = trend > 0 ? average * (trend / 100) * 3 : 0; // 3 month projection
    const variabilityBuffer = stdDev * 1.5; // 1.5 standard deviations
    const recommendedBudget = average + growthBuffer + variabilityBuffer;

    // Generate rationale
    let rationale = `Based on ${monthlyData.length} months of data with avg spending of $${Math.round(average).toLocaleString()}.`;
    if (trend > 10) {
      rationale += ` Spending is increasing by ${Math.round(trend)}% per month.`;
    } else if (trend < -10) {
      rationale += ` Spending is decreasing by ${Math.round(Math.abs(trend))}% per month.`;
    }
    if (variability > 30) {
      rationale += ' High variability suggests adding extra buffer.';
    }

    recommendations.push({
      categoryId: categoryDetails.id,
      categoryName: categoryDetails.name,
      currentBudget: currentBudget ? Number(currentBudget.amount) : null,
      recommendedBudget: Math.round(recommendedBudget * 100) / 100,
      rationale,
      historicalSpending: {
        average: Math.round(average * 100) / 100,
        trend: Math.round(trend * 100) / 100,
        variability: Math.round(variability * 100) / 100,
      },
      confidence: Math.min(0.95, 0.5 + monthlyData.length * 0.1),
    });
  }

  // Sort by difference between recommended and current (biggest gaps first)
  return recommendations.sort((a, b) => {
    const gapA = a.currentBudget
      ? Math.abs(a.recommendedBudget - a.currentBudget)
      : a.recommendedBudget;
    const gapB = b.currentBudget
      ? Math.abs(b.recommendedBudget - b.currentBudget)
      : b.recommendedBudget;
    return gapB - gapA;
  });
}

/**
 * Generate cash flow projection including recurring costs
 */
export async function generateCashFlowProjection(params: {
  days?: number; // Number of days to project (default: 30)
  startingBalance?: number; // Optional starting balance
}): Promise<CashFlowProjection[]> {
  const tenantId = getTenantId();
  const { days = 30, startingBalance = 0 } = params;

  const projections: CashFlowProjection[] = [];
  let runningBalance = startingBalance;

  // Get upcoming recurring costs
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const recurringCosts = await prisma.recurringCost.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      nextDueDate: { lte: endDate },
    },
    select: {
      id: true,
      name: true,
      amount: true,
      nextDueDate: true,
      frequency: true,
    },
    orderBy: { nextDueDate: 'asc' },
  });

  // Group by date
  const costsByDate = new Map<string, typeof recurringCosts>();
  for (const cost of recurringCosts) {
    const dateKey = cost.nextDueDate.toISOString().split('T')[0];
    if (!costsByDate.has(dateKey)) {
      costsByDate.set(dateKey, []);
    }
    costsByDate.get(dateKey)!.push(cost);
  }

  // Calculate average daily inflows (based on historical approved expenses that were reimbursed)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentInflows = await prisma.expense.aggregate({
    where: {
      tenantId,
      status: 'PAID',
      date: { gte: thirtyDaysAgo },
    },
    _sum: { amount: true },
  });

  const avgDailyInflow = Number(recentInflows._sum.amount || 0) / 30;

  // Generate daily projections
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];

    const daysCosts = costsByDate.get(dateKey) || [];
    const outflows = daysCosts.reduce((sum, c) => sum + Number(c.amount), 0);
    const inflows = avgDailyInflow; // Simplified - could be enhanced with revenue forecasting
    const netFlow = inflows - outflows;

    runningBalance += netFlow;

    projections.push({
      date: dateKey,
      inflows: Math.round(inflows * 100) / 100,
      outflows: Math.round(outflows * 100) / 100,
      netFlow: Math.round(netFlow * 100) / 100,
      runningBalance: Math.round(runningBalance * 100) / 100,
      recurringCosts: daysCosts.map((c) => ({
        id: c.id,
        name: c.name,
        amount: Number(c.amount),
        dueDate: c.nextDueDate.toISOString().split('T')[0],
      })),
    });
  }

  return projections;
}

/**
 * Get AI-powered financial insights
 */
export async function getFinancialInsights(): Promise<{
  summary: string;
  keyMetrics: Array<{ label: string; value: string; trend: string }>;
  recommendations: string[];
}> {
  const tenantId = getTenantId();

  // Gather key metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [currentPeriod, previousPeriod, budgets, recurringCosts] =
    await Promise.all([
      prisma.expense.aggregate({
        where: {
          tenantId,
          status: { in: ['APPROVED', 'PAID'] },
          date: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          tenantId,
          status: { in: ['APPROVED', 'PAID'] },
          date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.budget.findMany({
        where: { tenantId, status: 'ACTIVE' },
        select: { amount: true, spent: true },
      }),
      prisma.recurringCost.aggregate({
        where: { tenantId, status: 'ACTIVE' },
        _sum: { amount: true },
      }),
    ]);

  const currentAmount = Number(currentPeriod._sum.amount || 0);
  const previousAmount = Number(previousPeriod._sum.amount || 0);
  const spendingChange =
    previousAmount > 0
      ? ((currentAmount - previousAmount) / previousAmount) * 100
      : 0;

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);
  const budgetUtilization =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const monthlyRecurring = Number(recurringCosts._sum.amount || 0);

  // Generate key metrics
  const keyMetrics = [
    {
      label: 'Monthly Spending',
      value: `$${Math.round(currentAmount).toLocaleString()}`,
      trend:
        spendingChange > 0
          ? `+${spendingChange.toFixed(1)}%`
          : `${spendingChange.toFixed(1)}%`,
    },
    {
      label: 'Budget Utilization',
      value: `${budgetUtilization.toFixed(1)}%`,
      trend: budgetUtilization > 90 ? 'Over budget risk' : 'On track',
    },
    {
      label: 'Monthly Recurring',
      value: `$${Math.round(monthlyRecurring).toLocaleString()}`,
      trend: 'Fixed costs',
    },
  ];

  // Generate recommendations based on data
  const recommendations: string[] = [];

  if (spendingChange > 20) {
    recommendations.push(
      'Spending increased significantly this month. Review recent expenses for optimization opportunities.',
    );
  }

  if (budgetUtilization > 80) {
    recommendations.push(
      'Budget utilization is high. Consider reviewing upcoming expenses or increasing budgets.',
    );
  }

  const overBudgetCount = budgets.filter(
    (b) => Number(b.spent) > Number(b.amount),
  ).length;
  if (overBudgetCount > 0) {
    recommendations.push(
      `${overBudgetCount} budget(s) are over their allocated amount. Review and reallocate funds.`,
    );
  }

  if (monthlyRecurring > currentAmount * 0.5) {
    recommendations.push(
      'Recurring costs represent over 50% of spending. Review subscriptions for potential savings.',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Financial metrics are healthy. Continue monitoring trends.',
    );
  }

  // Generate summary
  const summary =
    `Monthly spending is $${Math.round(currentAmount).toLocaleString()}, ` +
    `${spendingChange > 0 ? 'up' : 'down'} ${Math.abs(spendingChange).toFixed(1)}% from last month. ` +
    `Budget utilization is at ${budgetUtilization.toFixed(1)}% with ` +
    `$${Math.round(monthlyRecurring).toLocaleString()} in monthly recurring costs.`;

  return {
    summary,
    keyMetrics,
    recommendations,
  };
}
