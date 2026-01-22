/**
 * Contract Tab Component
 *
 * Main tab component for displaying and managing contracts
 * for an opportunity.
 *
 * Features:
 * - List view of all contracts with status badges
 * - AI-powered contract generation
 * - Share link creation
 * - Signature tracking
 * - Audit log viewing
 *
 * @module features/opportunity-proposals/components/ContractTab
 */

import React, { useState } from 'react';
import {
  FileSignature,
  Sparkles,
  RefreshCw,
  Edit2,
  Trash2,
  Share2,
  Send,
  Eye,
  Clock,
  AlertCircle,
  Check,
  X,
  Users,
  ExternalLink,
} from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useToast } from '../../../ui/Toast';
import {
  useContracts,
  useDeleteContract,
  useVoidContract,
  useContractSignatures,
} from '../hooks/useContracts';
import { useSOWs } from '../hooks/useSOWs';
import { ContractGeneratorModal } from './ContractGeneratorModal';
import { ContractSharingModal } from './ContractSharingModal';
import type { Contract, ContractStatus, ContractType } from '../types';

interface ContractTabProps {
  opportunityId: number;
  accountId?: number;
  opportunityName?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_BADGE_VARIANTS: Record<
  ContractStatus,
  'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  DRAFT: 'secondary',
  PENDING_SIGNATURE: 'warning',
  PARTIALLY_SIGNED: 'primary',
  SIGNED: 'success',
  ACTIVE: 'success',
  EXPIRED: 'default',
  VOIDED: 'danger',
  TERMINATED: 'danger',
};

const STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Draft',
  PENDING_SIGNATURE: 'Pending Signature',
  PARTIALLY_SIGNED: 'Partially Signed',
  SIGNED: 'Signed',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  VOIDED: 'Voided',
  TERMINATED: 'Terminated',
};

