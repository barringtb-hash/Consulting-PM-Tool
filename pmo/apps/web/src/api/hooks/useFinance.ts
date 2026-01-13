/**
 * Finance React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as expensesApi from '../finance/expenses';
import * as budgetsApi from '../finance/budgets';
import * as recurringCostsApi from '../finance/recurring-costs';
import * as categoriesApi from '../finance/categories';
import * as analyticsApi from '../finance/analytics';
import * as aiApi from '../finance/ai';

// Query Keys
export const financeKeys = {
  all: ['finance'] as const,
  expenses: () => [...financeKeys.all, 'expenses'] as const,
  expenseList: (params: expensesApi.ListExpensesParams) =>
    [...financeKeys.expenses(), 'list', params] as const,
  expenseDetail: (id: number) =>
    [...financeKeys.expenses(), 'detail', id] as const,
  expenseStats: (params?: {
    startDate?: string;
    endDate?: string;
    accountId?: number;
  }) => [...financeKeys.expenses(), 'stats', params] as const,
  budgets: () => [...financeKeys.all, 'budgets'] as const,
  budgetList: (params: budgetsApi.ListBudgetsParams) =>
    [...financeKeys.budgets(), 'list', params] as const,
  budgetDetail: (id: number) =>
    [...financeKeys.budgets(), 'detail', id] as const,
  budgetStats: () => [...financeKeys.budgets(), 'stats'] as const,
  budgetExpenses: (id: number, params: { page?: number; limit?: number }) =>
    [...financeKeys.budgets(), id, 'expenses', params] as const,
  recurringCosts: () => [...financeKeys.all, 'recurringCosts'] as const,
  recurringCostList: (params: recurringCostsApi.ListRecurringCostsParams) =>
    [...financeKeys.recurringCosts(), 'list', params] as const,
  recurringCostDetail: (id: number) =>
    [...financeKeys.recurringCosts(), 'detail', id] as const,
  recurringCostStats: () => [...financeKeys.recurringCosts(), 'stats'] as const,
  upcomingRenewals: (days: number) =>
    [...financeKeys.recurringCosts(), 'upcoming', days] as const,
  categories: () => [...financeKeys.all, 'categories'] as const,
  categoryList: (params: categoriesApi.ListCategoriesParams) =>
    [...financeKeys.categories(), 'list', params] as const,
  categoryDetail: (id: number) =>
    [...financeKeys.categories(), 'detail', id] as const,
  analytics: () => [...financeKeys.all, 'analytics'] as const,
  dashboardOverview: (params?: { startDate?: string; endDate?: string }) =>
    [...financeKeys.analytics(), 'overview', params] as const,
  spendingByCategory: (params?: {
    startDate?: string;
    endDate?: string;
    accountId?: number;
  }) => [...financeKeys.analytics(), 'byCategory', params] as const,
  spendingTrends: (params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    accountId?: number;
  }) => [...financeKeys.analytics(), 'trends', params] as const,
  accountProfitability: (params?: {
    startDate?: string;
    endDate?: string;
    accountIds?: number[];
  }) => [...financeKeys.analytics(), 'profitability', params] as const,
};

// ============================================================================
// EXPENSE HOOKS
// ============================================================================

export function useExpenses(params: expensesApi.ListExpensesParams = {}) {
  return useQuery({
    queryKey: financeKeys.expenseList(params),
    queryFn: () => expensesApi.listExpenses(params),
  });
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: financeKeys.expenseDetail(id),
    queryFn: () => expensesApi.getExpense(id),
    select: (data) => data.expense,
    enabled: id > 0,
  });
}

export function useExpenseStats(params?: {
  startDate?: string;
  endDate?: string;
  accountId?: number;
}) {
  return useQuery({
    queryKey: financeKeys.expenseStats(params),
    queryFn: () => expensesApi.getExpenseStats(params || {}),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: expensesApi.UpdateExpenseInput;
    }) => expensesApi.updateExpense(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({
        queryKey: financeKeys.expenseDetail(id),
      });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      expensesApi.approveExpense(id, notes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({
        queryKey: financeKeys.expenseDetail(id),
      });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useRejectExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      expensesApi.rejectExpense(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({
        queryKey: financeKeys.expenseDetail(id),
      });
    },
  });
}

export function useMarkExpenseAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.markExpenseAsPaid,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({
        queryKey: financeKeys.expenseDetail(id),
      });
    },
  });
}

// ============================================================================
// BUDGET HOOKS
// ============================================================================

export function useBudgets(params: budgetsApi.ListBudgetsParams = {}) {
  return useQuery({
    queryKey: financeKeys.budgetList(params),
    queryFn: () => budgetsApi.listBudgets(params),
  });
}

export function useBudget(id: number) {
  return useQuery({
    queryKey: financeKeys.budgetDetail(id),
    queryFn: () => budgetsApi.getBudget(id),
    select: (data) => data.budget,
    enabled: id > 0,
  });
}

export function useBudgetStats() {
  return useQuery({
    queryKey: financeKeys.budgetStats(),
    queryFn: budgetsApi.getBudgetStats,
  });
}

export function useBudgetExpenses(
  id: number,
  params: { page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: financeKeys.budgetExpenses(id, params),
    queryFn: () => budgetsApi.getBudgetExpenses(id, params),
    enabled: id > 0,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: budgetsApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: budgetsApi.UpdateBudgetInput;
    }) => budgetsApi.updateBudget(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets() });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgetDetail(id) });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: budgetsApi.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

// ============================================================================
// RECURRING COST HOOKS
// ============================================================================

export function useRecurringCosts(
  params: recurringCostsApi.ListRecurringCostsParams = {},
) {
  return useQuery({
    queryKey: financeKeys.recurringCostList(params),
    queryFn: () => recurringCostsApi.listRecurringCosts(params),
  });
}

export function useRecurringCost(id: number) {
  return useQuery({
    queryKey: financeKeys.recurringCostDetail(id),
    queryFn: () => recurringCostsApi.getRecurringCost(id),
    select: (data) => data.cost,
    enabled: id > 0,
  });
}

export function useRecurringCostStats() {
  return useQuery({
    queryKey: financeKeys.recurringCostStats(),
    queryFn: recurringCostsApi.getRecurringCostStats,
  });
}

export function useUpcomingRenewals(days: number = 30) {
  return useQuery({
    queryKey: financeKeys.upcomingRenewals(days),
    queryFn: () => recurringCostsApi.getUpcomingRenewals(days),
  });
}

export function useCreateRecurringCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recurringCostsApi.createRecurringCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurringCosts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useUpdateRecurringCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: recurringCostsApi.UpdateRecurringCostInput;
    }) => recurringCostsApi.updateRecurringCost(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurringCosts() });
      queryClient.invalidateQueries({
        queryKey: financeKeys.recurringCostDetail(id),
      });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useDeleteRecurringCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recurringCostsApi.deleteRecurringCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurringCosts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

export function useGenerateExpenseFromRecurringCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recurringCostsApi.generateExpenseFromRecurringCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurringCosts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.analytics() });
    },
  });
}

// ============================================================================
// CATEGORY HOOKS
// ============================================================================

export function useCategories(params: categoriesApi.ListCategoriesParams = {}) {
  return useQuery({
    queryKey: financeKeys.categoryList(params),
    queryFn: () => categoriesApi.listCategories(params),
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: financeKeys.categoryDetail(id),
    queryFn: () => categoriesApi.getCategory(id),
    select: (data) => data.category,
    enabled: id > 0,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: categoriesApi.UpdateCategoryInput;
    }) => categoriesApi.updateCategory(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories() });
      queryClient.invalidateQueries({
        queryKey: financeKeys.categoryDetail(id),
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories() });
    },
  });
}

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

export function useDashboardOverview(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: financeKeys.dashboardOverview(params),
    queryFn: () => analyticsApi.getDashboardOverview(params || {}),
  });
}

export function useSpendingByCategory(params?: {
  startDate?: string;
  endDate?: string;
  accountId?: number;
}) {
  return useQuery({
    queryKey: financeKeys.spendingByCategory(params),
    queryFn: () => analyticsApi.getSpendingByCategory(params || {}),
  });
}

export function useSpendingTrends(params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
  accountId?: number;
}) {
  return useQuery({
    queryKey: financeKeys.spendingTrends(params),
    queryFn: () => analyticsApi.getSpendingTrends(params || {}),
  });
}

export function useAccountProfitability(params?: {
  startDate?: string;
  endDate?: string;
  accountIds?: number[];
}) {
  return useQuery({
    queryKey: financeKeys.accountProfitability(params),
    queryFn: () => analyticsApi.getAccountProfitability(params || {}),
  });
}

export function useExpensesByAccount(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...financeKeys.analytics(), 'byAccount', params],
    queryFn: () => analyticsApi.getExpensesByAccount(params || {}),
  });
}

export function useTopVendors(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...financeKeys.analytics(), 'topVendors', params],
    queryFn: () => analyticsApi.getTopVendors(params || {}),
  });
}

// ============================================================================
// AI HOOKS
// ============================================================================

export function useCategorySuggestions(
  description: string,
  vendorName?: string,
  amount?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...financeKeys.all,
      'ai',
      'categorize',
      description,
      vendorName,
      amount,
    ],
    queryFn: () => aiApi.suggestCategory(description, vendorName, amount),
    enabled: enabled && description.length > 3,
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useBulkCategorize() {
  return useMutation({
    mutationFn: aiApi.bulkCategorize,
  });
}

export function useRecordCategorizationFeedback() {
  return useMutation({
    mutationFn: aiApi.recordCategorizationFeedback,
  });
}

export function useExpenseAnomalies(expenseId: number) {
  return useQuery({
    queryKey: [...financeKeys.all, 'ai', 'anomalies', expenseId],
    queryFn: () => aiApi.detectExpenseAnomalies(expenseId),
    enabled: expenseId > 0,
  });
}

export function useAnomalyStats(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: [...financeKeys.all, 'ai', 'anomalyStats', params],
    queryFn: () => aiApi.getAnomalyStats(params),
  });
}

export function useScanAnomalies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiApi.scanForAnomalies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
    },
  });
}

export function useAnomalyInsights() {
  return useMutation({
    mutationFn: (anomalies: aiApi.AnomalyResult[]) =>
      aiApi.getAnomalyInsights(anomalies),
  });
}

export function useSpendingForecast(params?: {
  periods?: number;
  periodType?: 'MONTH' | 'QUARTER';
  categoryId?: number;
}) {
  return useQuery({
    queryKey: [...financeKeys.all, 'ai', 'forecast', params],
    queryFn: () => aiApi.getSpendingForecast(params),
  });
}

export function useBudgetRecommendations() {
  return useQuery({
    queryKey: [...financeKeys.all, 'ai', 'budgetRecommendations'],
    queryFn: aiApi.getBudgetRecommendations,
  });
}

export function useCashFlowProjection(params?: {
  days?: number;
  startingBalance?: number;
}) {
  return useQuery({
    queryKey: [...financeKeys.all, 'ai', 'cashFlow', params],
    queryFn: () => aiApi.getCashFlowProjection(params),
  });
}

export function useFinancialInsights() {
  return useQuery({
    queryKey: [...financeKeys.all, 'ai', 'insights'],
    queryFn: aiApi.getFinancialInsights,
  });
}
