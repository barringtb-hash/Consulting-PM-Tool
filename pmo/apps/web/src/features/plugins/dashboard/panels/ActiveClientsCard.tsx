/**
 * Active Accounts Summary Card Plugin
 *
 * Displays the count of active (non-archived) accounts.
 * Note: Uses legacy 'clients' data source until dashboard is migrated to CRM API.
 */

import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function ActiveAccountsCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  // TODO: Migrate to CRM accounts API (currently uses legacy clients data)
  const clientsData = data?.clients;

  return (
    <SummaryCard
      title="Active Accounts"
      value={clientsData?.active ?? 0}
      description="Accounts you're working with"
      variant="primary"
      onClick={() => navigate('/crm/accounts')}
      isLoading={clientsData?.isLoading}
    />
  );
}

const config: DashboardPanelConfig = {
  id: 'active-accounts-card',
  name: 'Active Accounts',
  description: 'Displays the count of active CRM accounts',
  position: 'summary-cards',
  priority: 10,
  defaultEnabled: true,
};

export const ActiveAccountsCardPlugin: DashboardPanelPlugin = {
  config,
  component: ActiveAccountsCardPanel,
};
