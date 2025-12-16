/**
 * Finance Dashboard Page
 *
 * Main dashboard for the finance module showing key metrics,
 * spending trends, and budget status.
 */

import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  PieChart,
  Receipt,
  Wallet,
  RefreshCw,
  Sparkles,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { Card, Button } from '../../ui';
import {
  useDashboardOverview,
  useBudgetStats,
  useRecurringCostStats,
  useSpendingByCategory,
  useUpcomingRenewals,
  useExpenses,
  useSpendingForecast,
  useFinancialInsights,
} from '../../api/hooks/useFinance';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  href?: string;
}) {
  const content = (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span
                className={`text-sm font-medium ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-sm text-gray-500">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

function CategoryBreakdown({
  categories,
}: {
  categories: Array<{
    categoryId: number;
    categoryName: string;
    categoryColor: string;
    total: number;
    percentage: number;
  }>;
}) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No spending data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.slice(0, 6).map((cat) => (
        <div key={cat.categoryId}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">
              {cat.categoryName}
            </span>
            <span className="text-gray-500">
              {formatCurrency(cat.total)} ({cat.percentage}%)
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.categoryColor,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: budgetStats, isLoading: budgetLoading } = useBudgetStats();
  const { data: recurringStats, isLoading: recurringLoading } =
    useRecurringCostStats();
  const { data: categoryData, isLoading: categoryLoading } =
    useSpendingByCategory();
  const { data: upcomingRenewals } = useUpcomingRenewals(14);
  const { data: pendingExpenses } = useExpenses({
    status: 'PENDING',
    limit: 5,
  });
  const { data: forecast, isLoading: forecastLoading } = useSpendingForecast({
    periods: 3,
    periodType: 'MONTH',
  });
  const { data: insights } = useFinancialInsights();

  const isLoading = overviewLoading || budgetLoading || recurringLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Finance Dashboard
          </h1>
          <p className="text-gray-500">
            Track expenses, budgets, and recurring costs
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" as={Link} to="/finance/recurring-costs">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recurring Costs
          </Button>
          <Button as={Link} to="/finance/expenses/new">
            <Receipt className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Expenses (MTD)"
            value={formatCurrency(overview?.totalExpenseAmount || 0)}
            subtitle={`${overview?.totalExpenses || 0} expenses`}
            icon={DollarSign}
            trend={overview?.expensesTrend}
            trendLabel="vs last period"
            href="/finance/expenses"
          />
          <StatCard
            title="Pending Approvals"
            value={overview?.pendingApprovals || 0}
            subtitle={formatCurrency(overview?.pendingAmount || 0)}
            icon={Clock}
            href="/finance/expenses?status=PENDING"
          />
          <StatCard
            title="Budget Utilization"
            value={`${overview?.budgetUtilization || 0}%`}
            subtitle={`${budgetStats?.activeBudgets || 0} active budgets`}
            icon={Wallet}
            href="/finance/budgets"
          />
          <StatCard
            title="Monthly Recurring"
            value={formatCurrency(overview?.recurringMonthlyCost || 0)}
            subtitle={`${recurringStats?.activeCosts || 0} active subscriptions`}
            icon={RefreshCw}
            href="/finance/recurring-costs"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending by Category */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Spending by Category
            </h2>
            <Link
              to="/finance/expenses"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          {categoryLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-2 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <CategoryBreakdown categories={categoryData?.categories || []} />
          )}
        </Card>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          {(pendingExpenses?.expenses?.length ?? 0) > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Pending Approvals
                </h2>
              </div>
              <div className="space-y-3">
                {pendingExpenses?.expenses.slice(0, 5).map((expense) => (
                  <Link
                    key={expense.id}
                    to={`/finance/expenses/${expense.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {expense.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {expense.owner.name}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                to="/finance/expenses?status=PENDING"
                className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700"
              >
                View all pending ({pendingExpenses?.total || 0})
              </Link>
            </Card>
          )}

          {/* Upcoming Renewals */}
          {(upcomingRenewals?.costs?.length ?? 0) > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Renewals
                </h2>
              </div>
              <div className="space-y-3">
                {upcomingRenewals?.costs.slice(0, 5).map((cost) => (
                  <Link
                    key={cost.id}
                    to={`/finance/recurring-costs/${cost.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {cost.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Due {new Date(cost.nextDueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(cost.amount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                to="/finance/recurring-costs"
                className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700"
              >
                View all recurring costs
              </Link>
            </Card>
          )}

          {/* Budget Status */}
          {(budgetStats?.overBudgetCount ?? 0) > 0 && (
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold text-red-900">
                  Budget Alerts
                </h2>
              </div>
              <p className="text-sm text-red-700">
                {budgetStats?.overBudgetCount} budget(s) are over their
                allocated amount.
              </p>
              <Link
                to="/finance/budgets"
                className="mt-3 inline-block text-sm text-red-700 font-medium hover:text-red-800"
              >
                Review budgets &rarr;
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* AI Insights & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Forecast */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Spending Forecast
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          </div>
          {forecastLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-8 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : forecast?.forecasts ? (
            <div className="space-y-4">
              {/* Trend Summary */}
              <div className="flex items-center gap-2 text-sm">
                {forecast.summary.trend === 'INCREASING' ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">
                      Spending trending up {forecast.summary.trendPercentage}%
                    </span>
                  </>
                ) : forecast.summary.trend === 'DECREASING' ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">
                      Spending trending down{' '}
                      {Math.abs(forecast.summary.trendPercentage)}%
                    </span>
                  </>
                ) : (
                  <span className="text-gray-600">Spending is stable</span>
                )}
              </div>

              {/* Forecast Bars */}
              {forecast.forecasts.map((f, i) => {
                const maxAmount = Math.max(
                  ...forecast.forecasts.map((x) => x.confidenceInterval.high),
                );
                const percentage = (f.predictedAmount / maxAmount) * 100;

                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{f.period}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(f.predictedAmount)}
                      </span>
                    </div>
                    <div className="relative h-6 bg-gray-100 rounded overflow-hidden">
                      {/* Confidence interval background */}
                      <div
                        className="absolute h-full bg-purple-100"
                        style={{
                          left: `${(f.confidenceInterval.low / maxAmount) * 100}%`,
                          width: `${((f.confidenceInterval.high - f.confidenceInterval.low) / maxAmount) * 100}%`,
                        }}
                      />
                      {/* Predicted amount bar */}
                      <div
                        className="absolute h-full bg-purple-500 rounded"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>{formatCurrency(f.confidenceInterval.low)}</span>
                      <span>{formatCurrency(f.confidenceInterval.high)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Total Predicted */}
              <div className="pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Total 3-month forecast
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(forecast.summary.totalPredicted)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Not enough data for forecasting
            </div>
          )}
        </Card>

        {/* AI Insights */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          </div>
          {insights ? (
            <div className="space-y-4">
              {/* Summary */}
              <p className="text-sm text-gray-600">{insights.summary}</p>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {insights.keyMetrics.map((metric, i) => (
                  <div
                    key={i}
                    className="text-center p-3 bg-gray-50 rounded-lg"
                  >
                    <p className="text-xs text-gray-500">{metric.label}</p>
                    <p className="font-semibold text-gray-900">
                      {metric.value}
                    </p>
                    <p className="text-xs text-gray-400">{metric.trend}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                  </p>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-medium shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Loading insights...
            </div>
          )}
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-3">
              <PieChart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Annual Recurring Cost</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(recurringStats?.annualTotal || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-3">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Budgeted</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(budgetStats?.totalBudgeted || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-3">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Budget Spent</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(budgetStats?.totalSpent || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
