/**
 * Predictive Maintenance Page
 *
 * Tool 3.3: IoT-integrated predictive maintenance with ML anomaly detection,
 * failure prediction, and work order management
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useClients } from '../../api/queries';
import {
  Wrench,
  Settings,
  Plus,
  Cpu,
  Activity,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  CheckCircle,
  Clock,
} from 'lucide-react';

// Types
interface MaintenanceConfig {
  id: number;
  clientId: number;
  anomalyThreshold: number;
  predictionHorizonDays: number;
  autoWorkOrderEnabled: boolean;
  maintenanceWindowStart: string | null;
  maintenanceWindowEnd: string | null;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface Equipment {
  id: number;
  name: string;
  type: string;
  serialNumber: string | null;
  location: string | null;
  status: string;
  healthScore: number;
  lastMaintenanceAt: string | null;
}

interface Sensor {
  id: number;
  equipmentId: number;
  equipmentName: string;
  type: string;
  unit: string;
  currentValue: number | null;
  normalMin: number;
  normalMax: number;
  isAnomalous: boolean;
  lastReadingAt: string | null;
}

interface WorkOrder {
  id: number;
  equipmentId: number;
  equipmentName: string;
  type: string;
  priority: string;
  status: string;
  description: string | null;
  scheduledFor: string | null;
  completedAt: string | null;
}

const STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  OPERATIONAL: 'success',
  DEGRADED: 'warning',
  CRITICAL: 'secondary',
  OFFLINE: 'neutral',
};

const PRIORITY_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  CRITICAL: 'secondary',
  HIGH: 'warning',
  MEDIUM: 'primary',
  LOW: 'neutral',
};

const WORK_ORDER_STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  OPEN: 'primary',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

// API functions
async function fetchMaintenanceConfigs(): Promise<MaintenanceConfig[]> {
  const res = await fetch(
    '/api/predictive-maintenance/configs',
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch maintenance configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchEquipment(configId: number): Promise<Equipment[]> {
  const res = await fetch(
    `/api/predictive-maintenance/${configId}/equipment`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch equipment') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.equipment || [];
}

async function fetchSensors(configId: number): Promise<Sensor[]> {
  const res = await fetch(
    `/api/predictive-maintenance/${configId}/sensors`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch sensors') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.sensors || [];
}

async function fetchWorkOrders(configId: number): Promise<WorkOrder[]> {
  const res = await fetch(
    `/api/predictive-maintenance/${configId}/work-orders`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch work orders') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.workOrders || [];
}

async function createMaintenanceConfig(
  clientId: number,
  data: Partial<MaintenanceConfig>,
): Promise<MaintenanceConfig> {
  const res = await fetch(
    `/api/clients/${clientId}/predictive-maintenance`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create maintenance config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

function PredictiveMaintenancePage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'equipment' | 'sensors' | 'work-orders'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['maintenance-configs'],
    queryFn: fetchMaintenanceConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const equipmentQuery = useQuery({
    queryKey: ['maintenance-equipment', selectedConfigId],
    queryFn: () => fetchEquipment(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'equipment',
  });

  const sensorsQuery = useQuery({
    queryKey: ['maintenance-sensors', selectedConfigId],
    queryFn: () => fetchSensors(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'sensors',
  });

  const workOrdersQuery = useQuery({
    queryKey: ['maintenance-work-orders', selectedConfigId],
    queryFn: () => fetchWorkOrders(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'work-orders',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      clientId: number;
      config: Partial<MaintenanceConfig>;
    }) => createMaintenanceConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-configs'] });
      setShowCreateModal(false);
      showToast('Predictive Maintenance configuration created', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
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
        anomalyThreshold:
          parseFloat(formData.get('anomalyThreshold') as string) || 2.0,
        predictionHorizonDays:
          parseInt(formData.get('predictionHorizonDays') as string, 10) || 7,
        autoWorkOrderEnabled: formData.get('autoWorkOrderEnabled') === 'on',
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Predictive Maintenance"
        subtitle="IoT-integrated predictive maintenance with ML anomaly detection"
        icon={Wrench}
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
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'equipment', label: 'Equipment', icon: Cpu },
              { id: 'sensors', label: 'Sensors', icon: Activity },
              { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
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
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Anomaly Threshold
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedConfig.anomalyThreshold}σ
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Prediction Horizon
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedConfig.predictionHorizonDays} days
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Auto Work Orders
                  </p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedConfig.autoWorkOrderEnabled
                      ? 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>
                <ClipboardList className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Status
                  </p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedConfig.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <CheckCircle
                  className={`h-8 w-8 ${selectedConfig.isActive ? 'text-green-500' : 'text-neutral-400 dark:text-neutral-500'}`}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Equipment Tab */}
      {selectedConfigId && activeTab === 'equipment' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Equipment</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {equipmentQuery.isLoading ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                Loading equipment...
              </div>
            ) : equipmentQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No equipment registered. Add equipment to start monitoring.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Health
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {equipmentQuery.data?.map((equip) => (
                      <tr key={equip.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {equip.name}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {equip.serialNumber || 'No serial'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                          {equip.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                          {equip.location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  equip.healthScore >= 80
                                    ? 'bg-green-500'
                                    : equip.healthScore >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${equip.healthScore}%` }}
                              />
                            </div>
                            <span className="text-sm text-neutral-900 dark:text-neutral-100">
                              {equip.healthScore}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={STATUS_VARIANTS[equip.status] || 'neutral'}
                          >
                            {equip.status}
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

      {/* Sensors Tab */}
      {selectedConfigId && activeTab === 'sensors' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sensors</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['maintenance-sensors'],
                  })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {sensorsQuery.isLoading ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                Loading sensors...
              </div>
            ) : sensorsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No sensors configured. Add sensors to equipment for monitoring.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sensorsQuery.data?.map((sensor) => (
                  <div
                    key={sensor.id}
                    className={`border rounded-lg p-4 ${sensor.isAnomalous ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30' : 'border-neutral-200 dark:border-neutral-700'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {sensor.type}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {sensor.equipmentName}
                        </p>
                      </div>
                      {sensor.isAnomalous && (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {sensor.currentValue !== null
                          ? `${sensor.currentValue} ${sensor.unit}`
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Normal: {sensor.normalMin} - {sensor.normalMax}{' '}
                        {sensor.unit}
                      </p>
                    </div>
                    {sensor.lastReadingAt && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                        Last reading:{' '}
                        {new Date(sensor.lastReadingAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Work Orders Tab */}
      {selectedConfigId && activeTab === 'work-orders' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Work Orders</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Work Order
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {workOrdersQuery.isLoading ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                Loading work orders...
              </div>
            ) : workOrdersQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No work orders. Equipment is running smoothly.
              </div>
            ) : (
              <div className="space-y-4">
                {workOrdersQuery.data?.map((order) => (
                  <div
                    key={order.id}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {order.equipmentName}
                          </span>
                          <Badge variant="primary">{order.type}</Badge>
                        </div>
                        {order.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {order.description}
                          </p>
                        )}
                        {order.scheduledFor && (
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                            Scheduled:{' '}
                            {new Date(order.scheduledFor).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={
                            PRIORITY_VARIANTS[order.priority] || 'neutral'
                          }
                        >
                          {order.priority}
                        </Badge>
                        <Badge
                          variant={
                            WORK_ORDER_STATUS_VARIANTS[order.status] ||
                            'neutral'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Create Predictive Maintenance Configuration
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
                label="Anomaly Threshold (Standard Deviations)"
                name="anomalyThreshold"
                defaultValue="2.0"
              >
                <option value="1.5">1.5σ (More sensitive)</option>
                <option value="2.0">2.0σ (Standard)</option>
                <option value="2.5">2.5σ (Less sensitive)</option>
                <option value="3.0">3.0σ (Very conservative)</option>
              </Select>

              <Select
                label="Prediction Horizon"
                name="predictionHorizonDays"
                defaultValue="7"
              >
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </Select>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    name="autoWorkOrderEnabled"
                    defaultChecked
                  />
                  <span className="text-sm">
                    Auto-generate work orders for predicted failures
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

export default PredictiveMaintenancePage;
