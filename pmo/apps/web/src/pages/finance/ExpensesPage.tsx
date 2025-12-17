/**
 * Expenses Page
 *
 * List and manage expenses with filtering, search, and CRUD operations.
 */

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Card, Button, Input, Modal } from '../../ui';
import {
  useExpenses,
  useDeleteExpense,
  useApproveExpense,
  useRejectExpense,
  useCategories,
} from '../../api/hooks/useFinance';
import type { ListExpensesParams } from '../../api/finance/expenses';

type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

const STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  DRAFT: { label: 'Draft', color: 'gray', icon: Receipt },
  PENDING: { label: 'Pending', color: 'yellow', icon: Clock },
  APPROVED: { label: 'Approved', color: 'green', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'red', icon: XCircle },
  PAID: { label: 'Paid', color: 'blue', icon: DollarSign },
  CANCELLED: { label: 'Cancelled', color: 'gray', icon: XCircle },
};

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: ExpenseStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
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

interface ExpenseActionsProps {
  expense: {
    id: number;
    status: ExpenseStatus;
  };
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  onDelete: (id: number) => void;
}

function ExpenseActions({
  expense,
  onApprove,
  onReject,
  onDelete,
}: ExpenseActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(expense.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {expense.status === 'PENDING' && (
          <>
            <button
              onClick={() => onApprove(expense.id)}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Approve"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Reject"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
            <Link
              to={`/finance/expenses/${expense.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Link>
            {(expense.status === 'DRAFT' || expense.status === 'PENDING') && (
              <Link
                to={`/finance/expenses/${expense.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            )}
            {(expense.status === 'DRAFT' || expense.status === 'CANCELLED') && (
              <button
                onClick={() => {
                  onDelete(expense.id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Expense"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting this expense.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowRejectModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ExpensesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') || '',
  );
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Build query params from URL
  const queryParams: ListExpensesParams = useMemo(
    () => ({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      status: (searchParams.get('status') as ExpenseStatus) || undefined,
      categoryId: searchParams.get('categoryId')
        ? parseInt(searchParams.get('categoryId')!)
        : undefined,
      search: searchParams.get('search') || undefined,
      sortBy:
        (searchParams.get('sortBy') as
          | 'date'
          | 'amount'
          | 'status'
          | 'createdAt') || 'date',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    }),
    [searchParams],
  );

  const { data, isLoading, error } = useExpenses(queryParams);
  const { data: categoriesData } = useCategories({});
  const deleteExpense = useDeleteExpense();
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();

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

  const handleApprove = (id: number) => {
    approveExpense.mutate({ id });
  };

  const handleReject = (id: number, reason: string) => {
    rejectExpense.mutate({ id, reason });
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteExpense.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / queryParams.limit!) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500">Manage and track all expenses</p>
        </div>
        <Button as={Link} to="/finance/expenses/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search expenses..."
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

          {/* Filter Toggle */}
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

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
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

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={queryParams.categoryId || ''}
                onChange={(e) =>
                  updateParams({ categoryId: e.target.value, page: '1' })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categoriesData?.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={queryParams.sortBy}
                onChange={(e) => updateParams({ sortBy: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="status">Status</option>
                <option value="createdAt">Created</option>
              </select>
            </div>

            {/* Sort Order */}
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

      {/* Quick Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-semibold text-gray-900">{data.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-xl font-semibold text-yellow-600">
              {data.expenses.filter((e) => e.status === 'PENDING').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">This Page Total</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatCurrency(
                data.expenses.reduce((sum, e) => sum + e.amount, 0),
              )}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Showing</p>
            <p className="text-xl font-semibold text-gray-900">
              {data.expenses.length} of {data.total}
            </p>
          </Card>
        </div>
      )}

      {/* Expenses Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-gray-500">Loading expenses...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Error loading expenses. Please try again.
          </div>
        ) : data?.expenses.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-2 text-gray-500">No expenses found</p>
            <Button as={Link} to="/finance/expenses/new" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add First Expense
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        {expense.aiAnomalyFlag && (
                          <span
                            className="inline-flex items-center justify-center p-1 bg-amber-100 text-amber-600 rounded"
                            title="Potential anomaly detected"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                        )}
                        <div>
                          <Link
                            to={`/finance/expenses/${expense.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {expense.description}
                          </Link>
                          {expense.vendorName && (
                            <p className="text-sm text-gray-500">
                              {expense.vendorName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${expense.category.color}20`,
                          color: expense.category.color,
                        }}
                      >
                        {expense.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(expense.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={expense.status as ExpenseStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {expense.owner.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ExpenseActions
                        expense={expense}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onDelete={handleDelete}
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
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(queryParams.page! - 1) * queryParams.limit! + 1} to{' '}
              {Math.min(queryParams.page! * queryParams.limit!, data.total)} of{' '}
              {data.total} expenses
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
        title="Delete Expense"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this expense? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
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
