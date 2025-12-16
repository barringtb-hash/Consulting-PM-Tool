/**
 * Finance AI API Client
 */

import http from '../http';

// Types
export interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reason: string;
}

export interface CategorizationResult {
  suggestions: CategorySuggestion[];
  usedAI: boolean;
}

export interface AnomalyResult {
  expenseId: number;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  context: {
    value: number;
    expected: number;
    deviation: number;
    threshold: number;
  };
}

export interface AnomalyStats {
  totalExpenses: number;
  anomalyCount: number;
  anomalyRate: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentAnomalies: AnomalyResult[];
}

export interface ForecastResult {
  period: string;
  startDate: string;
  endDate: string;
  predictedAmount: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  method: string;
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

export interface FinancialInsights {
  summary: string;
  keyMetrics: Array<{ label: string; value: string; trend: string }>;
  recommendations: string[];
}

// API Functions

export async function suggestCategory(
  description: string,
  vendorName?: string,
  amount?: number,
): Promise<CategorizationResult> {
  return http('/finance/ai/categorize', {
    method: 'POST',
    body: JSON.stringify({ description, vendorName, amount }),
  });
}

export async function bulkCategorize(
  expenses: Array<{
    id: number;
    description: string;
    vendorName?: string;
    amount?: number;
  }>,
): Promise<Record<number, CategorizationResult>> {
  const response = await http('/finance/ai/categorize/bulk', {
    method: 'POST',
    body: JSON.stringify({ expenses }),
  });
  return response.results;
}

export async function recordCategorizationFeedback(params: {
  expenseId: number;
  suggestedCategoryId: number;
  actualCategoryId: number;
  wasAccepted: boolean;
}): Promise<void> {
  await http('/finance/ai/categorize/feedback', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function detectExpenseAnomalies(
  expenseId: number,
): Promise<{ anomalies: AnomalyResult[] }> {
  return http(`/finance/ai/anomalies/${expenseId}`);
}

export async function getAnomalyStats(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnomalyStats> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const query = searchParams.toString();
  return http(`/finance/ai/anomalies/stats${query ? `?${query}` : ''}`);
}

export async function scanForAnomalies(): Promise<{
  scanned: number;
  flagged: number;
}> {
  return http('/finance/ai/anomalies/scan', {
    method: 'POST',
  });
}

export async function getAnomalyInsights(
  anomalies: AnomalyResult[],
): Promise<{ insights: string }> {
  return http('/finance/ai/anomalies/insights', {
    method: 'POST',
    body: JSON.stringify({ anomalies }),
  });
}

export async function getSpendingForecast(params?: {
  periods?: number;
  periodType?: 'MONTH' | 'QUARTER';
  categoryId?: number;
}): Promise<SpendingForecast> {
  const searchParams = new URLSearchParams();
  if (params?.periods) searchParams.set('periods', params.periods.toString());
  if (params?.periodType) searchParams.set('periodType', params.periodType);
  if (params?.categoryId)
    searchParams.set('categoryId', params.categoryId.toString());

  const query = searchParams.toString();
  return http(`/finance/ai/forecast${query ? `?${query}` : ''}`);
}

export async function getBudgetRecommendations(): Promise<{
  recommendations: BudgetRecommendation[];
}> {
  return http('/finance/ai/budget-recommendations');
}

export async function getCashFlowProjection(params?: {
  days?: number;
  startingBalance?: number;
}): Promise<{ projection: CashFlowProjection[] }> {
  const searchParams = new URLSearchParams();
  if (params?.days) searchParams.set('days', params.days.toString());
  if (params?.startingBalance)
    searchParams.set('startingBalance', params.startingBalance.toString());

  const query = searchParams.toString();
  return http(`/finance/ai/cash-flow${query ? `?${query}` : ''}`);
}

export async function getFinancialInsights(): Promise<FinancialInsights> {
  return http('/finance/ai/insights');
}
