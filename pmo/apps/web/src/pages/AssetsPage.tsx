/**
 * Assets Page
 *
 * Displays a library of AI assets with filtering, CRUD operations, and detail views.
 * Features:
 * - Stats cards with icons and colored accents
 * - Professional table layout with hover states
 * - Type-based colored avatars
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 * - Asset detail modal
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { type Asset, type AssetType } from '../api/assets';
import {
  useArchiveAsset,
  useAssets,
  useCreateAsset,
  useUpdateAsset,
} from '../api/queries';
import { useAccounts } from '../api/hooks/crm';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import {
  Plus,
  FileText,
  GitBranch,
  Database,
  FlaskConical,
  Shield,
  FolderOpen,
  MoreVertical,
  Eye,
  Pencil,
  Download,
  Trash2,
  Search,
} from 'lucide-react';
import AssetDetailModal from '../features/assets/AssetDetailModal';
import AssetFormCard from '../features/assets/AssetFormCard';
import { EMPTY_STATES } from '../utils/typography';

// ============================================================================
// Constants
// ============================================================================

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

// Icon configuration for each asset type
const ASSET_TYPE_ICONS: Record<AssetType, React.ElementType> = {
  PROMPT_TEMPLATE: FileText,
  WORKFLOW: GitBranch,
  DATASET: Database,
  EVALUATION: FlaskConical,
  GUARDRAIL: Shield,
};

// Color configuration for stat cards and avatars
const ASSET_TYPE_COLORS: Record<
  AssetType,
  { iconBg: string; iconColor: string; avatarBg: string; avatarText: string }
> = {
  PROMPT_TEMPLATE: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    avatarBg: 'bg-blue-100 dark:bg-blue-900/50',
    avatarText: 'text-blue-700 dark:text-blue-300',
  },
  WORKFLOW: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    avatarBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    avatarText: 'text-emerald-700 dark:text-emerald-300',
  },
  DATASET: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    avatarBg: 'bg-amber-100 dark:bg-amber-900/50',
    avatarText: 'text-amber-700 dark:text-amber-300',
  },
  EVALUATION: {
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
    avatarBg: 'bg-violet-100 dark:bg-violet-900/50',
    avatarText: 'text-violet-700 dark:text-violet-300',
  },
  GUARDRAIL: {
    iconBg: 'bg-neutral-100 dark:bg-neutral-700',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
    avatarBg: 'bg-neutral-100 dark:bg-neutral-700',
    avatarText: 'text-neutral-700 dark:text-neutral-300',
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Skeleton Components
// ============================================================================

/**
 * Skeleton loader for stats cards
 */
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

/**
 * Skeleton loader for table rows
 */
function TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    </tr>
  );
}

// ============================================================================
// Stats Card Component
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: StatCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
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

// ============================================================================
// Asset Avatar Component
// ============================================================================

interface AssetAvatarProps {
  type: AssetType;
  size?: 'sm' | 'md' | 'lg';
}

