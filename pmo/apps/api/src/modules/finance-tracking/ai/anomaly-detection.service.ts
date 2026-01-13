/**
 * Anomaly Detection Service
 *
 * Detects unusual spending patterns and anomalies in expense data
 * using statistical analysis and AI-powered insights.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface AnomalyResult {
  expenseId: number;
  type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  context: {
    value: number;
    expected: number;
    deviation: number;
    threshold: number;
  };
}

export type AnomalyType =
  | 'UNUSUALLY_HIGH_AMOUNT'
  | 'UNUSUALLY_LOW_AMOUNT'
  | 'DUPLICATE_EXPENSE'
  | 'OFF_HOURS_SUBMISSION'
  | 'UNUSUAL_VENDOR'
  | 'UNUSUAL_CATEGORY'
  | 'RAPID_SPENDING'
  | 'ROUND_NUMBER';

export interface AnomalyStats {
  totalExpenses: number;
  anomalyCount: number;
  anomalyRate: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<string, number>;
  recentAnomalies: AnomalyResult[];
}

export interface SpendingBaseline {
  categoryId: number;
  categoryName: string;
  mean: number;
  stdDev: number;
  count: number;
  min: number;
  max: number;
}

// ============================================================================
// ANOMALY DETECTION SERVICE
// ============================================================================

/**
 * Detect anomalies in a single expense
 */
export async function detectExpenseAnomalies(
  expenseId: number,
): Promise<AnomalyResult[]> {
  const tenantId = getTenantId();

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, tenantId },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  const anomalies: AnomalyResult[] = [];

  // Check for amount anomalies
  const amountAnomaly = await checkAmountAnomaly(
    tenantId,
    expense.categoryId,
    Number(expense.amount),
    expenseId,
  );
  if (amountAnomaly) {
    anomalies.push(amountAnomaly);
  }

  // Check for duplicates
  const duplicateAnomaly = await checkDuplicateExpense(
    tenantId,
    expense.id,
    expense.description,
    Number(expense.amount),
    expense.date,
    expense.vendorName,
  );
  if (duplicateAnomaly) {
    anomalies.push(duplicateAnomaly);
  }

  // Check for unusual vendor
  const vendorAnomaly = await checkUnusualVendor(
    tenantId,
    expense.vendorName,
    expenseId,
  );
  if (vendorAnomaly) {
    anomalies.push(vendorAnomaly);
  }

  // Check for round number (potential estimate)
  const roundAnomaly = checkRoundNumber(Number(expense.amount), expenseId);
  if (roundAnomaly) {
    anomalies.push(roundAnomaly);
  }

  // Check for rapid spending (multiple expenses in short period)
  const rapidSpendingAnomaly = await checkRapidSpending(
    tenantId,
    expense.ownerId,
    expense.createdAt,
    expenseId,
  );
  if (rapidSpendingAnomaly) {
    anomalies.push(rapidSpendingAnomaly);
  }

  return anomalies;
}

/**
 * Check if expense amount is anomalous for its category
 */
async function checkAmountAnomaly(
  tenantId: string,
  categoryId: number,
  amount: number,
  expenseId: number,
): Promise<AnomalyResult | null> {
  // Get baseline statistics for this category
  const baseline = await getCategoryBaseline(tenantId, categoryId);

  if (!baseline || baseline.count < 5) {
    // Not enough data to determine baseline
    return null;
  }

  // Prevent division by zero - if stdDev is 0 (all values identical), skip anomaly detection
  if (baseline.stdDev === 0) {
    return null;
  }

  const zScore = (amount - baseline.mean) / baseline.stdDev;
  const threshold = 2.0; // 2 standard deviations

  if (Math.abs(zScore) > threshold) {
    const isHigh = zScore > 0;
    return {
      expenseId,
      type: isHigh ? 'UNUSUALLY_HIGH_AMOUNT' : 'UNUSUALLY_LOW_AMOUNT',
      severity: Math.abs(zScore) > 3 ? 'HIGH' : 'MEDIUM',
      description: isHigh
        ? `Amount is ${zScore.toFixed(1)} standard deviations above average for ${baseline.categoryName}`
        : `Amount is ${Math.abs(zScore).toFixed(1)} standard deviations below average for ${baseline.categoryName}`,
      context: {
        value: amount,
        expected: baseline.mean,
        deviation: zScore,
        threshold,
      },
    };
  }

  return null;
}

