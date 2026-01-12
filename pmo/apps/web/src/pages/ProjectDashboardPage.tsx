import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  LayoutDashboard,
  CheckSquare,
  Users,
  FolderOpen,
  Settings,
  Megaphone,
  Edit2,
  UserPlus,
  Lock,
  Globe,
  FileText,
  AlertTriangle,
  MoreVertical,
  Trash2,
  Pencil,
  FolderX,
  Brain,
} from 'lucide-react';
import {
  useClient,
  useDeleteProject,
  useProject,
  useUpdateProject,
} from '../api/queries';
import { useAuth } from '../auth/AuthContext';
import { type Project, type ProjectStatus } from '../api/projects';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { ProjectOverviewTab } from '../features/projects/ProjectOverviewTab';
import { ProjectTasksTab } from '../features/projects/ProjectTasksTab';
import { ProjectDocumentsTab } from '../features/projects/ProjectDocumentsTab';
import { ProjectStatusTab } from '../features/status/ProjectStatusTab';
import ProjectMeetingsPanel from '../features/meetings/ProjectMeetingsPanel';
import { ProjectMLTab } from '../features/project-ml/ProjectMLTab';
import { Badge } from '../ui/Badge';
import { ProjectStatusPill } from '../components/ProjectStatusPill';
import { ProjectMembersManager } from '../components/projects/ProjectMembersManager';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { EMPTY_STATES, formatStatus } from '../utils/typography';

import {
  useProjectAssets,
  useLinkAssetToProject,
  useUnlinkAssetFromProject,
  useAssets,
  useCreateAsset,
} from '../api/queries';
import AssetForm, {
  assetFormValuesToPayload,
  type AssetFormValues,
} from '../components/AssetForm';
import {
  useProjectMarketingContents,
  useArchiveMarketingContent,
} from '../api/marketing';
import { GenerateFromProjectButton } from '../features/marketing';
import MarketingContentFormModal from '../features/marketing/MarketingContentFormModal';
import MarketingContentDetailModal from '../features/marketing/MarketingContentDetailModal';
import {
  type MarketingContent,
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
  getContentTypeIcon,
} from '../../../../packages/types/marketing';

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// Style configuration for stat card variants - matches ContactsPage pattern
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
  rose: {
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  neutral: {
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
  },
} as const;

type StatStyleVariant = keyof typeof STAT_STYLES;

// Skeleton loader for stats cards - matches ContactsPage pattern
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

// Stat card component with icon - matches ContactsPage pattern
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: StatStyleVariant;
  onClick?: () => void;
}

function _StatCard({
  icon,
  label,
  value,
  variant = 'neutral',
  onClick,
}: StatCardProps): JSX.Element {
  const styles = STAT_STYLES[variant];

  const cardContent = (
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
  );

  if (onClick) {
    return (
      <Card
        className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] hover:border-primary-300 dark:hover:border-primary-600"
        onClick={onClick}
      >
        {cardContent}
      </Card>
    );
  }

  return <Card className="p-4">{cardContent}</Card>;
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

