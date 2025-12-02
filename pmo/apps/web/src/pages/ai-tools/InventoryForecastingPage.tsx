/**
 * Inventory Forecasting Page
 *
 * Tool 3.1: ML-powered inventory forecasting with seasonal trends,
 * multi-location support, and automated alerts
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
  Package,
  Settings,
  Plus,
  TrendingUp,
  AlertTriangle,
  MapPin,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// Types
interface InventoryConfig {
  id: number;
  clientId: number;
  forecastHorizonDays: number;
  seasonalityEnabled: boolean;
  autoReorderEnabled: boolean;
  alertThreshold: number;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface InventoryLocation {
  id: number;
  name: string;
  address: string | null;
  isActive: boolean;
}

interface InventoryProduct {
  id: number;
  sku: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
}

interface InventoryAlert {
  id: number;
  type: string;
  severity: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

const ALERT_SEVERITY_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  CRITICAL: 'secondary',
  HIGH: 'warning',
  MEDIUM: 'primary',
  LOW: 'neutral',
};

// API functions
async function fetchInventoryConfigs(): Promise<InventoryConfig[]> {
  const res = await fetch(buildApiUrl('/inventory-forecasting/configs'), buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch inventory configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchLocations(configId: number): Promise<InventoryLocation[]> {
  const res = await fetch(
    buildApiUrl(`/inventory-forecasting/${configId}/locations`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch locations') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.locations || [];
}

async function fetchProducts(configId: number): Promise<InventoryProduct[]> {
  const res = await fetch(
    buildApiUrl(`/inventory-forecasting/${configId}/products`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch products') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.products || [];
}

async function fetchAlerts(configId: number): Promise<InventoryAlert[]> {
  const res = await fetch(
    buildApiUrl(`/inventory-forecasting/${configId}/alerts`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch alerts') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.alerts || [];
}

async function createInventoryConfig(
  clientId: number,
  data: Partial<InventoryConfig>,
): Promise<InventoryConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/inventory-forecasting`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create inventory config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

function InventoryForecastingPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'locations' | 'products' | 'alerts'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['inventory-configs'],
    queryFn: fetchInventoryConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const locationsQuery = useQuery({
    queryKey: ['inventory-locations', selectedConfigId],
    queryFn: () => fetchLocations(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'locations',
  });

  const productsQuery = useQuery({
    queryKey: ['inventory-products', selectedConfigId],
    queryFn: () => fetchProducts(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'products',
  });

  const alertsQuery = useQuery({
    queryKey: ['inventory-alerts', selectedConfigId],
    queryFn: () => fetchAlerts(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'alerts',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      clientId: number;
      config: Partial<InventoryConfig>;
    }) => createInventoryConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-configs'] });
      setShowCreateModal(false);
      showToast({
        message: 'Inventory Forecasting configuration created',
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
        forecastHorizonDays:
          parseInt(formData.get('forecastHorizonDays') as string, 10) || 30,
        seasonalityEnabled: formData.get('seasonalityEnabled') === 'on',
        autoReorderEnabled: formData.get('autoReorderEnabled') === 'on',
        alertThreshold:
          parseInt(formData.get('alertThreshold') as string, 10) || 20,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Forecasting"
        subtitle="ML-powered inventory forecasting with seasonal trends and automated alerts"
        icon={Package}
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
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'locations', label: 'Locations', icon: MapPin },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
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
                  <p className="text-sm text-gray-500">Forecast Horizon</p>
                  <p className="text-2xl font-bold">
                    {selectedConfig.forecastHorizonDays} days
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Seasonality</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.seasonalityEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Auto Reorder</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.autoReorderEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-purple-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Alert Threshold</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {selectedConfig.alertThreshold}%
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Locations Tab */}
      {selectedConfigId && activeTab === 'locations' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Inventory Locations</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {locationsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading locations...
              </div>
            ) : locationsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No locations configured. Add your first location to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {locationsQuery.data?.map((location) => (
                  <div
                    key={location.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-gray-500">
                          {location.address || 'No address'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={location.isActive ? 'success' : 'neutral'}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Products Tab */}
      {selectedConfigId && activeTab === 'products' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Products</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {productsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading products...
              </div>
            ) : productsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products configured. Add your first product to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reorder Point
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productsQuery.data?.map((product) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={
                              product.currentStock <= product.reorderPoint
                                ? 'text-red-600 font-medium'
                                : ''
                            }
                          >
                            {product.currentStock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {product.reorderPoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {product.leadTimeDays} days
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

      {/* Alerts Tab */}
      {selectedConfigId && activeTab === 'alerts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Inventory Alerts</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['inventory-alerts'],
                  })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {alertsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading alerts...
              </div>
            ) : alertsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active alerts. Your inventory levels are healthy.
              </div>
            ) : (
              <div className="space-y-4">
                {alertsQuery.data?.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${alert.isResolved ? 'bg-gray-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'CRITICAL'
                              ? 'text-red-500'
                              : alert.severity === 'HIGH'
                                ? 'text-orange-500'
                                : 'text-yellow-500'
                          }`}
                        />
                        <div>
                          <p className="font-medium">{alert.type}</p>
                          <p className="text-sm text-gray-600">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          alert.isResolved
                            ? 'neutral'
                            : ALERT_SEVERITY_VARIANTS[alert.severity] ||
                              'neutral'
                        }
                      >
                        {alert.isResolved ? 'Resolved' : alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
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
              Create Inventory Forecasting Configuration
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
                label="Forecast Horizon"
                name="forecastHorizonDays"
                defaultValue="30"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </Select>

              <Select
                label="Alert Threshold"
                name="alertThreshold"
                defaultValue="20"
              >
                <option value="10">10% below reorder point</option>
                <option value="20">20% below reorder point</option>
                <option value="30">30% below reorder point</option>
              </Select>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="seasonalityEnabled"
                    defaultChecked
                  />
                  <span className="text-sm">Enable Seasonality Detection</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="autoReorderEnabled"
                    defaultChecked
                  />
                  <span className="text-sm">
                    Enable Auto Reorder Suggestions
                  </span>
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

export default InventoryForecastingPage;
