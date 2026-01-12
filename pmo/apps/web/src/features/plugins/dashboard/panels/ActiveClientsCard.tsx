/**
 * Active Accounts Summary Card Plugin
 *
 * Displays the count of active (non-archived) CRM accounts.
 * Updated to match ContactsPage UI patterns with icons.
 */

import { Building2 } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { useDashboardPluginContext } from '../DashboardPluginContext';
import type { DashboardPanelPlugin, DashboardPanelConfig } from '../types';

function ActiveAccountsCardPanel(): JSX.Element {
  const { data, navigate } = useDashboardPluginContext();
  const accountsData = data?.accounts;

  return (
    <SummaryCard
      icon={<Building2 className="h-5 w-5" />}
      title="Active Accounts"
      value={accountsData?.active ?? 0}
      variant="blue"
      onClick={() => navigate('/crm/accounts')}
      isLoading={accountsData?.isLoading}
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