/**
 * Check for potential duplicate expenses
 */
async function checkDuplicateExpense(
  tenantId: string,
  expenseId: number,
  description: string,
  amount: number,
  date: Date,
  vendorName: string | null,
): Promise<AnomalyResult | null> {
  // Look for similar expenses within 7 days
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 7);

  const similarExpenses = await prisma.expense.findMany({
    where: {
      tenantId,
      id: { not: expenseId },
      date: { gte: startDate, lte: endDate },
      OR: [
        // Same amount and vendor
        { amount, vendorName },
        // Same amount and similar description
        {
          amount,
          description: {
            contains: description.slice(0, 20),
            mode: 'insensitive',
          },
        },
      ],
    },
    select: { id: true, description: true, amount: true, date: true },
    take: 5,
  });

  if (similarExpenses.length > 0) {
    return {
      expenseId,
      type: 'DUPLICATE_EXPENSE',
      severity: 'MEDIUM',
      description: `Found ${similarExpenses.length} similar expense(s) within 7 days`,
      context: {
        value: similarExpenses.length,
        expected: 0,
        deviation: similarExpenses.length,
        threshold: 0,
      },
    };
  }

  return null;
}

/**
 * Check if vendor is unusual (first time or rare)
 */
async function checkUnusualVendor(
  tenantId: string,
  vendorName: string | null,
  expenseId: number,
): Promise<AnomalyResult | null> {
  if (!vendorName) {
    return null;
  }

  // Count previous expenses from this vendor
  const vendorCount = await prisma.expense.count({
    where: {
      tenantId,
      vendorName: { equals: vendorName, mode: 'insensitive' },
      id: { not: expenseId },
      status: { in: ['APPROVED', 'PAID'] },
    },
  });

  if (vendorCount === 0) {
    return {
      expenseId,
      type: 'UNUSUAL_VENDOR',
      severity: 'LOW',
      description: `First expense from vendor: ${vendorName}`,
      context: {
        value: 0,
        expected: 1,
        deviation: -1,
        threshold: 0,
      },
    };
  }

  return null;
}

/**
 * Check if amount is suspiciously round (potential estimate)
 */
function checkRoundNumber(
  amount: number,
  expenseId: number,
): AnomalyResult | null {
  // Check if amount is a round number over $100
  if (amount >= 100 && amount % 100 === 0) {
    return {
      expenseId,
      type: 'ROUND_NUMBER',
      severity: 'LOW',
      description: 'Amount is a round number, which may indicate an estimate',
      context: {
        value: amount,
        expected: amount,
        deviation: 0,
        threshold: 100,
      },
    };
  }

  return null;
}

/**
 * Check for rapid spending (many expenses in short time)
 */
async function checkRapidSpending(
  tenantId: string,
  ownerId: number,
  createdAt: Date,
  expenseId: number,
): Promise<AnomalyResult | null> {
  // Count expenses from same user in last hour
  const oneHourAgo = new Date(createdAt);
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentCount = await prisma.expense.count({
    where: {
      tenantId,
      ownerId,
      id: { not: expenseId },
      createdAt: { gte: oneHourAgo, lte: createdAt },
    },
  });

  if (recentCount >= 5) {
    return {
      expenseId,
      type: 'RAPID_SPENDING',
      severity: 'MEDIUM',
      description: `User submitted ${recentCount + 1} expenses within an hour`,
      context: {
        value: recentCount + 1,
        expected: 2,
        deviation: recentCount - 1,
        threshold: 5,
      },
    };
  }

  return null;
}

/**
 * Get statistical baseline for a category
 */
async function getCategoryBaseline(
  tenantId: string,
  categoryId: number,
): Promise<SpendingBaseline | null> {
  // Get all approved expenses for this category in the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      categoryId,
      status: { in: ['APPROVED', 'PAID'] },
      date: { gte: sixMonthsAgo },
    },
    select: { amount: true },
    include: {
      category: { select: { name: true } },
    },
  });

  if (expenses.length < 5) {
    return null;
  }

  const amounts = expenses.map((e) => Number(e.amount));
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    amounts.length;
  const stdDev = Math.sqrt(variance);

  // Get category name from first expense
  const category = await prisma.expenseCategory.findUnique({
    where: { id: categoryId },
    select: { name: true },
  });

  return {
    categoryId,
    categoryName: category?.name || 'Unknown',
    mean,
    stdDev: stdDev || mean * 0.3, // Default to 30% if no variation
    count: amounts.length,
    min: Math.min(...amounts),
    max: Math.max(...amounts),
  };
}

