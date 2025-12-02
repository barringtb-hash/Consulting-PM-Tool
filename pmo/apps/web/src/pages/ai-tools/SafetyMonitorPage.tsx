/**
 * Safety Monitor Page
 *
 * Tool 3.5: Digital safety checklists, incident reporting,
 * OSHA 300 log management, and training compliance tracking
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
  HardHat,
  Settings,
  Plus,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

// Types
interface SafetyConfig {
  id: number;
  clientId: number;
  oshaLoggingEnabled: boolean;
  autoIncidentReporting: boolean;
  trainingTrackingEnabled: boolean;
  checklistFrequencyDays: number;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface SafetyChecklist {
  id: number;
  name: string;
  category: string;
  itemCount: number;
  completionRate: number;
  lastCompletedAt: string | null;
  isRequired: boolean;
}

interface SafetyIncident {
  id: number;
  type: string;
  severity: string;
  description: string;
  location: string | null;
  status: string;
  reportedAt: string;
  resolvedAt: string | null;
}

interface TrainingRecord {
  id: number;
  courseName: string;
  employeeName: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}

const SEVERITY_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  CRITICAL: 'secondary',
  HIGH: 'warning',
  MEDIUM: 'primary',
  LOW: 'neutral',
};

const INCIDENT_STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  OPEN: 'secondary',
  INVESTIGATING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const TRAINING_STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'warning',
  OVERDUE: 'secondary',
  SCHEDULED: 'primary',
  EXPIRED: 'neutral',
};

// API functions
async function fetchSafetyConfigs(): Promise<SafetyConfig[]> {
  const res = await fetch('/api/safety-monitor/configs', buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch safety configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchChecklists(configId: number): Promise<SafetyChecklist[]> {
  const res = await fetch(
    `/api/safety-monitor/${configId}/checklists`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch checklists') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.checklists || [];
}

async function fetchIncidents(configId: number): Promise<SafetyIncident[]> {
  const res = await fetch(
    `/api/safety-monitor/${configId}/incidents`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch incidents') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.incidents || [];
}

async function fetchTraining(configId: number): Promise<TrainingRecord[]> {
  const res = await fetch(
    `/api/safety-monitor/${configId}/training`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch training records') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.training || [];
}

async function createSafetyConfig(
  clientId: number,
  data: Partial<SafetyConfig>,
): Promise<SafetyConfig> {
  const res = await fetch(
    `/api/clients/${clientId}/safety-monitor`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create safety config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

function SafetyMonitorPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'checklists' | 'incidents' | 'training'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['safety-configs'],
    queryFn: fetchSafetyConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const checklistsQuery = useQuery({
    queryKey: ['safety-checklists', selectedConfigId],
    queryFn: () => fetchChecklists(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'checklists',
  });

  const incidentsQuery = useQuery({
    queryKey: ['safety-incidents', selectedConfigId],
    queryFn: () => fetchIncidents(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'incidents',
  });

  const trainingQuery = useQuery({
    queryKey: ['safety-training', selectedConfigId],
    queryFn: () => fetchTraining(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'training',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: { clientId: number; config: Partial<SafetyConfig> }) =>
      createSafetyConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-configs'] });
      setShowCreateModal(false);
      showToast({
        message: 'Safety Monitor configuration created',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);

    createConfigMutation.mutate({
      clientId,
      config: {
        oshaLoggingEnabled: formData.get('oshaLoggingEnabled') === 'on',
        autoIncidentReporting: formData.get('autoIncidentReporting') === 'on',
        trainingTrackingEnabled:
          formData.get('trainingTrackingEnabled') === 'on',
        checklistFrequencyDays:
          parseInt(formData.get('checklistFrequencyDays') as string, 10) || 7,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safety Monitor"
        subtitle="Digital safety checklists, incident reporting, and OSHA compliance tracking"
        icon={HardHat}
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
              { id: 'overview', label: 'Overview', icon: HardHat },
              { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
              { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
              { id: 'training', label: 'Training', icon: GraduationCap },
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
                  <p className="text-sm text-gray-500">OSHA Logging</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.oshaLoggingEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Auto Incident Report</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.autoIncidentReporting
                      ? 'Enabled'
                      : 'Disabled'}
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
                  <p className="text-sm text-gray-500">Training Tracking</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.trainingTrackingEnabled
                      ? 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Checklist Frequency</p>
                  <p className="text-2xl font-bold">
                    {selectedConfig.checklistFrequencyDays} days
                  </p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Checklists Tab */}
      {selectedConfigId && activeTab === 'checklists' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Safety Checklists</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Checklist
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {checklistsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading checklists...
              </div>
            ) : checklistsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No checklists configured. Create your first safety checklist.
              </div>
            ) : (
              <div className="space-y-4">
                {checklistsQuery.data?.map((checklist) => (
                  <div
                    key={checklist.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <ClipboardCheck className="h-6 w-6 text-gray-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{checklist.name}</p>
                          {checklist.isRequired && (
                            <Badge variant="secondary">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {checklist.category} • {checklist.itemCount} items
                        </p>
                        {checklist.lastCompletedAt && (
                          <p className="text-xs text-gray-400">
                            Last completed:{' '}
                            {new Date(
                              checklist.lastCompletedAt,
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {checklist.completionRate}%
                        </p>
                        <p className="text-xs text-gray-500">Completion</p>
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            checklist.completionRate >= 80
                              ? 'bg-green-500'
                              : checklist.completionRate >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${checklist.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Incidents Tab */}
      {selectedConfigId && activeTab === 'incidents' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Safety Incidents</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Report Incident
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {incidentsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading incidents...
              </div>
            ) : incidentsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No incidents reported. Your safety record is clean.
              </div>
            ) : (
              <div className="space-y-4">
                {incidentsQuery.data?.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              SEVERITY_VARIANTS[incident.severity] || 'neutral'
                            }
                          >
                            {incident.severity}
                          </Badge>
                          <span className="font-medium">{incident.type}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {incident.description}
                        </p>
                        {incident.location && (
                          <p className="text-xs text-gray-400 mt-1">
                            Location: {incident.location}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Reported:{' '}
                          {new Date(incident.reportedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          INCIDENT_STATUS_VARIANTS[incident.status] || 'neutral'
                        }
                      >
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Training Tab */}
      {selectedConfigId && activeTab === 'training' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Training Compliance</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['safety-training'],
                  })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {trainingQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading training records...
              </div>
            ) : trainingQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No training records. Add training requirements to track
                compliance.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trainingQuery.data?.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {record.courseName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {record.employeeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {record.status === 'COMPLETED' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : record.status === 'OVERDUE' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <Badge
                              variant={
                                TRAINING_STATUS_VARIANTS[record.status] ||
                                'neutral'
                              }
                            >
                              {record.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.dueDate
                            ? new Date(record.dueDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.expiresAt
                            ? new Date(record.expiresAt).toLocaleDateString()
                            : 'Never'}
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
              Create Safety Monitor Configuration
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
                label="Checklist Frequency"
                name="checklistFrequencyDays"
                defaultValue="7"
              >
                <option value="1">Daily</option>
                <option value="7">Weekly</option>
                <option value="14">Bi-weekly</option>
                <option value="30">Monthly</option>
              </Select>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="oshaLoggingEnabled"
                    defaultChecked
                  />
                  <span className="text-sm">
                    Enable OSHA 300 Log Management
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="autoIncidentReporting"
                    defaultChecked
                  />
                  <span className="text-sm">
                    Enable Automatic Incident Reporting
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="trainingTrackingEnabled"
                    defaultChecked
                  />
                  <span className="text-sm">
                    Enable Training Compliance Tracking
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

export default SafetyMonitorPage;