// Skeleton for page content
function PageSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header skeleton */}
      <header className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="container-padding py-6">
          <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </header>

      {/* Status bar skeleton */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <Card>
          <CardBody>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
                    <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </main>
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

// Action menu for list items
interface ActionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

function ActionMenu({ onEdit, onDelete }: ActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          {onEdit && (
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
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Skeleton loader for table rows
function _TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    </tr>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return EMPTY_STATES.noDate;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

function ProjectDashboardPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const projectId = useMemo(() => Number(id), [id]);

  const projectQuery = useProject(
    Number.isNaN(projectId) ? undefined : projectId,
  );
  const project = projectQuery.data as Project | undefined;
  const clientQuery = useClient(project?.clientId ?? undefined);
  const updateProjectMutation = useUpdateProject(projectId || 0);
  const deleteProjectMutation = useDeleteProject();
  const { setSelectedProject } = useClientProjectContext();

  const [activeTab, setActiveTab] = useState('overview');
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [editedStatus, setEditedStatus] = useState<ProjectStatus>('PLANNING');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');

  // Project name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Assets
  const projectAssetsQuery = useProjectAssets(projectId, false);
  const linkAssetMutation = useLinkAssetToProject(projectId || 0);
  const unlinkAssetMutation = useUnlinkAssetFromProject(projectId || 0);
  const availableAssetsQuery = useAssets(
    project?.clientId ? { clientId: project.clientId } : undefined,
  );
  const createAssetMutation = useCreateAsset();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Marketing
  const projectMarketingContentsQuery = useProjectMarketingContents(projectId);
  const archiveMarketingContentMutation = useArchiveMarketingContent();
  const [selectedMarketingContent, setSelectedMarketingContent] =
    useState<MarketingContent | null>(null);
  const [editingMarketingContent, setEditingMarketingContent] =
    useState<MarketingContent | null>(null);
  const [showMarketingContentDetail, setShowMarketingContentDetail] =
    useState(false);
  const [showMarketingContentForm, setShowMarketingContentForm] =
    useState(false);

  useRedirectOnUnauthorized(projectQuery.error);
  useRedirectOnUnauthorized(clientQuery.error);

  const handleDeleteProject = async () => {
    if (!project) return;

    if (
      !window.confirm(
        `Are you sure you want to delete "${project.name}"? This will also delete all tasks, milestones, meetings, and other associated data. This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      // Clear context and navigate BEFORE the mutation completes
      // This unmounts the component and its query hooks, preventing refetch attempts
      setSelectedProject(null);
      navigate('/dashboard');
      await deleteProjectMutation.mutateAsync(projectId);
      showToast('Project deleted successfully', 'success');
    } catch {
      showToast('Failed to delete project', 'error');
      // On failure, user is already on dashboard - they can navigate back if needed
    }
  };

  useEffect(() => {
    if (project) {
      setSelectedProject(project);
      setEditedStatus(project.status);
      setEditedStartDate(project.startDate?.slice(0, 10) ?? '');
      setEditedEndDate(project.endDate?.slice(0, 10) ?? '');
      setEditedName(project.name);
    }
  }, [project, setSelectedProject]);

  const handleUpdateProjectName = async () => {
    if (!project) return;
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      showToast('Project name cannot be empty', 'error');
      return;
    }
    if (trimmedName === project.name) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateProjectMutation.mutateAsync({ name: trimmedName });
      setIsEditingName(false);
      showToast('Project name updated', 'success');
    } catch (err) {
      console.error('Failed to update project name:', err);
      showToast('Failed to update project name', 'error');
    }
  };

  // Note: Legacy client-project context is deprecated. The CRM now uses Account-based context.
  // Client data is fetched and displayed directly without storing in context.

  const handleUpdateProjectStatus = async () => {
    if (!project) return;

    try {
      await updateProjectMutation.mutateAsync({
        status: editedStatus,
        startDate: editedStartDate || undefined,
        endDate: editedEndDate || undefined,
      });
      setShowStatusEditor(false);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleLinkAsset = async () => {
    if (!selectedAssetId) {
      setAssetError('Please select an asset');
      return;
    }

    try {
      await linkAssetMutation.mutateAsync({
        assetId: Number(selectedAssetId),
        notes: assetNotes || undefined,
      });
      setSelectedAssetId('');
      setAssetNotes('');
      setAssetError(null);
    } catch (err) {
      setAssetError(
        err instanceof Error ? err.message : 'Failed to link asset',
      );
    }
  };

  const handleUnlinkAsset = async (assetId: number) => {
    try {
      await unlinkAssetMutation.mutateAsync(assetId);
    } catch (err) {
      console.error('Failed to unlink asset:', err);
    }
  };

  const handleCreateAsset = async (values: AssetFormValues) => {
    if (!project) return;

    const payload = assetFormValuesToPayload({
      ...values,
      clientId:
        values.clientId || (project?.clientId ? String(project.clientId) : ''),
    });

    try {
      const asset = await createAssetMutation.mutateAsync(payload);
      await linkAssetMutation.mutateAsync({
        assetId: asset.id,
        notes: undefined,
      });
      setShowAssetForm(false);
    } catch (err) {
      console.error('Failed to create asset:', err);
    }
  };

  const projectAssets = useMemo(
    () => projectAssetsQuery.data ?? [],
    [projectAssetsQuery.data],
  );

  const availableAssets = useMemo(() => {
    const linkedIds = new Set(projectAssets.map((entry) => entry.assetId));
    const list = availableAssetsQuery.data ?? [];
    return list.filter((asset) => !linkedIds.has(asset.id));
  }, [availableAssetsQuery.data, projectAssets]);

  const marketingContents = useMemo(
    () => projectMarketingContentsQuery.data ?? [],
    [projectMarketingContentsQuery.data],
  );

  // Check if current user is admin (owner or has ADMIN role in project members)
  const isAdmin = useMemo(() => {
    if (!project || !user) return false;
    const userId = Number(user.id);
    // Owner always has admin access
    if (project.ownerId === userId) return true;
    // Check if user has ADMIN role in project members
    if (project.members) {
      return project.members.some(
        (m) => m.userId === userId && m.role === 'ADMIN',
      );
    }
    return false;
  }, [project, user]);

  const handleEditMarketingContent = (content: MarketingContent) => {
    setEditingMarketingContent(content);
    setShowMarketingContentForm(true);
    setShowMarketingContentDetail(false);
  };

  const handleViewMarketingContent = (content: MarketingContent) => {
    setSelectedMarketingContent(content);
    setShowMarketingContentDetail(true);
  };

  const handleArchiveMarketingContent = async (contentId: number) => {
    try {
      await archiveMarketingContentMutation.mutateAsync(contentId);
      if (editingMarketingContent?.id === contentId) {
        setEditingMarketingContent(null);
        setShowMarketingContentForm(false);
      }
      if (selectedMarketingContent?.id === contentId) {
        setSelectedMarketingContent(null);
        setShowMarketingContentDetail(false);
      }
      showToast('Marketing content archived successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to archive marketing content';
      showToast(message, 'error');
    }
  };

  // Loading state with skeleton
  if (projectQuery.isLoading) {
    return <PageSkeleton />;
  }

  // Error state
  if (projectQuery.error || !project) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <PageHeader
          title="Project Not Found"
          description="The project you are looking for could not be loaded."
        />
        <main className="page-content">
          <Card className="p-12">
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title={
                projectQuery.error
                  ? 'Unable to load project'
                  : 'Project not found'
              }
              description="The project may have been deleted or you may not have permission to view it."
              action={
                <Link to="/dashboard">
                  <Button variant="secondary">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              }
            />
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Page Header */}
      <PageHeader
        title={
          isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateProjectName();
                  } else if (e.key === 'Escape') {
                    setEditedName(project.name);
                    setIsEditingName(false);
                  }
                }}
                className="text-2xl font-bold bg-white dark:bg-neutral-800 border border-primary-300 dark:border-primary-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleUpdateProjectName}
                isLoading={updateProjectMutation.isPending}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditedName(project.name);
                  setIsEditingName(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <span
              role="button"
              tabIndex={0}
              className="group cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              onClick={() => setIsEditingName(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsEditingName(true);
                }
              }}
              title="Click to edit project name"
              aria-label={`Edit project name: ${project.name}`}
            >
              {project.name}
              <Edit2 className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" />
            </span>
          )
        }
        description={
          clientQuery.data ? (
            <span>
              Client:{' '}
              <Link
                to={`/clients/${clientQuery.data.id}`}
                className="text-primary-600 hover:text-primary-700"
              >
                {clientQuery.data.name}
              </Link>
            </span>
          ) : project.clientId ? (
            'Loading client...'
          ) : undefined
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending
                ? 'Deleting...'
                : 'Delete Project'}
            </Button>
            <Link to="/dashboard">
              <Button variant="secondary">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {/* Project Status Bar */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Status:
                </span>
                <Badge
                  variant={
                    project.status === 'IN_PROGRESS'
                      ? 'default'
                      : project.status === 'COMPLETED'
                        ? 'success'
                        : project.status === 'ON_HOLD'
                          ? 'warning'
                          : 'secondary'
                  }
                >
                  {formatStatus(project.status)}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Health:
                </span>
                <ProjectStatusPill
                  healthStatus={project.healthStatus}
                  statusSummary={project.statusSummary}
                  statusUpdatedAt={project.statusUpdatedAt}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span>{formatDate(project.startDate)}</span>
                <span>→</span>
                <span>{formatDate(project.endDate)}</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowStatusEditor(!showStatusEditor)}
            >
              <Settings className="w-4 h-4" />
              Update Status
            </Button>
          </div>

          {showStatusEditor && (
            <Card className="mt-4">
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="edit-status"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Project Status
                    </label>
                    <Select
                      id="edit-status"
                      value={editedStatus}
                      onChange={(e) =>
                        setEditedStatus(e.target.value as ProjectStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-start-date"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Start Date
                    </label>
                    <Input
                      id="edit-start-date"
                      type="date"
                      value={editedStartDate}
                      onChange={(e) => setEditedStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-end-date"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Target End Date
                    </label>
                    <Input
                      id="edit-end-date"
                      type="date"
                      value={editedEndDate}
                      onChange={(e) => setEditedEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateProjectStatus}
                    isLoading={updateProjectMutation.isPending}
                    size="sm"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowStatusEditor(false);
                      setEditedStatus(project.status);
                      setEditedStartDate(project.startDate?.slice(0, 10) ?? '');
                      setEditedEndDate(project.endDate?.slice(0, 10) ?? '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <CheckSquare className="w-4 h-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="meetings">
              <Users className="w-4 h-4" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="assets">
              <FolderOpen className="w-4 h-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="marketing">
              <Megaphone className="w-4 h-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="team">
              <UserPlus className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="status">
              <Settings className="w-4 h-4" />
              Status & Reporting
            </TabsTrigger>
            <TabsTrigger value="ml-insights">
              <Brain className="w-4 h-4" />
              ML Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewTab project={project} />
          </TabsContent>

          <TabsContent value="tasks">
            <ProjectTasksTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="meetings">
            <ProjectMeetingsPanel projectId={projectId} />
          </TabsContent>

          <TabsContent value="assets">
            <div className="space-y-6">
              {/* Linked Assets Section */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={<FolderOpen className="h-5 w-5" />}
                    title="Linked Assets"
                    variant="violet"
                  />
                </CardHeader>
                <CardBody>
                  {projectAssetsQuery.isLoading && (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg animate-pulse"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                              <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                              <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                            </div>
                            <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {projectAssets.length === 0 &&
                    !projectAssetsQuery.isLoading && (
                      <EmptyState
                        icon={<FolderX className="h-8 w-8" />}
                        title="No assets linked"
                        description={
                          EMPTY_STATES.noLinkedAssets +
                          ' Link existing assets or create new ones to associate with this project.'
                        }
                      />
                    )}

                  {projectAssets.length > 0 && (
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
                            <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                          {projectAssets.map((entry) => (
                            <tr
                              key={entry.id}
                              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                                    <FolderOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-neutral-900 dark:text-white">
                                      {entry.asset.name}
                                    </div>
                                    {entry.asset.description && (
                                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-md">
                                        {entry.asset.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                  <Badge>{entry.asset.type}</Badge>
                                  {entry.asset.isTemplate && (
                                    <Badge variant="secondary">Template</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleUnlinkAsset(entry.assetId)
                                  }
                                >
                                  Unlink
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Link Existing Asset */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={<FolderOpen className="h-5 w-5" />}
                    title="Link Existing Asset"
                    variant="blue"
                  />
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <label
                      htmlFor="asset-select"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Select Asset
                    </label>
                    <Select
                      id="asset-select"
                      value={selectedAssetId}
                      onChange={(e) => setSelectedAssetId(e.target.value)}
                    >
                      <option value="">Choose an asset...</option>
                      {availableAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} ({asset.type})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor="asset-notes"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Notes (optional)
                    </label>
                    <Input
                      id="asset-notes"
                      value={assetNotes}
                      onChange={(e) => setAssetNotes(e.target.value)}
                      placeholder="Context for this project"
                    />
                  </div>

                  {assetError && (
                    <p className="text-danger-600 text-sm">{assetError}</p>
                  )}

                  <Button
                    onClick={handleLinkAsset}
                    isLoading={linkAssetMutation.isPending}
                  >
                    Link Asset
                  </Button>
                </CardBody>
              </Card>

              {/* Create New Asset */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={<FolderOpen className="h-5 w-5" />}
                    title="Create New Asset"
                    variant="emerald"
                  />
                </CardHeader>
                <CardBody>
                  {!showAssetForm ? (
                    <Button onClick={() => setShowAssetForm(true)}>
                      New Asset
                    </Button>
                  ) : (
                    <AssetForm
                      initialValues={{
                        name: '',
                        type: '',
                        description: '',
                        clientId: project ? String(project.clientId) : '',
                        tags: '',
                        isTemplate: false,
                      }}
                      onSubmit={handleCreateAsset}
                      submitLabel="Create and Link"
                      isSubmitting={
                        createAssetMutation.isPending ||
                        linkAssetMutation.isPending
                      }
                      onCancel={() => setShowAssetForm(false)}
                      clients={clientQuery.data ? [clientQuery.data] : []}
                      disableClientSelection
                    />
                  )}
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <ProjectDocumentsTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="marketing">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <SectionHeader
                      icon={<Megaphone className="h-5 w-5" />}
                      title="Marketing Content"
                      variant="rose"
                    />
                    {(() => {
                      // Prefer accountId (new CRM field) over clientId (deprecated)
                      const effectiveAccountId =
                        project?.accountId ?? project?.clientId;
                      return effectiveAccountId ? (
                        <GenerateFromProjectButton
                          projectId={project.id}
                          projectName={project.name}
                          clientId={effectiveAccountId}
                        />
                      ) : null;
                    })()}
                  </div>
                </CardHeader>
                <CardBody>
                  {projectMarketingContentsQuery.isLoading && (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg animate-pulse"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded" />
                            <div className="flex-1">
                              <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                              <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-700 rounded" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {marketingContents.length === 0 &&
                    !projectMarketingContentsQuery.isLoading && (
                      <EmptyState
                        icon={<Megaphone className="h-8 w-8" />}
                        title="No marketing content yet"
                        description='Click "Generate Marketing Content" to create content from this project.'
                      />
                    )}

                  {marketingContents.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              Content
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                              Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                          {marketingContents.map((content) => (
                            <tr
                              key={content.id}
                              onClick={() =>
                                handleViewMarketingContent(content)
                              }
                              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl flex-shrink-0">
                                    {getContentTypeIcon(content.type)}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                      {content.name}
                                    </div>
                                    {content.summary && (
                                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-md">
                                        {content.summary}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 hidden sm:table-cell">
                                <Badge variant="neutral">
                                  {CONTENT_TYPE_LABELS[content.type]}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 hidden md:table-cell">
                                <Badge variant="secondary">
                                  {CONTENT_STATUS_LABELS[content.status]}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <ActionMenu
                                  onEdit={() =>
                                    handleEditMarketingContent(content)
                                  }
                                  onDelete={() =>
                                    handleArchiveMarketingContent(content.id)
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="space-y-6">
              {/* Visibility Info */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={
                      project.visibility === 'PRIVATE' ? (
                        <Lock className="h-5 w-5" />
                      ) : project.visibility === 'TEAM' ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        <Globe className="h-5 w-5" />
                      )
                    }
                    title="Project Visibility"
                    variant={
                      project.visibility === 'PRIVATE'
                        ? 'neutral'
                        : project.visibility === 'TEAM'
                          ? 'blue'
                          : 'emerald'
                    }
                  />
                </CardHeader>
                <CardBody>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Visibility Level
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                        {project.visibility === 'PRIVATE' && 'Private'}
                        {project.visibility === 'TEAM' && 'Team Members Only'}
                        {project.visibility === 'TENANT' && 'Tenant-wide'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Access Description
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                        {project.visibility === 'PRIVATE' &&
                          'Only the owner and assigned team members can access this project.'}
                        {project.visibility === 'TEAM' &&
                          'Only the owner and assigned team members can access this project.'}
                        {project.visibility === 'TENANT' &&
                          'All users in your organization can view this project.'}
                      </dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>

              {/* Team Members */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={<Users className="h-5 w-5" />}
                    title="Team Members"
                    variant="blue"
                  />
                </CardHeader>
                <CardBody>
                  <ProjectMembersManager
                    projectId={projectId}
                    ownerId={project.ownerId}
                    ownerName={project.owner?.name || 'Unknown'}
                    isAdmin={isAdmin}
                  />
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status">
            <ProjectStatusTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="ml-insights">
            <ProjectMLTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Marketing Content Modals */}
      {showMarketingContentForm && (
        <MarketingContentFormModal
          isOpen={showMarketingContentForm}
          onClose={() => {
            setShowMarketingContentForm(false);
            setEditingMarketingContent(null);
          }}
          editingContent={editingMarketingContent}
          clients={clientQuery.data ? [clientQuery.data] : []}
        />
      )}

      {showMarketingContentDetail && selectedMarketingContent && (
        <MarketingContentDetailModal
          isOpen={showMarketingContentDetail}
          onClose={() => {
            setShowMarketingContentDetail(false);
            setSelectedMarketingContent(null);
          }}
          content={selectedMarketingContent}
          onEdit={handleEditMarketingContent}
          onArchive={handleArchiveMarketingContent}
        />
      )}
    </div>
  );
}

export default ProjectDashboardPage;
