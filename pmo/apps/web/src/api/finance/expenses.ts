/**
 * Expense API Client
 */

import { http } from '../http';

// Types
export interface ExpenseCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Expense {
  id: number;
  tenantId: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  category: ExpenseCategory;
  account?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  budget?: { id: number; name: string } | null;
  owner: { id: number; name: string };
  approver?: { id: number; name: string } | null;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  tags: string[];
  notes?: string | null;
  aiAnomalyFlag: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  currency?: string;
  date: string;
  categoryId: number;
  accountId?: number;
  projectId?: number;
  opportunityId?: number;
  budgetId?: number;
  vendorName?: string;
  vendorId?: string;
  invoiceNumber?: string;
  tags?: string[];
  notes?: string;
  attachments?: Array<{ url: string; filename: string; type: string }>;
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
  status?: Expense['status'];
}

export interface ListExpensesParams {
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  status?: Expense['status'];
  categoryId?: number;
  accountId?: number;
  projectId?: number;
  budgetId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    total: number;
    count: number;
  }>;
}

// API Functions
export async function listExpenses(
  params: ListExpensesParams = {},
): Promise<{ expenses: Expense[]; total: number; pages: number }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/expenses?${searchParams.toString()}`);
}

export async function getExpense(id: number): Promise<{ expense: Expense }> {
  return http.get(`/finance/expenses/${id}`);
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<{ expense: Expense }> {
  return http.post('/finance/expenses', input);
}

export async function updateExpense(
  id: number,
  input: UpdateExpenseInput,
): Promise<{ expense: Expense }> {
  return http.put(`/finance/expenses/${id}`, input);
}

export async function deleteExpense(id: number): Promise<void> {
  return http.delete(`/finance/expenses/${id}`);
}

export async function approveExpense(
  id: number,
  notes?: string,
): Promise<{ expense: Expense }> {
  return http.post(`/finance/expenses/${id}/approve`, { notes });
}

export async function rejectExpense(
  id: number,
  reason: string,
): Promise<{ expense: Expense }> {
  return http.post(`/finance/expenses/${id}/reject`, { reason });
}

export async function markExpenseAsPaid(
  id: number,
): Promise<{ expense: Expense }> {
  return http.post(`/finance/expenses/${id}/paid`, {});
}

export async function getExpenseStats(
  params: {
    startDate?: string;
    endDate?: string;
    accountId?: number;
  } = {},
): Promise<ExpenseStats> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/expenses/stats?${searchParams.toString()}`);
}
