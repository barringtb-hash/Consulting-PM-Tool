/**
 * Expense Detail Page
 *
 * View expense details with approval workflow actions.
 */

import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  Edit,
  Trash2,
  Check,
  X,
  Receipt,
  Calendar,
  DollarSign,
  Building2,
  FolderKanban,
  Tag,
  User,
  Clock,
  FileText,
  CreditCard,
} from 'lucide-react';
import { Card, Button, Modal } from '../../ui';
import { PageHeader } from '../../ui/PageHeader';
import { useToast } from '../../ui/Toast';
import {
  useExpense,
  useApproveExpense,
  useRejectExpense,
  useMarkExpenseAsPaid,
  useDeleteExpense,
} from '../../api/hooks/useFinance';

type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

const STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; color: string; bgColor: string }
> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-neutral-700 dark:text-neutral-300',
    bgColor: 'bg-neutral-100 dark:bg-neutral-700',
  },
  PENDING: {
    label: 'Pending Approval',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  PAID: {
    label: 'Paid',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-neutral-700 dark:text-neutral-300',
    bgColor: 'bg-neutral-100 dark:bg-neutral-700',
  },
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
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Loading skeleton component for the expense detail page.
 */
function ExpenseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="container-padding py-6">
          <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-4" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mt-2" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-10 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="page-content">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 animate-pulse">
              <div className="h-12 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </Card>
            <Card className="p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const expenseId = useMemo(() => (id ? parseInt(id, 10) : 0), [id]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: expense, isLoading, error } = useExpense(expenseId);
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();
  const markAsPaid = useMarkExpenseAsPaid();
  const deleteExpense = useDeleteExpense();
  const { showToast } = useToast();

  const handleApprove = () => {
    if (id) {
      approveExpense.mutate(
        { id: parseInt(id) },
        {
          onSuccess: () => {
            showToast({
              message: 'Expense approved successfully',
              variant: 'success',
            });
          },
          onError: (err) => {
            const message =
              err instanceof Error ? err.message : 'Failed to approve expense';
            showToast({ message, variant: 'destructive' });
          },
        },
      );
    }
  };

  const handleReject = () => {
    if (id && rejectReason.trim()) {
      rejectExpense.mutate(
        { id: parseInt(id), reason: rejectReason },
        {
          onSuccess: () => {
            showToast({ message: 'Expense rejected', variant: 'success' });
            setShowRejectModal(false);
            setRejectReason('');
          },
          onError: (err) => {
            const message =
              err instanceof Error ? err.message : 'Failed to reject expense';
            showToast({ message, variant: 'destructive' });
          },
        },
      );
    }
  };

  const handleMarkAsPaid = () => {
    if (id) {
      markAsPaid.mutate(parseInt(id), {
        onSuccess: () => {
          showToast({ message: 'Expense marked as paid', variant: 'success' });
        },
        onError: (err) => {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to mark expense as paid';
          showToast({ message, variant: 'destructive' });
        },
      });
    }
  };

  const handleDelete = () => {
    if (id) {
      deleteExpense.mutate(parseInt(id), {
        onSuccess: () => {
          showToast({ message: 'Expense deleted', variant: 'success' });
          navigate('/finance/expenses');
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to delete expense';
          showToast({ message, variant: 'destructive' });
        },
      });
    }
  };

  if (isLoading) {
    return <ExpenseDetailSkeleton />;
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="page-content">
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" />
            <h2 className="mt-4 text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Expense not found
            </h2>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">
              The expense you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button as={Link} to="/finance/expenses" className="mt-4">
              Back to Expenses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig =
    STATUS_CONFIG[expense.status as ExpenseStatus] || STATUS_CONFIG.DRAFT;

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Action buttons based on status */}
      {expense.status === 'PENDING' && (
        <>
          <Button
            onClick={handleApprove}
            disabled={approveExpense.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            {approveExpense.isPending ? 'Approving...' : 'Approve'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowRejectModal(true)}
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </>
      )}
      {expense.status === 'APPROVED' && (
        <Button onClick={handleMarkAsPaid}>
          <CreditCard className="h-4 w-4 mr-2" />
          Mark as Paid
        </Button>
      )}
      {(expense.status === 'DRAFT' || expense.status === 'PENDING') && (
        <Button
          variant="secondary"
          as={Link}
          to={`/finance/expenses/${id}/edit`}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}
      {(expense.status === 'DRAFT' || expense.status === 'CANCELLED') && (
        <Button
          variant="secondary"
          onClick={() => setShowDeleteModal(true)}
          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>{expense.description}</span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>
        }
        description={`Created ${formatDateTime(expense.createdAt)}`}
        icon={Receipt}
        actions={headerActions}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Expenses', href: '/finance/expenses' },
          { label: expense.description },
        ]}
      />

      <div className="page-content">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Amount Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Amount
                  </p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            {/* Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Expense Details
              </h2>
              <dl className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                      Date
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {formatDate(expense.date)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                      Category
                    </dt>
                    <dd>
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${expense.category.color}20`,
                          color: expense.category.color,
                        }}
                      >
                        {expense.category.name}
                      </span>
                    </dd>
                  </div>
                </div>

                {expense.vendorName && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Vendor
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                        {expense.vendorName}
                      </dd>
                    </div>
                  </div>
                )}

                {expense.invoiceNumber && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Invoice Number
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                        {expense.invoiceNumber}
                      </dd>
                    </div>
                  </div>
                )}

                {expense.tags && expense.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Tags
                      </dt>
                      <dd className="flex flex-wrap gap-1 mt-1">
                        {expense.tags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </div>
                )}

                {expense.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Notes
                      </dt>
                      <dd className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
                        {expense.notes}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </Card>

            {/* Rejection Reason */}
            {expense.status === 'REJECTED' && expense.rejectionReason && (
              <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
                  Rejection Reason
                </h2>
                <p className="text-red-700 dark:text-red-400">
                  {expense.rejectionReason}
                </p>
                {expense.approvedBy && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                    Rejected by {expense.approvedBy.name} on{' '}
                    {expense.approvedAt && formatDateTime(expense.approvedAt)}
                  </p>
                )}
              </Card>
            )}

            {/* Approval Info */}
            {expense.status === 'APPROVED' && expense.approvedBy && (
              <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <h2 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
                  Approved
                </h2>
                <p className="text-green-700 dark:text-green-400">
                  Approved by {expense.approvedBy.name} on{' '}
                  {expense.approvedAt && formatDateTime(expense.approvedAt)}
                </p>
                {expense.approvalNotes && (
                  <p className="mt-2 text-green-600 dark:text-green-500">
                    {expense.approvalNotes}
                  </p>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Associations */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Associations
              </h2>
              <dl className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                      Owner
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {expense.owner.name}
                    </dd>
                  </div>
                </div>

                {expense.account && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Account
                      </dt>
                      <dd>
                        <Link
                          to={`/crm/accounts/${expense.account.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {expense.account.name}
                        </Link>
                      </dd>
                    </div>
                  </div>
                )}

                {expense.project && (
                  <div className="flex items-start gap-3">
                    <FolderKanban className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Project
                      </dt>
                      <dd>
                        <Link
                          to={`/projects/${expense.project.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {expense.project.name}
                        </Link>
                      </dd>
                    </div>
                  </div>
                )}

                {expense.budget && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Budget
                      </dt>
                      <dd>
                        <Link
                          to={`/finance/budgets/${expense.budget.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {expense.budget.name}
                        </Link>
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-neutral-100 dark:bg-neutral-700 p-1.5">
                    <Clock className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Created
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(expense.createdAt)}
                    </p>
                  </div>
                </div>

                {expense.updatedAt !== expense.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-neutral-100 dark:bg-neutral-700 p-1.5">
                      <Edit className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Last Updated
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDateTime(expense.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {expense.approvedAt && (
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-full p-1.5 ${expense.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}
                    >
                      {expense.status === 'REJECTED' ? (
                        <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {expense.status === 'REJECTED'
                          ? 'Rejected'
                          : 'Approved'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDateTime(expense.approvedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {expense.paidAt && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-1.5">
                      <CreditCard className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Paid
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDateTime(expense.paidAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Expense"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-300">
            Please provide a reason for rejecting this expense. This will be
            visible to the expense owner.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowRejectModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Expense
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Expense"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-300">
            Are you sure you want to delete this expense? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
