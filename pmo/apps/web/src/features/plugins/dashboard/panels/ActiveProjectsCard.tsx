/**
 * Active Projects Summary Card Plugin
 *
 * Displays the count of projects with IN_PROGRESS status.
 * Updated to match ContactsPage UI patterns with icons.
 */

import { FolderKanban } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function ActiveProjectsCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const projectsData = data?.projects;

  return (
    <SummaryCard
      icon={<FolderKanban className="h-5 w-5" />}
      title="Active Projects"
      value={projectsData?.active ?? 0}
      variant="emerald"
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
