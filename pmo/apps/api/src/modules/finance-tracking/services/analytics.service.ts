/**
 * Finance Analytics Service
 *
 * Business logic for financial analytics, reporting, and profitability analysis.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardOverview {
  totalExpenses: number;
  totalExpenseAmount: number;
  pendingApprovals: number;
  pendingAmount: number;
  activeBudgets: number;
  budgetUtilization: number;
  recurringMonthlyCost: number;
  expensesTrend: number; // % change from previous period
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

export interface AccountProfitabilityData {
  accountId: number;
  accountName: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export async function getDashboardOverview(params: {
  startDate?: string;
  endDate?: string;
}): Promise<DashboardOverview> {
  const tenantId = getTenantId();
  const { startDate, endDate } = params;

  // Default to current month if no dates provided
  const now = new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;

  // Previous period for trend calculation
  const periodLength = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodLength);
  const prevEnd = new Date(start.getTime() - 1);

  const expenseWhere: Prisma.ExpenseWhereInput = {
    tenantId,
    date: { gte: start, lte: end },
  };

  const prevExpenseWhere: Prisma.ExpenseWhereInput = {
    tenantId,
    date: { gte: prevStart, lte: prevEnd },
  };

  const [
    totalExpenses,
    pendingExpenses,
    prevTotalExpenses,
    activeBudgets,
    recurringCosts,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: expenseWhere,
      _count: true,
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...expenseWhere, status: 'PENDING' },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: prevExpenseWhere,
      _sum: { amount: true },
    }),
    prisma.budget.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { amount: true, spent: true, rolloverAmount: true },
    }),
    prisma.recurringCost.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { amount: true, frequency: true },
    }),
  ]);

  // PERF FIX: Single-pass calculation for budget utilization
  let totalBudgeted = 0;
  let totalSpent = 0;
  for (const b of activeBudgets) {
    totalBudgeted += Number(b.amount) + Number(b.rolloverAmount);
    totalSpent += Number(b.spent);
  }
  const budgetUtilization =
    totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  // Calculate monthly recurring cost
  const frequencyMultipliers: Record<string, number> = {
    WEEKLY: 52 / 12,
    BIWEEKLY: 26 / 12,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    SEMIANNUALLY: 1 / 6,
    YEARLY: 1 / 12,
  };
  const recurringMonthlyCost = recurringCosts.reduce((sum, cost) => {
    const multiplier = frequencyMultipliers[cost.frequency] || 1;
    return sum + Number(cost.amount) * multiplier;
  }, 0);

  // Calculate trend
  const currentTotal = Number(totalExpenses._sum.amount || 0);
  const prevTotal = Number(prevTotalExpenses._sum.amount || 0);
  const expensesTrend =
    prevTotal > 0
      ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
      : 0;

  return {
    totalExpenses: totalExpenses._count,
    totalExpenseAmount: currentTotal,
    pendingApprovals: pendingExpenses._count,
    pendingAmount: Number(pendingExpenses._sum.amount || 0),
    activeBudgets: activeBudgets.length,
    budgetUtilization,
    recurringMonthlyCost: Math.round(recurringMonthlyCost * 100) / 100,
    expensesTrend,
  };
}

export async function getSpendingByCategory(params: {
  startDate?: string;
  endDate?: string;
  accountId?: number;
}): Promise<SpendingByCategory[]> {
  const tenantId = getTenantId();
  const { startDate, endDate, accountId } = params;

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    status: { in: ['APPROVED', 'PAID'] },
    ...(startDate && { date: { gte: new Date(startDate) } }),
    ...(endDate && { date: { lte: new Date(endDate) } }),
    ...(accountId && { accountId }),
  };

  // PERF FIX: Fetch all categories upfront to avoid N+1 query pattern
  const [grouped, allCategories] = await Promise.all([
    prisma.expense.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.expenseCategory.findMany({
      where: { tenantId },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  // Calculate total for percentages
  const total = grouped.reduce((sum, g) => sum + Number(g._sum.amount || 0), 0);

  return grouped.map((g) => {
    const category = categoryMap.get(g.categoryId);
    const amount = Number(g._sum.amount || 0);
    return {
      categoryId: g.categoryId,
      categoryName: category?.name || 'Unknown',
      categoryColor: category?.color || '#6B7280',
      total: amount,
      count: g._count,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    };
  });
}

export async function getSpendingTrends(params: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
  accountId?: number;
}): Promise<SpendingTrend[]> {
  const tenantId = getTenantId();
  const { startDate, endDate, groupBy = 'month', accountId } = params;

  // Default to last 12 months
  const now = new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;

  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      date: { gte: start, lte: end },
      ...(accountId && { accountId }),
    },
    select: { date: true, amount: true, status: true },
    orderBy: { date: 'asc' },
  });

  // Group expenses by period
  const groups = new Map<
    string,
    { total: number; count: number; approved: number; pending: number }
  >();

  for (const expense of expenses) {
    let period: string;
    const date = expense.date;

    switch (groupBy) {
      case 'day':
        period = date.toISOString().split('T')[0];
        break;
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        period = weekStart.toISOString().split('T')[0];
        break;
      }
      case 'month':
      default:
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    const current = groups.get(period) || {
      total: 0,
      count: 0,
      approved: 0,
      pending: 0,
    };
    const amount = Number(expense.amount);

    current.total += amount;
    current.count += 1;

    if (expense.status === 'APPROVED' || expense.status === 'PAID') {
      current.approved += amount;
    } else if (expense.status === 'PENDING') {
      current.pending += amount;
    }

    groups.set(period, current);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      approved: Math.round(data.approved * 100) / 100,
      pending: Math.round(data.pending * 100) / 100,
    }));
}

export async function getAccountProfitability(params: {
  startDate?: string;
  endDate?: string;
  accountIds?: number[];
}): Promise<AccountProfitabilityData[]> {
  const tenantId = getTenantId();
  const { startDate, endDate, accountIds } = params;

  // Get accounts
  const accountWhere: Prisma.AccountWhereInput = {
    tenantId,
    archived: false,
    ...(accountIds && { id: { in: accountIds } }),
  };

  const accounts = await prisma.account.findMany({
    where: accountWhere,
    select: {
      id: true,
      name: true,
      annualRevenue: true,
      // Get won opportunities for revenue
      opportunities: {
        where: {
          status: 'WON',
          ...(startDate && { actualCloseDate: { gte: new Date(startDate) } }),
          ...(endDate && { actualCloseDate: { lte: new Date(endDate) } }),
        },
        select: { amount: true },
      },
      // Get expenses
      expenses: {
        where: {
          status: { in: ['APPROVED', 'PAID'] },
          ...(startDate && { date: { gte: new Date(startDate) } }),
          ...(endDate && { date: { lte: new Date(endDate) } }),
        },
        select: { amount: true },
      },
    },
  });

  return accounts
    .map((account) => {
      // Calculate revenue from won opportunities
      const revenue = account.opportunities.reduce(
        (sum, opp) => sum + Number(opp.amount || 0),
        0,
      );

      // Calculate costs
      const costs = account.expenses.reduce(
        (sum, exp) => sum + Number(exp.amount || 0),
        0,
      );

      const profit = revenue - costs;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

      return {
        accountId: account.id,
        accountName: account.name,
        revenue: Math.round(revenue * 100) / 100,
        costs: Math.round(costs * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

export async function getExpensesByAccount(params: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<
  Array<{
    accountId: number;
    accountName: string;
    total: number;
    count: number;
  }>
> {
  const tenantId = getTenantId();
  const { startDate, endDate, limit = 10 } = params;

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    accountId: { not: null },
    status: { in: ['APPROVED', 'PAID'] },
    ...(startDate && { date: { gte: new Date(startDate) } }),
    ...(endDate && { date: { lte: new Date(endDate) } }),
  };

  const grouped = await prisma.expense.groupBy({
    by: ['accountId'],
    where,
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  });

  // Get account names
  const accountIds = grouped
    .map((g) => g.accountId)
    .filter((id): id is number => id !== null);
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  return grouped
    .filter((g) => g.accountId !== null)
    .map((g) => ({
      accountId: g.accountId as number,
      accountName: accountMap.get(g.accountId as number) || 'Unknown',
      total: Number(g._sum.amount || 0),
      count: g._count,
    }));
}

export async function getTopVendors(params: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Array<{ vendorName: string; total: number; count: number }>> {
  const tenantId = getTenantId();
  const { startDate, endDate, limit = 10 } = params;

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    vendorName: { not: null },
    status: { in: ['APPROVED', 'PAID'] },
    ...(startDate && { date: { gte: new Date(startDate) } }),
    ...(endDate && { date: { lte: new Date(endDate) } }),
  };

  const grouped = await prisma.expense.groupBy({
    by: ['vendorName'],
    where,
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  });

  return grouped
    .filter((g) => g.vendorName !== null)
    .map((g) => ({
      vendorName: g.vendorName as string,
      total: Number(g._sum.amount || 0),
      count: g._count,
    }));
}
