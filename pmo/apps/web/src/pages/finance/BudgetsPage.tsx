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
} from 'lucide-react';
import { Card, Button, Input, Modal } from '../../ui';
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
  DRAFT: { label: 'Draft', color: 'gray', icon: Clock },
  ACTIVE: { label: 'Active', color: 'green', icon: CheckCircle },
  PAUSED: { label: 'Paused', color: 'yellow', icon: PauseCircle },
  CLOSED: { label: 'Closed', color: 'gray', icon: CheckCircle },
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

function StatusBadge({ status }: { status: BudgetStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
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
            isOverBudget ? 'text-red-600 font-medium' : 'text-gray-500'
          }
        >
          {percentage.toFixed(0)}% used
        </span>
        {isOverBudget && (
          <span className="text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Over budget
          </span>
        )}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
  const { data: stats } = useBudgetStats();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-500">Create and manage spending budgets</p>
        </div>
        <Button as={Link} to="/finance/budgets/new">
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Active Budgets</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.activeBudgets}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Budgeted</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(stats.totalBudgeted)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(stats.totalSpent)}
            </p>
          </Card>
          <Card
            className={`p-4 ${stats.overBudgetCount > 0 ? 'border-red-200 bg-red-50' : ''}`}
          >
            <p className="text-sm text-gray-500">Over Budget</p>
            <p
              className={`text-2xl font-semibold ${stats.overBudgetCount > 0 ? 'text-red-600' : 'text-gray-900'}`}
            >
              {stats.overBudgetCount}
            </p>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={queryParams.status || ''}
                onChange={(e) =>
                  updateParams({ status: e.target.value, page: '1' })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period
              </label>
              <select
                value={queryParams.period || ''}
                onChange={(e) =>
                  updateParams({ period: e.target.value, page: '1' })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={queryParams.sortBy}
                onChange={(e) => updateParams({ sortBy: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="startDate">Start Date</option>
                <option value="name">Name</option>
                <option value="amount">Amount</option>
                <option value="spent">Spent</option>
                <option value="createdAt">Created</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={queryParams.sortOrder}
                onChange={(e) => updateParams({ sortOrder: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-2 bg-gray-200 rounded w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600">
          Error loading budgets. Please try again.
        </div>
      ) : data?.budgets.length === 0 ? (
        <Card className="p-8 text-center">
          <Wallet className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-2 text-gray-500">No budgets found</p>
          <Button as={Link} to="/finance/budgets/new" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create First Budget
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.budgets.map((budget) => (
            <Card key={budget.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link
                    to={`/finance/budgets/${budget.id}`}
                    className="font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {budget.name}
                  </Link>
                  <p className="text-sm text-gray-500">
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
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(budget.spent, budget.currency)}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {formatCurrency(budget.amount, budget.currency)}
                  </span>
                </div>
                <UtilizationBar spent={budget.spent} amount={budget.amount} />
              </div>

              <div className="pt-4 border-t text-sm text-gray-500">
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
                    <span className="text-gray-700">{budget.account.name}</span>
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
          <p className="text-sm text-gray-500">
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Budget"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
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
