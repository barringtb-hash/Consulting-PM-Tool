/**
 * Recurring Cost Service
 *
 * Business logic for managing recurring costs (subscriptions, licenses, payroll).
 * Supports automatic expense generation and renewal alerts.
 */

import {
  Prisma,
  RecurringCostStatus,
  RecurringCostType,
  RecurringFrequency,
} from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';
import type {
  CreateRecurringCostInput,
  UpdateRecurringCostInput,
  ListRecurringCostsInput,
} from '../../../validation/finance';

// ============================================================================
// TYPES
// ============================================================================

export interface RecurringCostWithRelations {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  type: RecurringCostType;
  amount: Prisma.Decimal;
  currency: string;
  frequency: RecurringFrequency;
  billingDay?: number | null;
  startDate: Date;
  endDate?: Date | null;
  nextDueDate: Date;
  status: RecurringCostStatus;
  vendorName?: string | null;
  vendorUrl?: string | null;
  contractNumber?: string | null;
  seatCount?: number | null;
  costPerSeat?: Prisma.Decimal | null;
  department?: string | null;
  autoRenew: boolean;
  renewalAlertDays: number;
  account?: { id: number; name: string } | null;
  category: { id: number; name: string; color: string };
  employee?: { id: number; name: string } | null;
  owner: { id: number; name: string };
  _count: { expenses: number };
  annualCost: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateAnnualCost(
  amount: number,
  frequency: RecurringFrequency,
): number {
  const multipliers: Record<RecurringFrequency, number> = {
    WEEKLY: 52,
    BIWEEKLY: 26,
    MONTHLY: 12,
    QUARTERLY: 4,
    SEMIANNUALLY: 2,
    YEARLY: 1,
  };
  return amount * (multipliers[frequency] || 1);
}

function getNextDueDate(
  currentDueDate: Date,
  frequency: RecurringFrequency,
): Date {
  const next = new Date(currentDueDate);
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'SEMIANNUALLY':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// ============================================================================
// RECURRING COST SERVICE
// ============================================================================

export async function listRecurringCosts(
  params: ListRecurringCostsInput,
): Promise<{
  costs: RecurringCostWithRelations[];
  total: number;
  pages: number;
}> {
  const tenantId = getTenantId();
  const {
    page = 1,
    limit = 50,
    sortBy = 'nextDueDate',
    sortOrder = 'asc',
    status,
    type,
    accountId,
    categoryId,
    search,
    dueBefore,
  } = params;

  const where: Prisma.RecurringCostWhereInput = {
    tenantId,
    ...(status && { status }),
    ...(type && { type }),
    ...(accountId && { accountId }),
    ...(categoryId && { categoryId }),
    ...(dueBefore && { nextDueDate: { lte: new Date(dueBefore) } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [costs, total] = await Promise.all([
    prisma.recurringCost.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        employee: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        _count: { select: { expenses: true } },
      },
    }),
    prisma.recurringCost.count({ where }),
  ]);

  const costsWithDerived = costs.map((cost) => ({
    ...cost,
    annualCost: calculateAnnualCost(Number(cost.amount), cost.frequency),
  }));

  return {
    costs: costsWithDerived as unknown as RecurringCostWithRelations[],
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getRecurringCostById(
  id: number,
): Promise<RecurringCostWithRelations | null> {
  const tenantId = getTenantId();

  const cost = await prisma.recurringCost.findFirst({
    where: { id, tenantId },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
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

  if (!cost) return null;

  return {
    ...cost,
    annualCost: calculateAnnualCost(Number(cost.amount), cost.frequency),
  } as unknown as RecurringCostWithRelations;
}

export async function createRecurringCost(
  input: CreateRecurringCostInput,
  ownerId: number,
): Promise<RecurringCostWithRelations> {
  const tenantId = getTenantId();

  // Validate category
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

  // Validate employee if provided
  if (input.employeeId) {
    const employee = await prisma.user.findUnique({
      where: { id: input.employeeId },
    });
    if (!employee) {
      throw new Error('Employee not found');
    }
  }

  const cost = await prisma.recurringCost.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      frequency: input.frequency,
      billingDay: input.billingDay,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      nextDueDate: new Date(input.nextDueDate),
      accountId: input.accountId,
      categoryId: input.categoryId,
      vendorName: input.vendorName,
      vendorUrl: input.vendorUrl,
      contractNumber: input.contractNumber,
      seatCount: input.seatCount,
      costPerSeat: input.costPerSeat,
      employeeId: input.employeeId,
      department: input.department,
      autoRenew: input.autoRenew,
      renewalAlertDays: input.renewalAlertDays,
      ownerId,
      status: 'ACTIVE',
    },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      _count: { select: { expenses: true } },
    },
  });

  return {
    ...cost,
    annualCost: calculateAnnualCost(Number(cost.amount), cost.frequency),
  } as unknown as RecurringCostWithRelations;
}

export async function updateRecurringCost(
  id: number,
  input: UpdateRecurringCostInput,
): Promise<RecurringCostWithRelations> {
  const tenantId = getTenantId();

  const existing = await prisma.recurringCost.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Recurring cost not found');
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

  const cost = await prisma.recurringCost.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      frequency: input.frequency,
      billingDay: input.billingDay,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : undefined,
      accountId: input.accountId,
      categoryId: input.categoryId,
      vendorName: input.vendorName,
      vendorUrl: input.vendorUrl,
      contractNumber: input.contractNumber,
      seatCount: input.seatCount,
      costPerSeat: input.costPerSeat,
      employeeId: input.employeeId,
      department: input.department,
      autoRenew: input.autoRenew,
      renewalAlertDays: input.renewalAlertDays,
      status: input.status,
    },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      _count: { select: { expenses: true } },
    },
  });

  return {
    ...cost,
    annualCost: calculateAnnualCost(Number(cost.amount), cost.frequency),
  } as unknown as RecurringCostWithRelations;
}

