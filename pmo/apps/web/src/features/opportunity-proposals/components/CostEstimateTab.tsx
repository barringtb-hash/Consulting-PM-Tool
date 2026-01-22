/**
 * Cost Estimate Tab Component
 *
 * Main tab component for displaying and managing cost estimates
 * for an opportunity. Supports manual creation and AI-powered generation.
 *
 * Features:
 * - List view of all estimates with status badges
 * - Create/edit estimates with line items
 * - AI-powered estimate generation
 * - Approval workflow (approve/reject)
 * - Clone estimates for versioning
 *
 * @module features/opportunity-proposals/components/CostEstimateTab
 */

import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Sparkles,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useToast } from '../../../ui/Toast';
import {
  useCostEstimates,
  useDeleteEstimate,
  useApproveEstimate,
  useRejectEstimate,
  useCloneEstimate,
  useGenerateEstimate,
} from '../hooks/useCostEstimates';
import { EstimateFormModal } from './EstimateFormModal';
import { AIEstimateModal } from './AIEstimateModal';
import type { CostEstimate, EstimateStatus, EstimateType } from '../types';

interface CostEstimateTabProps {
  opportunityId: number;
  opportunityName?: string;
  opportunityDescription?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_BADGE_VARIANTS: Record<
  EstimateStatus,
  'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  DRAFT: 'secondary',
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'default',
};

const STATUS_LABELS: Record<EstimateStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

