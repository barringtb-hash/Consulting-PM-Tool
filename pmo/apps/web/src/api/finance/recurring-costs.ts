/**
 * Recurring Cost API Client
 */

import { http } from '../http';

// Types
export type RecurringCostType =
  | 'SUBSCRIPTION'
  | 'LICENSE'
  | 'PAYROLL'
  | 'BENEFITS'
  | 'CONTRACTOR'
  | 'RENT'
  | 'UTILITIES'
  | 'INSURANCE'
  | 'MAINTENANCE'
  | 'OTHER';

export type RecurringFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY';

export type RecurringCostStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface RecurringCost {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  type: RecurringCostType;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  billingDay?: number | null;
  startDate: string;
  endDate?: string | null;
  nextDueDate: string;
  status: RecurringCostStatus;
  vendorName?: string | null;
  vendorUrl?: string | null;
  contractNumber?: string | null;
  seatCount?: number | null;
  costPerSeat?: number | null;
  department?: string | null;
  autoRenew: boolean;
  renewalAlertDays: number;
  /** Expanded account relation from API response */
  account?: { id: number; name: string } | null;
  /** Expanded project relation from API response */
  project?: { id: number; name: string } | null;
  /** Raw project ID for filtering/updates (redundant with project.id when project is expanded) */
  projectId?: number | null;
  category: { id: number; name: string; color: string };
  employee?: { id: number; name: string } | null;
  owner: { id: number; name: string };
  _count: { expenses: number };
  /** Calculated annual cost based on amount and frequency */
  annualCost: number;
  notes?: string | null;
  /** When true, automatically creates an expense when this recurring cost is due */
  autoCreateExpense?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringCostInput {
  name: string;
  description?: string;
  type: RecurringCostType;
  amount: number;
  currency?: string;
  frequency: RecurringFrequency;
  billingDay?: number;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  accountId?: number;
  categoryId: number;
  vendorName?: string;
  vendorUrl?: string;
  contractNumber?: string;
  seatCount?: number;
  costPerSeat?: number;
  employeeId?: number;
  department?: string;
  autoRenew?: boolean;
  renewalAlertDays?: number;
}

export interface UpdateRecurringCostInput extends Partial<CreateRecurringCostInput> {
  status?: RecurringCostStatus;
}

export interface ListRecurringCostsParams {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'amount' | 'nextDueDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  status?: RecurringCostStatus;
  type?: RecurringCostType;
  accountId?: number;
  categoryId?: number;
  search?: string;
  dueBefore?: string;
}

export interface RecurringCostStats {
  totalCosts: number;
  activeCosts: number;
  monthlyTotal: number;
  annualTotal: number;
  upcomingRenewalsCount?: number;
  byType: Array<{ type: string; count: number; monthlyTotal: number }>;
}

// API Functions
export async function listRecurringCosts(
  params: ListRecurringCostsParams = {},
): Promise<{ costs: RecurringCost[]; total: number; pages: number }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/recurring-costs?${searchParams.toString()}`);
}

export async function getRecurringCost(
  id: number,
): Promise<{ cost: RecurringCost }> {
  return http.get(`/finance/recurring-costs/${id}`);
}

export async function createRecurringCost(
  input: CreateRecurringCostInput,
): Promise<{ cost: RecurringCost }> {
  return http.post('/finance/recurring-costs', input);
}

export async function updateRecurringCost(
  id: number,
  input: UpdateRecurringCostInput,
): Promise<{ cost: RecurringCost }> {
  return http.put(`/finance/recurring-costs/${id}`, input);
}

export async function deleteRecurringCost(id: number): Promise<void> {
  return http.delete(`/finance/recurring-costs/${id}`);
}

export async function generateExpenseFromRecurringCost(
  id: number,
): Promise<{ expenseId: number }> {
  return http.post(`/finance/recurring-costs/${id}/generate`, {});
}

export async function getUpcomingRenewals(
  days: number = 30,
): Promise<{ costs: RecurringCost[] }> {
  return http.get(`/finance/recurring-costs/upcoming?days=${days}`);
}

export async function getRecurringCostStats(): Promise<RecurringCostStats> {
  return http.get('/finance/recurring-costs/stats');
}
