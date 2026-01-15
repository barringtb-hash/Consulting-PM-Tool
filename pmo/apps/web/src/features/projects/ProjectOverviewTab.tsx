import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Calendar,
  User,
  TrendingUp,
  CheckSquare,
  Target,
  Clock,
  AlertTriangle,
  Flag,
  MessageSquare,
  ListTodo,
  Brain,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import { useClient, useProjectStatus } from '../../api/queries';
import { type Project } from '../../api/projects';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { ProjectStatusPill } from '../../components/ProjectStatusPill';
import { Badge } from '../../ui/Badge';
import { EMPTY_STATES, formatStatus } from '../../utils/typography';
import {
  useSuccessPrediction,
  useRiskForecast,
  useTimelinePrediction,
  useResourceOptimization,
  useMLStatus,
} from '../../hooks/useProjectML';

interface ProjectOverviewTabProps {
  project: Project;
}

// Style configuration for stat card variants - matches the main page patterns
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

// Stat card component with icon
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: StatStyleVariant;
  subtext?: string;
}

function StatCard({
  icon,
  label,
  value,
  variant = 'neutral',
  subtext,
}: StatCardProps): JSX.Element {
  const styles = STAT_STYLES[variant];

  return (
    <Card className="p-4">
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
          {subtext && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {subtext}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
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

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-3">
        <div className="text-neutral-400 dark:text-neutral-500">{icon}</div>
      </div>
      <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
        {title}
      </h4>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
        {description}
      </p>
    </div>
  );
}

// ============================================================================
// ML Insights Components
// ============================================================================

interface MLStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status: 'good' | 'warning' | 'critical' | 'neutral';
  icon: React.ReactNode;
  isLoading?: boolean;
}

/**
 * ML Stat Card - Displays a single ML metric with status-based styling
 */
