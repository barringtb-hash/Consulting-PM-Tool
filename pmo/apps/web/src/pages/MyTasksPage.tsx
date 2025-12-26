import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { LayoutList, LayoutGrid } from 'lucide-react';

import { useProjects } from '../api/queries';
import { useMilestones } from '../api/hooks/milestones';
import { useAuth } from '../auth/AuthContext';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  useMyTasks,
  useUpdateTask,
  type TaskPriority,
  type TaskStatus,
} from '../hooks/tasks';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import type { TaskWithProject } from '../api/tasks';
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

function getStatusBadgeVariant(status: TaskStatus): BadgeVariant {
  switch (status) {
    case 'DONE':
      return 'success';
    case 'IN_PROGRESS':
      return 'primary';
    case 'BLOCKED':
      return 'danger';
    case 'BACKLOG':
    default:
      return 'neutral';
  }
}

function getPriorityBadgeVariant(priority?: TaskPriority | null): BadgeVariant {
  if (!priority) return 'neutral';
  switch (priority) {
    case 'P0':
      return 'danger';
    case 'P1':
      return 'warning';
    case 'P2':
    default:
      return 'neutral';
  }
}

function formatStatusLabel(status: TaskStatus): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

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

  // Get the selected task to find its project
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasksQuery.data?.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasksQuery.data]);

  // Fetch milestones for the selected task's project
  const milestonesQuery = useMilestones(selectedTask?.projectId);
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
          (task.description ?? '').toLowerCase().includes(searchTerm)
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

  const activeFilterCount = [
    filters.projectId,
    filters.status,
    filters.priority,
    filters.search,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      projectId: '',
      status: '',
      priority: '',
      search: '',
    });
  };

  const handleToggleDone = async (task: TaskWithProject) => {
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
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
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
        error instanceof Error ? error.message : 'Unable to update task status';
      showToast(message, 'error');
    }
  };

  const selectedProject = projects.find(
    (p) => p.id === Number(filters.projectId),
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

      <main className="container-padding py-6 space-y-6">
        {/* Filter Section */}
        <section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Filters
            </h2>
            {activeFilterCount > 0 && (
              <Button variant="subtle" size="sm" onClick={clearFilters}>
                Clear filters ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Project"
              value={filters.projectId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  projectId: event.target.value,
                }))
              }
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
            >
              <option value="">All statuses</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </Select>

            <Select
              label="Priority"
              value={filters.priority}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  priority: event.target.value,
                }))
              }
            >
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>

            <Input
              label="Search"
              type="search"
              placeholder="Title or description"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Active filters:
              </span>
              {filters.projectId && selectedProject && (
                <Badge variant="primary">Project: {selectedProject.name}</Badge>
              )}
              {filters.status && (
                <Badge variant="primary">
                  Status: {formatStatusLabel(filters.status as TaskStatus)}
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="primary">Priority: {filters.priority}</Badge>
              )}
              {filters.search && (
                <Badge variant="primary">
                  Search: &quot;{filters.search}&quot;
                </Badge>
              )}
            </div>
          )}
        </section>

        {/* Tasks Section */}
        <section
          className={
            viewMode === 'board'
              ? ''
              : 'bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm'
          }
        >
          {viewMode === 'list' && (
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Tasks
                {filteredTasks.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-neutral-600 dark:text-neutral-400">
                    ({filteredTasks.length}{' '}
                    {filteredTasks.length === 1 ? 'task' : 'tasks'})
                  </span>
                )}
              </h2>
            </div>
          )}

          {/* Loading State */}
          {tasksQuery.isLoading && viewMode === 'list' && (
            <div className="px-6 py-4">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-neutral-100 dark:bg-neutral-700 animate-pulse rounded"
                  />
                ))}
              </div>
            </div>
          )}
          {tasksQuery.isLoading && viewMode === 'board' && (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((col) => (
                  <div key={col} className="space-y-3">
                    <div className="h-8 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded" />
                    {[1, 2, 3].map((card) => (
                      <div
                        key={card}
                        className="h-24 bg-neutral-100 dark:bg-neutral-700 animate-pulse rounded"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {tasksQuery.error && (
            <div className="px-6 py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger-100 mb-4">
                  <svg
                    className="w-6 h-6 text-danger-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-danger-600 font-medium" role="alert">
                  Unable to load tasks
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                  Please try refreshing the page or contact support if the
                  problem persists.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!tasksQuery.isLoading &&
            !tasksQuery.error &&
            filteredTasks.length === 0 && (
              <div className="px-6 py-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-700 mb-4">
                    <svg
                      className="w-6 h-6 text-neutral-400 dark:text-neutral-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  {activeFilterCount > 0 ? (
                    <>
                      <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                        No tasks match your filters
                      </p>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                        Try adjusting or clearing your filters to see more
                        tasks.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                        {EMPTY_STATES.noTasks}
                      </p>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                        Tasks are created within projects. Visit a project to
                        create your first task.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

          {/* List View - Tasks Table */}
          {viewMode === 'list' &&
            !tasksQuery.isLoading &&
            !tasksQuery.error &&
            filteredTasks.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider w-8">
                        Done
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {filteredTasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <td
                          className="px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={task.status === 'DONE'}
                            onChange={() => handleToggleDone(task)}
                            aria-label={`Mark task "${task.title}" as ${task.status === 'DONE' ? 'not done' : 'done'}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-md">
                            <p
                              className={`text-sm font-medium ${
                                task.status === 'DONE'
                                  ? 'line-through text-neutral-500 dark:text-neutral-400'
                                  : 'text-neutral-900 dark:text-neutral-100'
                              }`}
                              title={task.title}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p
                                className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2"
                                title={task.description}
                              >
                                {task.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.projectName && (
                            <Link
                              to={`/projects/${task.projectId}`}
                              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              {task.projectName}
                            </Link>
                          )}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(task.status)}>
                              {formatStatusLabel(task.status)}
                            </Badge>
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  task.id,
                                  e.target.value as TaskStatus,
                                )
                              }
                              className="text-xs border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600"
                              aria-label={`Change status for task "${task.title}"`}
                            >
                              {TASK_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {formatStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={getPriorityBadgeVariant(task.priority)}
                          >
                            {task.priority ?? 'None'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDate(task.dueDate)}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-right text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            to={`/projects/${task.projectId}`}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View Project
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* Board View - Kanban */}
          {viewMode === 'board' &&
            !tasksQuery.isLoading &&
            !tasksQuery.error &&
            filteredTasks.length > 0 && (
              <TaskKanbanBoard
                tasks={filteredTasks}
                onTaskMove={handleStatusChange}
                onTaskClick={setSelectedTaskId}
              />
            )}
        </section>
      </main>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={selectedTaskId !== null}
        taskId={selectedTaskId}
        projectId={selectedTask?.projectId ?? 0}
        milestones={milestones}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}

export default MyTasksPage;
