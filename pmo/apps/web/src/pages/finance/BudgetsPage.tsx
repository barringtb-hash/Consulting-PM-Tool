/**
 * Budgets Page
 *
 * List and manage budgets with status tracking and utilization visualization.
 */

import { useState, useMemo, memo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Plus,
  Search,
  Filter,
  Wallet,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Card, Button, Input, Modal } from '../../ui';
import { PageHeader } from '../../ui/PageHeader';
import {
  useBudgets,
  useDeleteBudget,
  useBudgetStats,
} from '../../api/hooks/useFinance';
import type { ListBudgetsParams } from '../../api/finance/budgets';

type BudgetStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

const STATUS_CONFIG: Record<
  BudgetStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  DRAFT: { label: 'Draft', color: 'neutral', icon: Clock },
  ACTIVE: { label: 'Active', color: 'green', icon: CheckCircle },
  PAUSED: { label: 'Paused', color: 'yellow', icon: PauseCircle },
  CLOSED: { label: 'Closed', color: 'neutral', icon: CheckCircle },
};

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
};

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Skeleton loader for stat cards */
function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

/** Skeleton loader for budget cards */
function BudgetCardSkeleton(): JSX.Element {
  return (
    <Card className="p-6">
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
          <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>
        <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-4" />
        <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
      </div>
    </Card>
  );
}