/**
 * Batch detect anomalies for multiple expenses
 */
export async function batchDetectAnomalies(
  expenseIds: number[],
): Promise<Map<number, AnomalyResult[]>> {
  const results = new Map<number, AnomalyResult[]>();

  for (const expenseId of expenseIds) {
    try {
      const anomalies = await detectExpenseAnomalies(expenseId);
      results.set(expenseId, anomalies);
    } catch (error) {
      console.error(
        `Error detecting anomalies for expense ${expenseId}:`,
        error,
      );
      results.set(expenseId, []);
    }
  }

  return results;
}

/**
 * Get anomaly statistics for the tenant
 */
export async function getAnomalyStats(params: {
  startDate?: string;
  endDate?: string;
}): Promise<AnomalyStats> {
  const tenantId = getTenantId();

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    aiAnomalyFlag: true,
    ...(params.startDate && { date: { gte: new Date(params.startDate) } }),
    ...(params.endDate && { date: { lte: new Date(params.endDate) } }),
  };

  const [totalExpenses, anomalyExpenses] = await Promise.all([
    prisma.expense.count({
      where: { tenantId },
    }),
    prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  // Detect anomalies for flagged expenses
  const recentAnomalies: AnomalyResult[] = [];
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };

  for (const expense of anomalyExpenses.slice(0, 20)) {
    const anomalies = await detectExpenseAnomalies(expense.id);
    for (const anomaly of anomalies) {
      byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;
      bySeverity[anomaly.severity]++;
      if (recentAnomalies.length < 10) {
        recentAnomalies.push(anomaly);
      }
    }
  }

  return {
    totalExpenses,
    anomalyCount: anomalyExpenses.length,
    anomalyRate: totalExpenses > 0 ? anomalyExpenses.length / totalExpenses : 0,
    byType: byType as Record<AnomalyType, number>,
    bySeverity,
    recentAnomalies,
  };
}

/**
 * Update expense anomaly flag based on detection
 */
export async function updateExpenseAnomalyFlag(
  expenseId: number,
  hasAnomaly: boolean,
): Promise<void> {
  const tenantId = getTenantId();

  await prisma.expense.updateMany({
    where: { id: expenseId, tenantId },
    data: { aiAnomalyFlag: hasAnomaly },
  });
}

/**
 * Automatically scan and flag anomalies for pending expenses
 */
export async function scanPendingExpenses(): Promise<{
  scanned: number;
  flagged: number;
}> {
  const tenantId = getTenantId();

  // Get pending expenses that haven't been scanned
  const pendingExpenses = await prisma.expense.findMany({
    where: {
      tenantId,
      status: 'PENDING',
    },
    select: { id: true },
  });

  let flagged = 0;

  for (const expense of pendingExpenses) {
    const anomalies = await detectExpenseAnomalies(expense.id);
    if (anomalies.length > 0) {
      await updateExpenseAnomalyFlag(expense.id, true);
      flagged++;
    }
  }

  return {
    scanned: pendingExpenses.length,
    flagged,
  };
}

/**
 * Get AI-powered insights about anomalies (uses OpenAI if available)
 */
export async function getAnomalyInsights(
  anomalies: AnomalyResult[],
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey || anomalies.length === 0) {
    // Return basic summary without AI
    const highCount = anomalies.filter((a) => a.severity === 'HIGH').length;
    const mediumCount = anomalies.filter((a) => a.severity === 'MEDIUM').length;
    const lowCount = anomalies.filter((a) => a.severity === 'LOW').length;

    return `Found ${anomalies.length} anomalies: ${highCount} high severity, ${mediumCount} medium, ${lowCount} low. Review flagged expenses for potential issues.`;
  }

  const prompt = `As a finance analyst, analyze these expense anomalies and provide a brief insight (2-3 sentences):

${JSON.stringify(anomalies.slice(0, 10), null, 2)}

Focus on patterns, potential issues, and recommended actions. Be concise.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content?.trim() ||
      'Unable to generate insights.'
    );
  } catch (error) {
    console.error('Error getting AI insights:', error);
    return `Found ${anomalies.length} anomalies requiring review.`;
  }
}
