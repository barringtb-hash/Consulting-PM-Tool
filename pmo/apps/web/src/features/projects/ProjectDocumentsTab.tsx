/**
 * Project Documents Tab
 * Displays and manages structured project documents from templates
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  FolderOpen,
} from 'lucide-react';
import {
  useProjectDocuments,
  useProjectDocumentStats,
  useDocumentTemplates,
  useCreateProjectDocument,
  useDeleteProjectDocument,
  useCloneProjectDocument,
  type ProjectDocument,
  type TemplateInfo,
  type ProjectDocumentCategory,
  type ProjectDocumentStatus,
} from '../../api/hooks/projectDocuments';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { useToast } from '../../ui/Toast';

interface ProjectDocumentsTabProps {
  projectId: number;
}

// Style configuration for consistent theming
const STAT_STYLES = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  violet: {
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  amber: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  neutral: {
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
  },
} as const;

type StatStyleVariant = keyof typeof STAT_STYLES;

// Stat card component with icon
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: StatStyleVariant;
}

function StatCard({
  icon,
  label,
  value,
  variant = 'neutral',
}: StatCardProps): JSX.Element {
  const styles = STAT_STYLES[variant];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${styles.iconBg}`}
        >
          <div className={styles.iconColor}>{icon}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {label}
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Skeleton loader for stats cards
function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

// Section header with icon in colored background
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  variant?: StatStyleVariant;
  action?: React.ReactNode;
}

function SectionHeader({
  icon,
  title,
  variant = 'neutral',
  action,
}: SectionHeaderProps): JSX.Element {
  const styles = STAT_STYLES[variant];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${styles.iconBg}`}
        >
          <div className={styles.iconColor}>{icon}</div>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
        <div className="text-neutral-400 dark:text-neutral-500">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}

// Document grid skeleton
function DocumentGridSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 dark:border-neutral-700">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t dark:border-neutral-700">
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Status badge colors
const statusColors: Record<
  ProjectDocumentStatus,
  'default' | 'warning' | 'success' | 'neutral'
> = {
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  ARCHIVED: 'neutral',
};

// Status icons
const StatusIcon: React.FC<{ status: ProjectDocumentStatus }> = ({
  status,
}) => {
  switch (status) {
    case 'DRAFT':
      return <FileText className="w-4 h-4" />;
    case 'IN_REVIEW':
      return <Clock className="w-4 h-4" />;
    case 'APPROVED':
      return <CheckCircle className="w-4 h-4" />;
    case 'ARCHIVED':
      return <Archive className="w-4 h-4" />;
    default:
      return null;
  }
};

// Category labels
const categoryLabels: Record<ProjectDocumentCategory, string> = {
  CORE: 'Core Project Documents',
  LIFECYCLE: 'Project Lifecycle',
  AI_SPECIFIC: 'AI Project-Specific',
};

// Category variants for icons
const categoryVariants: Record<ProjectDocumentCategory, StatStyleVariant> = {
  CORE: 'blue',
  LIFECYCLE: 'emerald',
  AI_SPECIFIC: 'violet',
};

// Template Picker Modal
interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TemplateInfo, name: string) => void;
  isCreating: boolean;
}

function TemplatePickerModal({
  isOpen,
  onClose,
  onSelect,
  isCreating,
}: TemplatePickerModalProps) {
  const templatesQuery = useDocumentTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(
    null,
  );
  const [documentName, setDocumentName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<
    Set<ProjectDocumentCategory>
  >(new Set(['CORE', 'LIFECYCLE', 'AI_SPECIFIC']));

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null);
      setDocumentName('');
      setExpandedCategories(new Set(['CORE', 'LIFECYCLE', 'AI_SPECIFIC']));
    }
  }, [isOpen]);

  const groupedTemplates = useMemo(() => {
    const templates = templatesQuery.data ?? [];
    return {
      CORE: templates.filter((t) => t.category === 'CORE'),
      LIFECYCLE: templates.filter((t) => t.category === 'LIFECYCLE'),
      AI_SPECIFIC: templates.filter((t) => t.category === 'AI_SPECIFIC'),
    };
  }, [templatesQuery.data]);

  const toggleCategory = (category: ProjectDocumentCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleTemplateSelect = (template: TemplateInfo) => {
    setSelectedTemplate(template);
    setDocumentName(template.name);
  };

  const handleCreate = () => {
    if (selectedTemplate && documentName.trim()) {
      onSelect(selectedTemplate, documentName.trim());
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setDocumentName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Document from Template"
    >
      <div className="space-y-4">
        {templatesQuery.isLoading ? (
          <p className="text-neutral-500">Loading templates...</p>
        ) : (
          <>
            <div className="space-y-2">
              {(
                [
                  'CORE',
                  'LIFECYCLE',
                  'AI_SPECIFIC',
                ] as ProjectDocumentCategory[]
              ).map((category) => (
                <div
                  key={category}
                  className="border rounded-lg dark:border-neutral-700"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {categoryLabels[category]}
                    </span>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    )}
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="border-t dark:border-neutral-700">
                      {groupedTemplates[category].map((template) => (
                        <button
                          key={template.type}
                          type="button"
                          onClick={() => handleTemplateSelect(template)}
                          className={`w-full p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b last:border-b-0 dark:border-neutral-700 ${
                            selectedTemplate?.type === template.type
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : ''
                          }`}
                        >
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {template.name}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            {template.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedTemplate && (
              <div className="pt-4 border-t dark:border-neutral-700">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Document Name
                </label>
                <Input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Enter document name"
                />
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!selectedTemplate || !documentName.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Document'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Document Card Component
interface DocumentCardProps {
  document: ProjectDocument;
  onView: (id: number) => void;
  onClone: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

function DocumentCard({
  document,
  onView,
  onClone,
  onDelete,
}: DocumentCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = `${document.name} (Copy)`;
    onClone(document.id, newName);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(document.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Document"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400">
            Are you sure you want to delete &quot;{document.name}&quot;? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      <div
        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer dark:border-neutral-700 dark:hover:bg-neutral-800/50 overflow-hidden"
        onClick={() => onView(document.id)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${STAT_STYLES[categoryVariants[document.category]].iconBg}`}
            >
              <FileText
                className={`w-5 h-5 ${STAT_STYLES[categoryVariants[document.category]].iconColor}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {document.name}
              </h3>
              {document.description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                  {document.description}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={statusColors[document.status]}
            className="ml-2 flex-shrink-0"
          >
            <StatusIcon status={document.status} />
            <span className="ml-1">{document.status.replace('_', ' ')}</span>
          </Badge>
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t dark:border-neutral-700">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Updated {new Date(document.updatedAt).toLocaleDateString()}
            {document.editor && ` by ${document.editor.name}`}
          </div>
          {showActions && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleClone}
                className="p-1 hover:bg-neutral-100 rounded dark:hover:bg-neutral-700"
                title="Clone document"
              >
                <Copy className="w-4 h-4 text-neutral-500" />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="p-1 hover:bg-neutral-100 rounded dark:hover:bg-neutral-700"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4 text-danger-500" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function ProjectDocumentsTab({ projectId }: ProjectDocumentsTabProps) {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    ProjectDocumentCategory | ''
  >('');
  const [filterStatus, setFilterStatus] = useState<ProjectDocumentStatus | ''>(
    '',
  );

  const documentsQuery = useProjectDocuments(projectId, {
    category: filterCategory || undefined,
    status: filterStatus || undefined,
    search: searchQuery || undefined,
  });
  const statsQuery = useProjectDocumentStats(projectId);
  const createMutation = useCreateProjectDocument(projectId);
  const cloneMutation = useCloneProjectDocument();
  const deleteMutation = useDeleteProjectDocument();

  const handleCreateDocument = async (template: TemplateInfo, name: string) => {
    try {
      await createMutation.mutateAsync({
        templateType: template.type,
        name,
      });
      setIsModalOpen(false);
      showToast('Document created successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create document';
      showToast(message, 'error');
    }
  };

  const handleViewDocument = (id: number) => {
    // TODO: Navigate to document editor or open modal
    showToast(`Document editor coming soon! Document ID: ${id}`, 'info');
  };

  const handleCloneDocument = async (id: number, newName: string) => {
    try {
      await cloneMutation.mutateAsync({ id, newName });
      showToast('Document cloned successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to clone document';
      showToast(message, 'error');
    }
  };

  const handleDeleteDocument = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id, projectId });
      showToast('Document deleted successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete document';
      showToast(message, 'error');
    }
  };

  const groupedDocuments = useMemo(() => {
    const docs = documentsQuery.data ?? [];
    return {
      CORE: docs.filter((d) => d.category === 'CORE'),
      LIFECYCLE: docs.filter((d) => d.category === 'LIFECYCLE'),
      AI_SPECIFIC: docs.filter((d) => d.category === 'AI_SPECIFIC'),
    };
  }, [documentsQuery.data]);

  // Loading state with skeleton
  if (documentsQuery.isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Documents section skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardBody>
            <DocumentGridSkeleton />
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  if (documentsQuery.error) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" />}
            title="Unable to load documents"
            description="There was a problem loading the documents for this project. Please try again."
            action={
              <Button
                variant="secondary"
                onClick={() => documentsQuery.refetch()}
              >
                Retry
              </Button>
            }
          />
        </CardBody>
      </Card>
    );
  }

  const documents = documentsQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Total Documents"
            value={stats.total}
            variant="blue"
          />
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Draft"
            value={stats.byStatus.DRAFT || 0}
            variant="neutral"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="In Review"
            value={stats.byStatus.IN_REVIEW || 0}
            variant="amber"
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Approved"
            value={stats.byStatus.APPROVED || 0}
            variant="emerald"
          />
        </div>
      )}

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <SectionHeader
            icon={<FolderOpen className="h-5 w-5" />}
            title="Documents"
            variant="blue"
            action={
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-5 h-5" />
                New Document
              </Button>
            }
          />
        </CardHeader>
        <CardBody>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(
                  e.target.value as ProjectDocumentCategory | '',
                )
              }
              className="border rounded-md px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
            >
              <option value="">All Categories</option>
              <option value="CORE">Core</option>
              <option value="LIFECYCLE">Lifecycle</option>
              <option value="AI_SPECIFIC">AI-Specific</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as ProjectDocumentStatus | '')
              }
              className="border rounded-md px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="APPROVED">Approved</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Document List by Category */}
          {documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No documents yet"
              description="Create your first document from one of our templates to get started with project documentation."
              action={
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-5 h-5" />
                  Create First Document
                </Button>
              }
            />
          ) : (
            <div className="space-y-8">
              {(
                [
                  'CORE',
                  'LIFECYCLE',
                  'AI_SPECIFIC',
                ] as ProjectDocumentCategory[]
              ).map((category) => {
                const categoryDocs = groupedDocuments[category];
                if (
                  categoryDocs.length === 0 &&
                  filterCategory &&
                  filterCategory !== category
                ) {
                  return null;
                }
                if (categoryDocs.length === 0) {
                  return null;
                }

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${STAT_STYLES[categoryVariants[category]].iconBg}`}
                      >
                        <FileText
                          className={`w-4 h-4 ${STAT_STYLES[categoryVariants[category]].iconColor}`}
                        />
                      </div>
                      <h4 className="text-md font-medium text-neutral-900 dark:text-neutral-100">
                        {categoryLabels[category]}
                      </h4>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        ({categoryDocs.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryDocs.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onView={handleViewDocument}
                          onClone={handleCloneDocument}
                          onDelete={handleDeleteDocument}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleCreateDocument}
        isCreating={createMutation.isPending}
      />
    </div>
  );
}
