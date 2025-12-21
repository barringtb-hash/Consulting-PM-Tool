/**
 * Recurring Costs Page
 *
 * Manage subscriptions, licenses, and other recurring expenses.
 */

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Receipt,
  Calendar,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { Card, Button, Input, Modal } from '../../ui';
import {
  useRecurringCosts,
  useDeleteRecurringCost,
  useRecurringCostStats,
  useGenerateExpenseFromRecurringCost,
} from '../../api/hooks/useFinance';
import type { ListRecurringCostsParams } from '../../api/finance/recurring-costs';

type RecurringCostStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
type RecurringCostType =
  | 'SUBSCRIPTION'
  | 'LICENSE'
  | 'SERVICE'
  | 'EMPLOYEE'
  | 'OTHER';
type RecurringFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const STATUS_CONFIG: Record<
  RecurringCostStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  ACTIVE: { label: 'Active', color: 'green', icon: CheckCircle },
  PAUSED: { label: 'Paused', color: 'yellow', icon: PauseCircle },
  CANCELLED: { label: 'Cancelled', color: 'red', icon: XCircle },
  EXPIRED: { label: 'Expired', color: 'gray', icon: XCircle },
};

const TYPE_LABELS: Record<RecurringCostType, string> = {
  SUBSCRIPTION: 'Subscription',
  LICENSE: 'License',
  SERVICE: 'Service',
  EMPLOYEE: 'Employee',
  OTHER: 'Other',
};

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
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

function getDaysUntil(dateString: string): number {
  const today = new Date();
  const targetDate = new Date(dateString);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function StatusBadge({ status }: { status: RecurringCostStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
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

function RenewalBadge({ nextDueDate }: { nextDueDate: string }) {
  const daysUntil = getDaysUntil(nextDueDate);

  if (daysUntil < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  if (daysUntil <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Calendar className="h-3 w-3" />
        Due in {daysUntil} days
      </span>
    );
  }

  if (daysUntil <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Calendar className="h-3 w-3" />
        Due in {daysUntil} days
      </span>
    );
  }

  return null;
}

interface RecurringCostActionsProps {
  cost: {
    id: number;
    status: RecurringCostStatus;
  };
  onDelete: (id: number) => void;
  onGenerateExpense: (id: number) => void;
}

function RecurringCostActions({
  cost,
  onDelete,
  onGenerateExpense,
}: RecurringCostActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-20">
            <Link
              to={`/finance/recurring-costs/${cost.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Link>
            {cost.status === 'ACTIVE' && (
              <>
                <Link
                  to={`/finance/recurring-costs/${cost.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    onGenerateExpense(cost.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
                >
                  <Receipt className="h-4 w-4" />
                  Generate Expense
                </button>
              </>
            )}
            {(cost.status === 'CANCELLED' || cost.status === 'EXPIRED') && (
              <button
                onClick={() => {
                  onDelete(cost.id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
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
}

export default function RecurringCostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') || '',
  );
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const queryParams: ListRecurringCostsParams = useMemo(
    () => ({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      status: (searchParams.get('status') as RecurringCostStatus) || undefined,
      type: (searchParams.get('type') as RecurringCostType) || undefined,
      search: searchParams.get('search') || undefined,
      sortBy:
        (searchParams.get('sortBy') as
          | 'name'
          | 'amount'
          | 'nextDueDate'
          | 'createdAt') || 'nextDueDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    }),
    [searchParams],
  );

  const { data, isLoading, error } = useRecurringCosts(queryParams);
  const { data: stats } = useRecurringCostStats();
  const deleteRecurringCost = useDeleteRecurringCost();
  const generateExpense = useGenerateExpenseFromRecurringCost();

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  const handleSearch = () => {
    updateParams({ search: searchTerm, page: '1' });
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteRecurringCost.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleGenerateExpense = (id: number) => {
    generateExpense.mutate(id);
  };

  const totalPages = data ? Math.ceil(data.total / queryParams.limit!) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recurring Costs
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage subscriptions, licenses, and recurring expenses
          </p>
        </div>
        <Button as={Link} to="/finance/recurring-costs/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring Cost
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Active Costs
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.activeCosts}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monthly Total
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(stats.monthlyTotal)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Annual Total
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(stats.annualTotal)}
            </p>
          </Card>
          <Card
            className={`p-4 ${stats.upcomingRenewalsCount > 0 ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20' : ''}`}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Due in 7 Days
            </p>
            <p
              className={`text-2xl font-semibold ${stats.upcomingRenewalsCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}
            >
              {stats.upcomingRenewalsCount}
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
                placeholder="Search recurring costs..."
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
          <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={queryParams.status || ''}
                onChange={(e) =>
                  updateParams({ status: e.target.value, page: '1' })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={queryParams.type || ''}
                onChange={(e) =>
                  updateParams({ type: e.target.value, page: '1' })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Types</option>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={queryParams.sortBy}
                onChange={(e) => updateParams({ sortBy: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="nextDueDate">Next Due Date</option>
                <option value="name">Name</option>
                <option value="amount">Amount</option>
                <option value="createdAt">Created</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order
              </label>
              <select
                value={queryParams.sortOrder}
                onChange={(e) => updateParams({ sortOrder: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="asc">Soonest First</option>
                <option value="desc">Latest First</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Recurring Costs Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Loading recurring costs...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 dark:text-red-400">
            Error loading recurring costs. Please try again.
          </div>
        ) : data?.costs.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              No recurring costs found
            </p>
            <Button
              as={Link}
              to="/finance/recurring-costs/new"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Recurring Cost
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Next Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data?.costs.map((cost) => (
                  <tr
                    key={cost.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/finance/recurring-costs/${cost.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {cost.name}
                      </Link>
                      {cost.vendorName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {cost.vendorName}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                        {TYPE_LABELS[cost.type as RecurringCostType]}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {formatCurrency(cost.amount, cost.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {FREQUENCY_LABELS[cost.frequency as RecurringFrequency]}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatDate(cost.nextDueDate)}
                        </p>
                        <RenewalBadge nextDueDate={cost.nextDueDate} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={cost.status as RecurringCostStatus}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <RecurringCostActions
                        cost={cost}
                        onDelete={handleDelete}
                        onGenerateExpense={handleGenerateExpense}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(queryParams.page! - 1) * queryParams.limit! + 1} to{' '}
              {Math.min(queryParams.page! * queryParams.limit!, data.total)} of{' '}
              {data.total} recurring costs
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
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Recurring Cost"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this recurring cost? This action
            cannot be undone.
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
