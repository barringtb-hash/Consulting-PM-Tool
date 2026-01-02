/**
 * Project Documents Tab
 * Displays and manages structured project documents from templates
 */

import React, { useState, useMemo } from 'react';
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
import { Card, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';

interface ProjectDocumentsTabProps {
  projectId: number;
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

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = `${document.name} (Copy)`;
    onClone(document.id, newName);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      onDelete(document.id);
    }
  };

  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer dark:border-neutral-700 dark:hover:bg-neutral-800"
      onClick={() => onView(document.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
              {document.name}
            </h3>
          </div>
          {document.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {document.description}
            </p>
          )}
        </div>
        <Badge variant={statusColors[document.status]}>
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
              onClick={handleDelete}
              className="p-1 hover:bg-neutral-100 rounded dark:hover:bg-neutral-700"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4 text-danger-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectDocumentsTab({ projectId }: ProjectDocumentsTabProps) {
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
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const handleViewDocument = (id: number) => {
    // TODO: Navigate to document editor or open modal
    console.log('View document:', id);
    alert('Document editor coming soon! Document ID: ' + id);
  };

  const handleCloneDocument = async (id: number, newName: string) => {
    try {
      await cloneMutation.mutateAsync({ id, newName });
    } catch (error) {
      console.error('Failed to clone document:', error);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id, projectId });
    } catch (error) {
      console.error('Failed to delete document:', error);
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

  if (documentsQuery.isLoading) {
    return (
      <Card>
        <CardBody>
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading documents...
          </p>
        </CardBody>
      </Card>
    );
  }

  if (documentsQuery.error) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 text-danger-600">
            <AlertCircle className="w-5 h-5" />
            <p>Unable to load documents</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const documents = documentsQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Documents
          </h2>
          {stats && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {stats.total} document{stats.total !== 1 ? 's' : ''} •{' '}
              {stats.byStatus.DRAFT || 0} draft •{' '}
              {stats.byStatus.IN_REVIEW || 0} in review •{' '}
              {stats.byStatus.APPROVED || 0} approved
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-5 h-5" />
          New Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
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
            setFilterCategory(e.target.value as ProjectDocumentCategory | '')
          }
          className="border rounded-md px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-700"
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
          className="border rounded-md px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-700"
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
        <Card>
          <CardBody className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              No documents yet
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              Create your first document from one of our templates to get
              started.
            </p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-5 h-5" />
              Create First Document
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {(
            ['CORE', 'LIFECYCLE', 'AI_SPECIFIC'] as ProjectDocumentCategory[]
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
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-3">
                  {categoryLabels[category]}
                </h3>
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
