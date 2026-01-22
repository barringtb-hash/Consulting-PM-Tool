/**
 * SOW Tab Component
 *
 * Main tab component for displaying and managing Statements of Work
 * for an opportunity.
 *
 * Features:
 * - List view of all SOWs with status badges
 * - AI-powered SOW generation
 * - Section-based editing
 * - Export to markdown/html
 * - Approval workflow
 *
 * @module features/opportunity-proposals/components/SOWTab
 */

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  Download,
  Send,
  Eye,
  Clock,
  AlertCircle,
} from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useToast } from '../../../ui/Toast';
import {
  useSOWs,
  useDeleteSOW,
  useApproveSOW,
  useExportSOW,
  useSendSOW,
} from '../hooks/useSOWs';
import { useCostEstimates } from '../hooks/useCostEstimates';
import { SOWGeneratorModal } from './SOWGeneratorModal';
import { SOWEditor } from './SOWEditor';
import type { OpportunitySOW, SOWStatus } from '../types';

interface SOWTabProps {
  opportunityId: number;
  opportunityName?: string;
  opportunityDescription?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_BADGE_VARIANTS: Record<
  SOWStatus,
  'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  SENT: 'primary',
  SIGNED: 'success',
  EXPIRED: 'default',
};

const STATUS_LABELS: Record<SOWStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  SENT: 'Sent',
  SIGNED: 'Signed',
  EXPIRED: 'Expired',
};

// ============================================================================
// Helper Functions
// ============================================================================

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
// SOW Card Component
// ============================================================================

interface SOWCardProps {
  sow: OpportunitySOW;
  onEdit: (sow: OpportunitySOW) => void;
  onDelete: (sow: OpportunitySOW) => void;
  onApprove: (sow: OpportunitySOW) => void;
  onExport: (sow: OpportunitySOW, format: 'markdown' | 'html' | 'text') => void;
  onSend: (sow: OpportunitySOW) => void;
  isApproving?: boolean;
  isExporting?: boolean;
}