export async function deleteRecurringCost(id: number): Promise<void> {
  const tenantId = getTenantId();

  const existing = await prisma.recurringCost.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { expenses: true } } },
  });

  if (!existing) {
    throw new Error('Recurring cost not found');
  }

  if (existing._count.expenses > 0) {
    throw new Error(
      'Cannot delete recurring cost with generated expenses. Cancel it instead.',
    );
  }

  await prisma.recurringCost.delete({ where: { id } });
}

export async function generateExpenseFromRecurringCost(
  id: number,
  ownerId: number,
): Promise<{ expenseId: number }> {
  const tenantId = getTenantId();

  const cost = await prisma.recurringCost.findFirst({
    where: { id, tenantId, status: 'ACTIVE' },
  });

  if (!cost) {
    throw new Error('Recurring cost not found or not active');
  }

  // Create the expense
  const expense = await prisma.expense.create({
    data: {
      tenantId,
      description: `${cost.name} - ${cost.nextDueDate.toLocaleDateString()}`,
      amount: cost.amount,
      currency: cost.currency,
      date: cost.nextDueDate,
      categoryId: cost.categoryId,
      accountId: cost.accountId,
      recurringCostId: cost.id,
      vendorName: cost.vendorName,
      ownerId,
      status: 'PENDING',
    },
  });

  // Update next due date
  const nextDueDate = getNextDueDate(cost.nextDueDate, cost.frequency);

  // Check if end date reached
  const newStatus =
    cost.endDate && nextDueDate > cost.endDate && !cost.autoRenew
      ? 'EXPIRED'
      : 'ACTIVE';

  await prisma.recurringCost.update({
    where: { id },
    data: {
      nextDueDate,
      status: newStatus,
    },
  });

  return { expenseId: expense.id };
}

export async function getUpcomingRenewals(
  daysAhead: number = 30,
): Promise<RecurringCostWithRelations[]> {
  const tenantId = getTenantId();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const costs = await prisma.recurringCost.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      nextDueDate: { lte: futureDate },
    },
    orderBy: { nextDueDate: 'asc' },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      _count: { select: { expenses: true } },
    },
  });

  return costs.map((cost) => ({
    ...cost,
    annualCost: calculateAnnualCost(Number(cost.amount), cost.frequency),
  })) as unknown as RecurringCostWithRelations[];
}

export async function getRecurringCostStats(): Promise<{
  totalCosts: number;
  activeCosts: number;
  monthlyTotal: number;
  annualTotal: number;
  byType: Array<{ type: string; count: number; monthlyTotal: number }>;
}> {
  const tenantId = getTenantId();

  const costs = await prisma.recurringCost.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { amount: true, frequency: true, type: true },
  });

  const monthlyTotal = costs.reduce((sum, cost) => {
    const annual = calculateAnnualCost(Number(cost.amount), cost.frequency);
    return sum + annual / 12;
  }, 0);

  const annualTotal = costs.reduce((sum, cost) => {
    return sum + calculateAnnualCost(Number(cost.amount), cost.frequency);
  }, 0);

  // Group by type
  const typeGroups = new Map<string, { count: number; monthlyTotal: number }>();
  for (const cost of costs) {
    const current = typeGroups.get(cost.type) || { count: 0, monthlyTotal: 0 };
    const annual = calculateAnnualCost(Number(cost.amount), cost.frequency);
    typeGroups.set(cost.type, {
      count: current.count + 1,
      monthlyTotal: current.monthlyTotal + annual / 12,
    });
  }

  const totalCount = await prisma.recurringCost.count({ where: { tenantId } });

  return {
    totalCosts: totalCount,
    activeCosts: costs.length,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    annualTotal: Math.round(annualTotal * 100) / 100,
    byType: Array.from(typeGroups.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      monthlyTotal: Math.round(data.monthlyTotal * 100) / 100,
    })),
  };
}
