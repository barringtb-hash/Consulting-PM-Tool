import React, { useMemo, useState } from 'react';
import {
  useMarketingContents,
  useArchiveMarketingContent,
} from '../api/marketing';
import { useClients } from '../api/queries';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Card, CardBody } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { Plus, Edit2, Archive, FileText, Calendar } from 'lucide-react';
import {
  type MarketingContent,
  type ContentType,
  type ContentStatus,
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
  getContentTypeIcon,
} from '../../../../packages/types/marketing';
import MarketingContentFormModal from '../features/marketing/MarketingContentFormModal';
import MarketingContentDetailModal from '../features/marketing/MarketingContentDetailModal';

const CONTENT_STATUS_VARIANTS: Record<
  ContentStatus,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  DRAFT: 'neutral',
  IN_REVIEW: 'warning',
  APPROVED: 'primary',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
};

function MarketingContentPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedContent, setSelectedContent] =
    useState<MarketingContent | null>(null);
  const [editingContent, setEditingContent] = useState<MarketingContent | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const { showToast } = useToast();

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      clientId: clientIdFilter ? Number(clientIdFilter) : undefined,
      archived: includeArchived,
    }),
    [search, typeFilter, statusFilter, clientIdFilter, includeArchived],
  );

  const contentsQuery = useMarketingContents(filterParams);
  const clientsQuery = useClients({ includeArchived: false });
  const archiveContentMutation = useArchiveMarketingContent();

  useRedirectOnUnauthorized(contentsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);

  const handleArchive = async (contentId: number) => {
    try {
      await archiveContentMutation.mutateAsync(contentId);
      if (editingContent?.id === contentId) {
        setEditingContent(null);
        setShowCreateModal(false);
      }
      if (selectedContent?.id === contentId) {
        setSelectedContent(null);
        setShowDetailModal(false);
      }
      showToast('Content archived successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to archive content';
      showToast(message, 'error');
    }
  };

  const contents = contentsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const handleEdit = (content: MarketingContent) => {
    setEditingContent(content);
    setShowCreateModal(true);
    setShowDetailModal(false);
  };

  const handleViewDetail = (content: MarketingContent) => {
    setSelectedContent(content);
    setShowDetailModal(true);
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="Marketing & Content"
        description="Create and manage marketing content from your projects and meetings"
        actions={
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('list')}
            >
              <FileText className="w-4 h-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              Create Content
            </Button>
          </div>
        }
      />

      <div className="container-padding py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Search"
                placeholder="Search by name or summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                label="Content Type"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as ContentType | '')
                }
              >
                <option value="">All Types</option>
                {Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ContentStatus | '')
                }
              >
                <option value="">All Statuses</option>
                {Object.entries(CONTENT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                label="Client"
                value={clientIdFilter}
                onChange={(e) => setClientIdFilter(e.target.value)}
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  className="rounded border-neutral-300"
                />
                Include archived content
              </label>
            </div>
          </CardBody>
        </Card>

        {/* Content List or Calendar */}
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {contentsQuery.isLoading ? (
              <Card>
                <CardBody>
                  <p className="text-center text-neutral-500">
                    Loading content...
                  </p>
                </CardBody>
              </Card>
            ) : contents.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-center text-neutral-500">
                    No marketing content found. Create your first content to get
                    started!
                  </p>
                </CardBody>
              </Card>
            ) : (
              contents.map((content) => (
                <Card
                  key={content.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {getContentTypeIcon(content.type)}
                          </span>
                          <div>
                            <h3
                              className="text-lg font-semibold text-neutral-900 cursor-pointer hover:text-primary-600"
                              onClick={() => handleViewDetail(content)}
                            >
                              {content.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  CONTENT_STATUS_VARIANTS[content.status]
                                }
                              >
                                {CONTENT_STATUS_LABELS[content.status]}
                              </Badge>
                              <Badge variant="neutral">
                                {CONTENT_TYPE_LABELS[content.type]}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {content.summary && (
                          <p className="text-sm text-neutral-600 mt-2 line-clamp-2">
                            {content.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-neutral-500">
                          {content.client && (
                            <span>Client: {content.client.name}</span>
                          )}
                          {content.project && (
                            <span>Project: {content.project.name}</span>
                          )}
                          <span>Created: {formatDate(content.createdAt)}</span>
                          {content.scheduledFor && (
                            <span>
                              Scheduled: {formatDate(content.scheduledFor)}
                            </span>
                          )}
                        </div>
                        {content.tags && content.tags.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {content.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(content)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleArchive(content.id)}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card>
            <CardBody>
              <p className="text-center text-neutral-500">
                Calendar view coming soon! Use the list view to manage your
                content.
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <MarketingContentFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingContent(null);
          }}
          editingContent={editingContent}
          clients={clients}
        />
      )}

      {showDetailModal && selectedContent && (
        <MarketingContentDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
          onEdit={handleEdit}
          onArchive={handleArchive}
        />
      )}
    </div>
  );
}

export default MarketingContentPage;
