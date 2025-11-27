/**
 * Active Clients Summary Card Plugin
 *
 * Displays the count of active (non-archived) clients.
 */

import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function ActiveClientsCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const clientsData = data?.clients;

  return (
    <SummaryCard
      title="Active Clients"
      value={clientsData?.active ?? 0}
      description="Clients you're working with"
      variant="primary"
      onClick={() => navigate('/clients')}
      isLoading={clientsData?.isLoading}
    />
  );
}

const config: DashboardPanelConfig = {
  id: 'active-clients-card',
  name: 'Active Clients',
  description: 'Displays the count of active clients',
  position: 'summary-cards',
  priority: 10,
  defaultEnabled: true,
};

export const ActiveClientsCardPlugin: DashboardPanelPlugin = {
  config,
  component: ActiveClientsCardPanel,
};
