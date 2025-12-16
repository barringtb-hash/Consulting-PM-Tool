/**
 * Finance Tracking Module Router
 *
 * Main router combining all finance-related routes.
 * Admin-only module for tracking expenses, budgets, and recurring costs.
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireTenantRole } from '../../auth/auth.middleware';
import { runWithTenant } from '../../tenant/tenant.context';
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

const router = Router();

// All finance routes require authentication
router.use(requireAuth);

// ============================================================================
// MIDDLEWARE: Admin check for write operations
// ============================================================================

const requireFinanceAdmin = requireTenantRole(['OWNER', 'ADMIN']);

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// List categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const parsed = listCategoriesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await runWithTenant(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => categoryService.listCategories(parsed.data) as any,
      req.tenantId!,
    );
    return res.json(result);
  } catch (error) {
    console.error('Error listing categories:', error);
    return res.status(500).json({ error: 'Failed to list categories' });
  }
});

// Get category by ID
router.get('/categories/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await runWithTenant(
      () => categoryService.getCategoryById(id),
      req.tenantId!,
    );

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
  async (req: Request, res: Response) => {
    try {
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const category = await runWithTenant(
        () => categoryService.createCategory(parsed.data),
        req.tenantId!,
      );

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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const category = await runWithTenant(
        () => categoryService.updateCategory(id, parsed.data),
        req.tenantId!,
      );

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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      await runWithTenant(
        () => categoryService.deleteCategory(id),
        req.tenantId!,
      );

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
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const parsed = listExpensesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await runWithTenant(
      () => expenseService.listExpenses(parsed.data),
      req.tenantId!,
    );

    return res.json(result);
  } catch (error) {
    console.error('Error listing expenses:', error);
    return res.status(500).json({ error: 'Failed to list expenses' });
  }
});

// Get expense stats
router.get('/expenses/stats', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const stats = await runWithTenant(
      () =>
        expenseService.getExpenseStats({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          accountId: accountId ? parseInt(accountId as string, 10) : undefined,
        }),
      req.tenantId!,
    );

    return res.json(stats);
  } catch (error) {
    console.error('Error getting expense stats:', error);
    return res.status(500).json({ error: 'Failed to get expense stats' });
  }
});

// Get expense by ID
router.get('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    const expense = await runWithTenant(
      () => expenseService.getExpenseById(id),
      req.tenantId!,
    );

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
router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const expense = await runWithTenant(
      () => expenseService.createExpense(parsed.data, req.user!.id),
      req.tenantId!,
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
router.put('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const expense = await runWithTenant(
      () => expenseService.updateExpense(id, parsed.data, req.user!.id),
      req.tenantId!,
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
router.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    await runWithTenant(
      () => expenseService.deleteExpense(id, req.user!.id),
      req.tenantId!,
    );

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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      const parsed = approveExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const expense = await runWithTenant(
        () =>
          expenseService.approveExpense(id, req.user!.id, parsed.data.notes),
        req.tenantId!,
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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      const parsed = rejectExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const expense = await runWithTenant(
        () =>
          expenseService.rejectExpense(id, req.user!.id, parsed.data.reason),
        req.tenantId!,
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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      const expense = await runWithTenant(
        () => expenseService.markExpenseAsPaid(id, req.user!.id),
        req.tenantId!,
      );

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
router.get('/budgets', async (req: Request, res: Response) => {
  try {
    const parsed = listBudgetsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await runWithTenant(
      () => budgetService.listBudgets(parsed.data),
      req.tenantId!,
    );

    return res.json(result);
  } catch (error) {
    console.error('Error listing budgets:', error);
    return res.status(500).json({ error: 'Failed to list budgets' });
  }
});

// Get budget stats
router.get('/budgets/stats', async (req: Request, res: Response) => {
  try {
    const stats = await runWithTenant(
      () => budgetService.getBudgetStats(),
      req.tenantId!,
    );
    return res.json(stats);
  } catch (error) {
    console.error('Error getting budget stats:', error);
    return res.status(500).json({ error: 'Failed to get budget stats' });
  }
});

// Get budget by ID
router.get('/budgets/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid budget ID' });
    }

    const budget = await runWithTenant(
      () => budgetService.getBudgetById(id),
      req.tenantId!,
    );

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
router.get('/budgets/:id/expenses', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid budget ID' });
    }

    const { page, limit } = req.query;
    const result = await runWithTenant(
      () =>
        budgetService.getBudgetExpenses(id, {
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }),
      req.tenantId!,
    );

    return res.json(result);
  } catch (error) {
    console.error('Error getting budget expenses:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to get budget expenses';
    return res.status(400).json({ error: message });
  }
});

// Create budget (admin only)
router.post(
  '/budgets',
  requireFinanceAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = createBudgetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const budget = await runWithTenant(
        () => budgetService.createBudget(parsed.data, req.user!.id),
        req.tenantId!,
      );

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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid budget ID' });
      }

      const parsed = updateBudgetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const budget = await runWithTenant(
        () => budgetService.updateBudget(id, parsed.data),
        req.tenantId!,
      );

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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid budget ID' });
      }

      await runWithTenant(() => budgetService.deleteBudget(id), req.tenantId!);

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
router.get('/recurring-costs', async (req: Request, res: Response) => {
  try {
    const parsed = listRecurringCostsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await runWithTenant(
      () => recurringCostService.listRecurringCosts(parsed.data),
      req.tenantId!,
    );

    return res.json(result);
  } catch (error) {
    console.error('Error listing recurring costs:', error);
    return res.status(500).json({ error: 'Failed to list recurring costs' });
  }
});

// Get recurring cost stats
router.get('/recurring-costs/stats', async (req: Request, res: Response) => {
  try {
    const stats = await runWithTenant(
      () => recurringCostService.getRecurringCostStats(),
      req.tenantId!,
    );
    return res.json(stats);
  } catch (error) {
    console.error('Error getting recurring cost stats:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get recurring cost stats' });
  }
});

// Get upcoming renewals
router.get('/recurring-costs/upcoming', async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const costs = await runWithTenant(
      () =>
        recurringCostService.getUpcomingRenewals(
          days ? parseInt(days as string, 10) : 30,
        ),
      req.tenantId!,
    );
    return res.json({ costs });
  } catch (error) {
    console.error('Error getting upcoming renewals:', error);
    return res.status(500).json({ error: 'Failed to get upcoming renewals' });
  }
});

// Get recurring cost by ID
router.get('/recurring-costs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid recurring cost ID' });
    }

    const cost = await runWithTenant(
      () => recurringCostService.getRecurringCostById(id),
      req.tenantId!,
    );

    if (!cost) {
      return res.status(404).json({ error: 'Recurring cost not found' });
    }

    return res.json({ cost });
  } catch (error) {
    console.error('Error getting recurring cost:', error);
    return res.status(500).json({ error: 'Failed to get recurring cost' });
  }
});

// Create recurring cost (admin only)
router.post(
  '/recurring-costs',
  requireFinanceAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = createRecurringCostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const cost = await runWithTenant(
        () =>
          recurringCostService.createRecurringCost(parsed.data, req.user!.id),
        req.tenantId!,
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
  },
);

// Update recurring cost (admin only)
router.put(
  '/recurring-costs/:id',
  requireFinanceAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid recurring cost ID' });
      }

      const parsed = updateRecurringCostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const cost = await runWithTenant(
        () => recurringCostService.updateRecurringCost(id, parsed.data),
        req.tenantId!,
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

// Delete recurring cost (admin only)
router.delete(
  '/recurring-costs/:id',
  requireFinanceAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid recurring cost ID' });
      }

      await runWithTenant(
        () => recurringCostService.deleteRecurringCost(id),
        req.tenantId!,
      );

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
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid recurring cost ID' });
      }

      const result = await runWithTenant(
        () =>
          recurringCostService.generateExpenseFromRecurringCost(
            id,
            req.user!.id,
          ),
        req.tenantId!,
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
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const overview = await runWithTenant(
      () =>
        analyticsService.getDashboardOverview({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
        }),
      req.tenantId!,
    );
    return res.json(overview);
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    return res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

// Spending by category
router.get('/analytics/by-category', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const data = await runWithTenant(
      () =>
        analyticsService.getSpendingByCategory({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          accountId: accountId ? parseInt(accountId as string, 10) : undefined,
        }),
      req.tenantId!,
    );
    return res.json({ categories: data });
  } catch (error) {
    console.error('Error getting spending by category:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get spending by category' });
  }
});

// Spending trends
router.get('/analytics/trends', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy, accountId } = req.query;
    const data = await runWithTenant(
      () =>
        analyticsService.getSpendingTrends({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          groupBy: groupBy as 'day' | 'week' | 'month' | undefined,
          accountId: accountId ? parseInt(accountId as string, 10) : undefined,
        }),
      req.tenantId!,
    );
    return res.json({ trends: data });
  } catch (error) {
    console.error('Error getting spending trends:', error);
    return res.status(500).json({ error: 'Failed to get spending trends' });
  }
});

// Account profitability
router.get('/analytics/profitability', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accountIds } = req.query;
    const data = await runWithTenant(
      () =>
        analyticsService.getAccountProfitability({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          accountIds: accountIds
            ? (accountIds as string).split(',').map((id) => parseInt(id, 10))
            : undefined,
        }),
      req.tenantId!,
    );
    return res.json({ accounts: data });
  } catch (error) {
    console.error('Error getting account profitability:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get account profitability' });
  }
});

// Expenses by account
router.get('/analytics/by-account', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const data = await runWithTenant(
      () =>
        analyticsService.getExpensesByAccount({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }),
      req.tenantId!,
    );
    return res.json({ accounts: data });
  } catch (error) {
    console.error('Error getting expenses by account:', error);
    return res.status(500).json({ error: 'Failed to get expenses by account' });
  }
});

// Top vendors
router.get('/analytics/top-vendors', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const data = await runWithTenant(
      () =>
        analyticsService.getTopVendors({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }),
      req.tenantId!,
    );
    return res.json({ vendors: data });
  } catch (error) {
    console.error('Error getting top vendors:', error);
    return res.status(500).json({ error: 'Failed to get top vendors' });
  }
});

export default router;