function MLStatCard({
  title,
  value,
  subtitle,
  status,
  icon,
  isLoading,
}: MLStatCardProps): JSX.Element {
  const statusColors = {
    good: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
    warning:
      'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
    critical:
      'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10',
    neutral:
      'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10',
  };

  if (isLoading) {
    return (
      <div className="animate-pulse h-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}

interface MLInsightsSectionProps {
  projectId: number;
}

/**
 * ML Insights Section - Collapsible section displaying AI-powered project metrics
 *
 * Shows success likelihood, risk level, timeline prediction, and workload balance
 * using data from ML prediction hooks.
 */
function MLInsightsSection({ projectId }: MLInsightsSectionProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch ML status to check if ML is available
  const { data: mlStatus, isLoading: statusLoading } = useMLStatus();

  // Fetch ML predictions
  const { data: successData, isLoading: successLoading } =
    useSuccessPrediction(projectId);
  const { data: riskData, isLoading: riskLoading } = useRiskForecast(projectId);
  const { data: timelineData, isLoading: timelineLoading } =
    useTimelinePrediction(projectId);
  const { data: resourceData, isLoading: resourceLoading } =
    useResourceOptimization(projectId);

  const isLoading =
    statusLoading ||
    successLoading ||
    riskLoading ||
    timelineLoading ||
    resourceLoading;

  // If ML is not available, show a minimal message
  if (!statusLoading && !mlStatus?.available) {
    return (
      <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              AI Insights
            </span>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            ML features require configuration. Contact your administrator to
            enable AI-powered insights.
          </p>
        </CardBody>
      </Card>
    );
  }

  // Compute display values from the data
  // Use nullish coalescing (??) to handle undefined/null values and avoid NaN
  const successProbability =
    successData?.overallSuccessProbability ?? successData?.probability ?? null;

  const successPercent =
    successProbability != null ? Math.round(successProbability * 100) : null;

  const riskLevel = riskData?.overallRiskLevel?.toUpperCase() || null;

  // Handle undefined daysVariance by defaulting to null for the whole expression
  const timelineVariance = timelineData?.daysVariance;
  const timelineStatus =
    timelineData && timelineVariance !== undefined
      ? timelineVariance === 0
        ? 'On Track'
        : timelineVariance < 0
          ? `${Math.abs(timelineVariance)}d early`
          : `${timelineVariance}d late`
      : null;

  const workloadScore =
    resourceData?.workloadBalance?.interpretation?.toUpperCase() || null;

  /**
   * Determine status color based on success percentage
   */
  const getSuccessStatus = (
    percent: number | null,
  ): 'good' | 'warning' | 'critical' | 'neutral' => {
    if (percent === null) return 'neutral';
    if (percent >= 70) return 'good';
    if (percent >= 50) return 'warning';
    return 'critical';
  };

  /**
   * Determine status color based on risk level
   */
  const getRiskStatus = (
    level: string | null,
  ): 'good' | 'warning' | 'critical' | 'neutral' => {
    if (level === null) return 'neutral';
    if (level === 'LOW') return 'good';
    if (level === 'MEDIUM') return 'warning';
    return 'critical';
  };

  /**
   * Determine status color based on timeline variance
   */
  const getTimelineStatus = (
    data: typeof timelineData,
  ): 'good' | 'warning' | 'critical' | 'neutral' => {
    if (!data || data.daysVariance === undefined) return 'neutral';
    if (data.daysVariance <= 0) return 'good';
    if (data.daysVariance <= 7) return 'warning';
    return 'critical';
  };

  /**
   * Determine status color based on workload score
   */
  const getWorkloadStatus = (
    score: string | null,
  ): 'good' | 'warning' | 'critical' | 'neutral' => {
    if (score === null) return 'neutral';
    if (score === 'EXCELLENT' || score === 'GOOD') return 'good';
    if (score === 'FAIR') return 'warning';
    return 'critical';
  };

  return (
    <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              AI Insights
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-neutral-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-500" />
          )}
        </button>
      </CardHeader>
      {isExpanded && (
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MLStatCard
              title="Success"
              value={successPercent !== null ? `${successPercent}%` : '-'}
              subtitle="Likelihood"
              status={getSuccessStatus(successPercent)}
              icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
              isLoading={isLoading}
            />
            <MLStatCard
              title="Risk"
              value={riskLevel || '-'}
              subtitle="Level"
              status={getRiskStatus(riskLevel)}
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              isLoading={isLoading}
            />
            <MLStatCard
              title="Timeline"
              value={timelineStatus || '-'}
              subtitle="Prediction"
              status={getTimelineStatus(timelineData)}
              icon={<Clock className="h-4 w-4 text-blue-500" />}
              isLoading={isLoading}
            />
            <MLStatCard
              title="Workload"
              value={workloadScore || '-'}
              subtitle="Balance"
              status={getWorkloadStatus(workloadScore)}
              icon={<Users className="h-4 w-4 text-violet-500" />}
              isLoading={isLoading}
            />
          </div>
        </CardBody>
      )}
    </Card>
  );
}

// Skeleton loader for info section
function InfoSectionSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
              <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// Skeleton loader for content cards
function ContentCardSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
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

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const clientQuery = useClient(project.clientId);
  const statusQuery = useProjectStatus(project.id);

  const statusData = statusQuery.data;

  const totalTasks = useMemo(() => {
    if (!statusData?.taskCounts) return 0;
    return Object.values(statusData.taskCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
  }, [statusData]);

  const completedTasks = useMemo(() => {
    return statusData?.taskCounts?.DONE ?? 0;
  }, [statusData]);

  const completionPercentage = useMemo(() => {
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  }, [completedTasks, totalTasks]);

  const inProgressTasks = useMemo(() => {
    return statusData?.taskCounts?.IN_PROGRESS ?? 0;
  }, [statusData]);

  const blockedTasks = useMemo(() => {
    return statusData?.taskCounts?.BLOCKED ?? 0;
  }, [statusData]);

  // Show skeleton loading state
  if (statusQuery.isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Info section skeleton */}
        <InfoSectionSkeleton />

        {/* Content cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ContentCardSkeleton />
          <ContentCardSkeleton />
          <ContentCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckSquare className="h-5 w-5" />}
          label="Total Tasks"
          value={totalTasks}
          variant="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Progress"
          value={`${completionPercentage}%`}
          variant="emerald"
          subtext={`${completedTasks} of ${totalTasks} done`}
        />
        <StatCard
          icon={<ListTodo className="h-5 w-5" />}
          label="In Progress"
          value={inProgressTasks}
          variant="violet"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Blocked"
          value={blockedTasks}
          variant={blockedTasks > 0 ? 'rose' : 'neutral'}
        />
      </div>

      {/* AI/ML Insights Section */}
      <MLInsightsSection projectId={project.id} />

      {/* Overdue Tasks Alert */}
      {statusData && statusData.overdueTasks.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20">
          <CardHeader>
            <SectionHeader
              icon={<AlertTriangle className="h-5 w-5" />}
              title={`Overdue Tasks (${statusData.overdueTasks.length})`}
              variant="rose"
            />
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-rose-100/50 dark:bg-rose-900/30 border-b border-rose-200 dark:border-rose-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider hidden sm:table-cell">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-200 dark:divide-rose-800">
                  {statusData.overdueTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50">
                            <Clock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          </div>
                          <span className="font-medium text-rose-900 dark:text-rose-200">
                            {task.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-rose-700 dark:text-rose-300">
                          Was due: {formatDate(task.dueDate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Project Information Card */}
      <Card>
        <CardHeader>
          <SectionHeader
            icon={<User className="h-5 w-5" />}
            title="Project Information"
            variant="blue"
          />
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                Client
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {clientQuery.isLoading && 'Loading...'}
                {clientQuery.data && (
                  <Link
                    to={`/clients/${clientQuery.data.id}`}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {clientQuery.data.name}
                  </Link>
                )}
                {clientQuery.error && 'Unable to load'}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                Status
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
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
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                Health
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                <ProjectStatusPill
                  healthStatus={project.healthStatus}
                  statusSummary={project.statusSummary}
                  statusUpdatedAt={project.statusUpdatedAt}
                />
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                Start Date
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatDate(project.startDate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                Target End Date
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatDate(project.endDate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                Created
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatDate(project.createdAt)}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {/* Status Snapshot */}
      {statusQuery.error && (
        <Card className="border-rose-200 dark:border-rose-800">
          <CardBody>
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title="Unable to load project status"
              description="There was a problem loading the project status data. Please try again later."
            />
          </CardBody>
        </Card>
      )}

      {statusData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Task Progress Card */}
          <Card>
            <CardHeader>
              <SectionHeader
                icon={<TrendingUp className="h-5 w-5" />}
                title="Task Progress"
                variant="emerald"
              />
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Completion
                    </span>
                    <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                {Object.keys(statusData.taskCounts).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {Object.entries(statusData.taskCounts).map(
                      ([status, count]) => (
                        <div key={status} className="text-center">
                          <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                            {count}
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            {formatStatus(status)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CheckSquare className="h-5 w-5" />}
                    title="No tasks yet"
                    description="Create tasks to track progress"
                  />
                )}
              </div>
            </CardBody>
          </Card>

          {/* Current Milestone Card */}
          <Card>
            <CardHeader>
              <SectionHeader
                icon={<Target className="h-5 w-5" />}
                title="Current Milestone"
                variant="violet"
              />
            </CardHeader>
            <CardBody>
              {statusData.currentMilestone ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex-shrink-0">
                      <Flag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {statusData.currentMilestone.name}
                      </h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Due: {formatDate(statusData.currentMilestone.dueDate)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      statusData.currentMilestone.status === 'IN_PROGRESS'
                        ? 'default'
                        : statusData.currentMilestone.status === 'DONE'
                          ? 'success'
                          : 'secondary'
                    }
                  >
                    {formatStatus(statusData.currentMilestone.status)}
                  </Badge>
                </div>
              ) : (
                <EmptyState
                  icon={<Target className="h-5 w-5" />}
                  title="No active milestone"
                  description={EMPTY_STATES.noActiveMilestone}
                />
              )}
            </CardBody>
          </Card>

          {/* Upcoming Deadlines Card */}
          <Card>
            <CardHeader>
              <SectionHeader
                icon={<Clock className="h-5 w-5" />}
                title="Upcoming Deadlines"
                variant="amber"
              />
            </CardHeader>
            <CardBody>
              {statusData.upcomingTasks.length > 0 ? (
                <div className="space-y-3">
                  {statusData.upcomingTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex-shrink-0">
                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          {formatDate(task.dueDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Clock className="h-5 w-5" />}
                  title="No upcoming deadlines"
                  description={EMPTY_STATES.noUpcomingTasks}
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Recent Risks and Decisions */}
      {statusData &&
        (statusData.recentRisks.length > 0 ||
          statusData.recentDecisions.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statusData.recentRisks.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <SectionHeader
                    icon={<AlertTriangle className="h-5 w-5" />}
                    title="Recent Risks"
                    variant="amber"
                  />
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {statusData.recentRisks.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex-shrink-0">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-neutral-900 dark:text-neutral-100">
                            {risk.snippet}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                            From meeting on {formatDate(risk.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {statusData.recentDecisions.length > 0 && (
              <Card className="border-violet-200 dark:border-violet-800">
                <CardHeader>
                  <SectionHeader
                    icon={<MessageSquare className="h-5 w-5" />}
                    title="Recent Decisions"
                    variant="violet"
                  />
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {statusData.recentDecisions.map((decision, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex-shrink-0">
                          <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-neutral-900 dark:text-neutral-100">
                            {decision.snippet}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                            From meeting on {formatDate(decision.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
    </div>
  );
}
