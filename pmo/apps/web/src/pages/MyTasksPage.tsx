/**
 * My Tasks Page
 *
 * Displays a list of tasks assigned to the current user with filtering, status updates, and CRUD operations.
 * Features:
 * - Stats cards with icons and colored accents
 * - Professional table layout with hover states
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 * - Task detail modal
 * - List/Board view toggle
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { Link } from 'react-router';
import {
  LayoutList,
  LayoutGrid,
  ListTodo,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Eye,
  Pencil,
  CheckSquare,
  Trash2,
  Search,
  ClipboardList,
} from 'lucide-react';

import { useProjects } from '../api/queries';
import { useProjectMilestones } from '../api/hooks/milestones';
import { useAuth } from '../auth/AuthContext';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  useMyTasks,
  useUpdateTask,
  useDeleteTask,
  type TaskStatus,
} from '../hooks/tasks';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import {
  formatStatusLabel,
  formatPriorityLabel,
  STATUS_BADGE_VARIANTS,
  PRIORITY_BADGE_VARIANTS,
  type TaskWithProject,
  type TaskPriority,
} from '../api/tasks';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { TaskDetailModal } from '../features/tasks/TaskDetailModal';
import { EMPTY_STATES } from '../utils/typography';

interface Filters {
  projectId: string;
  status: string;
  priority: string;
  search: string;
}

type ViewMode = 'list' | 'board';

function formatDate(value?: string | null): string {
  if (!value) {
    return EMPTY_STATES.noDueDate;
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if a task is overdue (due date in the past and not completed)
 */
