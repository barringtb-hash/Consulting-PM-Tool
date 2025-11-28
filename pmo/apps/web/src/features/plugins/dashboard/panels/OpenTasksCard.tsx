/**
 * Open Tasks Summary Card Plugin
 *
 * Displays the count of the user's open (non-DONE) tasks.
 */

import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function OpenTasksCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const tasksData = data?.tasks;

  return (
    <SummaryCard
      title="My Open Tasks"
      value={tasksData?.open ?? 0}
      description="Tasks to complete"
      variant="default"
      onClick={() => navigate('/tasks')}
      isLoading={tasksData?.isLoading}
    />
  );
}

const config: DashboardPanelConfig = {
  id: 'open-tasks-card',
  name: 'Open Tasks',
  description: "Displays the count of user's open tasks",
  position: 'summary-cards',
  priority: 30,
  defaultEnabled: true,
};

export const OpenTasksCardPlugin: DashboardPanelPlugin = {
  config,
  component: OpenTasksCardPanel,
};
