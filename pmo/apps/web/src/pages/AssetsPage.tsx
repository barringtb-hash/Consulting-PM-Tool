import React, { useMemo, useState } from 'react';
import { type Asset, type AssetType } from '../api/assets';
import {
  useArchiveAsset,
  useAssets,
  useClients,
  useCreateAsset,
  useUpdateAsset,
} from '../api/queries';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { Plus, Edit2, Archive, FileText, FolderOpen } from 'lucide-react';
import AssetDetailModal from '../features/assets/AssetDetailModal';
import AssetFormCard from '../features/assets/AssetFormCard';
import { EMPTY_STATES } from '../utils/typography';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  PROMPT_TEMPLATE: 'Prompt Template',
  WORKFLOW: 'Workflow',
  DATASET: 'Dataset',
  EVALUATION: 'Evaluation',
  GUARDRAIL: 'Guardrail',
};

const ASSET_TYPE_VARIANTS: Record<
  AssetType,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  PROMPT_TEMPLATE: 'primary',
  WORKFLOW: 'success',
  DATASET: 'warning',
  EVALUATION: 'secondary',
  GUARDRAIL: 'neutral',
};

function AssetsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<AssetType | ''>('');
  const [template, setTemplate] = useState<'' | 'true' | 'false'>('');
  const [clientId, setClientId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { showToast } = useToast();

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      assetType: (type || undefined) as AssetType | undefined,
      isTemplate:
        template === '' ? undefined : template === 'true' ? true : false,
      clientId: clientId ? Number(clientId) : undefined,
      includeArchived,
    }),
    [clientId, includeArchived, search, template, type],
  );

  const assetsQuery = useAssets(filterParams);
  const clientsQuery = useClients({ includeArchived: true });
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset(editingAsset?.id ?? 0);
  const archiveAssetMutation = useArchiveAsset();

  useRedirectOnUnauthorized(assetsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createAssetMutation.error);
  useRedirectOnUnauthorized(updateAssetMutation.error);
  useRedirectOnUnauthorized(archiveAssetMutation.error);

  const handleArchive = async (assetId: number) => {
    try {
      await archiveAssetMutation.mutateAsync(assetId);
      if (editingAsset?.id === assetId) {
        setEditingAsset(null);
        setShowCreateForm(false);
      }
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
      showToast('Asset archived successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to archive asset';
      showToast(message, 'error');
    }
  };

  const assets = assetsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowCreateForm(true);
    setSelectedAsset(null);
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setShowCreateForm(false);
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    setEditingAsset(null);
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Assets Library"
        description="Manage AI prompts, workflows, datasets, and reusable templates"
        actions={
          !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4" />
              Create Asset
            </Button>
          )
        }
      />

      <div className="container-padding py-6 space-y-6">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <AssetFormCard
            editingAsset={editingAsset}
            clients={clients}
            onCancel={handleCancelEdit}
            onSuccess={handleCreateSuccess}
          />
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle as="h2">Filters</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-3">
                <Input
                  label="Search"
                  placeholder="Search by name, description, or tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>

              <Select
                label="Type"
                value={type}
                onChange={(e) => setType(e.target.value as AssetType | '')}
              >
                <option value="">All Types</option>
                <option value="PROMPT_TEMPLATE">Prompt Template</option>
                <option value="WORKFLOW">Workflow</option>
                <option value="DATASET">Dataset</option>
                <option value="EVALUATION">Evaluation</option>
                <option value="GUARDRAIL">Guardrail</option>
              </Select>

              <Select
                label="Template Status"
                value={template}
                onChange={(e) =>
                  setTemplate(e.target.value as '' | 'true' | 'false')
                }
              >
                <option value="">All Assets</option>
                <option value="true">Templates Only</option>
                <option value="false">Client-Specific Only</option>
              </Select>

              <Select
                label="Client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>

              <div className="lg:col-span-3">
                <Checkbox
                  label="Show archived assets"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Asset List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {assets.length === 0
                ? EMPTY_STATES.noAssets
                : `${assets.length} asset${assets.length === 1 ? '' : 's'}`}
            </h2>
          </div>

          {/* Loading State */}
          {assetsQuery.isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardBody>
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                      <div className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
                        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {assetsQuery.error && (
            <Card>
              <CardBody>
                <div className="text-center py-8">
                  <p className="text-danger-600 font-medium">
                    Unable to load assets
                  </p>
                  <p className="text-neutral-600 text-sm mt-2">
                    Please try again later
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Empty State */}
          {!assetsQuery.isLoading &&
            !assetsQuery.error &&
            assets.length === 0 && (
              <Card>
                <CardBody>
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                      {EMPTY_STATES.noAssets}
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6 max-w-md mx-auto">
                      {search || type || template || clientId
                        ? "Try adjusting your filters to find what you're looking for."
                        : 'Get started by creating your first asset — a prompt template, workflow, dataset, or training material.'}
                    </p>
                    {!showCreateForm && (
                      <Button onClick={() => setShowCreateForm(true)}>
                        <Plus className="w-4 h-4" />
                        Create Your First Asset
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

          {/* Asset Cards Grid */}
          {!assetsQuery.isLoading &&
            !assetsQuery.error &&
            assets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((asset) => {
                  const client = clients.find((c) => c.id === asset.clientId);
                  return (
                    <Card
                      key={asset.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <CardBody className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {asset.name}
                            </h3>
                            {asset.archived && (
                              <Badge variant="danger" className="mt-1">
                                Archived
                              </Badge>
                            )}
                          </div>
                          <Badge variant={ASSET_TYPE_VARIANTS[asset.type]}>
                            {ASSET_TYPE_LABELS[asset.type]}
                          </Badge>
                        </div>

                        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 min-h-[2.5rem]">
                          {asset.description || EMPTY_STATES.noDescription}
                        </p>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-neutral-400" />
                            <span className="text-neutral-600 dark:text-neutral-400">
                              {client
                                ? client.name
                                : asset.isTemplate
                                  ? 'Global Template'
                                  : 'Unassigned'}
                            </span>
                          </div>

                          {asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {asset.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="neutral"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {asset.tags.length > 3 && (
                                <Badge variant="neutral" className="text-xs">
                                  +{asset.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Updated {formatDate(asset.updatedAt)}
                          </div>
                        </div>

                        <div
                          className="flex gap-2 pt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(asset);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                          {!asset.archived && (
                            <Button
                              size="sm"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(asset.id);
                              }}
                              disabled={archiveAssetMutation.isPending}
                            >
                              <Archive className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          client={clients.find((c) => c.id === selectedAsset.clientId)}
          onClose={() => setSelectedAsset(null)}
          onEdit={() => {
            handleEdit(selectedAsset);
          }}
          onArchive={() => handleArchive(selectedAsset.id)}
        />
      )}
    </div>
  );
}

export default AssetsPage;
