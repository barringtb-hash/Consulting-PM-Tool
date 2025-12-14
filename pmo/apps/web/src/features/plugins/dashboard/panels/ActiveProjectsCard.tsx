/**
 * Active Projects Summary Card Plugin
 *
 * Displays the count of projects with IN_PROGRESS status.
 */

import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function ActiveProjectsCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const projectsData = data?.projects;

  return (
    <SummaryCard
      title="Active Projects"
      value={projectsData?.active ?? 0}
      description="Projects in progress"
      variant="primary"
      onClick={() => navigate('/projects')}
      isLoading={projectsData?.isLoading}
    />
  );
}

const config: DashboardPanelConfig = {
  id: 'active-projects-card',
  name: 'Active Projects',
  description: 'Displays the count of active projects',
  position: 'summary-cards',
  priority: 20,
  defaultEnabled: true,
};

export const ActiveProjectsCardPlugin: DashboardPanelPlugin = {
  config,
  component: ActiveProjectsCardPanel,
};
