import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Edit2, Archive } from 'lucide-react';
import {
  type MarketingContent,
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
  getContentTypeIcon,
} from '../../../../packages/types/marketing';

interface MarketingContentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: MarketingContent;
  onEdit: (content: MarketingContent) => void;
  onArchive: (contentId: number) => void;
}

const CONTENT_STATUS_VARIANTS: Record<
  MarketingContent['status'],
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  DRAFT: 'neutral',
  IN_REVIEW: 'warning',
  APPROVED: 'primary',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
};

function MarketingContentDetailModal({
  isOpen,
  onClose,
  content,
  onEdit,
  onArchive,
}: MarketingContentDetailModalProps): JSX.Element {
  const formatDate = (date?: Date): string => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Content Details" size="large">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getContentTypeIcon(content.type)}</span>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{content.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={CONTENT_STATUS_VARIANTS[content.status]}>
                  {CONTENT_STATUS_LABELS[content.status]}
                </Badge>
                <Badge variant="neutral">{CONTENT_TYPE_LABELS[content.type]}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(content)}>
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onArchive(content.id)}>
              <Archive className="w-4 h-4" />
              Archive
            </Button>
          </div>
        </div>

        {/* Summary */}
        {content.summary && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">Summary</h3>
            <p className="text-neutral-900">{content.summary}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          {content.client && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-1">Client</h3>
              <p className="text-neutral-900">{content.client.name}</p>
            </div>
          )}

          {content.project && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-1">Project</h3>
              <p className="text-neutral-900">{content.project.name}</p>
            </div>
          )}

          {content.sourceMeeting && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-1">Source Meeting</h3>
              <p className="text-neutral-900">{content.sourceMeeting.title}</p>
              <p className="text-sm text-neutral-500">
                {formatDate(content.sourceMeeting.date)}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-1">Created</h3>
            <p className="text-neutral-900">{formatDate(content.createdAt)}</p>
            {content.createdBy && (
              <p className="text-sm text-neutral-500">{content.createdBy.name}</p>
            )}
          </div>

          {content.publishedAt && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-1">Published</h3>
              <p className="text-neutral-900">{formatDate(content.publishedAt)}</p>
            </div>
          )}

          {content.scheduledFor && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-1">Scheduled For</h3>
              <p className="text-neutral-900">{formatDate(content.scheduledFor)}</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              {content.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm bg-neutral-100 text-neutral-700 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {content.content && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">Content</h3>
            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              {typeof content.content === 'object' ? (
                <div className="space-y-3">
                  {content.content.title && (
                    <div>
                      <h4 className="text-lg font-semibold text-neutral-900">
                        {content.content.title}
                      </h4>
                    </div>
                  )}
                  {content.content.body && (
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-neutral-700">
                        {content.content.body}
                      </pre>
                    </div>
                  )}
                  {content.content.metadata && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-neutral-700">
                        Additional Metadata
                      </summary>
                      <pre className="mt-2 text-xs text-neutral-600 overflow-auto">
                        {JSON.stringify(content.content.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <pre className="text-sm text-neutral-700 overflow-auto">
                  {JSON.stringify(content.content, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default MarketingContentDetailModal;
