/**
 * Budget Service
 *
 * Business logic for managing budgets.
 * Supports budget periods, alerts, and rollover.
 */

import { Prisma, BudgetStatus } from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';
import type {
  CreateBudgetInput,
  UpdateBudgetInput,
  ListBudgetsInput,
} from '../../../validation/finance';

// ============================================================================
// TYPES
// ============================================================================

export interface BudgetWithRelations {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  amount: Prisma.Decimal;
  spent: Prisma.Decimal;
  currency: string;
  period: string;
  startDate: Date;
  endDate?: Date | null;
  status: BudgetStatus;
  alertThresholds: number[];
  allowRollover: boolean;
  rolloverAmount: Prisma.Decimal;
  account?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  category?: { id: number; name: string; color: string } | null;
  owner: { id: number; name: string };
  _count: { expenses: number };
  percentUsed: number;
  remaining: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BUDGET SERVICE
// ============================================================================

export async function listBudgets(
  params: ListBudgetsInput,
): Promise<{ budgets: BudgetWithRelations[]; total: number; pages: number }> {
  const tenantId = getTenantId();
  const {
    page = 1,
    limit = 50,
    sortBy = 'startDate',
    sortOrder = 'desc',
    status,
    period,
    accountId,
    projectId,
    categoryId,
    search,
  } = params;

  const where: Prisma.BudgetWhereInput = {
    tenantId,
    ...(status && { status }),
    ...(period && { period }),
    ...(accountId && { accountId }),
    ...(projectId && { projectId }),
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        account: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true } },
        _count: { select: { expenses: true } },
      },
    }),
    prisma.budget.count({ where }),
  ]);

  // Calculate derived fields
  const budgetsWithDerived = budgets.map((budget) => {
    const amount = Number(budget.amount);
    const spent = Number(budget.spent);
    const rollover = Number(budget.rolloverAmount);
    const totalBudget = amount + rollover;
    return {
      ...budget,
      alertThresholds: budget.alertThresholds as number[],
      percentUsed:
        totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
      remaining: totalBudget - spent,
    };
  });

  return {
    budgets: budgetsWithDerived as unknown as BudgetWithRelations[],
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getBudgetById(
  id: number,
): Promise<BudgetWithRelations | null> {
  const tenantId = getTenantId();

  const budget = await prisma.budget.findFirst({
    where: { id, tenantId },
    include: {
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      owner: { select: { id: true, name: true } },
      expenses: {
        take: 10,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          status: true,
        },
      },
      _count: { select: { expenses: true } },
    },
  });

  if (!budget) return null;

  const amount = Number(budget.amount);
  const spent = Number(budget.spent);
  const rollover = Number(budget.rolloverAmount);
  const totalBudget = amount + rollover;

  return {
    ...budget,
    alertThresholds: budget.alertThresholds as number[],
    percentUsed: totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
    remaining: totalBudget - spent,
  } as unknown as BudgetWithRelations;
}

export async function createBudget(
  input: CreateBudgetInput,
  ownerId: number,
): Promise<BudgetWithRelations> {
  const tenantId = getTenantId();

  // Validate account if provided
  if (input.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: input.accountId, tenantId },
    });
    if (!account) {
      throw new Error('Account not found');
    }
  }

  // Validate project if provided
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, tenantId },
    });
    if (!project) {
      throw new Error('Project not found');
    }
  }

  // Validate category if provided
  if (input.categoryId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: input.categoryId, tenantId, isActive: true },
    });
    if (!category) {
      throw new Error('Category not found or inactive');
    }
  }

  const budget = await prisma.budget.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      period: input.period,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      accountId: input.accountId,
      projectId: input.projectId,
      categoryId: input.categoryId,
      alertThresholds: input.alertThresholds,
      allowRollover: input.allowRollover,
      ownerId,
      status: 'ACTIVE',
    },
    include: {
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      owner: { select: { id: true, name: true } },
      _count: { select: { expenses: true } },
    },
  });

  return {
    ...budget,
    alertThresholds: budget.alertThresholds as number[],
    percentUsed: 0,
    remaining: Number(budget.amount),
  } as unknown as BudgetWithRelations;
}

export async function updateBudget(
  id: number,
  input: UpdateBudgetInput,
): Promise<BudgetWithRelations> {
  const tenantId = getTenantId();

  const existing = await prisma.budget.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Budget not found');
  }

  // Validate account if being changed
  if (input.accountId !== undefined && input.accountId !== existing.accountId) {
    if (input.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: input.accountId, tenantId },
      });
      if (!account) {
        throw new Error('Account not found');
      }
    }
  }

  const budget = await prisma.budget.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      period: input.period,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      accountId: input.accountId,
      projectId: input.projectId,
      categoryId: input.categoryId,
      alertThresholds: input.alertThresholds,
      allowRollover: input.allowRollover,
      status: input.status,
    },
    include: {
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      owner: { select: { id: true, name: true } },
      _count: { select: { expenses: true } },
    },
  });

  const amount = Number(budget.amount);
  const spent = Number(budget.spent);
  const rollover = Number(budget.rolloverAmount);
  const totalBudget = amount + rollover;

  return {
    ...budget,
    alertThresholds: budget.alertThresholds as number[],
    percentUsed: totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
    remaining: totalBudget - spent,
  } as unknown as BudgetWithRelations;
}

export async function deleteBudget(id: number): Promise<void> {
  const tenantId = getTenantId();

  const existing = await prisma.budget.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { expenses: true } } },
  });

  if (!existing) {
    throw new Error('Budget not found');
  }

  if (existing._count.expenses > 0) {
    throw new Error(
      'Cannot delete budget with linked expenses. Close it instead.',
    );
  }

  await prisma.budget.delete({ where: { id } });
}

export async function getBudgetExpenses(
  id: number,
  params: { page?: number; limit?: number },
): Promise<{
  expenses: Array<{
    id: number;
    description: string;
    amount: Prisma.Decimal;
    date: Date;
    status: string;
    category: { name: string };
    owner: { name: string };
  }>;
  total: number;
}> {
  const tenantId = getTenantId();
  const { page = 1, limit = 20 } = params;

  const budget = await prisma.budget.findFirst({
    where: { id, tenantId },
  });

  if (!budget) {
    throw new Error('Budget not found');
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: { budgetId: id },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        status: true,
        category: { select: { name: true } },
        owner: { select: { name: true } },
      },
    }),
    prisma.expense.count({ where: { budgetId: id } }),
  ]);

  return { expenses, total };
}

export async function getBudgetStats(): Promise<{
  totalBudgets: number;
  activeBudgets: number;
  totalBudgeted: number;
  totalSpent: number;
  overBudgetCount: number;
}> {
  const tenantId = getTenantId();

  const budgets = await prisma.budget.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { amount: true, spent: true, rolloverAmount: true },
  });

  const totalBudgeted = budgets.reduce(
    (sum, b) => sum + Number(b.amount) + Number(b.rolloverAmount),
    0,
  );
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);
  const overBudgetCount = budgets.filter(
    (b) => Number(b.spent) > Number(b.amount) + Number(b.rolloverAmount),
  ).length;

  const totalCount = await prisma.budget.count({ where: { tenantId } });

  return {
    totalBudgets: totalCount,
    activeBudgets: budgets.length,
    totalBudgeted,
    totalSpent,
    overBudgetCount,
  };
}
