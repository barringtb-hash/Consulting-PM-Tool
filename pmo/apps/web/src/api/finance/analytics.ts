/**
 * Finance Analytics API Client
 */

import { http } from '../http';

// Types
export interface DashboardOverview {
  totalExpenses: number;
  totalExpenseAmount: number;
  pendingApprovals: number;
  pendingAmount: number;
  activeBudgets: number;
  budgetUtilization: number;
  recurringMonthlyCost: number;
  expensesTrend: number;
}

export interface SpendingByCategory {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SpendingTrend {
  period: string;
  total: number;
  count: number;
  approved: number;
  pending: number;
}

export interface AccountProfitability {
  accountId: number;
  accountName: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

export interface ExpensesByAccount {
  accountId: number;
  accountName: string;
  total: number;
  count: number;
}

export interface TopVendor {
  vendorName: string;
  total: number;
  count: number;
}

// API Functions
export async function getDashboardOverview(
  params: {
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<DashboardOverview> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/analytics/overview?${searchParams.toString()}`);
}

export async function getSpendingByCategory(
  params: {
    startDate?: string;
    endDate?: string;
    accountId?: number;
  } = {},
): Promise<{ categories: SpendingByCategory[] }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/analytics/by-category?${searchParams.toString()}`);
}

export async function getSpendingTrends(
  params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    accountId?: number;
  } = {},
): Promise<{ trends: SpendingTrend[] }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/analytics/trends?${searchParams.toString()}`);
}

export async function getAccountProfitability(
  params: {
    startDate?: string;
    endDate?: string;
    accountIds?: number[];
  } = {},
): Promise<{ accounts: AccountProfitability[] }> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.accountIds?.length) {
    searchParams.append('accountIds', params.accountIds.join(','));
  }
  return http.get(
    `/finance/analytics/profitability?${searchParams.toString()}`,
  );
}

export async function getExpensesByAccount(
  params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {},
): Promise<{ accounts: ExpensesByAccount[] }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/analytics/by-account?${searchParams.toString()}`);
}

export async function getTopVendors(
  params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {},
): Promise<{ vendors: TopVendor[] }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/analytics/top-vendors?${searchParams.toString()}`);
}
