import React, { useState } from 'react';
import {
  Settings,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Clock,
  Target,
  MessageSquare,
  FileText,
  Download,
} from 'lucide-react';

import {
  useGenerateStatusSummary,
  useProjectStatus,
  useUpdateProjectHealthStatus,
} from '../../api/queries';
import type { ProjectHealthStatus } from '../../api/projects';
import { copyToClipboard } from '../../utils/clipboard';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { formatStatus } from '../../utils/typography';

interface ProjectStatusTabProps {
  projectId: number;
}

// Style configuration for consistent theming
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

// Stat card component with icon
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: StatStyleVariant;
}

function StatCard({
  icon,
  label,
  value,
  variant = 'neutral',
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
        </div>
      </div>
    </Card>
  );
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

// Content section skeleton
function ContentSectionSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

const healthStatusOptions: Array<{
  value: ProjectHealthStatus;
  label: string;
}> = [
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'OFF_TRACK', label: 'Off Track' },
];

const _healthStatusVariants: Record<ProjectHealthStatus, StatStyleVariant> = {
  ON_TRACK: 'emerald',
  AT_RISK: 'amber',
  OFF_TRACK: 'rose',
};

export function ProjectStatusTab({ projectId }: ProjectStatusTabProps) {
  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useProjectStatus(projectId);
  const updateHealthMutation = useUpdateProjectHealthStatus(projectId);
  const generateSummaryMutation = useGenerateStatusSummary(projectId);

  const [formData, setFormData] = useState({
    healthStatus: status?.healthStatus || 'ON_TRACK',
    statusSummary: status?.statusSummary || '',
  });

  const [summaryRange, setSummaryRange] = useState<
    'week' | '2weeks' | 'custom'
  >('week');

  // Update form data when status data changes
  React.useEffect(() => {
    if (status) {
      setFormData({
        healthStatus: status.healthStatus,
        statusSummary: status.statusSummary || '',
      });
    }
  }, [status]);

  const handleSave = async () => {
    try {
      await updateHealthMutation.mutateAsync({
        healthStatus: formData.healthStatus,
        statusSummary: formData.statusSummary || undefined,
      });
      refetch();
      alert('Status updated successfully!');
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleReset = () => {
    if (status) {
      setFormData({
        healthStatus: status.healthStatus,
        statusSummary: status.statusSummary || '',
      });
    }
  };

  const handleGenerateSummary = async () => {
    try {
      const rangeDays = summaryRange === 'week' ? 7 : 14;
      const result = await generateSummaryMutation.mutateAsync({ rangeDays });

      // Display the markdown in an alert or modal (you can enhance this)
      const blob = new Blob([result.markdown], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-status-summary.md`;
      a.click();
      URL.revokeObjectURL(url);

      // Copy to clipboard with Safari fallback support
      const copied = await copyToClipboard(result.markdown);
      if (copied) {
        alert('Summary generated and copied to clipboard!');
      } else {
        alert(
          'Summary generated and downloaded. Clipboard copy failed - please copy manually.',
        );
      }
    } catch (err) {
      console.error('Failed to generate summary:', err);
      alert('Failed to generate summary. Please try again.');
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContentSectionSkeleton />
          <ContentSectionSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Unable to load project status"
            description={(error as Error).message}
          />
        </CardBody>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<Settings className="h-6 w-6" />}
            title="No status data available"
            description="Status information will appear here once the project has some activity."
          />
        </CardBody>
      </Card>
    );
  }

  // Calculate totals for stats
  const totalTasks = Object.values(status.taskCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const completedTasks = status.taskCounts.DONE ?? 0;
  const inProgressTasks = status.taskCounts.IN_PROGRESS ?? 0;
  const blockedTasks = status.taskCounts.BLOCKED ?? 0;

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
          label="Completed"
          value={completedTasks}
          variant="emerald"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Status Editor */}
        <div className="space-y-6">
          {/* Project Health Status Card */}
          <Card>
            <CardHeader>
              <SectionHeader
                icon={<Settings className="h-5 w-5" />}
                title="Project Health Status"
                variant="blue"
              />
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label
                  htmlFor="healthStatus"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Status
                </label>
                <select
                  id="healthStatus"
                  value={formData.healthStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      healthStatus: e.target.value as ProjectHealthStatus,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
                >
                  {healthStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="statusSummary"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Status Summary
                </label>
                <textarea
                  id="statusSummary"
                  value={formData.statusSummary}
                  onChange={(e) =>
                    setFormData({ ...formData, statusSummary: e.target.value })
                  }
                  rows={4}
                  maxLength={1000}
                  placeholder="Brief summary of project status (max 1000 characters)"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
                />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {formData.statusSummary.length} / 1000 characters
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-2">
                <div>
                  <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                    Last updated
                  </dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDate(status.statusUpdatedAt)}
                  </dd>
                </div>
              </dl>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  isLoading={updateHealthMutation.isPending}
                >
                  Save
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Status Summary Helper */}
          <Card>
            <CardHeader>
              <SectionHeader
                icon={<FileText className="h-5 w-5" />}
                title="Status Summary Helper"
                variant="emerald"
              />
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Time Period
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSummaryRange('week')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      summaryRange === 'week'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                    }`}
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => setSummaryRange('2weeks')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      summaryRange === '2weeks'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                    }`}
                  >
                    Last 14 days
                  </button>
                </div>
              </div>

              <Button
                onClick={handleGenerateSummary}
                isLoading={generateSummaryMutation.isPending}
                className="w-full"
              >
                <Download className="h-4 w-4" />
                Generate & Copy Summary
              </Button>

              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Generates a markdown summary of completed and upcoming work. The
                summary will be downloaded as a file and copied to your
                clipboard.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Metrics */}
        <div className="space-y-6">
          {/* Task Status Breakdown */}
          <Card>
            <CardHeader>
              <SectionHeader
                icon={<CheckSquare className="h-5 w-5" />}
                title="Task Status"
                variant="blue"
              />
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(status.taskCounts).map(
                  ([taskStatus, count]) => (
                    <div
                      key={taskStatus}
                      className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                        {count}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {formatStatus(taskStatus)}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardBody>
          </Card>

          {/* Overdue Tasks */}
          {status.overdueTasks.length > 0 && (
            <Card className="border-rose-200 dark:border-rose-800">
              <CardHeader>
                <SectionHeader
                  icon={<AlertTriangle className="h-5 w-5" />}
                  title={`Overdue Tasks (${status.overdueTasks.length})`}
                  variant="rose"
                />
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {status.overdueTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex-shrink-0">
                        <Clock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {task.title}
                        </div>
                        <div className="text-sm text-rose-600 dark:text-rose-400">
                          Due: {formatDate(task.dueDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Upcoming Tasks */}
          {status.upcomingTasks.length > 0 && (
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={<Clock className="h-5 w-5" />}
                  title={`Upcoming Tasks (${status.upcomingTasks.length})`}
                  variant="amber"
                />
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {status.upcomingTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex-shrink-0">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {task.title}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          Due: {formatDate(task.dueDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Current Milestone */}
          {status.currentMilestone && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <SectionHeader
                  icon={<Target className="h-5 w-5" />}
                  title="Current Milestone"
                  variant="emerald"
                />
              </CardHeader>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex-shrink-0">
                    <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {status.currentMilestone.name}
                    </div>
                    <dl className="mt-2 grid grid-cols-1 gap-1">
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Due
                        </dt>
                        <dd className="text-sm text-neutral-900 dark:text-neutral-100">
                          {formatDate(status.currentMilestone.dueDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Status
                        </dt>
                        <dd>
                          <Badge
                            variant={
                              status.currentMilestone.status === 'DONE'
                                ? 'success'
                                : status.currentMilestone.status ===
                                    'IN_PROGRESS'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {formatStatus(status.currentMilestone.status)}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Upcoming Milestones */}
          {status.upcomingMilestones.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <SectionHeader
                  icon={<Target className="h-5 w-5" />}
                  title={`Upcoming Milestones (${status.upcomingMilestones.length})`}
                  variant="blue"
                />
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {status.upcomingMilestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {milestone.name}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          Due: {formatDate(milestone.dueDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Recent Risks */}
          {status.recentRisks.length > 0 && (
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
                  {status.recentRisks.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-neutral-900 dark:text-neutral-100">
                          {risk.snippet}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Meeting on {formatDate(risk.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Recent Decisions */}
          {status.recentDecisions.length > 0 && (
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
                  {status.recentDecisions.map((decision, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex-shrink-0">
                        <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-neutral-900 dark:text-neutral-100">
                          {decision.snippet}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Meeting on {formatDate(decision.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
