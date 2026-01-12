/**
 * Upcoming Tasks Panel Plugin
 *
 * Displays a list of upcoming tasks sorted by due date.
 * Updated to match ContactsPage UI patterns with table layout.
 */

import { Link } from 'react-router';
import { Clock, CheckCircle2, ListTodo, Calendar } from 'lucide-react';
import { Card, CardBody, CardTitle } from '../../../../ui/Card';
import { Badge, type BadgeVariant } from '../../../../ui/Badge';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';
import { EMPTY_STATES } from '../../../../utils/typography';

/**
 * Format a date string for display
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return EMPTY_STATES.noDueDate;
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Check if a date is overdue
 */
function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

interface TaskItem {
  id: number;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string;
  projectId: number;
  projectName?: string;
}

interface TaskRowProps {
  task: TaskItem;
  onNavigate: (path: string) => void;
}

const statusColors: Record<string, BadgeVariant> = {
  BACKLOG: 'neutral',
  IN_PROGRESS: 'primary',
  BLOCKED: 'warning',
  DONE: 'success',
};

const priorityColors: Record<string, BadgeVariant> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'neutral',
};

const priorityLabels: Record<string, string> = {
  P0: 'High',
  P1: 'Medium',
  P2: 'Low',
};

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Task row with table-style layout matching ContactsPage patterns
 */
function TaskRow({ task, onNavigate }: TaskRowProps): JSX.Element {
  const overdueFlag = isOverdue(task.dueDate);

  return (
    <tr
      onClick={() => onNavigate(`/projects/${task.projectId}`)}
      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group border-b border-neutral-200 dark:border-neutral-700 last:border-b-0"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50">
            <ListTodo className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
              {task.title}
            </div>
            {task.projectName && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {task.projectName}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[task.status] ?? 'neutral'} size="sm">
            {formatStatus(task.status)}
          </Badge>
          {task.priority && (
            <Badge
              variant={priorityColors[task.priority] ?? 'neutral'}
              size="sm"
            >
              {priorityLabels[task.priority] ?? task.priority}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <div
            className={`text-sm font-medium flex items-center gap-1 ${
              overdueFlag
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(task.dueDate)}
          </div>
          {overdueFlag && (
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Overdue
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Skeleton loader for task table rows
 */
function TaskRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1.5" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" />
      </td>
    </tr>
  );
}

function TaskListSkeleton(): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Task
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
              Status
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Due
            </th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TaskRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Empty state component matching ContactsPage pattern
 */
function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 mb-4">
        <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        All caught up!
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No upcoming tasks with due dates
      </p>
    </div>
  );
}

function UpcomingTasksPanelComponent(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const tasksData = data?.tasks;
  const upcomingTasks = tasksData?.upcoming ?? [];
  const isLoading = tasksData?.isLoading ?? false;

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
          </div>
          <Link
            to="/tasks"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            View all
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <TaskListSkeleton />
          ) : upcomingTasks.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Due
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onNavigate={navigate} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with count */}
        {!isLoading && upcomingTasks.length > 0 && (
          <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Showing{' '}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {upcomingTasks.length}
              </span>{' '}
              task{upcomingTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

const config: DashboardPanelConfig = {
  id: 'upcoming-tasks-panel',
  name: 'Upcoming Tasks',
  description: 'Displays a list of upcoming tasks sorted by due date',
  position: 'main-left',
  priority: 10,
  defaultEnabled: true,
};

export const UpcomingTasksPanelPlugin: DashboardPanelPlugin = {
  config,
  component: UpcomingTasksPanelComponent,
};
