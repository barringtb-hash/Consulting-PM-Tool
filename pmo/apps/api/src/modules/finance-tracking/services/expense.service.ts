/**
 * Expense Service
 *
 * Business logic for managing individual expense records.
 * Supports CRUD, approval workflow, and budget tracking.
 */

import { Prisma, ExpenseStatus } from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesInput,
} from '../../../validation/finance';

// ============================================================================
// TYPES
// ============================================================================

export interface ExpenseWithRelations {
  id: number;
  tenantId: string;
  description: string;
  amount: Prisma.Decimal;
  currency: string;
  date: Date;
  status: ExpenseStatus;
  category: { id: number; name: string; color: string; icon: string };
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
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// EXPENSE SERVICE
// ============================================================================

export async function listExpenses(
  params: ListExpensesInput,
): Promise<{ expenses: ExpenseWithRelations[]; total: number; pages: number }> {
  const tenantId = getTenantId();
  const {
    page = 1,
    limit = 50,
    sortBy = 'date',
    sortOrder = 'desc',
    status,
    categoryId,
    accountId,
    projectId,
    budgetId,
    startDate,
    endDate,
    search,
    minAmount,
    maxAmount,
  } = params;

  // Build date filter separately to avoid self-reference
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (startDate || endDate) {
    dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
  }

  // Build amount filter separately to avoid self-reference
  let amountFilter: { gte?: number; lte?: number } | undefined;
  if (minAmount !== undefined || maxAmount !== undefined) {
    amountFilter = {};
    if (minAmount !== undefined) amountFilter.gte = minAmount;
    if (maxAmount !== undefined) amountFilter.lte = maxAmount;
  }

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    ...(status && { status }),
    ...(categoryId && { categoryId }),
    ...(accountId && { accountId }),
    ...(projectId && { projectId }),
    ...(budgetId && { budgetId }),
    ...(dateFilter && { date: dateFilter }),
    ...(amountFilter && { amount: amountFilter }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        account: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        budget: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses: expenses as unknown as ExpenseWithRelations[],
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getExpenseById(
  id: number,
): Promise<ExpenseWithRelations | null> {
  const tenantId = getTenantId();

  const expense = await prisma.expense.findFirst({
    where: { id, tenantId },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true } },
      budget: { select: { id: true, name: true } },
      recurringCost: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  return expense as unknown as ExpenseWithRelations | null;
}

export async function createExpense(
  input: CreateExpenseInput,
  ownerId: number,
): Promise<ExpenseWithRelations> {
  const tenantId = getTenantId();

  // Validate category exists
  const category = await prisma.expenseCategory.findFirst({
    where: { id: input.categoryId, tenantId, isActive: true },
  });
  if (!category) {
    throw new Error('Category not found or inactive');
  }

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

  // Validate budget if provided and update spent amount
  if (input.budgetId) {
    const budget = await prisma.budget.findFirst({
      where: { id: input.budgetId, tenantId, status: 'ACTIVE' },
    });
    if (!budget) {
      throw new Error('Budget not found or not active');
    }
  }

  const expense = await prisma.expense.create({
    data: {
      tenantId,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      date: new Date(input.date),
      categoryId: input.categoryId,
      accountId: input.accountId,
      projectId: input.projectId,
      opportunityId: input.opportunityId,
      budgetId: input.budgetId,
      vendorName: input.vendorName,
      vendorId: input.vendorId,
      invoiceNumber: input.invoiceNumber,
      tags: input.tags,
      notes: input.notes,
      attachments: input.attachments,
      allocations: input.allocations,
      ownerId,
      status: 'PENDING',
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      budget: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  return expense as unknown as ExpenseWithRelations;
}

export async function updateExpense(
  id: number,
  input: UpdateExpenseInput,
  userId: number,
): Promise<ExpenseWithRelations> {
  const tenantId = getTenantId();

  const existing = await prisma.expense.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Expense not found');
  }

  // Only owner can update, and only if not yet approved
  if (existing.ownerId !== userId) {
    throw new Error('Only the expense owner can update it');
  }

  if (existing.status === 'APPROVED' || existing.status === 'PAID') {
    throw new Error('Cannot update approved or paid expenses');
  }

  // Validate category if being changed
  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: input.categoryId, tenantId, isActive: true },
    });
    if (!category) {
      throw new Error('Category not found or inactive');
    }
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      date: input.date ? new Date(input.date) : undefined,
      categoryId: input.categoryId,
      accountId: input.accountId,
      projectId: input.projectId,
      opportunityId: input.opportunityId,
      budgetId: input.budgetId,
      vendorName: input.vendorName,
      vendorId: input.vendorId,
      invoiceNumber: input.invoiceNumber,
      tags: input.tags,
      notes: input.notes,
      attachments: input.attachments,
      allocations: input.allocations,
      // Reset to pending if it was rejected and re-submitted
      status: existing.status === 'REJECTED' ? 'PENDING' : undefined,
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      budget: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  return expense as unknown as ExpenseWithRelations;
}

export async function deleteExpense(id: number, userId: number): Promise<void> {
  const tenantId = getTenantId();

  const existing = await prisma.expense.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Expense not found');
  }

  if (existing.ownerId !== userId) {
    throw new Error('Only the expense owner can delete it');
  }

  if (existing.status === 'APPROVED' || existing.status === 'PAID') {
    throw new Error('Cannot delete approved or paid expenses');
  }

  await prisma.expense.delete({ where: { id } });
}

export async function approveExpense(
  id: number,
  approverId: number,
  notes?: string,
): Promise<ExpenseWithRelations> {
  const tenantId = getTenantId();

  const existing = await prisma.expense.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Expense not found');
  }

