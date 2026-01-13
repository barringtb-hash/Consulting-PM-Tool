import React, { useEffect, useRef } from 'react';
import { X, Edit2, Archive, FileText, Tag, Calendar } from 'lucide-react';
import { type Asset } from '../../api/assets';
import { type Client } from '../../api/clients';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

interface AssetDetailModalProps {
  asset: Asset;
  client?: Client;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  PROMPT_TEMPLATE: 'Prompt Template',
  WORKFLOW: 'Workflow',
  DATASET: 'Dataset',
  EVALUATION: 'Evaluation',
  GUARDRAIL: 'Guardrail',
};

const ASSET_TYPE_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  PROMPT_TEMPLATE: 'primary',
  WORKFLOW: 'success',
  DATASET: 'warning',
  EVALUATION: 'secondary',
  GUARDRAIL: 'neutral',
};

function AssetDetailModal({
  asset,
  client,
  onClose,
  onEdit,
  onArchive,
}: AssetDetailModalProps): JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus trap - focus the close button when modal opens
  useEffect(() => {
    const previouslyFocusedElement = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    return () => {
      // Return focus to the previously focused element when modal closes
      previouslyFocusedElement?.focus?.();
    };
  }, []);

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-detail-modal-title"
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-neutral-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2
                  id="asset-detail-modal-title"
                  className="text-xl font-semibold text-neutral-900 truncate"
                >
                  {asset.name}
                </h2>
                <Badge variant={ASSET_TYPE_VARIANTS[asset.type]}>
                  {ASSET_TYPE_LABELS[asset.type]}
                </Badge>
                {asset.isTemplate && <Badge variant="primary">Template</Badge>}
                {asset.archived && <Badge variant="danger">Archived</Badge>}
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="ml-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-2">
                Description
              </h3>
              <p className="text-neutral-900 whitespace-pre-wrap">
                {asset.description || 'No description provided'}
              </p>
            </div>

            {/* Client */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Client Assignment
              </h3>
              <p className="text-neutral-900">
                {client
                  ? client.name
                  : asset.isTemplate
                    ? 'Global Template'
                    : 'Unassigned'}
              </p>
            </div>

            {/* Tags */}
            {asset.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} variant="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration */}
            {asset.content && (
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-2">
                  Configuration
                </h3>
                <pre className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-sm text-neutral-900 overflow-x-auto">
                  {JSON.stringify(asset.content, null, 2)}
                </pre>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created
                </h3>
                <p className="text-sm text-neutral-900">
                  {formatDate(asset.createdAt)}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Last Updated
                </h3>
                <p className="text-sm text-neutral-900">
                  {formatDate(asset.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {!asset.archived && (
              <>
                <Button
                  variant="subtle"
                  onClick={() => {
                    onArchive();
                    onClose();
                  }}
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
                <Button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetDetailModal;
