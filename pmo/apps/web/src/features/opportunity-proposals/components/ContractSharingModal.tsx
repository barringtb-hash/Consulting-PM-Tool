/**
 * Contract Sharing Modal
 *
 * Modal for creating and managing contract share links.
 */

import React, { useState } from 'react';
import { Share2, Loader2, Copy, Check, Lock, ExternalLink } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useToast } from '../../../ui/Toast';
import { useCreateShareLink } from '../hooks/useContracts';
import type { Contract } from '../types';

interface ContractSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: number;
  contract: Contract;
}

export function ContractSharingModal({
  isOpen,
  onClose,
  opportunityId,
  contract,
}: ContractSharingModalProps): JSX.Element {
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Toast
  const { showToast } = useToast();

  // Mutation
  const createShareLinkMutation = useCreateShareLink();

  const handleCreateLink = async (): Promise<void> => {
    try {
      const result = await createShareLinkMutation.mutateAsync({
        opportunityId,
        contractId: contract.id,
        input: {
          expiresInDays,
          password: usePassword && password ? password : undefined,
        },
      });
      setShareUrl(result.shareUrl);
      showToast('Share link created', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create share link',
        'error',
      );
    }
  };

  const handleCopyLink = async (): Promise<void> => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      showToast('Failed to copy link', 'error');
    }
  };

  // Check if contract already has a share link
  const hasExistingLink = Boolean(contract.shareToken);
  const existingLinkExpired =
    hasExistingLink &&
    contract.shareExpiresAt &&
    new Date(contract.shareExpiresAt) < new Date();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Contract"
      size="medium"
    >
      <div className="space-y-6">
        {/* Contract Info */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Sharing:
          </p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {contract.title}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {contract.contractNumber}
          </p>
        </div>

        {/* Existing Link Status */}
        {hasExistingLink && (
          <div
            className={`p-4 rounded-lg border ${
              existingLinkExpired
                ? 'bg-danger-50 dark:bg-danger-900/30 border-danger-100 dark:border-danger-800'
                : 'bg-success-50 dark:bg-success-900/30 border-success-100 dark:border-success-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-medium ${
                    existingLinkExpired
                      ? 'text-danger-900 dark:text-danger-100'
                      : 'text-success-900 dark:text-success-100'
                  }`}
                >
                  {existingLinkExpired
                    ? 'Previous share link expired'
                    : 'Share link is active'}
                </p>
                {!existingLinkExpired && contract.shareExpiresAt && (
                  <p className="text-xs text-success-700 dark:text-success-300">
                    Expires:{' '}
                    {new Date(contract.shareExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {!existingLinkExpired && (
                <Badge variant="success" size="sm">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Share Link Result */}
        {shareUrl ? (
          <div className="space-y-4">
            <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-100 dark:border-primary-800">
              <div className="flex items-start gap-3">
                <Share2 className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
                    Share Link Created
                  </p>
                  <p className="text-xs text-primary-700 dark:text-primary-300 mt-1 break-all">
                    {shareUrl}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleCopyLink}
                variant={copied ? 'secondary' : 'primary'}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
            </div>

            {usePassword && password && (
              <div className="p-3 bg-warning-50 dark:bg-warning-900/30 rounded-md">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    Password required: <strong>{password}</strong>
                  </p>
                </div>
                <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                  Share this password separately with the recipient.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Link Settings */}
            <div className="space-y-4">
              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Link Expires In
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>

              {/* Password Protection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usePassword"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <label
                    htmlFor="usePassword"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Password protect this link
                  </label>
                </div>

                {usePassword && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter a password"
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Minimum 6 characters. You&apos;ll need to share this
                      password separately.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                The recipient will be able to view the contract without signing
                in. All views are tracked for audit purposes.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={createShareLinkMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLink}
                disabled={
                  createShareLinkMutation.isPending ||
                  (usePassword && password.length < 6)
                }
              >
                {createShareLinkMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Create Share Link
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default ContractSharingModal;
