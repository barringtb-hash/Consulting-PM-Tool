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
  DollarSign,
  Clock,
} from 'lucide-react';
import { Card, Button, Input, Modal } from '../../ui';
import { PageHeader } from '../../ui/PageHeader';
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
  | 'PAYROLL'
  | 'BENEFITS'
  | 'CONTRACTOR'
  | 'RENT'
  | 'UTILITIES'
  | 'INSURANCE'
  | 'MAINTENANCE'
  | 'OTHER';
type RecurringFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY';

const STATUS_CONFIG: Record<
  RecurringCostStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  ACTIVE: { label: 'Active', color: 'green', icon: CheckCircle },
  PAUSED: { label: 'Paused', color: 'yellow', icon: PauseCircle },
  CANCELLED: { label: 'Cancelled', color: 'red', icon: XCircle },
  EXPIRED: { label: 'Expired', color: 'neutral', icon: XCircle },
};

const TYPE_LABELS: Record<RecurringCostType, string> = {
  SUBSCRIPTION: 'Subscription',
  LICENSE: 'License',
  SERVICE: 'Service',
  EMPLOYEE: 'Employee',
  PAYROLL: 'Payroll',
  BENEFITS: 'Benefits',
  CONTRACTOR: 'Contractor',
  RENT: 'Rent',
  UTILITIES: 'Utilities',
  INSURANCE: 'Insurance',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other',
};

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMIANNUALLY: 'Semi-annually',
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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  highlight,
}: StatCardProps) {
  return (
    <Card
      className={`p-4 ${highlight ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
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
            className={`text-xl sm:text-2xl font-semibold ${highlight ? 'text-yellow-600 dark:text-yellow-400' : 'text-neutral-900 dark:text-neutral-100'}`}
          >
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
        <div>
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
          <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: RecurringCostStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    neutral:
      'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
    yellow:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    green:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  if (daysUntil <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Calendar className="h-3 w-3" />
        Due in {daysUntil} days
      </span>
    );
  }

  if (daysUntil <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
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
        className="p-1 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-20">
            <Link
              to={`/finance/recurring-costs/${cost.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Link>
            {cost.status === 'ACTIVE' && (
              <>
                <Link
                  to={`/finance/recurring-costs/${cost.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    onGenerateExpense(cost.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 w-full text-left"
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

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            {[
              'Name',
              'Type',
              'Amount',
              'Frequency',
              'Next Due',
              'Status',
              'Actions',
            ].map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-6 py-4">
                <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const { data: stats, isLoading: statsLoading } = useRecurringCostStats();
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Recurring Costs"
        description="Manage subscriptions, licenses, and recurring expenses"
        icon={RefreshCw}
        action={
          <Button as={Link} to="/finance/recurring-costs/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Recurring Cost
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                icon={<CheckCircle className="h-5 w-5" />}
                label="Active Costs"
                value={stats.activeCosts}
                iconBg="bg-green-100 dark:bg-green-900/50"
                iconColor="text-green-600 dark:text-green-400"
              />
              <StatCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Monthly Total"
                value={formatCurrency(stats.monthlyTotal)}
                iconBg="bg-blue-100 dark:bg-blue-900/50"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={<Calendar className="h-5 w-5" />}
                label="Annual Total"
                value={formatCurrency(stats.annualTotal)}
                iconBg="bg-purple-100 dark:bg-purple-900/50"
                iconColor="text-purple-600 dark:text-purple-400"
              />
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                label="Due in 7 Days"
                value={stats.upcomingRenewalsCount}
                iconBg="bg-yellow-100 dark:bg-yellow-900/50"
                iconColor="text-yellow-600 dark:text-yellow-400"
                highlight={stats.upcomingRenewalsCount > 0}
              />
            </div>
          )
        )}

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
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
                  Type
                </label>
                <select
                  value={queryParams.type || ''}
                  onChange={(e) =>
                    updateParams({ type: e.target.value, page: '1' })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Sort By
                </label>
                <select
                  value={queryParams.sortBy}
                  onChange={(e) => updateParams({ sortBy: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="nextDueDate">Next Due Date</option>
                  <option value="name">Name</option>
                  <option value="amount">Amount</option>
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
            <TableSkeleton />
          ) : error ? (
            <div className="p-8 text-center text-red-600 dark:text-red-400">
              Error loading recurring costs. Please try again.
            </div>
          ) : data?.costs.length === 0 ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" />
              <p className="mt-2 text-neutral-500 dark:text-neutral-400">
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
                <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Next Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {data?.costs.map((cost) => (
                    <tr
                      key={cost.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/finance/recurring-costs/${cost.id}`}
                          className="font-medium text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {cost.name}
                        </Link>
                        {cost.vendorName && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {cost.vendorName}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-xs font-medium">
                          {TYPE_LABELS[cost.type as RecurringCostType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(cost.amount, cost.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {FREQUENCY_LABELS[cost.frequency as RecurringFrequency]}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-neutral-900 dark:text-neutral-100">
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
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing {(queryParams.page! - 1) * queryParams.limit! + 1} to{' '}
                {Math.min(queryParams.page! * queryParams.limit!, data.total)}{' '}
                of {data.total} recurring costs
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
            <p className="text-neutral-600 dark:text-neutral-300">
              Are you sure you want to delete this recurring cost? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
              >
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
    </div>
  );
}
