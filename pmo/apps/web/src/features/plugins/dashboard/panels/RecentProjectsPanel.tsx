/**
 * Recent Projects Panel Plugin
 *
 * Displays a list of recently updated projects.
 * Updated to match ContactsPage UI patterns with table layout.
 */

import { Link } from 'react-router';
import { FolderOpen, FolderPlus, Activity } from 'lucide-react';
import { Card, CardBody, CardTitle } from '../../../../ui/Card';
import { Badge, type BadgeVariant } from '../../../../ui/Badge';
import { Button } from '../../../../ui/Button';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';
import { EMPTY_STATES } from '../../../../utils/typography';

interface ProjectItem {
  id: number;
  name: string;
  status: string;
  healthStatus?: string;
  statusSummary?: string;
  updatedAt: string;
}

interface ProjectRowProps {
  project: ProjectItem;
  onNavigate: (path: string) => void;
}

const statusColors: Record<string, BadgeVariant> = {
  PLANNING: 'neutral',
  IN_PROGRESS: 'primary',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const healthColors: Record<string, BadgeVariant> = {
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  OFF_TRACK: 'danger',
};

const healthLabels: Record<string, string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  OFF_TRACK: 'Off Track',
};

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Project row with table-style layout matching ContactsPage patterns
 */
function ProjectRow({ project, onNavigate }: ProjectRowProps): JSX.Element {
  return (
    <tr
      onClick={() => onNavigate(`/projects/${project.id}`)}
      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group border-b border-neutral-200 dark:border-neutral-700 last:border-b-0"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
            <FolderOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
              {project.name}
            </div>
            {project.statusSummary && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {project.statusSummary}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[project.status] ?? 'neutral'} size="sm">
            {formatStatus(project.status)}
          </Badge>
          {project.healthStatus && (
            <Badge
              variant={healthColors[project.healthStatus] ?? 'neutral'}
              size="sm"
            >
              {healthLabels[project.healthStatus] ?? project.healthStatus}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {formatRelativeTime(project.updatedAt)}
        </span>
      </td>
    </tr>
  );
}

/**
 * Skeleton loader for project table rows
 */
function ProjectRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1.5" />
            <div className="h-3 w-28 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-14 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" />
      </td>
    </tr>
  );
}

function ProjectListSkeleton(): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Project
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
              Status
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <ProjectRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Empty state component matching ContactsPage pattern
 */
function EmptyState({
  onAddProject,
}: {
  onAddProject: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
        <FolderPlus className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        {EMPTY_STATES.noProjects}
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
        Create your first project to get started
      </p>
      <Button variant="primary" size="sm" onClick={onAddProject}>
        <FolderPlus className="h-4 w-4 mr-2" />
        New Project
      </Button>
    </div>
  );
}

function RecentProjectsPanelComponent(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const projectsData = data?.projects;
  const recentProjects = projectsData?.recent ?? [];
  const isLoading = projectsData?.isLoading ?? false;

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
            <CardTitle className="text-base">Recent Projects</CardTitle>
          </div>
          <Link
            to="/projects"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            View all
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <ProjectListSkeleton />
          ) : recentProjects.length === 0 ? (
            <EmptyState onAddProject={() => navigate('/projects/new')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      onNavigate={navigate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with count */}
        {!isLoading && recentProjects.length > 0 && (
          <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Showing{' '}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {recentProjects.length}
              </span>{' '}
              project{recentProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

const config: DashboardPanelConfig = {
  id: 'recent-projects-panel',
  name: 'Recent Projects',
  description: 'Displays a list of recently updated projects',
  position: 'main-right',
  priority: 10,
  defaultEnabled: true,
};

export const RecentProjectsPanelPlugin: DashboardPanelPlugin = {
  config,
  component: RecentProjectsPanelComponent,
};