const TYPE_LABELS: Record<EstimateType, string> = {
  FIXED_PRICE: 'Fixed Price',
  TIME_AND_MATERIALS: 'Time & Materials',
  RETAINER: 'Retainer',
  HYBRID: 'Hybrid',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

// ============================================================================
// Estimate Card Component
// ============================================================================

interface EstimateCardProps {
  estimate: CostEstimate;
  onEdit: (estimate: CostEstimate) => void;
  onDelete: (estimate: CostEstimate) => void;
  onApprove: (estimate: CostEstimate) => void;
  onReject: (estimate: CostEstimate) => void;
  onClone: (estimate: CostEstimate) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isCloning?: boolean;
}

function EstimateCard({
  estimate,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onClone,
  isApproving,
  isRejecting,
  isCloning,
}: EstimateCardProps): JSX.Element {
  const canApprove =
    estimate.status === 'DRAFT' || estimate.status === 'PENDING_REVIEW';
  const canReject =
    estimate.status === 'DRAFT' || estimate.status === 'PENDING_REVIEW';
  const canEdit = estimate.status === 'DRAFT';

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant={STATUS_BADGE_VARIANTS[estimate.status]} size="sm">
              {STATUS_LABELS[estimate.status]}
            </Badge>
            <Badge variant="secondary" size="sm">
              {TYPE_LABELS[estimate.estimateType]}
            </Badge>
            {estimate.aiGenerated && (
              <Badge variant="primary" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            )}
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              v{estimate.version}
            </span>
          </div>

          <h4 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {estimate.name}
          </h4>

          <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {formatCurrency(estimate.total, estimate.currency)}
            </span>
            {estimate.lineItems && (
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {estimate.lineItems.length} items
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(estimate.createdAt)}
            </span>
          </div>

          {estimate.validUntil && (
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Valid until: {formatDate(estimate.validUntil)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canApprove && (
            <button
              type="button"
              onClick={() => onApprove(estimate)}
              disabled={isApproving}
              className="p-1.5 text-neutral-400 hover:text-success-600 dark:hover:text-success-400 rounded-md hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50"
              title="Approve"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {canReject && (
            <button
              type="button"
              onClick={() => onReject(estimate)}
              disabled={isRejecting}
              className="p-1.5 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-md hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50"
              title="Reject"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onClone(estimate)}
            disabled={isCloning}
            className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50"
            title="Clone"
          >
            <Copy className="w-4 h-4" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(estimate)}
              className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onDelete(estimate)}
              className="p-1.5 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CostEstimateTab({
  opportunityId,
  opportunityName,
  opportunityDescription,
}: CostEstimateTabProps): JSX.Element {
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<CostEstimate | null>(
    null,
  );

  // Data fetching
  const estimatesQuery = useCostEstimates(opportunityId);

  // Mutations
  const deleteMutation = useDeleteEstimate();
  const approveMutation = useApproveEstimate();
  const rejectMutation = useRejectEstimate();
  const cloneMutation = useCloneEstimate();
  const generateMutation = useGenerateEstimate();

  // Toast
  const { showToast } = useToast();

  // Handlers
  const handleCreate = (): void => {
    setEditingEstimate(null);
    setShowFormModal(true);
  };

  const handleEdit = (estimate: CostEstimate): void => {
    setEditingEstimate(estimate);
    setShowFormModal(true);
  };

  const handleDelete = async (estimate: CostEstimate): Promise<void> => {
    if (
      !window.confirm(`Are you sure you want to delete "${estimate.name}"?`)
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        opportunityId,
        estimateId: estimate.id,
      });
      showToast('Estimate deleted', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to delete estimate',
        'error',
      );
    }
  };

  const handleApprove = async (estimate: CostEstimate): Promise<void> => {
    try {
      await approveMutation.mutateAsync({
        opportunityId,
        estimateId: estimate.id,
      });
      showToast('Estimate approved', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to approve estimate',
        'error',
      );
    }
  };

  const handleReject = async (estimate: CostEstimate): Promise<void> => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;

    try {
      await rejectMutation.mutateAsync({
        opportunityId,
        estimateId: estimate.id,
        reason: reason || undefined,
      });
      showToast('Estimate rejected', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to reject estimate',
        'error',
      );
    }
  };

  const handleClone = async (estimate: CostEstimate): Promise<void> => {
    try {
      await cloneMutation.mutateAsync({
        opportunityId,
        estimateId: estimate.id,
      });
      showToast('Estimate cloned', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to clone estimate',
        'error',
      );
    }
  };

  const handleGenerateAI = async (): Promise<void> => {
    setShowAIModal(true);
  };

  const handleAIGenerate = async (input: {
    estimateType?: string;
    projectDescription?: string;
    budget?: number;
  }): Promise<void> => {
    try {
      await generateMutation.mutateAsync({
        opportunityId,
        input: {
          ...input,
          estimateType: input.estimateType as
            | 'FIXED_PRICE'
            | 'TIME_AND_MATERIALS'
            | 'RETAINER'
            | 'HYBRID'
            | undefined,
        },
      });
      showToast('AI estimate generated', 'success');
      setShowAIModal(false);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to generate estimate',
        'error',
      );
    }
  };

  const handleRefresh = (): void => {
    estimatesQuery.refetch();
  };

  const handleFormClose = (): void => {
    setShowFormModal(false);
    setEditingEstimate(null);
  };

  const handleFormSuccess = (): void => {
    setShowFormModal(false);
    setEditingEstimate(null);
    estimatesQuery.refetch();
  };

  // Summary stats
  const estimates = estimatesQuery.data ?? [];
  const approvedEstimates = estimates.filter((e) => e.status === 'APPROVED');
  const totalApprovedValue = approvedEstimates.reduce(
    (sum, e) => sum + e.total,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total Estimates
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {estimates.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 dark:bg-success-900 rounded-lg">
                <Check className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Approved
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {approvedEstimates.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 dark:bg-warning-900 rounded-lg">
                <Clock className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Pending Review
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {
                    estimates.filter((e) => e.status === 'PENDING_REVIEW')
                      .length
                  }
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <DollarSign className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Approved Value
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(totalApprovedValue)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Cost Estimates
        </h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={handleGenerateAI}>
            <Sparkles className="w-4 h-4 mr-1" />
            AI Generate
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-1" />
            New Estimate
          </Button>
        </div>
      </div>

      {/* Estimates List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-neutral-500" />
            <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              All Estimates
            </h4>
            <Badge variant="secondary" size="sm">
              {estimates.length}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          {estimatesQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"
                />
              ))}
            </div>
          ) : estimatesQuery.error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-danger-500 mx-auto mb-2" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Failed to load estimates. Please try again.
              </p>
            </div>
          ) : estimates.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                No estimates yet
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Create a new estimate or use AI to generate one automatically.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateAI}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI Generate
                </Button>
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create Estimate
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {estimates.map((estimate) => (
                <EstimateCard
                  key={estimate.id}
                  estimate={estimate}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onClone={handleClone}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                  isCloning={cloneMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Form Modal */}
      {showFormModal && (
        <EstimateFormModal
          isOpen={showFormModal}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          opportunityId={opportunityId}
          estimate={editingEstimate ?? undefined}
        />
      )}

      {/* AI Generation Modal */}
      {showAIModal && (
        <AIEstimateModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
          isGenerating={generateMutation.isPending}
          opportunityName={opportunityName}
          opportunityDescription={opportunityDescription}
        />
      )}
    </div>
  );
}

export default CostEstimateTab;
