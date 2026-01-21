/**
 * Finance Routes
 *
 * Finance tracking module routes:
 * - Dashboard
 * - Expenses
 * - Budgets
 * - Recurring Costs
 */

import { lazy } from 'react';
import { Route } from 'react-router';
import { LazyPage } from './components';

// Finance pages
const FinanceDashboardPage = lazy(
  () => import('../pages/finance/FinanceDashboardPage'),
);
const ExpensesPage = lazy(() => import('../pages/finance/ExpensesPage'));
const ExpenseFormPage = lazy(() => import('../pages/finance/ExpenseFormPage'));
const ExpenseDetailPage = lazy(
  () => import('../pages/finance/ExpenseDetailPage'),
);
const BudgetsPage = lazy(() => import('../pages/finance/BudgetsPage'));
const BudgetFormPage = lazy(() => import('../pages/finance/BudgetFormPage'));
const RecurringCostsPage = lazy(
  () => import('../pages/finance/RecurringCostsPage'),
);
const RecurringCostFormPage = lazy(
  () => import('../pages/finance/RecurringCostFormPage'),
);

interface FinanceRoutesProps {
  isModuleEnabled: (moduleId: string) => boolean;
}

/**
 * Finance tracking module routes
 */
export function financeRoutes({
  isModuleEnabled,
}: FinanceRoutesProps): JSX.Element | null {
  if (!isModuleEnabled('financeTracking')) {
    return null;
  }

  return (
    <>
      {/* Finance Dashboard */}
      <Route
        path="/finance"
        element={
          <LazyPage>
            <FinanceDashboardPage />
          </LazyPage>
        }
      />

      {/* Expenses */}
      <Route
        path="/finance/expenses"
        element={
          <LazyPage>
            <ExpensesPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/expenses/new"
        element={
          <LazyPage>
            <ExpenseFormPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/expenses/:id"
        element={
          <LazyPage>
            <ExpenseDetailPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/expenses/:id/edit"
        element={
          <LazyPage>
            <ExpenseFormPage />
          </LazyPage>
        }
      />

      {/* Budgets */}
      <Route
        path="/finance/budgets"
        element={
          <LazyPage>
            <BudgetsPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/budgets/new"
        element={
          <LazyPage>
            <BudgetFormPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/budgets/:id"
        element={
          <LazyPage>
            <BudgetFormPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/budgets/:id/edit"
        element={
          <LazyPage>
            <BudgetFormPage />
          </LazyPage>
        }
      />

      {/* Recurring Costs */}
      <Route
        path="/finance/recurring-costs"
        element={
          <LazyPage>
            <RecurringCostsPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/recurring-costs/new"
        element={
          <LazyPage>
            <RecurringCostFormPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/recurring-costs/:id"
        element={
          <LazyPage>
            <RecurringCostFormPage />
          </LazyPage>
        }
      />
      <Route
        path="/finance/recurring-costs/:id/edit"
        element={
          <LazyPage>
            <RecurringCostFormPage />
          </LazyPage>
        }
      />
    </>
  );
}
