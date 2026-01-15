/**
 * RAID Extraction Modal Component
 *
 * Displays AI-extracted RAID items from meeting notes for user review.
 * Users can select which items to accept and add to the RAID log.
 *
 * @module features/raid/RAIDExtractionModal
 */

import React, { useState, useMemo } from 'react';
import {
  Check,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import type { ExtractedRAIDItem, RAIDItemType } from './types';

// ============================================================================
// Types
// ============================================================================

interface RAIDExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedItems: ExtractedRAIDItem[];
  onAccept: (items: ExtractedRAIDItem[]) => void;
  isAccepting?: boolean;
  meetingTitle?: string;
}

// ============================================================================
// Style Configuration
// ============================================================================

const typeIcons: Record<RAIDItemType, React.ElementType> = {
  risk: AlertTriangle,
  'action-item': CheckCircle2,
  issue: AlertOctagon,
  decision: FileCheck2,
};

const typeLabels: Record<RAIDItemType, string> = {
  risk: 'Risk',
  'action-item': 'Action Item',
  issue: 'Issue',
  decision: 'Decision',
};

const typeBadgeVariants: Record<
  RAIDItemType,
  'warning' | 'primary' | 'danger' | 'success'
> = {
  risk: 'warning',
  'action-item': 'primary',
  issue: 'danger',
  decision: 'success',
};

// ============================================================================
// Helper Functions
// ============================================================================

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-success-600 dark:text-success-400';
  if (confidence >= 0.6) return 'text-warning-600 dark:text-warning-400';
  return 'text-neutral-500 dark:text-neutral-400';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
}

// ============================================================================
// Main Component
// ============================================================================

export function RAIDExtractionModal({
  isOpen,
  onClose,
  extractedItems,
  onAccept,
  isAccepting = false,
  meetingTitle,
}: RAIDExtractionModalProps): JSX.Element | null {
  // Track which items are selected (all selected by default)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    () => new Set(extractedItems.map((_, i) => i)),
  );

  // Reset selection when items change
  React.useEffect(() => {
    setSelectedItems(new Set(extractedItems.map((_, i) => i)));
  }, [extractedItems]);

  // Group items by type for summary
  const itemsByType = useMemo(() => {
    const groups: Record<RAIDItemType, number> = {
      risk: 0,
      'action-item': 0,
      issue: 0,
      decision: 0,
    };
    extractedItems.forEach((item) => {
      groups[item.type]++;
    });
    return groups;
  }, [extractedItems]);

  const toggleItem = (index: number): void => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = (): void => {
    if (selectedItems.size === extractedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(extractedItems.map((_, i) => i)));
    }
  };

  const handleAccept = (): void => {
    const acceptedItems = extractedItems.filter((_, i) => selectedItems.has(i));
    onAccept(acceptedItems);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Extracted RAID Items"
      size="large"
    >
      <div className="space-y-4">
        {/* Header with meeting info */}
        <div className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-primary-700 dark:text-primary-300">
              AI has analyzed the meeting notes and extracted the following
              items.
            </p>
            {meetingTitle && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                From: {meetingTitle}
              </p>
            )}
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(itemsByType).map(([type, count]) => {
            if (count === 0) return null;
            return (
              <Badge
                key={type}
                variant={typeBadgeVariants[type as RAIDItemType]}
              >
                {count} {typeLabels[type as RAIDItemType]}
                {count !== 1 ? 's' : ''}
              </Badge>
            );
          })}
        </div>

        {/* Select all toggle */}
        <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {selectedItems.size} of {extractedItems.length} items selected
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            {selectedItems.size === extractedItems.length
              ? 'Deselect All'
              : 'Select All'}
          </button>
        </div>

        {/* Items list */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {extractedItems.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              No RAID items were extracted from this meeting.
            </div>
          ) : (
            extractedItems.map((item, index) => {
              const Icon = typeIcons[item.type];
              const isSelected = selectedItems.has(index);

              return (
                <div
                  key={index}
                  onClick={() => toggleItem(index)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors
                    ${
                      isSelected
                        ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                    }`}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleItem(index);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0
                        ${
                          isSelected
                            ? 'bg-primary-600 dark:bg-primary-500 border-primary-600 dark:border-primary-500 text-white'
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                        <Badge variant={typeBadgeVariants[item.type]} size="sm">
                          {typeLabels[item.type]}
                        </Badge>
                        <span
                          className={`text-xs font-medium ${getConfidenceColor(item.confidence)}`}
                        >
                          {getConfidenceLabel(item.confidence)} confidence (
                          {Math.round(item.confidence * 100)}%)
                        </span>
                      </div>

                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {item.title}
                      </h4>

                      {item.description && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          {item.description}
                        </p>
                      )}

                      {/* Source text quote */}
                      {item.sourceText && (
                        <blockquote className="mt-2 pl-3 border-l-2 border-neutral-300 dark:border-neutral-600 text-xs text-neutral-500 dark:text-neutral-400 italic">
                          &ldquo;{item.sourceText}&rdquo;
                        </blockquote>
                      )}

                      {/* Suggested metadata */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.suggestedOwner && (
                          <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded">
                            Suggested: {item.suggestedOwner}
                          </span>
                        )}
                        {item.suggestedPriority && (
                          <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded">
                            Priority: {item.suggestedPriority}
                          </span>
                        )}
                        {item.suggestedDueDate && (
                          <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded">
                            Due: {item.suggestedDueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="secondary" onClick={onClose} disabled={isAccepting}>
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={selectedItems.size === 0 || isAccepting}
            isLoading={isAccepting}
          >
            Accept {selectedItems.size} Item
            {selectedItems.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
