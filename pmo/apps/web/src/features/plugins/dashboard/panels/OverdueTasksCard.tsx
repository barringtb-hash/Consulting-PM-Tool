/**
 * Overdue Tasks Summary Card Plugin
 *
 * Displays the count of overdue tasks with warning styling.
 * Updated to match ContactsPage UI patterns with icons.
 */

import { AlertTriangle } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function OverdueTasksCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const tasksData = data?.tasks;
  const overdueCount = tasksData?.overdue ?? 0;

  return (
    <SummaryCard
      icon={<AlertTriangle className="h-5 w-5" />}
      title="Overdue Tasks"
      value={overdueCount}
      variant={overdueCount > 0 ? 'rose' : 'amber'}
      onClick={() => navigate('/tasks')}
      isLoading={tasksData?.isLoading}
    />
  );
}

const config: DashboardPanelConfig = {
  id: 'overdue-tasks-card',
  name: 'Overdue Tasks',
  description: 'Displays the count of overdue tasks with warning styling',
  position: 'summary-cards',
  priority: 40,
  defaultEnabled: true,
};

export const OverdueTasksCardPlugin: DashboardPanelPlugin = {
  config,
  component: OverdueTasksCardPanel,
};