const AssetAvatar = memo(function AssetAvatar({
  type,
  size = 'md',
}: AssetAvatarProps): JSX.Element {
  const colors = ASSET_TYPE_COLORS[type];
  const IconComponent = ASSET_TYPE_ICONS[type];

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-lg ${sizeClasses[size]} ${colors.avatarBg}`}
    >
      <IconComponent className={`${iconSizes[size]} ${colors.avatarText}`} />
    </div>
  );
});

// ============================================================================
// Action Menu Component
// ============================================================================

interface ActionMenuProps {
  onView: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isArchived: boolean;
}

function ActionMenu({
  onView,
  onEdit,
  onDownload,
  onDelete,
  isArchived,
}: ActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onView();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDownload();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          {!isArchived && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Archive
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  hasFilters: boolean;
  onAddAsset: () => void;
}

function EmptyState({ hasFilters, onAddAsset }: EmptyStateProps): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <FolderOpen className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching assets' : 'No assets yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : EMPTY_STATES.noAssets +
              ' Get started by creating your first asset - a prompt template, workflow, dataset, or training material.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddAsset}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Asset
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

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
  const accountsQuery = useAccounts({ archived: undefined });
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset(editingAsset?.id ?? 0);
  const archiveAssetMutation = useArchiveAsset();

  useRedirectOnUnauthorized(assetsQuery.error);
  useRedirectOnUnauthorized(accountsQuery.error);
  useRedirectOnUnauthorized(createAssetMutation.error);
  useRedirectOnUnauthorized(updateAssetMutation.error);
  useRedirectOnUnauthorized(archiveAssetMutation.error);

  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
  const accounts = useMemo(
    () => accountsQuery.data?.data ?? [],
    [accountsQuery.data],
  );

  // Calculate asset statistics by type
  const stats = useMemo(() => {
    const promptTemplates = assets.filter(
      (a) => a.type === 'PROMPT_TEMPLATE',
    ).length;
    const workflows = assets.filter((a) => a.type === 'WORKFLOW').length;
    const datasets = assets.filter((a) => a.type === 'DATASET').length;
    const total = assets.length;
    return { promptTemplates, workflows, datasets, total };
  }, [assets]);

  const hasFilters = Boolean(search || type || template || clientId);

  const handleArchive = useCallback(
    async (assetId: number) => {
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
    },
    [archiveAssetMutation, editingAsset?.id, selectedAsset?.id, showToast],
  );

  const handleEdit = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setShowCreateForm(true);
    setSelectedAsset(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingAsset(null);
    setShowCreateForm(false);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateForm(false);
    setEditingAsset(null);
  }, []);

  const handleDownload = useCallback(
    (asset: Asset) => {
      // Create a JSON blob of the asset content
      const content = JSON.stringify(
        {
          name: asset.name,
          type: asset.type,
          description: asset.description,
          content: asset.content,
          tags: asset.tags,
        },
        null,
        2,
      );
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.name.replace(/\s+/g, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Asset downloaded successfully', 'success');
    },
    [showToast],
  );

  const handleArchiveWithConfirm = useCallback(
    async (assetId: number) => {
      if (!window.confirm('Are you sure you want to archive this asset?')) {
        return;
      }
      await handleArchive(assetId);
    },
    [handleArchive],
  );

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

      <div className="page-content space-y-6">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <AssetFormCard
            editingAsset={editingAsset}
            clients={accounts}
            onCancel={handleCancelEdit}
            onSuccess={handleCreateSuccess}
          />
        )}

        {/* Stats Cards */}
        {assetsQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              label="Prompt Templates"
              value={stats.promptTemplates}
              iconBg="bg-blue-100 dark:bg-blue-900/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<GitBranch className="h-5 w-5" />}
              label="Workflows"
              value={stats.workflows}
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<Database className="h-5 w-5" />}
              label="Datasets"
              value={stats.datasets}
              iconBg="bg-amber-100 dark:bg-amber-900/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<FolderOpen className="h-5 w-5" />}
              label="Total Assets"
              value={stats.total}
              iconBg="bg-violet-100 dark:bg-violet-900/50"
              iconColor="text-violet-600 dark:text-violet-400"
            />
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <Input
                type="text"
                placeholder="Search by name, description, or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as AssetType | '')}
              className="w-full sm:w-44"
            >
              <option value="">All Types</option>
              <option value="PROMPT_TEMPLATE">Prompt Template</option>
              <option value="WORKFLOW">Workflow</option>
              <option value="DATASET">Dataset</option>
              <option value="EVALUATION">Evaluation</option>
              <option value="GUARDRAIL">Guardrail</option>
            </Select>
            <Select
              value={template}
              onChange={(e) =>
                setTemplate(e.target.value as '' | 'true' | 'false')
              }
              className="w-full sm:w-40"
            >
              <option value="">All Assets</option>
              <option value="true">Templates Only</option>
              <option value="false">Client-Specific</option>
            </Select>
            <Select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="">All Clients</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-3">
            <Checkbox
              label="Show archived assets"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
          </div>
        </Card>

        {/* Assets Table */}
        {assetsQuery.isLoading ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Modified
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : assetsQuery.error ? (
          <Card className="p-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/30 mb-4">
                <FolderOpen className="h-8 w-8 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Unable to load assets
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Please try refreshing the page or contact support if the problem
                persists.
              </p>
            </div>
          </Card>
        ) : assets.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onAddAsset={() => setShowCreateForm(true)}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Modified
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {assets.map((asset) => {
                    const client = accounts.find(
                      (c) => c.id === asset.clientId,
                    );
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <AssetAvatar type={asset.type} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                  {asset.name}
                                </span>
                                {asset.isTemplate && (
                                  <Badge variant="primary" size="sm">
                                    Template
                                  </Badge>
                                )}
                                {asset.archived && (
                                  <Badge variant="danger" size="sm">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                  {client
                                    ? client.name
                                    : asset.isTemplate
                                      ? 'Global Template'
                                      : 'Unassigned'}
                                </span>
                                {asset.tags.length > 0 && (
                                  <span className="text-neutral-300 dark:text-neutral-600">
                                    |
                                  </span>
                                )}
                                {asset.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="neutral"
                                    size="sm"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {asset.tags.length > 2 && (
                                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                    +{asset.tags.length - 2}
                                  </span>
                                )}
                              </div>
                              {/* Show type on mobile */}
                              <div className="sm:hidden text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                {ASSET_TYPE_LABELS[asset.type]}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <Badge variant={ASSET_TYPE_VARIANTS[asset.type]}>
                            {ASSET_TYPE_LABELS[asset.type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {formatDate(asset.updatedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <ActionMenu
                            onView={() => setSelectedAsset(asset)}
                            onEdit={() => handleEdit(asset)}
                            onDownload={() => handleDownload(asset)}
                            onDelete={() => handleArchiveWithConfirm(asset.id)}
                            isArchived={asset.archived}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Results count footer */}
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing{' '}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {assets.length}
                </span>{' '}
                asset{assets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          client={accounts.find((c) => c.id === selectedAsset.clientId)}
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
