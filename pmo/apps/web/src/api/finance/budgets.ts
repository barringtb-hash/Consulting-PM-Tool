/**
 * Budget API Client
 */

import { http } from '../http';

// Types
export interface Budget {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  amount: number;
  spent: number;
  currency: string;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  endDate?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  alertThresholds: number[];
  allowRollover: boolean;
  rolloverAmount: number;
  account?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  category?: { id: number; name: string; color: string } | null;
  owner: { id: number; name: string };
  _count: { expenses: number };
  percentUsed: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetInput {
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  period: Budget['period'];
  startDate: string;
  endDate?: string;
  accountId?: number;
  projectId?: number;
  categoryId?: number;
  alertThresholds?: number[];
  allowRollover?: boolean;
}

export interface UpdateBudgetInput extends Partial<CreateBudgetInput> {
  status?: Budget['status'];
}

export interface ListBudgetsParams {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'amount' | 'spent' | 'startDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  status?: Budget['status'];
  period?: Budget['period'];
  accountId?: number;
  projectId?: number;
  categoryId?: number;
  search?: string;
}

export interface BudgetStats {
  totalBudgets: number;
  activeBudgets: number;
  totalBudgeted: number;
  totalSpent: number;
  overBudgetCount: number;
}

export interface BudgetExpense {
  id: number;
  description: string;
  amount: number;
  date: string;
  status: string;
  category: { name: string };
  owner: { name: string };
}

// API Functions
export async function listBudgets(
  params: ListBudgetsParams = {},
): Promise<{ budgets: Budget[]; total: number; pages: number }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/budgets?${searchParams.toString()}`);
}

export async function getBudget(id: number): Promise<{ budget: Budget }> {
  return http.get(`/finance/budgets/${id}`);
}

export async function createBudget(
  input: CreateBudgetInput,
): Promise<{ budget: Budget }> {
  return http.post('/finance/budgets', input);
}

export async function updateBudget(
  id: number,
  input: UpdateBudgetInput,
): Promise<{ budget: Budget }> {
  return http.put(`/finance/budgets/${id}`, input);
}

export async function deleteBudget(id: number): Promise<void> {
  return http.delete(`/finance/budgets/${id}`);
}

export async function getBudgetExpenses(
  id: number,
  params: { page?: number; limit?: number } = {},
): Promise<{ expenses: BudgetExpense[]; total: number }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/budgets/${id}/expenses?${searchParams.toString()}`);
}

export async function getBudgetStats(): Promise<BudgetStats> {
  return http.get('/finance/budgets/stats');
}
