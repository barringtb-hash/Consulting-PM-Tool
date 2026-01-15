/**
 * Project RAID Tab Component
 *
 * Main tab component for displaying and managing RAID items
 * (Risks, Action Items, Issues, Decisions) for a project.
 *
 * Features:
 * - Summary cards with counts for each RAID category
 * - Tabbed interface to filter by item type
 * - List view with status indicators
 * - Create/edit modals for managing items
 * - AI extraction from meeting notes
 *
 * @module features/raid/ProjectRAIDTab
 */

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  FileCheck2,
  Plus,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { RAIDSummaryCards } from './RAIDSummaryCards';
import { RAIDItemFormModal } from './RAIDItemFormModal';
import { RAIDExtractionModal } from './RAIDExtractionModal';
import {
  useActionItems,
  useDecisions,
  useProjectIssues,
  useProjectRisks,
  useCreateRAIDItem,
  useUpdateRAIDItem,
  useDeleteRAIDItem,
  useAcceptExtractedItems,
} from './hooks/useRAIDData';
import type {
  RAIDFilter,
  RAIDItemType,
  RAIDItem,
  RAIDItemFormValues,
  ExtractedRAIDItem,
} from './types';

interface ProjectRAIDTabProps {
  /** The project ID to display RAID items for */
  projectId: number;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_ICONS: Record<RAIDItemType, React.ElementType> = {
  risk: AlertTriangle,
  'action-item': CheckCircle2,
  issue: AlertOctagon,
  decision: FileCheck2,
};

const TYPE_BADGE_VARIANTS: Record<
  RAIDItemType,
  'warning' | 'primary' | 'danger' | 'success'
> = {
  risk: 'warning',
  'action-item': 'primary',
  issue: 'danger',
  decision: 'success',
};

const TYPE_LABELS: Record<RAIDItemType, string> = {
  risk: 'Risk',
  'action-item': 'Action Item',
  issue: 'Issue',
  decision: 'Decision',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a label from a status enum value
 */
function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format a date string for display
 */
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

/**
 * Get badge variant based on status
 */
function getStatusBadgeVariant(
  status: string,
): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary' {
  const normalizedStatus = status.toUpperCase();
  if (
    normalizedStatus.includes('COMPLETED') ||
    normalizedStatus.includes('RESOLVED') ||
    normalizedStatus.includes('CLOSED') ||
    normalizedStatus.includes('APPROVED') ||
    normalizedStatus.includes('MITIGATED')
  ) {
    return 'success';
  }
  if (normalizedStatus.includes('IN_PROGRESS')) {
    return 'primary';
  }
  if (
    normalizedStatus.includes('OPEN') ||
    normalizedStatus.includes('IDENTIFIED') ||
    normalizedStatus.includes('PENDING')
  ) {
    return 'warning';
  }
  if (
    normalizedStatus.includes('CANCELLED') ||
    normalizedStatus.includes('REJECTED')
  ) {
    return 'danger';
  }
  return 'default';
}

/**
 * Get badge variant based on priority
 */
function getPriorityBadgeVariant(
  priority?: string,
): 'default' | 'success' | 'warning' | 'danger' {
  if (!priority) return 'default';
  const normalizedPriority = priority.toUpperCase();
  if (normalizedPriority === 'CRITICAL') return 'danger';
  if (normalizedPriority === 'HIGH') return 'warning';
  if (normalizedPriority === 'LOW') return 'success';
  return 'default';
}

// ============================================================================
// Table Row Component
// ============================================================================

interface RAIDTableRowProps {
  item: RAIDItem;
  onEdit: (item: RAIDItem) => void;
  onDelete: (item: RAIDItem) => void;
}

function RAIDTableRow({
  item,
  onEdit,
  onDelete,
}: RAIDTableRowProps): JSX.Element {
  const Icon = TYPE_ICONS[item.type];

  // Get priority/severity for display
  let priorityValue: string | undefined;
  if (item.type === 'action-item') {
    priorityValue = item.priority;
  } else if (item.type === 'issue') {
    priorityValue = item.severity;
  } else if (item.type === 'risk') {
    priorityValue = item.impact;
  }

  // Get due date for action items
  const dueDate = item.type === 'action-item' ? item.dueDate : undefined;

  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="w-5 h-5 flex-shrink-0 text-neutral-500 dark:text-neutral-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={TYPE_BADGE_VARIANTS[item.type]} size="sm">
              {TYPE_LABELS[item.type]}
            </Badge>
            <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {item.title}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {item.owner && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {item.owner.name}
              </span>
            )}
            {dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {priorityValue && (
          <Badge variant={getPriorityBadgeVariant(priorityValue)} size="sm">
            {formatLabel(priorityValue)}
          </Badge>
        )}
        <Badge variant={getStatusBadgeVariant(item.status)} size="sm">
          {formatLabel(item.status)}
        </Badge>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
          aria-label={`Edit ${item.title}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="p-1.5 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-md hover:bg-white dark:hover:bg-neutral-700"
          aria-label={`Delete ${item.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Project RAID Tab Component
 *
 * Displays RAID log items with filtering and management capabilities.
 */
export function ProjectRAIDTab({
  projectId,
}: ProjectRAIDTabProps): JSX.Element {
  // Filter state
  const [activeFilter, setActiveFilter] = useState<RAIDFilter>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RAIDItem | null>(null);
  const [addItemType, setAddItemType] = useState<RAIDItemType>('action-item');

  // Mock extracted items for demo (replace with actual extraction results)
  const [extractedItems, setExtractedItems] = useState<ExtractedRAIDItem[]>([]);

  // Data fetching using hooks
  const actionItemsQuery = useActionItems(projectId);
  const decisionsQuery = useDecisions(projectId);
  const issuesQuery = useProjectIssues(projectId);
  const risksQuery = useProjectRisks(projectId);

  // Mutations
  const createMutation = useCreateRAIDItem();
  const updateMutation = useUpdateRAIDItem();
  const deleteMutation = useDeleteRAIDItem();
  const acceptExtractedMutation = useAcceptExtractedItems();

  // Combine all items for display
  const allItems = useMemo((): RAIDItem[] => {
    const items: RAIDItem[] = [];

    if (actionItemsQuery.data) {
      items.push(
        ...actionItemsQuery.data.map((item) => ({
          ...item,
          type: 'action-item' as const,
        })),
      );
    }
    if (decisionsQuery.data) {
      items.push(
        ...decisionsQuery.data.map((item) => ({
          ...item,
          type: 'decision' as const,
        })),
      );
    }
    if (issuesQuery.data) {
      items.push(
        ...issuesQuery.data.map((item) => ({
          ...item,
          type: 'issue' as const,
        })),
      );
    }
    if (risksQuery.data) {
      items.push(
        ...risksQuery.data.map((item) => ({ ...item, type: 'risk' as const })),
      );
    }

    // Sort by created date (newest first)
    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [
    actionItemsQuery.data,
    decisionsQuery.data,
    issuesQuery.data,
    risksQuery.data,
  ]);

  // Filter items based on active filter
  const filteredItems = useMemo((): RAIDItem[] => {
    if (activeFilter === 'all') return allItems;
    return allItems.filter((item) => {
      switch (activeFilter) {
        case 'risks':
          return item.type === 'risk';
        case 'action-items':
          return item.type === 'action-item';
        case 'issues':
          return item.type === 'issue';
        case 'decisions':
          return item.type === 'decision';
        default:
          return true;
      }
    });
  }, [allItems, activeFilter]);

  // Loading state
  const isLoading =
    actionItemsQuery.isLoading ||
    decisionsQuery.isLoading ||
    issuesQuery.isLoading ||
    risksQuery.isLoading;

  // Error state
  const hasError =
    actionItemsQuery.error ||
    decisionsQuery.error ||
    issuesQuery.error ||
    risksQuery.error;

  // Handlers
  const handleAddItem = (type?: RAIDItemType): void => {
    setAddItemType(type ?? 'action-item');
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEditItem = (item: RAIDItem): void => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleDeleteItem = async (item: RAIDItem): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        projectId,
        itemId: item.id,
        type: item.type,
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleSubmitForm = async (
    values: RAIDItemFormValues,
  ): Promise<void> => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          projectId,
          itemId: editingItem.id,
          values,
          type: editingItem.type,
        });
      } else {
        await createMutation.mutateAsync({
          projectId,
          values,
        });
      }
      setShowAddModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const handleAcceptExtracted = async (
    items: ExtractedRAIDItem[],
  ): Promise<void> => {
    try {
      await acceptExtractedMutation.mutateAsync({
        projectId,
        items,
      });
      setShowExtractionModal(false);
      setExtractedItems([]);
    } catch (error) {
      console.error('Failed to accept extracted items:', error);
    }
  };

  const handleRefresh = (): void => {
    actionItemsQuery.refetch();
    decisionsQuery.refetch();
    issuesQuery.refetch();
    risksQuery.refetch();
  };

  const filterButtons: Array<{
    value: RAIDFilter;
    label: string;
    icon: React.ElementType | null;
  }> = [
    { value: 'all', label: 'All', icon: null },
    { value: 'risks', label: 'Risks', icon: AlertTriangle },
    { value: 'action-items', label: 'Action Items', icon: CheckCircle2 },
    { value: 'issues', label: 'Issues', icon: AlertOctagon },
    { value: 'decisions', label: 'Decisions', icon: FileCheck2 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <RAIDSummaryCards projectId={projectId} />

      {/* Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {filterButtons.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveFilter(value)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${
                  activeFilter === value
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExtractionModal(true)}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Extract from Meeting
          </Button>
          <Button size="sm" onClick={() => handleAddItem()}>
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      {/* RAID Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-500" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {activeFilter === 'all'
                ? 'All RAID Items'
                : activeFilter.charAt(0).toUpperCase() +
                  activeFilter.slice(1).replace('-', ' ')}
            </h3>
            <Badge variant="secondary" size="sm">
              {filteredItems.length}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          {hasError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-danger-500 mx-auto mb-2" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Failed to load RAID items. Please try again.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                <FileCheck2 className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                No RAID items yet
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Extract items from meetings or add them manually to start
                tracking.
              </p>
              <div className="mt-4">
                <Button size="sm" onClick={() => handleAddItem()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Item
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <RAIDTableRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <RAIDItemFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmitForm}
        initialType={editingItem?.type ?? addItemType}
        initialValues={
          editingItem
            ? {
                type: editingItem.type,
                title: editingItem.title,
                description: editingItem.description ?? '',
                status: editingItem.status,
                priority:
                  editingItem.type === 'action-item'
                    ? editingItem.priority
                    : undefined,
                severity:
                  editingItem.type === 'issue'
                    ? editingItem.severity
                    : undefined,
                probability:
                  editingItem.type === 'risk'
                    ? editingItem.probability
                    : undefined,
                impact:
                  editingItem.type === 'risk' ? editingItem.impact : undefined,
                dueDate:
                  editingItem.type === 'action-item'
                    ? editingItem.dueDate
                    : undefined,
                ownerId: editingItem.ownerId,
                mitigationPlan:
                  editingItem.type === 'risk'
                    ? editingItem.mitigationPlan
                    : undefined,
                contingencyPlan:
                  editingItem.type === 'risk'
                    ? editingItem.contingencyPlan
                    : undefined,
                resolution:
                  editingItem.type === 'issue'
                    ? editingItem.resolution
                    : undefined,
                rationale:
                  editingItem.type === 'decision'
                    ? editingItem.rationale
                    : undefined,
              }
            : undefined
        }
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={
          createMutation.error?.message ?? updateMutation.error?.message ?? null
        }
        mode={editingItem ? 'edit' : 'create'}
      />

      {/* Extraction Modal */}
      <RAIDExtractionModal
        isOpen={showExtractionModal}
        onClose={() => {
          setShowExtractionModal(false);
          setExtractedItems([]);
        }}
        extractedItems={extractedItems}
        onAccept={handleAcceptExtracted}
        isAccepting={acceptExtractedMutation.isPending}
        meetingTitle="Recent Meeting"
      />
    </div>
  );
}

export default ProjectRAIDTab;
