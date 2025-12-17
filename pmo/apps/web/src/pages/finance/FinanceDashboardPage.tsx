/**
 * Finance Dashboard Page
 *
 * Main dashboard for the finance module showing key metrics,
 * spending trends, and budget status.
 */

import { Link } from 'react-router';
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
  Plus,
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

/** Reusable AI badge component */
function AIBadge({ color = 'purple' }: { color?: 'purple' | 'amber' }) {
  const colorClasses = {
    purple: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm ${colorClasses[color]}`}
    >
      <Sparkles className="h-3 w-3" />
      AI
    </span>
  );
}

/** Empty state component for sections with no data */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-xs mb-4">
        {description}
      </p>
      {action && (
        <Button variant="secondary" size="sm" as={Link} to={action.href}>
          <Plus className="h-4 w-4 mr-1" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  href,
  iconColor = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  href?: string;
  iconColor?: 'blue' | 'amber' | 'green' | 'purple';
}) {
  const iconColorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const content = (
    <Card className="p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 truncate">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
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
                <span className="text-sm text-gray-400">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 ${iconColorClasses[iconColor]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
      >
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
      <EmptyState
        icon={PieChart}
        title="No spending data yet"
        description="Start tracking your expenses to see spending breakdown by category."
        action={{ label: 'Add Expense', href: '/finance/expenses/new' }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {categories.slice(0, 6).map((cat) => (
        <div key={cat.categoryId}>
          <div className="flex justify-between text-sm mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.categoryColor }}
              />
              <span className="font-medium text-gray-700">
                {cat.categoryName}
              </span>
            </div>
            <span className="text-gray-600 font-medium">
              {formatCurrency(cat.total)}{' '}
              <span className="text-gray-400 font-normal">
                ({cat.percentage}%)
              </span>
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
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
            iconColor="blue"
            trend={overview?.expensesTrend}
            trendLabel="vs last period"
            href="/finance/expenses"
          />
          <StatCard
            title="Pending Approvals"
            value={overview?.pendingApprovals || 0}
            subtitle={formatCurrency(overview?.pendingAmount || 0)}
            icon={Clock}
            iconColor="amber"
            href="/finance/expenses?status=PENDING"
          />
          <StatCard
            title="Budget Utilization"
            value={`${overview?.budgetUtilization || 0}%`}
            subtitle={`${budgetStats?.activeBudgets || 0} active budgets`}
            icon={Wallet}
            iconColor="green"
            href="/finance/budgets"
          />
          <StatCard
            title="Monthly Recurring"
            value={formatCurrency(overview?.recurringMonthlyCost || 0)}
            subtitle={`${recurringStats?.activeCosts || 0} active subscriptions`}
            icon={RefreshCw}
            iconColor="purple"
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
          <div className="flex items-center gap-2 mb-6">
            <div className="rounded-lg bg-purple-50 p-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Spending Forecast
            </h2>
            <AIBadge color="purple" />
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
                {forecast.summary.trend === 'INCREASING' ? (
                  <>
                    <div className="rounded-full bg-red-100 p-1">
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="text-sm text-red-600 font-medium">
                      Spending trending up {forecast.summary.trendPercentage}%
                    </span>
                  </>
                ) : forecast.summary.trend === 'DECREASING' ? (
                  <>
                    <div className="rounded-full bg-green-100 p-1">
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      Spending trending down{' '}
                      {Math.abs(forecast.summary.trendPercentage)}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-600">
                    Spending is stable
                  </span>
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
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600 font-medium">
                        {f.period}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(f.predictedAmount)}
                      </span>
                    </div>
                    <div className="relative h-7 bg-gray-100 rounded-lg overflow-hidden">
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
                        className="absolute h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{formatCurrency(f.confidenceInterval.low)}</span>
                      <span>{formatCurrency(f.confidenceInterval.high)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Total Predicted */}
              <div className="pt-4 border-t mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Total 3-month forecast
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(forecast.summary.totalPredicted)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Not enough data yet"
              description="Add more expenses to enable AI-powered spending forecasts and predictions."
              action={{ label: 'Add Expense', href: '/finance/expenses/new' }}
            />
          )}
        </Card>

        {/* AI Insights */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="rounded-lg bg-amber-50 p-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
            <AIBadge color="amber" />
          </div>
          {insights ? (
            <div className="space-y-5">
              {/* Summary */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {insights.summary}
              </p>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {insights.keyMetrics.map((metric, i) => (
                  <div
                    key={i}
                    className="text-center p-3 bg-gradient-to-b from-gray-50 to-gray-100/50 rounded-xl border border-gray-100"
                  >
                    <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
                    <p className="font-bold text-gray-900">{metric.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {metric.trend}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Recommendations
                  </p>
                  <ul className="space-y-2.5">
                    {insights.recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-gray-600"
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Lightbulb}
              title="Generating insights"
              description="AI is analyzing your financial data to provide personalized insights."
            />
          )}
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 p-3">
              <PieChart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Annual Recurring Cost
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(recurringStats?.annualTotal || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-100 p-3">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Budgeted
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(budgetStats?.totalBudgeted || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 p-3">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Budget Spent</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(budgetStats?.totalSpent || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
