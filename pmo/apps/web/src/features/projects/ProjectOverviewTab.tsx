import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, TrendingUp } from 'lucide-react';
import { useClient, useProjectStatus } from '../../api/queries';
import { type Project } from '../../api/projects';
import { Card, CardBody, CardHeader, CardTitle } from '../../ui/Card';
import { ProjectStatusPill } from '../../components/ProjectStatusPill';
import { Badge } from '../../ui/Badge';
import { EMPTY_STATES, formatStatus } from '../../utils/typography';

interface ProjectOverviewTabProps {
  project: Project;
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

  return (
    <div className="space-y-6">
      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Client</span>
              </div>
              {clientQuery.isLoading && (
                <p className="text-neutral-600">Loading...</p>
              )}
              {clientQuery.data && (
                <Link
                  to={`/clients/${clientQuery.data.id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {clientQuery.data.name}
                </Link>
              )}
              {clientQuery.error && (
                <p className="text-neutral-600">Unable to load</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="flex items-center gap-2">
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
            </div>

            <div>
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Health</span>
              </div>
              <ProjectStatusPill
                healthStatus={project.healthStatus}
                statusSummary={project.statusSummary}
                statusUpdatedAt={project.statusUpdatedAt}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Start Date</span>
              </div>
              <p className="text-neutral-900">
                {formatDate(project.startDate)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Target End Date</span>
              </div>
              <p className="text-neutral-900">{formatDate(project.endDate)}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Created</span>
              </div>
              <p className="text-neutral-900">
                {formatDate(project.createdAt)}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Status Snapshot */}
      {statusQuery.isLoading && (
        <Card>
          <CardBody>
            <p className="text-neutral-600">Loading project status...</p>
          </CardBody>
        </Card>
      )}

      {statusQuery.error && (
        <Card>
          <CardBody>
            <p className="text-danger-600">Unable to load project status</p>
          </CardBody>
        </Card>
      )}

      {statusData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Task Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle as="h3">Task Progress</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-600">Completion</span>
                    <span className="text-2xl font-bold text-neutral-900">
                      {completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {Object.entries(statusData.taskCounts).map(
                    ([status, count]) => (
                      <div key={status} className="text-center">
                        <div className="text-xl font-semibold text-neutral-900">
                          {count}
                        </div>
                        <div className="text-xs text-neutral-600">
                          {formatStatus(status)}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Current Milestone Card */}
          <Card>
            <CardHeader>
              <CardTitle as="h3">Current Milestone</CardTitle>
            </CardHeader>
            <CardBody>
              {statusData.currentMilestone ? (
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">
                    {statusData.currentMilestone.name}
                  </h4>
                  <p className="text-sm text-neutral-600 mb-1">
                    Due: {formatDate(statusData.currentMilestone.dueDate)}
                  </p>
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
                <p className="text-neutral-600 text-sm">
                  {EMPTY_STATES.noActiveMilestone}
                </p>
              )}
            </CardBody>
          </Card>

          {/* Upcoming Deadlines Card */}
          <Card>
            <CardHeader>
              <CardTitle as="h3">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardBody>
              {statusData.upcomingTasks.length > 0 ? (
                <ul className="space-y-2">
                  {statusData.upcomingTasks.slice(0, 3).map((task) => (
                    <li key={task.id} className="text-sm">
                      <div className="font-medium text-neutral-900">
                        {task.title}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {formatDate(task.dueDate)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-neutral-600 text-sm">
                  {EMPTY_STATES.noUpcomingTasks}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Overdue Tasks Alert */}
      {statusData && statusData.overdueTasks.length > 0 && (
        <Card className="border-danger-200 bg-danger-50">
          <CardHeader>
            <CardTitle as="h3" className="text-danger-900">
              ⚠️ Overdue Tasks ({statusData.overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {statusData.overdueTasks.map((task) => (
                <li key={task.id} className="text-sm">
                  <div className="font-medium text-danger-900">
                    {task.title}
                  </div>
                  <div className="text-xs text-danger-700">
                    Was due: {formatDate(task.dueDate)}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Recent Risks and Decisions */}
      {statusData &&
        (statusData.recentRisks.length > 0 ||
          statusData.recentDecisions.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statusData.recentRisks.length > 0 && (
              <Card className="border-yellow-200">
                <CardHeader>
                  <CardTitle as="h3" className="text-yellow-900">
                    Recent Risks
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="space-y-3">
                    {statusData.recentRisks.map((risk, idx) => (
                      <li key={idx} className="text-sm">
                        <p className="text-neutral-900">{risk.snippet}</p>
                        <p className="text-xs text-neutral-600 mt-1">
                          From meeting on {formatDate(risk.date)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {statusData.recentDecisions.length > 0 && (
              <Card className="border-purple-200">
                <CardHeader>
                  <CardTitle as="h3" className="text-purple-900">
                    Recent Decisions
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="space-y-3">
                    {statusData.recentDecisions.map((decision, idx) => (
                      <li key={idx} className="text-sm">
                        <p className="text-neutral-900">{decision.snippet}</p>
                        <p className="text-xs text-neutral-600 mt-1">
                          From meeting on {formatDate(decision.date)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
          </div>
        )}
    </div>
  );
}