  if (existing.status !== 'PENDING') {
    throw new Error('Only pending expenses can be approved');
  }

  if (existing.ownerId === approverId) {
    throw new Error('Cannot approve your own expense');
  }

  // Use transaction to prevent race condition when updating budget spent amount
  const expense = await prisma.$transaction(async (tx) => {
    // Update budget spent amount if linked
    if (existing.budgetId) {
      await tx.budget.update({
        where: { id: existing.budgetId },
        data: {
          spent: {
            increment: existing.amount,
          },
        },
      });
    }

    return tx.expense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalNotes: notes,
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        account: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        budget: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
  });

  return expense as unknown as ExpenseWithRelations;
}

export async function rejectExpense(
  id: number,
  approverId: number,
  reason: string,
): Promise<ExpenseWithRelations> {
  const tenantId = getTenantId();

  const existing = await prisma.expense.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Expense not found');
  }

  if (existing.status !== 'PENDING') {
    throw new Error('Only pending expenses can be rejected');
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status: 'REJECTED',
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      budget: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  return expense as unknown as ExpenseWithRelations;
}

export async function markExpenseAsPaid(
  id: number,
  _userId: number,
): Promise<ExpenseWithRelations> {
  const tenantId = getTenantId();

  const existing = await prisma.expense.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Expense not found');
  }

  if (existing.status !== 'APPROVED') {
    throw new Error('Only approved expenses can be marked as paid');
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status: 'PAID',
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      account: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      budget: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  return expense as unknown as ExpenseWithRelations;
}

export async function getExpenseStats(params: {
  startDate?: string;
  endDate?: string;
  accountId?: number;
}): Promise<{
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
}> {
  const tenantId = getTenantId();

  // Build date filter separately to properly combine gte and lte
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (params.startDate || params.endDate) {
    dateFilter = {};
    if (params.startDate) dateFilter.gte = new Date(params.startDate);
    if (params.endDate) dateFilter.lte = new Date(params.endDate);
  }

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    ...(dateFilter && { date: dateFilter }),
    ...(params.accountId && { accountId: params.accountId }),
  };

  const [allExpenses, pendingExpenses, approvedExpenses, byCategory] =
    await Promise.all([
      prisma.expense.aggregate({
        where,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...where, status: 'PENDING' },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...where, status: { in: ['APPROVED', 'PAID'] } },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

  // Get category names
  const categoryIds = byCategory.map((c) => c.categoryId);
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return {
    totalExpenses: allExpenses._count,
    totalAmount: Number(allExpenses._sum.amount || 0),
    pendingCount: pendingExpenses._count,
    pendingAmount: Number(pendingExpenses._sum.amount || 0),
    approvedCount: approvedExpenses._count,
    approvedAmount: Number(approvedExpenses._sum.amount || 0),
    byCategory: byCategory.map((c) => ({
      categoryId: c.categoryId,
      categoryName: categoryMap.get(c.categoryId) || 'Unknown',
      total: Number(c._sum.amount || 0),
      count: c._count,
    })),
  };
}
