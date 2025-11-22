import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useClients, useProjects } from '../api/queries';
import { useMyTasks } from '../hooks/tasks';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { Card, CardBody, CardTitle } from '../ui/Card';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { TaskWithProject } from '../api/tasks';
import type { Project } from '../api/projects';

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'No due date';
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

function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

interface SummaryCardProps {
  title: string;
  value: number;
  description: string;
  variant?: 'default' | 'primary' | 'warning' | 'danger';
  onClick?: () => void;
  isLoading?: boolean;
}

function SummaryCard({
  title,
  value,
  description,
  variant = 'default',
  onClick,
  isLoading,
}: SummaryCardProps): JSX.Element {
  const variantStyles = {
    default: 'border-neutral-200',
    primary: 'border-primary-200 bg-primary-50/30',
    warning: 'border-warning-200 bg-warning-50/30',
    danger: 'border-danger-200 bg-danger-50/30',
  };

  const valueColors = {
    default: 'text-neutral-900',
    primary: 'text-primary-700',
    warning: 'text-warning-700',
    danger: 'text-danger-700',
  };

  const wrapperProps = onClick
    ? {
        onClick,
        className: `w-full text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${variantStyles[variant]}`,
      }
    : {
        className: variantStyles[variant],
      };

  return (
    <Card {...wrapperProps}>
      <CardBody>
        <div className="flex flex-col gap-2">
          <CardTitle as="h3" className="text-sm font-medium text-neutral-600">
            {title}
          </CardTitle>
          {isLoading ? (
            <div className="h-10 w-20 bg-neutral-200 animate-pulse rounded" />
          ) : (
            <div className={`text-3xl font-bold ${valueColors[variant]}`}>
              {value}
            </div>
          )}
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
      </CardBody>
    </Card>
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

function ProjectListSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-neutral-100 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ownerId = user ? Number(user.id) : undefined;

  const clientsQuery = useClients({ includeArchived: false });
  const projectsQuery = useProjects();
  const tasksQuery = useMyTasks(ownerId);

  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);

  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  // Calculate summary metrics
  const activeClients = useMemo(
    () => clients.filter((c) => !c.archived).length,
    [clients],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'IN_PROGRESS').length,
    [projects],
  );

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'DONE').length,
    [tasks],
  );

  const overdueTasks = useMemo(
    () =>
      tasks.filter((t) => t.status !== 'DONE' && isOverdue(t.dueDate)).length,
    [tasks],
  );

  // Upcoming tasks: non-done tasks with due dates, sorted by due date
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'DONE' && t.dueDate)
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!);
        const dateB = new Date(b.dueDate!);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 7);
  }, [tasks]);

  // Recent projects: sorted by updatedAt, top 5
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [projects]);

  const hasError =
    clientsQuery.error || projectsQuery.error || tasksQuery.error;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome to your AI Consulting PMO workspace. Track your clients, projects, tasks, and AI assets."
      />

      <Section>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Active Clients"
            value={activeClients}
            description="Clients you're working with"
            variant="primary"
            onClick={() => navigate('/clients')}
            isLoading={clientsQuery.isLoading}
          />
          <SummaryCard
            title="Active Projects"
            value={activeProjects}
            description="Projects in progress"
            variant="primary"
            onClick={() => navigate('/clients')}
            isLoading={projectsQuery.isLoading}
          />
          <SummaryCard
            title="My Open Tasks"
            value={openTasks}
            description="Tasks to complete"
            variant="default"
            onClick={() => navigate('/tasks')}
            isLoading={tasksQuery.isLoading}
          />
          <SummaryCard
            title="Overdue Tasks"
            value={overdueTasks}
            description="Tasks past due date"
            variant={overdueTasks > 0 ? 'danger' : 'default'}
            onClick={() => navigate('/tasks')}
            isLoading={tasksQuery.isLoading}
          />
        </div>

        {/* Error State */}
        {hasError && (
          <Card className="mb-8 border-danger-200 bg-danger-50">
            <CardBody>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-danger-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-danger-900 mb-1">
                    Failed to load dashboard data
                  </h3>
                  <p className="text-sm text-danger-700 mb-3">
                    There was a problem loading some of your data. Please try
                    again.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clientsQuery.refetch();
                      projectsQuery.refetch();
                      tasksQuery.refetch();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upcoming Tasks */}
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

              {tasksQuery.isLoading ? (
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
                  <p className="text-neutral-600 font-medium mb-1">
                    All caught up!
                  </p>
                  <p className="text-sm text-neutral-500">
                    No upcoming tasks with due dates
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Right: Recent Projects */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Recent Projects</CardTitle>
                <Link
                  to="/clients"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all →
                </Link>
              </div>

              {projectsQuery.isLoading ? (
                <ProjectListSkeleton />
              ) : recentProjects.length === 0 ? (
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
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-neutral-600 font-medium mb-1">
                    No projects yet
                  </p>
                  <p className="text-sm text-neutral-500 mb-4">
                    Create your first project to get started
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/projects/new')}
                  >
                    New Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <ProjectRow key={project.id} project={project} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </Section>
    </>
  );
}

interface TaskRowProps {
  task: TaskWithProject;
}

function TaskRow({ task }: TaskRowProps): JSX.Element {
  const navigate = useNavigate();
  const overdueFlag = isOverdue(task.dueDate);

  const statusColors: Record<string, string> = {
    BACKLOG: 'neutral',
    IN_PROGRESS: 'primary',
    BLOCKED: 'warning',
    DONE: 'success',
  };

  const priorityColors: Record<string, string> = {
    P0: 'danger',
    P1: 'warning',
    P2: 'neutral',
  };

  return (
    <button
      onClick={() => navigate(`/projects/${task.projectId}`)}
      className="w-full text-left p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-neutral-900 truncate group-hover:text-primary-700">
              {task.title}
            </h4>
            {task.priority && (
              <Badge
                variant={
                  priorityColors[task.priority] as
                    | 'danger'
                    | 'warning'
                    | 'neutral'
                }
              >
                {task.priority}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {task.projectName && <span>{task.projectName}</span>}
            <span>•</span>
            <Badge variant={statusColors[task.status] as BadgeVariant}>
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

interface ProjectRowProps {
  project: Project;
}

function ProjectRow({ project }: ProjectRowProps): JSX.Element {
  const navigate = useNavigate();

  const statusColors: Record<string, string> = {
    PLANNING: 'neutral',
    IN_PROGRESS: 'primary',
    ON_HOLD: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };

  const healthColors: Record<string, string> = {
    ON_TRACK: 'success',
    AT_RISK: 'warning',
    OFF_TRACK: 'danger',
  };

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="w-full text-left p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-medium text-neutral-900 group-hover:text-primary-700">
          {project.name}
        </h4>
        {project.healthStatus && (
          <Badge variant={healthColors[project.healthStatus] as BadgeVariant}>
            {project.healthStatus.replace('_', ' ')}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusColors[project.status] as BadgeVariant}>
          {project.status.replace('_', ' ')}
        </Badge>
        {project.statusSummary && (
          <>
            <span className="text-neutral-400">•</span>
            <span className="text-xs text-neutral-600 line-clamp-1">
              {project.statusSummary}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

export default DashboardPage;
