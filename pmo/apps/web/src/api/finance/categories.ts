/**
 * Expense Category API Client
 */

import { http } from '../http';

// Types
export interface ExpenseCategory {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  isSystem: boolean;
  isActive: boolean;
  parentId?: number | null;
  children?: ExpenseCategory[];
  _count?: { expenses: number; budgets: number; recurringCosts: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  isActive?: boolean;
}

export interface ListCategoriesParams {
  includeInactive?: boolean;
  parentId?: number;
}

// API Functions
export async function listCategories(
  params: ListCategoriesParams = {},
): Promise<{ categories: ExpenseCategory[]; total: number }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return http.get(`/finance/categories?${searchParams.toString()}`);
}

export async function getCategory(
  id: number,
): Promise<{ category: ExpenseCategory }> {
  return http.get(`/finance/categories/${id}`);
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<{ category: ExpenseCategory }> {
  return http.post('/finance/categories', input);
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput,
): Promise<{ category: ExpenseCategory }> {
  return http.put(`/finance/categories/${id}`, input);
}

export async function deleteCategory(id: number): Promise<void> {
  return http.delete(`/finance/categories/${id}`);
}
