/**
 * Revenue Management Page
 *
 * Tool 3.4: AI-powered dynamic pricing with demand forecasting,
 * competitor monitoring, and revenue optimization
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useClients } from '../../api/queries';
import {
  DollarSign,
  Settings,
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  RefreshCw,
  Target,
  Eye,
} from 'lucide-react';

// Types
interface RevenueConfig {
  id: number;
  clientId: number;
  pricingStrategy: string;
  minPriceMultiplier: number;
  maxPriceMultiplier: number;
  competitorTrackingEnabled: boolean;
  demandForecastEnabled: boolean;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface PricingRule {
  id: number;
  name: string;
  productCategory: string | null;
  basePrice: number;
  currentPrice: number;
  priceChange: number;
  isActive: boolean;
}

interface Competitor {
  id: number;
  name: string;
  website: string | null;
  productsTracked: number;
  lastScrapedAt: string | null;
  isActive: boolean;
}

interface RevenueForecast {
  id: number;
  period: string;
  predictedRevenue: number;
  predictedDemand: number;
  confidence: number;
  createdAt: string;
}

const STRATEGY_LABELS: Record<string, string> = {
  DYNAMIC: 'Dynamic Pricing',
  COMPETITIVE: 'Competitive Matching',
  VALUE_BASED: 'Value-Based',
  COST_PLUS: 'Cost Plus',
};

// API functions
async function fetchRevenueConfigs(): Promise<RevenueConfig[]> {
  const res = await fetch(
    buildApiUrl('/revenue-management/configs'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch revenue configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchPricingRules(configId: number): Promise<PricingRule[]> {
  const res = await fetch(
    buildApiUrl(`/revenue-management/${configId}/pricing`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch pricing rules') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.rules || [];
}

async function fetchCompetitors(configId: number): Promise<Competitor[]> {
  const res = await fetch(
    buildApiUrl(`/revenue-management/${configId}/competitors`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch competitors') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.competitors || [];
}

async function fetchForecasts(configId: number): Promise<RevenueForecast[]> {
  const res = await fetch(
    buildApiUrl(`/revenue-management/${configId}/forecasts`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch forecasts') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.forecasts || [];
}

async function createRevenueConfig(
  clientId: number,
  data: Partial<RevenueConfig>,
): Promise<RevenueConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/revenue-management`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create revenue config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

function RevenueManagementPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'pricing' | 'competitors' | 'forecasts'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['revenue-configs'],
    queryFn: fetchRevenueConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const pricingQuery = useQuery({
    queryKey: ['revenue-pricing', selectedConfigId],
    queryFn: () => fetchPricingRules(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'pricing',
  });

  const competitorsQuery = useQuery({
    queryKey: ['revenue-competitors', selectedConfigId],
    queryFn: () => fetchCompetitors(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'competitors',
  });

  const forecastsQuery = useQuery({
    queryKey: ['revenue-forecasts', selectedConfigId],
    queryFn: () => fetchForecasts(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'forecasts',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: { clientId: number; config: Partial<RevenueConfig> }) =>
      createRevenueConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-configs'] });
      setShowCreateModal(false);
      showToast({
        message: 'Revenue Management configuration created',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  // Redirect to login on 401 errors from queries or mutations
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createConfigMutation.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);

    createConfigMutation.mutate({
      clientId,
      config: {
        pricingStrategy: formData.get('pricingStrategy') as string,
        minPriceMultiplier:
          parseFloat(formData.get('minPriceMultiplier') as string) || 0.8,
        maxPriceMultiplier:
          parseFloat(formData.get('maxPriceMultiplier') as string) || 1.5,
        competitorTrackingEnabled:
          formData.get('competitorTrackingEnabled') === 'on',
        demandForecastEnabled: formData.get('demandForecastEnabled') === 'on',
      },
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Management"
        subtitle="AI-powered dynamic pricing with demand forecasting and competitor monitoring"
        icon={DollarSign}
        actions={
          <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            New Configuration
          </Button>
        }
      />

      {/* Configuration Selector */}
      <Card>
        <CardBody>
          <div className="flex gap-4 flex-wrap">
            <Select
              label="Select Configuration"
              value={selectedConfigId?.toString() || ''}
              onChange={(e) =>
                setSelectedConfigId(
                  e.target.value ? parseInt(e.target.value, 10) : null,
                )
              }
            >
              <option value="">Select a configuration...</option>
              {configsQuery.data?.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.client?.name || `Config ${config.id}`}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      {selectedConfigId && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'pricing', label: 'Pricing', icon: DollarSign },
              { id: 'competitors', label: 'Competitors', icon: Eye },
              { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Overview Tab */}
      {selectedConfigId && activeTab === 'overview' && selectedConfig && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pricing Strategy</p>
                  <p className="text-lg font-semibold">
                    {STRATEGY_LABELS[selectedConfig.pricingStrategy] ||
                      selectedConfig.pricingStrategy}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Price Range</p>
                  <p className="text-lg font-semibold">
                    {(selectedConfig.minPriceMultiplier * 100).toFixed(0)}% -{' '}
                    {(selectedConfig.maxPriceMultiplier * 100).toFixed(0)}%
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Competitor Tracking</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.competitorTrackingEnabled
                      ? 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Demand Forecast</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.demandForecastEnabled
                      ? 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Pricing Tab */}
      {selectedConfigId && activeTab === 'pricing' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Pricing Rules</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {pricingQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading pricing rules...
              </div>
            ) : pricingQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pricing rules configured. Add rules to enable dynamic
                pricing.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Base Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingQuery.data?.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {rule.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rule.productCategory || 'All'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatCurrency(rule.basePrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {formatCurrency(rule.currentPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`flex items-center gap-1 text-sm ${rule.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {rule.priceChange >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {rule.priceChange >= 0 ? '+' : ''}
                            {rule.priceChange.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={rule.isActive ? 'success' : 'neutral'}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Competitors Tab */}
      {selectedConfigId && activeTab === 'competitors' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Competitor Tracking</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Competitor
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {competitorsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading competitors...
              </div>
            ) : competitorsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No competitors being tracked. Add competitors to monitor their
                pricing.
              </div>
            ) : (
              <div className="space-y-4">
                {competitorsQuery.data?.map((competitor) => (
                  <div
                    key={competitor.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{competitor.name}</p>
                      {competitor.website && (
                        <p className="text-sm text-gray-500">
                          {competitor.website}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {competitor.productsTracked} products tracked
                        {competitor.lastScrapedAt &&
                          ` • Last updated: ${new Date(competitor.lastScrapedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={competitor.isActive ? 'success' : 'neutral'}
                      >
                        {competitor.isActive ? 'Active' : 'Paused'}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          queryClient.invalidateQueries({
                            queryKey: ['revenue-competitors'],
                          })
                        }
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Forecasts Tab */}
      {selectedConfigId && activeTab === 'forecasts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Revenue Forecasts</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['revenue-forecasts'],
                  })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {forecastsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading forecasts...
              </div>
            ) : forecastsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No forecasts generated yet. Forecasts will appear once you have
                enough historical data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Demand
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {forecastsQuery.data?.map((forecast) => (
                      <tr key={forecast.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {forecast.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatCurrency(forecast.predictedRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {forecast.predictedDemand.toLocaleString()} units
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  forecast.confidence >= 80
                                    ? 'bg-green-500'
                                    : forecast.confidence >= 60
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${forecast.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm">
                              {forecast.confidence}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(forecast.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Create Revenue Management Configuration
            </h2>
            <form onSubmit={handleCreateConfig} className="space-y-4">
              <Select
                label="Client"
                name="clientId"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                <option value="">Select a client...</option>
                {clientsQuery.data?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Pricing Strategy"
                name="pricingStrategy"
                defaultValue="DYNAMIC"
              >
                <option value="DYNAMIC">Dynamic Pricing</option>
                <option value="COMPETITIVE">Competitive Matching</option>
                <option value="VALUE_BASED">Value-Based</option>
                <option value="COST_PLUS">Cost Plus</option>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Min Price Multiplier"
                  name="minPriceMultiplier"
                  defaultValue="0.8"
                >
                  <option value="0.7">70%</option>
                  <option value="0.8">80%</option>
                  <option value="0.9">90%</option>
                  <option value="1.0">100%</option>
                </Select>
                <Select
                  label="Max Price Multiplier"
                  name="maxPriceMultiplier"
                  defaultValue="1.5"
                >
                  <option value="1.1">110%</option>
                  <option value="1.25">125%</option>
                  <option value="1.5">150%</option>
                  <option value="2.0">200%</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="competitorTrackingEnabled"
                    defaultChecked
                  />
                  <span className="text-sm">Enable Competitor Tracking</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="demandForecastEnabled"
                    defaultChecked
                  />
                  <span className="text-sm">Enable Demand Forecasting</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createConfigMutation.isPending}>
                  {createConfigMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RevenueManagementPage;
