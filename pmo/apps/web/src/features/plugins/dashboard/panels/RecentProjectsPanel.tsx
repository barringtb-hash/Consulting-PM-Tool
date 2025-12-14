/**
 * Recent Projects Panel Plugin
 *
 * Displays a list of recently updated projects.
 */

import { Link } from 'react-router-dom';
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

function ProjectRow({ project, onNavigate }: ProjectRowProps): JSX.Element {
  return (
    <button
      onClick={() => onNavigate(`/projects/${project.id}`)}
      className="w-full text-left p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-medium text-neutral-900 group-hover:text-primary-700">
          {project.name}
        </h4>
        {project.healthStatus && (
          <Badge variant={healthColors[project.healthStatus] ?? 'neutral'}>
            {project.healthStatus.replace('_', ' ')}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusColors[project.status] ?? 'neutral'}>
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

function ProjectListSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-neutral-100 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

function RecentProjectsPanelComponent(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const projectsData = data?.projects;
  const recentProjects = projectsData?.recent ?? [];
  const isLoading = projectsData?.isLoading ?? false;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recent Projects</CardTitle>
          <Link
            to="/projects"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {isLoading ? (
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
              {EMPTY_STATES.noProjects}
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
              <ProjectRow
                key={project.id}
                project={project}
                onNavigate={navigate}
              />
            ))}
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
