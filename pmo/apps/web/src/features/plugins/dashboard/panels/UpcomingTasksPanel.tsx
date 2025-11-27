/**
 * Upcoming Tasks Panel Plugin
 *
 * Displays a list of upcoming tasks sorted by due date.
 */

import { Link } from 'react-router-dom';
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

function TaskRow({ task, onNavigate }: TaskRowProps): JSX.Element {
  const overdueFlag = isOverdue(task.dueDate);

  return (
    <button
      onClick={() => onNavigate(`/projects/${task.projectId}`)}
      className="w-full text-left p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-neutral-900 truncate group-hover:text-primary-700">
              {task.title}
            </h4>
            {task.priority && (
              <Badge variant={priorityColors[task.priority] ?? 'neutral'}>
                {task.priority}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {task.projectName && <span>{task.projectName}</span>}
            <span>•</span>
            <Badge variant={statusColors[task.status] ?? 'neutral'}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div
            className={`text-sm font-medium ${overdueFlag ? 'text-danger-600' : 'text-neutral-700'}`}
          >
            {formatDate(task.dueDate)}
          </div>
          {overdueFlag && (
            <span className="text-xs text-danger-600 font-medium">Overdue</span>
          )}
        </div>
      </div>
    </button>
  );
}

function TaskListSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

function UpcomingTasksPanelComponent(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const tasksData = data?.tasks;
  const upcomingTasks = tasksData?.upcoming ?? [];
  const isLoading = tasksData?.isLoading ?? false;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Upcoming Tasks</CardTitle>
          <Link
            to="/tasks"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {isLoading ? (
          <TaskListSkeleton />
        ) : upcomingTasks.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-neutral-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-neutral-600 font-medium mb-1">All caught up!</p>
            <p className="text-sm text-neutral-500">
              No upcoming tasks with due dates
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <TaskRow key={task.id} task={task} onNavigate={navigate} />
            ))}
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