function isOverdue(task: TaskWithProject): boolean {
  if (!task.dueDate || task.status === 'DONE') return false;
  const dueDate = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
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
          <div className="w-4 h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
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
// Action Menu Component
// ============================================================================

interface ActionMenuProps {
  onView: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
  isCompleted: boolean;
}

function ActionMenu({
  onView,
  onEdit,
  onComplete,
  onDelete,
  isCompleted,
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
            Edit Task
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onComplete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
            {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
          </button>
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
  onClearFilters: () => void;
}

function EmptyState({
  hasFilters,
  onClearFilters,
}: EmptyStateProps): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <ClipboardList className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching tasks' : 'No tasks yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : EMPTY_STATES.noTasks +
              ' Tasks are created within projects. Visit a project to create your first task.'}
        </p>
        {hasFilters && (
          <Button variant="secondary" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Priority Indicator Component
// ============================================================================

interface PriorityIndicatorProps {
  priority: TaskPriority | null | undefined;
}

const PriorityIndicator = memo(function PriorityIndicator({
  priority,
}: PriorityIndicatorProps): JSX.Element | null {
  if (!priority) return null;

  const colors: Record<TaskPriority, string> = {
    P0: 'bg-red-500',
    P1: 'bg-amber-500',
    P2: 'bg-neutral-400',
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[priority]}`}
      title={`Priority: ${formatPriorityLabel(priority)}`}
    />
  );
});

// ============================================================================
// Main Component
// ============================================================================

function MyTasksPage(): JSX.Element {
  const [filters, setFilters] = useState<Filters>({
    projectId: '',
    status: '',
    priority: '',
    search: '',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const { user } = useAuth();
  const { showToast } = useToast();
  const ownerId = user ? Number(user.id) : undefined;
  const tasksQuery = useMyTasks(ownerId);
  const projectsQuery = useProjects();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Get the selected task to find its project
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasksQuery.data?.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasksQuery.data]);

  // Fetch milestones for the selected task's project
  const milestonesQuery = useProjectMilestones(selectedTask?.projectId);
  const milestones = useMemo(
    () => milestonesQuery.data ?? [],
    [milestonesQuery.data],
  );

  useRedirectOnUnauthorized(tasksQuery.error);
  useRedirectOnUnauthorized(projectsQuery.error);

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  // Only show projects that have tasks assigned to the current user
  const projects = useMemo(() => {
    const allProjects = projectsQuery.data ?? [];
    const projectsWithUserTasks = new Set(tasks.map((task) => task.projectId));
    return allProjects.filter((project) =>
      projectsWithUserTasks.has(project.id),
    );
  }, [projectsQuery.data, tasks]);

  // Create a map of project IDs to names for display
  const _projectMap = useMemo(() => {
    const map: Record<number, string> = {};
    projects.forEach((project) => {
      map[project.id] = project.name;
    });
    return map;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.projectId && Number(filters.projectId) !== task.projectId) {
        return false;
      }

      if (filters.status && task.status !== filters.status) {
        return false;
      }

      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchTerm) ||
          (task.description ?? '').toLowerCase().includes(searchTerm) ||
          (task.projectName ?? '').toLowerCase().includes(searchTerm)
        );
      }

      return true;
    });
  }, [
    filters.priority,
    filters.projectId,
    filters.search,
    filters.status,
    tasks,
  ]);

  // Calculate task statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter((t) => t.status === 'DONE').length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    return { total, inProgress, completed, overdue };
  }, [tasks]);

  const hasFilters = Boolean(
    filters.projectId || filters.status || filters.priority || filters.search,
  );

  const clearFilters = useCallback(() => {
    setFilters({
      projectId: '',
      status: '',
      priority: '',
      search: '',
    });
  }, []);

  const handleToggleDone = useCallback(
    async (task: TaskWithProject) => {
      const newStatus: TaskStatus =
        task.status === 'DONE' ? 'IN_PROGRESS' : 'DONE';
      try {
        await updateTaskMutation.mutateAsync({
          taskId: task.id,
          payload: { status: newStatus },
        });
        showToast(
          `Task "${task.title}" marked as ${newStatus === 'DONE' ? 'done' : 'in progress'}`,
          'success',
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to update task';
        showToast(message, 'error');
      }
    },
    [updateTaskMutation, showToast],
  );

  const handleStatusChange = useCallback(
    async (taskId: number, newStatus: TaskStatus) => {
      try {
        await updateTaskMutation.mutateAsync({
          taskId,
          payload: { status: newStatus },
        });
        showToast(
          `Task status updated to ${formatStatusLabel(newStatus)}`,
          'success',
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to update task status';
        showToast(message, 'error');
      }
    },
    [updateTaskMutation, showToast],
  );

  const handleDeleteTask = useCallback(
    async (task: TaskWithProject) => {
      if (
        !window.confirm(
          `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
        )
      ) {
        return;
      }

      try {
        await deleteTaskMutation.mutateAsync(task.id);
        showToast('Task deleted successfully', 'success');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to delete task';
        showToast(message, 'error');
      }
    },
    [deleteTaskMutation, showToast],
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="My Tasks"
        description="Track and manage tasks across all your projects."
        actions={
          <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              aria-label="List view"
            >
              <LayoutList size={16} />
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'board'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              aria-label="Board view"
            >
              <LayoutGrid size={16} />
              Board
            </button>
          </div>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards */}
        {tasksQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<ListTodo className="h-5 w-5" />}
              label="Total Tasks"
              value={stats.total}
              iconBg="bg-blue-100 dark:bg-blue-900/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="In Progress"
              value={stats.inProgress}
              iconBg="bg-amber-100 dark:bg-amber-900/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Completed"
              value={stats.completed}
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Overdue"
              value={stats.overdue}
              iconBg="bg-red-100 dark:bg-red-900/50"
              iconColor="text-red-600 dark:text-red-400"
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
                placeholder="Search by title, description, or project..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>
            <Select
              value={filters.projectId}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  projectId: e.target.value,
                }))
              }
              className="w-full sm:w-44"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              className="w-full sm:w-36"
            >
              <option value="">All Statuses</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </Select>
            <Select
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  priority: e.target.value,
                }))
              }
              className="w-full sm:w-32"
            >
              <option value="">All Priorities</option>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {formatPriorityLabel(priority)}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        {/* Tasks Section */}
        {tasksQuery.isLoading ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Due Date
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
        ) : tasksQuery.error ? (
          <Card className="p-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/30 mb-4">
                <AlertTriangle className="h-8 w-8 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Unable to load tasks
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Please try refreshing the page or contact support if the problem
                persists.
              </p>
            </div>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
        ) : viewMode === 'list' ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <PriorityIndicator priority={task.priority} />
                          <div className="min-w-0 flex-1">
                            {task.parentTask && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5 flex items-center gap-1">
                                <span className="text-neutral-400 dark:text-neutral-500">
                                  Subtask of:
                                </span>
                                {task.parentTask.title}
                              </p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${
                                  task.status === 'DONE'
                                    ? 'line-through text-neutral-500 dark:text-neutral-400'
                                    : 'text-neutral-900 dark:text-white'
                                }`}
                              >
                                {task.title}
                              </span>
                              <Badge
                                variant={STATUS_BADGE_VARIANTS[task.status]}
                                size="sm"
                              >
                                {formatStatusLabel(task.status)}
                              </Badge>
                              {task.priority && (
                                <Badge
                                  variant={
                                    PRIORITY_BADGE_VARIANTS[task.priority]
                                  }
                                  size="sm"
                                >
                                  {formatPriorityLabel(task.priority)}
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                            {/* Show project on mobile */}
                            {task.projectName && (
                              <div className="sm:hidden text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                {task.projectName}
                              </div>
                            )}
                            {/* Show due date on mobile */}
                            {task.dueDate && (
                              <div
                                className={`md:hidden text-sm mt-1 ${
                                  isOverdue(task)
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-neutral-500 dark:text-neutral-400'
                                }`}
                              >
                                Due: {formatDate(task.dueDate)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-4 py-4 hidden sm:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.projectName ? (
                          <Link
                            to={`/projects/${task.projectId}`}
                            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            {task.projectName}
                          </Link>
                        ) : (
                          <span className="text-sm text-neutral-400 dark:text-neutral-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span
                          className={`text-sm ${
                            isOverdue(task)
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          onView={() => setSelectedTaskId(task.id)}
                          onEdit={() => setSelectedTaskId(task.id)}
                          onComplete={() => handleToggleDone(task)}
                          onDelete={() => handleDeleteTask(task)}
                          isCompleted={task.status === 'DONE'}
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
                  {filteredTasks.length}
                </span>{' '}
                task{filteredTasks.length !== 1 ? 's' : ''}
                {hasFilters && tasks.length !== filteredTasks.length && (
                  <span>
                    {' '}
                    of{' '}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {tasks.length}
                    </span>{' '}
                    total
                  </span>
                )}
              </p>
            </div>
          </Card>
        ) : (
          /* Board View - Kanban */
          <TaskKanbanBoard
            tasks={filteredTasks}
            onTaskMove={handleStatusChange}
            onTaskClick={setSelectedTaskId}
          />
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={selectedTaskId !== null}
        taskId={selectedTaskId}
        projectId={selectedTask?.projectId}
        milestones={milestones}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}

export default MyTasksPage;
