/**
 * Open Tasks Summary Card Plugin
 *
 * Displays the count of the user's open (non-DONE) tasks.
 * Updated to match ContactsPage UI patterns with icons.
 */

import { CheckSquare } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function OpenTasksCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const tasksData = data?.tasks;

  return (
    <SummaryCard
      icon={<CheckSquare className="h-5 w-5" />}
      title="My Open Tasks"
      value={tasksData?.open ?? 0}
      variant="violet"
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