/** Stats card component with icon */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  alert?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  alert,
}: StatCardProps): JSX.Element {
  return (
    <Card
      className={`p-4 ${alert ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {label}
          </div>
          <div
            className={`text-xl sm:text-2xl font-semibold ${alert ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}
          >
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: BudgetStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    neutral:
      'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
    green:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    yellow:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[config.color]}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function UtilizationBar({ spent, amount }: { spent: number; amount: number }) {
  const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
  const isOverBudget = spent > amount;
  const isWarning = percentage >= 75 && percentage < 100;

  let bgColor = 'bg-blue-500';
  if (isOverBudget) bgColor = 'bg-red-500';
  else if (isWarning) bgColor = 'bg-yellow-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span
          className={
            isOverBudget
              ? 'text-red-600 dark:text-red-400 font-medium'
              : 'text-neutral-500 dark:text-neutral-400'
          }
        >
          {percentage.toFixed(0)}% used
        </span>
        {isOverBudget && (
          <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Over budget
          </span>
        )}
      </div>
      <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${bgColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface BudgetActionsProps {
  budget: {
    id: number;
    status: BudgetStatus;
  };
  onDelete: (id: number) => void;
}

const BudgetActions = memo(function BudgetActions({
  budget,
  onDelete,
}: BudgetActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleToggleMenu = useCallback(() => {
    setShowMenu((prev) => !prev);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    onDelete(budget.id);
    setShowMenu(false);
  }, [budget.id, onDelete]);

  return (
    <div className="relative">
      <button
        onClick={handleToggleMenu}
        className="p-1 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={handleCloseMenu} />
          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-20">
            <Link
              to={`/finance/budgets/${budget.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Link>
            {budget.status !== 'CLOSED' && (
              <Link
                to={`/finance/budgets/${budget.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            )}
            {budget.status === 'DRAFT' && (
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 w-full text-left"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
});

BudgetActions.displayName = 'BudgetActions';

export default function BudgetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') || '',
  );
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const queryParams: ListBudgetsParams = useMemo(
    () => ({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      status: (searchParams.get('status') as BudgetStatus) || undefined,
      period: (searchParams.get('period') as BudgetPeriod) || undefined,
      search: searchParams.get('search') || undefined,
      sortBy:
        (searchParams.get('sortBy') as
          | 'name'
          | 'amount'
          | 'spent'
          | 'startDate'
          | 'createdAt') || 'startDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    }),
    [searchParams],
  );

  const { data, isLoading, error } = useBudgets(queryParams);
  const { data: stats, isLoading: statsLoading } = useBudgetStats();
  const deleteBudget = useDeleteBudget();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams],
  );

  const handleSearch = useCallback(() => {
    updateParams({ search: searchTerm, page: '1' });
  }, [searchTerm, updateParams]);

  const handleDelete = useCallback((id: number) => {
    setDeleteConfirm(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirm) {
      deleteBudget.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, deleteBudget]);

  const totalPages = data ? Math.ceil(data.total / queryParams.limit!) : 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Budgets"
        description="Create and manage spending budgets"
        icon={Wallet}
        action={
          <Button as={Link} to="/finance/budgets/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Budget
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              label="Active Budgets"
              value={stats.activeBudgets}
              iconBg="bg-blue-100 dark:bg-blue-900/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Budgeted"
              value={formatCurrency(stats.totalBudgeted)}
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total Spent"
              value={formatCurrency(stats.totalSpent)}
              iconBg="bg-amber-100 dark:bg-amber-900/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5" />}
              label="Over Budget"
              value={stats.overBudgetCount}
              iconBg={
                stats.overBudgetCount > 0
                  ? 'bg-red-100 dark:bg-red-900/50'
                  : 'bg-violet-100 dark:bg-violet-900/50'
              }
              iconColor={
                stats.overBudgetCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-violet-600 dark:text-violet-400'
              }
              alert={stats.overBudgetCount > 0}
            />
          </div>
        ) : null}

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                <Input
                  type="text"
                  placeholder="Search budgets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button variant="secondary" onClick={handleSearch}>
                Search
              </Button>
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown
                className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Status
                </label>
                <select
                  value={queryParams.status || ''}
                  onChange={(e) =>
                    updateParams({ status: e.target.value, page: '1' })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Period
                </label>
                <select
                  value={queryParams.period || ''}
                  onChange={(e) =>
                    updateParams({ period: e.target.value, page: '1' })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="">All Periods</option>
                  {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Sort By
                </label>
                <select
                  value={queryParams.sortBy}
                  onChange={(e) => updateParams({ sortBy: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="startDate">Start Date</option>
                  <option value="name">Name</option>
                  <option value="amount">Amount</option>
                  <option value="spent">Spent</option>
                  <option value="createdAt">Created</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Order
                </label>
                <select
                  value={queryParams.sortOrder}
                  onChange={(e) => updateParams({ sortOrder: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Budgets Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <BudgetCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-red-600 dark:text-red-400">
                Error loading budgets. Please try again.
              </p>
            </div>
          </Card>
        ) : data?.budgets.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Wallet className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                No budgets found
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Create your first budget to start tracking your spending.
              </p>
              <Button as={Link} to="/finance/budgets/new">
                <Plus className="h-4 w-4 mr-2" />
                Create First Budget
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.budgets.map((budget) => (
              <Card key={budget.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Link
                      to={`/finance/budgets/${budget.id}`}
                      className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {budget.name}
                    </Link>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {PERIOD_LABELS[budget.period as BudgetPeriod]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={budget.status as BudgetStatus} />
                    <BudgetActions budget={budget} onDelete={handleDelete} />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(budget.spent, budget.currency)}
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      of {formatCurrency(budget.amount, budget.currency)}
                    </span>
                  </div>
                  <UtilizationBar spent={budget.spent} amount={budget.amount} />
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 text-sm text-neutral-500 dark:text-neutral-400">
                  <div className="flex justify-between">
                    <span>Start Date</span>
                    <span>{formatDate(budget.startDate)}</span>
                  </div>
                  {budget.endDate && (
                    <div className="flex justify-between mt-1">
                      <span>End Date</span>
                      <span>{formatDate(budget.endDate)}</span>
                    </div>
                  )}
                  {budget.account && (
                    <div className="flex justify-between mt-1">
                      <span>Account</span>
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {budget.account.name}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Showing {(queryParams.page! - 1) * queryParams.limit! + 1} to{' '}
              {Math.min(queryParams.page! * queryParams.limit!, data.total)} of{' '}
              {data.total} budgets
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={queryParams.page === 1}
                onClick={() =>
                  updateParams({ page: String(queryParams.page! - 1) })
                }
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={queryParams.page === totalPages}
                onClick={() =>
                  updateParams({ page: String(queryParams.page! + 1) })
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Budget"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-300">
            Are you sure you want to delete this budget? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
