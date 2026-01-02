/**
 * Expense Detail Page
 *
 * View expense details with approval workflow actions.
 */

import { useState } from 'react';
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
import { Card, Button, Modal, Breadcrumb } from '../../ui';
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
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  PENDING: {
    label: 'Pending Approval',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  PAID: { label: 'Paid', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
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

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: expense, isLoading, error } = useExpense(parseInt(id || '0'));
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();
  const markAsPaid = useMarkExpenseAsPaid();
  const deleteExpense = useDeleteExpense();

  const handleApprove = () => {
    if (id) {
      approveExpense.mutate({ id: parseInt(id) });
    }
  };

  const handleReject = () => {
    if (id && rejectReason.trim()) {
      rejectExpense.mutate({ id: parseInt(id), reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const handleMarkAsPaid = () => {
    if (id) {
      markAsPaid.mutate(parseInt(id));
    }
  };

  const handleDelete = () => {
    if (id) {
      deleteExpense.mutate(parseInt(id), {
        onSuccess: () => navigate('/finance/expenses'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-12 w-12 text-gray-300 mx-auto" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Expense not found
        </h2>
        <p className="mt-2 text-gray-500">
          The expense you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button as={Link} to="/finance/expenses" className="mt-4">
          Back to Expenses
        </Button>
      </div>
    );
  }

  const statusConfig =
    STATUS_CONFIG[expense.status as ExpenseStatus] || STATUS_CONFIG.DRAFT;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Finance', href: '/finance' },
          { label: 'Expenses', href: '/finance/expenses' },
          { label: expense.description },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {expense.description}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
            <span className="text-gray-500">
              Created {formatDateTime(expense.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons based on status */}
          {expense.status === 'PENDING' && (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowRejectModal(true)}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleApprove}>
                <Check className="h-4 w-4 mr-2" />
                Approve
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
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 p-4">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Expense Details
            </h2>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <dt className="text-sm text-gray-500">Date</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDate(expense.date)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <dt className="text-sm text-gray-500">Category</dt>
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
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-gray-500">Vendor</dt>
                    <dd className="font-medium text-gray-900">
                      {expense.vendorName}
                    </dd>
                  </div>
                </div>
              )}

              {expense.invoiceNumber && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-gray-500">Invoice Number</dt>
                    <dd className="font-medium text-gray-900">
                      {expense.invoiceNumber}
                    </dd>
                  </div>
                </div>
              )}

              {expense.tags && expense.tags.length > 0 && (
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-gray-500">Tags</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {expense.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-sm"
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
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-gray-500">Notes</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">
                      {expense.notes}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </Card>

          {/* Rejection Reason */}
          {expense.status === 'REJECTED' && expense.rejectionReason && (
            <Card className="p-6 border-red-200 bg-red-50">
              <h2 className="text-lg font-semibold text-red-900 mb-2">
                Rejection Reason
              </h2>
              <p className="text-red-700">{expense.rejectionReason}</p>
              {expense.approvedBy && (
                <p className="mt-2 text-sm text-red-600">
                  Rejected by {expense.approvedBy.name} on{' '}
                  {expense.approvedAt && formatDateTime(expense.approvedAt)}
                </p>
              )}
            </Card>
          )}

          {/* Approval Info */}
          {expense.status === 'APPROVED' && expense.approvedBy && (
            <Card className="p-6 border-green-200 bg-green-50">
              <h2 className="text-lg font-semibold text-green-900 mb-2">
                Approved
              </h2>
              <p className="text-green-700">
                Approved by {expense.approvedBy.name} on{' '}
                {expense.approvedAt && formatDateTime(expense.approvedAt)}
              </p>
              {expense.approvalNotes && (
                <p className="mt-2 text-green-600">{expense.approvalNotes}</p>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Associations */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Associations
            </h2>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <dt className="text-sm text-gray-500">Owner</dt>
                  <dd className="font-medium text-gray-900">
                    {expense.owner.name}
                  </dd>
                </div>
              </div>

              {expense.account && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-gray-500">Account</dt>
                    <dd>
                      <Link
                        to={`/crm/accounts/${expense.account.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {expense.account.name}
                      </Link>
                    </dd>
                  </div>
                </div>
              )}

              {expense.project && (
                <div className="flex items-start gap-3">
                  <FolderKanban className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-gray-500">Project</dt>
                    <dd>
                      <Link
                        to={`/projects/${expense.project.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {expense.project.name}
                      </Link>
                    </dd>
                  </div>
                </div>
              )}

              {expense.budget && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-gray-500">Budget</dt>
                    <dd>
                      <Link
                        to={`/finance/budgets/${expense.budget.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Timeline
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-gray-100 p-1.5">
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(expense.createdAt)}
                  </p>
                </div>
              </div>

              {expense.updatedAt !== expense.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-gray-100 p-1.5">
                    <Edit className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Last Updated
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(expense.updatedAt)}
                    </p>
                  </div>
                </div>
              )}

              {expense.approvedAt && (
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-full p-1.5 ${expense.status === 'REJECTED' ? 'bg-red-100' : 'bg-green-100'}`}
                  >
                    {expense.status === 'REJECTED' ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {expense.status === 'REJECTED' ? 'Rejected' : 'Approved'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(expense.approvedAt)}
                    </p>
                  </div>
                </div>
              )}

              {expense.paidAt && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-1.5">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Paid</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(expense.paidAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Expense"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting this expense. This will be
            visible to the expense owner.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <p className="text-gray-600">
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
