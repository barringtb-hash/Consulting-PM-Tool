/**
 * Projects Page
 *
 * Displays a list of projects with filtering and CRUD operations.
 * Features:
 * - Stats cards with icons and colored accents
 * - Professional table layout with hover states
 * - Initials-based colored avatars
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  FolderKanban,
  Clock,
  CheckCircle,
  AlertTriangle,
  MoreVertical,
  Eye,
  Pencil,
  Archive,
  Trash2,
  FolderX,
} from 'lucide-react';

import { ProjectStatus, updateProject } from '../api/projects';
import { useProjects, useDeleteProject } from '../api/queries';
import { useAccounts } from '../api/hooks/crm';
import { queryClient } from '../api/queries';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { Badge, BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { EMPTY_STATES } from '../utils/typography';

interface Filters {
  search: string;
  status: ProjectStatus | '';
  clientId: number | '';
}

// Avatar color palette based on name - consistent 8-color palette
const AVATAR_COLORS = [
  {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-900/50',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-900/50',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-900/50',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    text: 'text-orange-700 dark:text-orange-300',
  },
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
];

function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function formatStatus(status: ProjectStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  // Extract YYYY-MM-DD from ISO string to avoid timezone issues
  const datePart = dateString.split('T')[0];
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return '-';
  const [year, month, day] = datePart.split('-').map(Number);
  // Create date in local timezone
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusVariant(status: ProjectStatus): BadgeVariant {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'primary';
    case 'ON_HOLD':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    case 'PLANNING':
    default:
      return 'neutral';
  }
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

// Skeleton loader for table rows
function TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
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

// Stats card component with icon
interface StatCardProps {
  icon: ReactNode;
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

// Project avatar component
interface ProjectAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function ProjectAvatar({ name, size = 'md' }: ProjectAvatarProps): JSX.Element {
  const initials = getInitials(name);
  const colors = getAvatarColor(name);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${colors.bg} ${colors.text}`}
    >
      {initials}
    </div>
  );
}

// Dropdown action menu component
interface ActionMenuProps {
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchived?: boolean;
  isDeleting?: boolean;
}

function ActionMenu({
  onView,
  onEdit,
  onArchive,
  onDelete,
  isArchived,
  isDeleting,
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
            View
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
              onArchive();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <Archive className="h-4 w-4" />
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            disabled={isDeleting}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({
  hasFilters,
  onAddProject,
}: {
  hasFilters: boolean;
  onAddProject: () => void;
}): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <FolderX className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching projects' : 'No projects yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : EMPTY_STATES.noProjects +
              ' Get started by creating your first project.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddProject}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
        )}
      </div>
    </Card>
  );
}

function ProjectsPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    clientId: '',
  });

  const deleteProjectMutation = useDeleteProject();

  const filterParams = useMemo(
    () => ({
      status: filters.status || undefined,
      clientId: filters.clientId || undefined,
    }),
    [filters.status, filters.clientId],
  );

  const projectsQuery = useProjects(filterParams);
  const accountsQuery = useAccounts();

  useRedirectOnUnauthorized(projectsQuery.error);
  useRedirectOnUnauthorized(accountsQuery.error);

  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );
  const accounts = useMemo(
    () => accountsQuery.data?.data ?? [],
    [accountsQuery.data?.data],
  );

  // Create a map of client IDs to names for display
  const clientMap = useMemo(() => {
    const map: Record<number, string> = {};
    accounts.forEach((account) => {
      map[account.id] = account.name;
    });
    return map;
  }, [accounts]);

  // Apply search filter client-side
  const filteredProjects = useMemo(() => {
    if (!filters.search) {
      return projects;
    }
    const searchLower = filters.search.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchLower) ||
        clientMap[project.clientId ?? 0]?.toLowerCase().includes(searchLower),
    );
  }, [projects, filters.search, clientMap]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(
      (p) => p.status === 'IN_PROGRESS',
    ).length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    const atRisk = projects.filter(
      (p) => p.status === 'ON_HOLD' || p.status === 'CANCELLED',
    ).length;
    return { total, inProgress, completed, atRisk };
  }, [projects]);

  const hasFilters = Boolean(
    filters.search || filters.status || filters.clientId,
  );

  const handleProjectClick = useCallback(
    (projectId: number) => {
      navigate(`/projects/${projectId}`);
    },
    [navigate],
  );

  const handleViewProject = useCallback(
    (projectId: number) => {
      navigate(`/projects/${projectId}`);
    },
    [navigate],
  );

  const handleEditProject = useCallback(
    (projectId: number) => {
      navigate(`/projects/${projectId}/edit`);
    },
    [navigate],
  );

  const handleArchiveProject = useCallback(
    async (projectId: number, currentStatus: ProjectStatus) => {
      // Archive = set to CANCELLED, Unarchive = set back to PLANNING
      const newStatus: ProjectStatus =
        currentStatus === 'CANCELLED' ? 'PLANNING' : 'CANCELLED';
      const action = currentStatus === 'CANCELLED' ? 'unarchived' : 'archived';

      try {
        await updateProject(projectId, { status: newStatus });
        // Invalidate queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        showToast(`Project ${action} successfully`, 'success');
      } catch {
        showToast(`Failed to ${action.slice(0, -1)} project`, 'error');
      }
    },
    [showToast],
  );

  const handleDeleteProject = useCallback(
    async (projectId: number, projectName: string) => {
      if (
        !window.confirm(
          `Are you sure you want to delete "${projectName}"? This will also delete all associated tasks, milestones, and meetings. This action cannot be undone.`,
        )
      ) {
        return;
      }

      try {
        await deleteProjectMutation.mutateAsync(projectId);
        showToast('Project deleted successfully', 'success');
      } catch {
        showToast('Failed to delete project', 'error');
      }
    },
    [deleteProjectMutation, showToast],
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Projects"
        description="Manage your projects and track progress across all client engagements."
        action={
          <Button onClick={() => navigate('/projects/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards */}
        {projectsQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<FolderKanban className="h-5 w-5" />}
              label="Total Projects"
              value={stats.total}
              iconBg="bg-blue-100 dark:bg-blue-900/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="In Progress"
              value={stats.inProgress}
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<CheckCircle className="h-5 w-5" />}
              label="Completed"
              value={stats.completed}
              iconBg="bg-violet-100 dark:bg-violet-900/50"
              iconColor="text-violet-600 dark:text-violet-400"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="At Risk"
              value={stats.atRisk}
              iconBg="bg-amber-100 dark:bg-amber-900/50"
              iconColor="text-amber-600 dark:text-amber-400"
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
                placeholder="Search by name or account..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as ProjectStatus | '',
                }))
              }
              className="w-full sm:w-40"
            >
              <option value="">All Statuses</option>
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
            <Select
              value={filters.clientId}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  clientId: e.target.value ? Number(e.target.value) : '',
                }))
              }
              className="w-full sm:w-44"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        {/* Projects Table */}
        {projectsQuery.isLoading ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      End Date
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
        ) : projectsQuery.error ? (
          <Card className="p-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/30 mb-4">
                <AlertTriangle className="h-8 w-8 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Unable to load projects
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Please try refreshing the page or contact support if the problem
                persists.
              </p>
              <Button
                variant="secondary"
                onClick={() => projectsQuery.refetch()}
              >
                Try Again
              </Button>
            </div>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onAddProject={() => navigate('/projects/new')}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      End Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      data-testid={`project-row-${project.id}`}
                      onClick={() => handleProjectClick(project.id)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <ProjectAvatar name={project.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                data-testid={`project-name-${project.id}`}
                                className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                              >
                                {project.name}
                              </span>
                              <Badge
                                variant={getStatusVariant(project.status)}
                                size="sm"
                              >
                                {formatStatus(project.status)}
                              </Badge>
                            </div>
                            {/* Show client name on mobile */}
                            <div className="sm:hidden text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                              {clientMap[project.clientId ?? 0] || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {clientMap[project.clientId ?? 0] || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {formatDate(project.endDate)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          onView={() => handleViewProject(project.id)}
                          onEdit={() => handleEditProject(project.id)}
                          onArchive={() =>
                            handleArchiveProject(project.id, project.status)
                          }
                          onDelete={() =>
                            handleDeleteProject(project.id, project.name)
                          }
                          isArchived={project.status === 'CANCELLED'}
                          isDeleting={deleteProjectMutation.isPending}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results count footer */}
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing{' '}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {filteredProjects.length}
                </span>{' '}
                project{filteredProjects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
