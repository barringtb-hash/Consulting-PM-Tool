/**
 * Finance Tracking Module Router
 *
 * Main router combining all finance-related routes.
 * - Expenses & Recurring Costs: Users can manage their own (ownership enforced)
 * - Categories & Budgets: Admin-only for creation/modification
 * - Approval actions (approve/reject expenses): Admin-only
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import { requireRole } from '../../auth/role.middleware';
import {
  tenantMiddleware,
  type TenantRequest,
} from '../../tenant/tenant.middleware';
import * as categoryService from './services/category.service';
import * as expenseService from './services/expense.service';
import * as budgetService from './services/budget.service';
import * as recurringCostService from './services/recurring-cost.service';
import * as analyticsService from './services/analytics.service';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  createBudgetSchema,
  updateBudgetSchema,
  listBudgetsSchema,
  createRecurringCostSchema,
  updateRecurringCostSchema,
  listRecurringCostsSchema,
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
} from '../../validation/finance';
import * as categorizationService from './ai/categorization.service';
import * as anomalyService from './ai/anomaly-detection.service';
import type { AnomalyResult } from './ai/anomaly-detection.service';
import * as forecastingService from './ai/forecasting.service';

const router = Router();

// All finance routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// ============================================================================
// MIDDLEWARE: Admin check for write operations
// ============================================================================

const requireFinanceAdmin = requireRole('ADMIN');

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// List categories
router.get('/categories', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = listCategoriesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await categoryService.listCategories(parsed.data);
    return res.json(result);
  } catch (error) {
    console.error('Error listing categories:', error);
    return res.status(500).json({ error: 'Failed to list categories' });
  }
});

// Get category by ID
router.get('/categories/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await categoryService.getCategoryById(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json({ category });
  } catch (error) {
    console.error('Error getting category:', error);
    return res.status(500).json({ error: 'Failed to get category' });
  }
});

// Create category (admin only)
router.post(
  '/categories',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const category = await categoryService.createCategory(parsed.data);

      return res.status(201).json({ category });
    } catch (error) {
      console.error('Error creating category:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create category';
      return res.status(400).json({ error: message });
    }
  },
);

// Update category (admin only)
router.put(
  '/categories/:id',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const category = await categoryService.updateCategory(id, parsed.data);

      return res.json({ category });
    } catch (error) {
      console.error('Error updating category:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update category';
      return res.status(400).json({ error: message });
    }
  },
);

// Delete category (admin only)
router.delete(
  '/categories/:id',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      await categoryService.deleteCategory(id);

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting category:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to delete category';
      return res.status(400).json({ error: message });
    }
  },
);

// ============================================================================
// EXPENSE ROUTES
// ============================================================================

// List expenses
router.get('/expenses', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = listExpensesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await expenseService.listExpenses(parsed.data);

    return res.json(result);
  } catch (error) {
    console.error('Error listing expenses:', error);
    return res.status(500).json({ error: 'Failed to list expenses' });
  }
});

// Get expense stats
router.get('/expenses/stats', async (req: TenantRequest, res: Response) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const stats = await expenseService.getExpenseStats({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      accountId: accountId ? parseInt(accountId as string, 10) : undefined,
    });

    return res.json(stats);
  } catch (error) {
    console.error('Error getting expense stats:', error);
    return res.status(500).json({ error: 'Failed to get expense stats' });
  }
});

// Get expense by ID
router.get('/expenses/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    const expense = await expenseService.getExpenseById(id);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    return res.json({ expense });
  } catch (error) {
    console.error('Error getting expense:', error);
    return res.status(500).json({ error: 'Failed to get expense' });
  }
});

// Create expense
router.post('/expenses', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const expense = await expenseService.createExpense(
      parsed.data,
      req.userId!,
    );

    return res.status(201).json({ expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create expense';
    return res.status(400).json({ error: message });
  }
});

// Update expense
router.put('/expenses/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const expense = await expenseService.updateExpense(
      id,
      parsed.data,
      req.userId!,
    );

    return res.json({ expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update expense';
    return res.status(400).json({ error: message });
  }
});

// Delete expense
router.delete('/expenses/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    await expenseService.deleteExpense(id, req.userId!);

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting expense:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete expense';
    return res.status(400).json({ error: message });
  }
});

// Approve expense (admin only)
router.post(
  '/expenses/:id/approve',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      const parsed = approveExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const expense = await expenseService.approveExpense(
        id,
        req.userId!,
        parsed.data.notes,
      );

      return res.json({ expense });
    } catch (error) {
      console.error('Error approving expense:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to approve expense';
      return res.status(400).json({ error: message });
    }
  },
);

// Reject expense (admin only)
router.post(
  '/expenses/:id/reject',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      const parsed = rejectExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const expense = await expenseService.rejectExpense(
        id,
        req.userId!,
        parsed.data.reason,
      );

      return res.json({ expense });
    } catch (error) {
      console.error('Error rejecting expense:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to reject expense';
      return res.status(400).json({ error: message });
    }
  },
);

// Mark expense as paid (admin only)
router.post(
  '/expenses/:id/paid',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      const expense = await expenseService.markExpenseAsPaid(id, req.userId!);

      return res.json({ expense });
    } catch (error) {
      console.error('Error marking expense as paid:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to mark expense as paid';
      return res.status(400).json({ error: message });
    }
  },
);

// ============================================================================
// BUDGET ROUTES
// ============================================================================

// List budgets
router.get('/budgets', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = listBudgetsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await budgetService.listBudgets(parsed.data);

    return res.json(result);
  } catch (error) {
    console.error('Error listing budgets:', error);
    return res.status(500).json({ error: 'Failed to list budgets' });
  }
});

// Get budget stats
router.get('/budgets/stats', async (req: TenantRequest, res: Response) => {
  try {
    const stats = await budgetService.getBudgetStats();
    return res.json(stats);
  } catch (error) {
    console.error('Error getting budget stats:', error);
    return res.status(500).json({ error: 'Failed to get budget stats' });
  }
});

// Get budget by ID
router.get('/budgets/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid budget ID' });
    }

    const budget = await budgetService.getBudgetById(id);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    return res.json({ budget });
  } catch (error) {
    console.error('Error getting budget:', error);
    return res.status(500).json({ error: 'Failed to get budget' });
  }
});

// Get budget expenses
router.get(
  '/budgets/:id/expenses',
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid budget ID' });
      }

      const { page, limit } = req.query;
      const result = await budgetService.getBudgetExpenses(id, {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      return res.json(result);
    } catch (error) {
      console.error('Error getting budget expenses:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get budget expenses';
      return res.status(400).json({ error: message });
    }
  },
);

// Create budget (admin only)
router.post(
  '/budgets',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = createBudgetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const budget = await budgetService.createBudget(parsed.data, req.userId!);

      return res.status(201).json({ budget });
    } catch (error) {
      console.error('Error creating budget:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create budget';
      return res.status(400).json({ error: message });
    }
  },
);

// Update budget (admin only)
router.put(
  '/budgets/:id',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid budget ID' });
      }

      const parsed = updateBudgetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const budget = await budgetService.updateBudget(id, parsed.data);

      return res.json({ budget });
    } catch (error) {
      console.error('Error updating budget:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update budget';
      return res.status(400).json({ error: message });
    }
  },
);

// Delete budget (admin only)
router.delete(
  '/budgets/:id',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid budget ID' });
      }

      await budgetService.deleteBudget(id);

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting budget:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to delete budget';
      return res.status(400).json({ error: message });
    }
  },
);

// ============================================================================
// RECURRING COST ROUTES
// ============================================================================

// List recurring costs
router.get('/recurring-costs', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = listRecurringCostsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await recurringCostService.listRecurringCosts(parsed.data);

    return res.json(result);
  } catch (error) {
    console.error('Error listing recurring costs:', error);
    return res.status(500).json({ error: 'Failed to list recurring costs' });
  }
});

// Get recurring cost stats
router.get(
  '/recurring-costs/stats',
  async (req: TenantRequest, res: Response) => {
    try {
      const stats = await recurringCostService.getRecurringCostStats();
      return res.json(stats);
    } catch (error) {
      console.error('Error getting recurring cost stats:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get recurring cost stats' });
    }
  },
);

// Get upcoming renewals
router.get(
  '/recurring-costs/upcoming',
  async (req: TenantRequest, res: Response) => {
    try {
      const { days } = req.query;
      const costs = await recurringCostService.getUpcomingRenewals(
        days ? parseInt(days as string, 10) : 30,
      );
      return res.json({ costs });
    } catch (error) {
      console.error('Error getting upcoming renewals:', error);
      return res.status(500).json({ error: 'Failed to get upcoming renewals' });
    }
  },
);

// Get recurring cost by ID
router.get(
  '/recurring-costs/:id',
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid recurring cost ID' });
      }

      const cost = await recurringCostService.getRecurringCostById(id);

      if (!cost) {
        return res.status(404).json({ error: 'Recurring cost not found' });
      }

      return res.json({ cost });
    } catch (error) {
      console.error('Error getting recurring cost:', error);
      return res.status(500).json({ error: 'Failed to get recurring cost' });
    }
  },
);

// Create recurring cost
router.post('/recurring-costs', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = createRecurringCostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const cost = await recurringCostService.createRecurringCost(
      parsed.data,
      req.userId!,
    );

    return res.status(201).json({ cost });
  } catch (error) {
    console.error('Error creating recurring cost:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to create recurring cost';
    return res.status(400).json({ error: message });
  }
});

// Update recurring cost
router.put(
  '/recurring-costs/:id',
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid recurring cost ID' });
      }

      const parsed = updateRecurringCostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const cost = await recurringCostService.updateRecurringCost(
        id,
        parsed.data,
        req.userId!,
      );

      return res.json({ cost });
    } catch (error) {
      console.error('Error updating recurring cost:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update recurring cost';
      return res.status(400).json({ error: message });
    }
  },
);

// Delete recurring cost
router.delete(
  '/recurring-costs/:id',
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid recurring cost ID' });
      }

      await recurringCostService.deleteRecurringCost(id, req.userId!);

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting recurring cost:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete recurring cost';
      return res.status(400).json({ error: message });
    }
  },
);

// Generate expense from recurring cost (admin only)
router.post(
  '/recurring-costs/:id/generate',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid recurring cost ID' });
      }

      const result =
        await recurringCostService.generateExpenseFromRecurringCost(
          id,
          req.userId!,
        );

      return res.status(201).json(result);
    } catch (error) {
      console.error('Error generating expense:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to generate expense';
      return res.status(400).json({ error: message });
    }
  },
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

// Dashboard overview
router.get('/analytics/overview', async (req: TenantRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const overview = await analyticsService.getDashboardOverview({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    return res.json(overview);
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    return res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

// Spending by category
router.get(
  '/analytics/by-category',
  async (req: TenantRequest, res: Response) => {
    try {
      const { startDate, endDate, accountId } = req.query;
      const data = await analyticsService.getSpendingByCategory({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        accountId: accountId ? parseInt(accountId as string, 10) : undefined,
      });
      return res.json({ categories: data });
    } catch (error) {
      console.error('Error getting spending by category:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get spending by category' });
    }
  },
);

// Spending trends
router.get('/analytics/trends', async (req: TenantRequest, res: Response) => {
  try {
    const { startDate, endDate, groupBy, accountId } = req.query;
    const data = await analyticsService.getSpendingTrends({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      groupBy: groupBy as 'day' | 'week' | 'month' | undefined,
      accountId: accountId ? parseInt(accountId as string, 10) : undefined,
    });
    return res.json({ trends: data });
  } catch (error) {
    console.error('Error getting spending trends:', error);
    return res.status(500).json({ error: 'Failed to get spending trends' });
  }
});

// Account profitability
router.get(
  '/analytics/profitability',
  async (req: TenantRequest, res: Response) => {
    try {
      const { startDate, endDate, accountIds } = req.query;
      const data = await analyticsService.getAccountProfitability({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        accountIds: accountIds
          ? (accountIds as string).split(',').map((id) => parseInt(id, 10))
          : undefined,
      });
      return res.json({ accounts: data });
    } catch (error) {
      console.error('Error getting account profitability:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get account profitability' });
    }
  },
);

// Expenses by account
router.get(
  '/analytics/by-account',
  async (req: TenantRequest, res: Response) => {
    try {
      const { startDate, endDate, limit } = req.query;
      const data = await analyticsService.getExpensesByAccount({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      return res.json({ accounts: data });
    } catch (error) {
      console.error('Error getting expenses by account:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get expenses by account' });
    }
  },
);

// Top vendors
router.get(
  '/analytics/top-vendors',
  async (req: TenantRequest, res: Response) => {
    try {
      const { startDate, endDate, limit } = req.query;
      const data = await analyticsService.getTopVendors({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      return res.json({ vendors: data });
    } catch (error) {
      console.error('Error getting top vendors:', error);
      return res.status(500).json({ error: 'Failed to get top vendors' });
    }
  },
);

// ============================================================================
// AI ROUTES
// ============================================================================

// Get AI category suggestions
router.post('/ai/categorize', async (req: TenantRequest, res: Response) => {
  try {
    const body = req.body as {
      description?: string;
      vendorName?: string;
      amount?: string | number;
    };
    const { description, vendorName, amount } = body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const result = await categorizationService.suggestCategory(
      description,
      vendorName,
      amount ? parseFloat(String(amount)) : undefined,
    );

    return res.json(result);
  } catch (error) {
    console.error('Error getting category suggestions:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get category suggestions' });
  }
});

// Bulk categorize expenses
router.post(
  '/ai/categorize/bulk',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      type BulkExpenseInput = {
        id: number;
        description: string;
        vendorName?: string;
        amount?: number;
      };
      const body = req.body as { expenses?: BulkExpenseInput[] };
      const { expenses } = body;

      if (!Array.isArray(expenses)) {
        return res.status(400).json({ error: 'Expenses array is required' });
      }

      const results = await categorizationService.bulkCategorize(expenses);

      return res.json({
        results: Object.fromEntries(results),
      });
    } catch (error) {
      console.error('Error bulk categorizing:', error);
      return res.status(500).json({ error: 'Failed to bulk categorize' });
    }
  },
);

// Record categorization feedback
router.post(
  '/ai/categorize/feedback',
  async (req: TenantRequest, res: Response) => {
    try {
      const body = req.body as {
        expenseId?: number;
        suggestedCategoryId?: number;
        actualCategoryId?: number;
        wasAccepted?: boolean;
      };
      const { expenseId, suggestedCategoryId, actualCategoryId, wasAccepted } =
        body;

      // Validate required fields
      if (
        typeof expenseId !== 'number' ||
        expenseId <= 0 ||
        typeof suggestedCategoryId !== 'number' ||
        suggestedCategoryId <= 0 ||
        typeof actualCategoryId !== 'number' ||
        actualCategoryId <= 0 ||
        typeof wasAccepted !== 'boolean'
      ) {
        return res.status(400).json({
          error: 'Invalid input',
          details: {
            expenseId: 'must be a positive integer',
            suggestedCategoryId: 'must be a positive integer',
            actualCategoryId: 'must be a positive integer',
            wasAccepted: 'must be a boolean',
          },
        });
      }

      await categorizationService.recordCategorizationFeedback({
        expenseId,
        suggestedCategoryId,
        actualCategoryId,
        wasAccepted,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Error recording feedback:', error);
      return res.status(500).json({ error: 'Failed to record feedback' });
    }
  },
);

// Detect anomalies for an expense
router.get(
  '/ai/anomalies/:expenseId',
  async (req: TenantRequest, res: Response) => {
    try {
      const expenseId = parseInt(String(req.params.expenseId), 10);
      if (isNaN(expenseId)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      const anomalies = await anomalyService.detectExpenseAnomalies(expenseId);

      return res.json({ anomalies });
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to detect anomalies';
      return res.status(400).json({ error: message });
    }
  },
);

// Get anomaly statistics
router.get('/ai/anomalies/stats', async (req: TenantRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await anomalyService.getAnomalyStats({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    return res.json(stats);
  } catch (error) {
    console.error('Error getting anomaly stats:', error);
    return res.status(500).json({ error: 'Failed to get anomaly stats' });
  }
});

// Scan pending expenses for anomalies
router.post(
  '/ai/anomalies/scan',
  requireFinanceAdmin,
  async (req: TenantRequest, res: Response) => {
    try {
      const result = await anomalyService.scanPendingExpenses();

      return res.json(result);
    } catch (error) {
      console.error('Error scanning for anomalies:', error);
      return res.status(500).json({ error: 'Failed to scan for anomalies' });
    }
  },
);

// Get AI anomaly insights
router.post(
  '/ai/anomalies/insights',
  async (req: TenantRequest, res: Response) => {
    try {
      const body = req.body as { anomalies?: AnomalyResult[] };
      const { anomalies } = body;

      if (!Array.isArray(anomalies)) {
        return res.status(400).json({ error: 'Anomalies array is required' });
      }

      const insights = await anomalyService.getAnomalyInsights(anomalies);

      return res.json({ insights });
    } catch (error) {
      console.error('Error getting anomaly insights:', error);
      return res.status(500).json({ error: 'Failed to get anomaly insights' });
    }
  },
);

// Generate spending forecast
router.get('/ai/forecast', async (req: TenantRequest, res: Response) => {
  try {
    const { periods, periodType, categoryId } = req.query;

    const forecast = await forecastingService.generateSpendingForecast({
      periods: periods ? parseInt(periods as string, 10) : undefined,
      periodType: periodType as 'MONTH' | 'QUARTER' | undefined,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
    });

    return res.json(forecast);
  } catch (error) {
    console.error('Error generating forecast:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate forecast';
    return res.status(400).json({ error: message });
  }
});

// Get budget recommendations
router.get(
  '/ai/budget-recommendations',
  async (req: TenantRequest, res: Response) => {
    try {
      const recommendations =
        await forecastingService.generateBudgetRecommendations();

      return res.json({ recommendations });
    } catch (error) {
      console.error('Error getting budget recommendations:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get budget recommendations' });
    }
  },
);

// Get cash flow projection
router.get('/ai/cash-flow', async (req: TenantRequest, res: Response) => {
  try {
    const { days, startingBalance } = req.query;

    const projection = await forecastingService.generateCashFlowProjection({
      days: days ? parseInt(days as string, 10) : undefined,
      startingBalance: startingBalance
        ? parseFloat(startingBalance as string)
        : undefined,
    });

    return res.json({ projection });
  } catch (error) {
    console.error('Error generating cash flow projection:', error);
    return res
      .status(500)
      .json({ error: 'Failed to generate cash flow projection' });
  }
});

// Get financial insights
router.get('/ai/insights', async (req: TenantRequest, res: Response) => {
  try {
    const insights = await forecastingService.getFinancialInsights();

    return res.json(insights);
  } catch (error) {
    console.error('Error getting financial insights:', error);
    return res.status(500).json({ error: 'Failed to get financial insights' });
  }
});

export default router;