function SOWCard({
  sow,
  onEdit,
  onDelete,
  onApprove,
  onExport,
  onSend,
  isApproving,
  isExporting,
}: SOWCardProps): JSX.Element {
  const canApprove = sow.status === 'DRAFT' || sow.status === 'IN_REVIEW';
  const canEdit = sow.status === 'DRAFT';
  const canSend = sow.status === 'APPROVED';

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant={STATUS_BADGE_VARIANTS[sow.status]} size="sm">
              {STATUS_LABELS[sow.status]}
            </Badge>
            {sow.generatedBy === 'AI' && (
              <Badge variant="primary" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            )}
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              v{sow.version}
            </span>
          </div>

          <h4 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {sow.name}
          </h4>

          <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {sow.content.sections?.length ?? 0} sections
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(sow.createdAt)}
            </span>
          </div>

          {sow.estimate && (
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Linked to estimate: {sow.estimate.name}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canApprove && (
            <button
              type="button"
              onClick={() => onApprove(sow)}
              disabled={isApproving}
              className="p-1.5 text-neutral-400 hover:text-success-600 dark:hover:text-success-400 rounded-md hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50"
              title="Approve"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {canSend && (
            <button
              type="button"
              onClick={() => onSend(sow)}
              className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
              title="Send to Client"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onExport(sow, 'markdown')}
            disabled={isExporting}
            className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(sow)}
            className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
            title={canEdit ? 'Edit' : 'View'}
          >
            {canEdit ? (
              <Edit2 className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => onDelete(sow)}
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

export function SOWTab({
  opportunityId,
  opportunityName,
  opportunityDescription,
}: SOWTabProps): JSX.Element {
  // Modal states
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [editingSOW, setEditingSOW] = useState<OpportunitySOW | null>(null);

  // Data fetching
  const sowsQuery = useSOWs(opportunityId);
  const estimatesQuery = useCostEstimates(opportunityId);

  // Mutations
  const deleteMutation = useDeleteSOW();
  const approveMutation = useApproveSOW();
  const exportMutation = useExportSOW();
  const sendMutation = useSendSOW();

  // Toast
  const { showToast } = useToast();

  // Handlers
  const handleGenerateNew = (): void => {
    setShowGeneratorModal(true);
  };

  const handleEdit = (sow: OpportunitySOW): void => {
    setEditingSOW(sow);
  };

  const handleDelete = async (sow: OpportunitySOW): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${sow.name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        opportunityId,
        sowId: sow.id,
      });
      showToast('SOW deleted', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to delete SOW',
        'error',
      );
    }
  };

  const handleApprove = async (sow: OpportunitySOW): Promise<void> => {
    try {
      await approveMutation.mutateAsync({
        opportunityId,
        sowId: sow.id,
      });
      showToast('SOW approved', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to approve SOW',
        'error',
      );
    }
  };

  const handleExport = async (
    sow: OpportunitySOW,
    format: 'markdown' | 'html' | 'text',
  ): Promise<void> => {
    try {
      const result = await exportMutation.mutateAsync({
        opportunityId,
        sowId: sow.id,
        format,
      });

      // Download the file
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('SOW exported', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to export SOW',
        'error',
      );
    }
  };

  const handleSend = async (sow: OpportunitySOW): Promise<void> => {
    const email = window.prompt('Enter client email address:');
    if (!email) return;

    const message = window.prompt('Add a message (optional):');

    try {
      await sendMutation.mutateAsync({
        opportunityId,
        sowId: sow.id,
        email,
        message: message ?? undefined,
      });
      showToast('SOW sent to client', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to send SOW',
        'error',
      );
    }
  };

  const handleRefresh = (): void => {
    sowsQuery.refetch();
  };

  const handleGeneratorSuccess = (): void => {
    setShowGeneratorModal(false);
    sowsQuery.refetch();
  };

  const handleEditorClose = (): void => {
    setEditingSOW(null);
    sowsQuery.refetch();
  };

  // Data
  const sows = sowsQuery.data ?? [];
  const estimates = estimatesQuery.data ?? [];
  const approvedEstimates = estimates.filter((e) => e.status === 'APPROVED');

  // If editing, show the editor
  if (editingSOW) {
    return (
      <SOWEditor
        opportunityId={opportunityId}
        sow={editingSOW}
        onClose={handleEditorClose}
        readOnly={editingSOW.status !== 'DRAFT'}
      />
    );
  }

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
                  Total SOWs
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {sows.length}
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
                  {sows.filter((s) => s.status === 'APPROVED').length}
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
                  In Review
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {sows.filter((s) => s.status === 'IN_REVIEW').length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <Send className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Sent
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {
                    sows.filter(
                      (s) => s.status === 'SENT' || s.status === 'SIGNED',
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Statements of Work
        </h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleGenerateNew}>
            <Sparkles className="w-4 h-4 mr-1" />
            Generate SOW
          </Button>
        </div>
      </div>

      {/* SOWs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-neutral-500" />
            <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              All SOWs
            </h4>
            <Badge variant="secondary" size="sm">
              {sows.length}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          {sowsQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"
                />
              ))}
            </div>
          ) : sowsQuery.error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-danger-500 mx-auto mb-2" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Failed to load SOWs. Please try again.
              </p>
            </div>
          ) : sows.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                <FileText className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                No SOWs yet
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Generate an AI-powered Statement of Work based on your approved
                estimates.
              </p>
              {approvedEstimates.length === 0 ? (
                <p className="text-xs text-warning-600 dark:text-warning-400 mt-2">
                  Note: Approve an estimate first to link it to your SOW.
                </p>
              ) : null}
              <div className="mt-4">
                <Button size="sm" onClick={handleGenerateNew}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate SOW
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sows.map((sow) => (
                <SOWCard
                  key={sow.id}
                  sow={sow}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onApprove={handleApprove}
                  onExport={handleExport}
                  onSend={handleSend}
                  isApproving={approveMutation.isPending}
                  isExporting={exportMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Generator Modal */}
      {showGeneratorModal && (
        <SOWGeneratorModal
          isOpen={showGeneratorModal}
          onClose={() => setShowGeneratorModal(false)}
          onSuccess={handleGeneratorSuccess}
          opportunityId={opportunityId}
          opportunityName={opportunityName}
          opportunityDescription={opportunityDescription}
          estimates={approvedEstimates}
        />
      )}
    </div>
  );
}

export default SOWTab;