const TYPE_LABELS: Record<ContractType, string> = {
  MSA: 'MSA',
  SOW: 'SOW',
  MSA_WITH_SOW: 'MSA + SOW',
  NDA: 'NDA',
  CONSULTING_AGREEMENT: 'Consulting Agreement',
  RETAINER_AGREEMENT: 'Retainer Agreement',
  AMENDMENT: 'Amendment',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount?: number, currency = 'USD'): string {
  if (!amount) return '-';
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
// Signature Status Component
// ============================================================================

interface SignatureStatusProps {
  opportunityId: number;
  contractId: number;
}

function SignatureStatus({
  opportunityId,
  contractId,
}: SignatureStatusProps): JSX.Element | null {
  const signaturesQuery = useContractSignatures(opportunityId, contractId);

  if (signaturesQuery.isLoading) {
    return (
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        Loading signatures...
      </div>
    );
  }

  const data = signaturesQuery.data;
  if (!data || data.totalSigners === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <Users className="w-3 h-3 text-neutral-400" />
      <span className="text-neutral-500 dark:text-neutral-400">
        {data.signedCount}/{data.totalSigners} signed
      </span>
      {data.declinedCount > 0 && (
        <Badge variant="danger" size="sm">
          {data.declinedCount} declined
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Contract Card Component
// ============================================================================

interface ContractCardProps {
  contract: Contract;
  opportunityId: number;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  onVoid: (contract: Contract) => void;
  onShare: (contract: Contract) => void;
  onSendForSignatures: (contract: Contract) => void;
  isVoiding?: boolean;
}

function ContractCard({
  contract,
  opportunityId,
  onEdit,
  onDelete,
  onVoid,
  onShare,
  onSendForSignatures,
  isVoiding,
}: ContractCardProps): JSX.Element {
  const canEdit = contract.status === 'DRAFT';
  const canSend =
    contract.status === 'DRAFT' || contract.status === 'PENDING_SIGNATURE';
  const canVoid =
    contract.status !== 'VOIDED' &&
    contract.status !== 'EXPIRED' &&
    contract.status !== 'TERMINATED';
  const canShare = contract.status !== 'DRAFT';

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant={STATUS_BADGE_VARIANTS[contract.status]} size="sm">
              {STATUS_LABELS[contract.status]}
            </Badge>
            <Badge variant="secondary" size="sm">
              {TYPE_LABELS[contract.type]}
            </Badge>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {contract.contractNumber}
            </span>
          </div>

          <h4 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {contract.title}
          </h4>

          <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {contract.totalValue && (
              <span className="flex items-center gap-1">
                {formatCurrency(contract.totalValue, contract.currency)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(contract.createdAt)}
            </span>
          </div>

          <div className="mt-2">
            <SignatureStatus
              opportunityId={opportunityId}
              contractId={contract.id}
            />
          </div>

          {contract.shareToken && (
            <div className="mt-2 text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Share link active
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canSend && (
            <button
              type="button"
              onClick={() => onSendForSignatures(contract)}
              className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
              title="Send for Signatures"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          {canShare && (
            <button
              type="button"
              onClick={() => onShare(contract)}
              className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(contract)}
            className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
            title={canEdit ? 'Edit' : 'View'}
          >
            {canEdit ? (
              <Edit2 className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          {canVoid && (
            <button
              type="button"
              onClick={() => onVoid(contract)}
              disabled={isVoiding}
              className="p-1.5 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-md hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50"
              title="Void Contract"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onDelete(contract)}
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

export function ContractTab({
  opportunityId,
  accountId: _accountId,
  opportunityName,
}: ContractTabProps): JSX.Element {
  // Modal states
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );

  // Data fetching
  const contractsQuery = useContracts(opportunityId);
  const sowsQuery = useSOWs(opportunityId);

  // Mutations
  const deleteMutation = useDeleteContract();
  const voidMutation = useVoidContract();

  // Toast
  const { showToast } = useToast();

  // Handlers
  const handleGenerateNew = (): void => {
    setShowGeneratorModal(true);
  };

  const handleEdit = (contract: Contract): void => {
    // For now, just show contract details in alert
    // In a real implementation, this would open an editor modal
    showToast(`Viewing contract: ${contract.title}`, 'info');
  };

  const handleDelete = async (contract: Contract): Promise<void> => {
    if (
      !window.confirm(`Are you sure you want to delete "${contract.title}"?`)
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        opportunityId,
        contractId: contract.id,
      });
      showToast('Contract deleted', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to delete contract',
        'error',
      );
    }
  };

  const handleVoid = async (contract: Contract): Promise<void> => {
    const reason = window.prompt('Reason for voiding (optional):');
    if (reason === null) return;

    try {
      await voidMutation.mutateAsync({
        opportunityId,
        contractId: contract.id,
        reason: reason || undefined,
      });
      showToast('Contract voided', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to void contract',
        'error',
      );
    }
  };

  const handleShare = (contract: Contract): void => {
    setSelectedContract(contract);
    setShowSharingModal(true);
  };

  const handleSendForSignatures = (_contract: Contract): void => {
    // For now, show a prompt for signer details
    // In a real implementation, this would open a modal
    const name = window.prompt('Signer name:');
    if (!name) return;

    const email = window.prompt('Signer email:');
    if (!email) return;

    showToast(`Signature request would be sent to ${email}`, 'info');
  };

  const handleRefresh = (): void => {
    contractsQuery.refetch();
  };

  const handleGeneratorSuccess = (): void => {
    setShowGeneratorModal(false);
    contractsQuery.refetch();
  };

  const handleSharingModalClose = (): void => {
    setShowSharingModal(false);
    setSelectedContract(null);
  };

  // Data
  const contracts = contractsQuery.data ?? [];
  const sows = sowsQuery.data ?? [];
  const approvedSows = sows.filter((s) => s.status === 'APPROVED');

  // Stats
  const signedContracts = contracts.filter(
    (c) => c.status === 'SIGNED' || c.status === 'ACTIVE',
  );
  const pendingContracts = contracts.filter(
    (c) => c.status === 'PENDING_SIGNATURE' || c.status === 'PARTIALLY_SIGNED',
  );
  const totalValue = signedContracts.reduce(
    (sum, c) => sum + (c.totalValue ?? 0),
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
                <FileSignature className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total Contracts
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {contracts.length}
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
                  Signed
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {signedContracts.length}
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
                  Pending
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {pendingContracts.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <FileSignature className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Contract Value
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Contracts
        </h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleGenerateNew}>
            <Sparkles className="w-4 h-4 mr-1" />
            Generate Contract
          </Button>
        </div>
      </div>

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-neutral-500" />
            <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              All Contracts
            </h4>
            <Badge variant="secondary" size="sm">
              {contracts.length}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          {contractsQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"
                />
              ))}
            </div>
          ) : contractsQuery.error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-danger-500 mx-auto mb-2" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Failed to load contracts. Please try again.
              </p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                <FileSignature className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                No contracts yet
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Generate an AI-powered contract based on your approved SOWs.
              </p>
              {approvedSows.length === 0 && (
                <p className="text-xs text-warning-600 dark:text-warning-400 mt-2">
                  Note: Approve a SOW first to include it in your contract.
                </p>
              )}
              <div className="mt-4">
                <Button size="sm" onClick={handleGenerateNew}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate Contract
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  opportunityId={opportunityId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onVoid={handleVoid}
                  onShare={handleShare}
                  onSendForSignatures={handleSendForSignatures}
                  isVoiding={voidMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Generator Modal */}
      {showGeneratorModal && (
        <ContractGeneratorModal
          isOpen={showGeneratorModal}
          onClose={() => setShowGeneratorModal(false)}
          onSuccess={handleGeneratorSuccess}
          opportunityId={opportunityId}
          opportunityName={opportunityName}
          sows={approvedSows}
        />
      )}

      {/* Sharing Modal */}
      {showSharingModal && selectedContract && (
        <ContractSharingModal
          isOpen={showSharingModal}
          onClose={handleSharingModalClose}
          opportunityId={opportunityId}
          contract={selectedContract}
        />
      )}
    </div>
  );
}

export default ContractTab;
