/**
 * Prior Authorization Bot Page
 *
 * Tool 2.4: Healthcare prior authorization automation with appeals management
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useClients } from '../../api/queries';
import {
  Plus,
  ShieldCheck,
  Settings,
  BarChart3,
  FileText,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Scale,
} from 'lucide-react';

// Types
interface PriorAuthConfig {
  id: number;
  clientId: number;
  practiceName: string | null;
  practiceNPI: string | null;
  ehrSystem: string | null;
  isHipaaEnabled: boolean;
  notifyOnSubmission: boolean;
  notifyOnStatusChange: boolean;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface PARequest {
  id: number;
  requestNumber: string;
  patientName: string;
  payerName: string;
  serviceType: string;
  status: string;
  urgency: string;
  submittedAt: string | null;
  decidedAt: string | null;
  approvalNumber: string | null;
  denialReason: string | null;
  appealStatus: string;
  createdAt: string;
}

const STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  DRAFT: 'neutral',
  SUBMITTED: 'primary',
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'secondary',
  PARTIAL_APPROVAL: 'warning',
  WITHDRAWN: 'neutral',
  EXPIRED: 'neutral',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  DRAFT: <FileText className="h-4 w-4" />,
  SUBMITTED: <Send className="h-4 w-4" />,
  PENDING: <Clock className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4 text-green-500" />,
  DENIED: <XCircle className="h-4 w-4 text-red-500" />,
  PARTIAL_APPROVAL: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
};

const URGENCY_VARIANTS: Record<string, 'neutral' | 'warning' | 'secondary'> = {
  ROUTINE: 'neutral',
  URGENT: 'warning',
  EMERGENT: 'secondary',
};

// API functions
async function fetchPriorAuthConfigs(): Promise<PriorAuthConfig[]> {
  const res = await fetch(buildApiUrl('/prior-auth/configs'), buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch prior auth configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchPARequests(
  configId: number,
  status?: string,
): Promise<PARequest[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(
    buildApiUrl(`/prior-auth/${configId}/requests?${params}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch PA requests') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.requests || [];
}

async function fetchAnalytics(configId: number): Promise<{
  summary: {
    totalRequests: number;
    approvedRequests: number;
    deniedRequests: number;
    pendingRequests: number;
    approvalRate: string | number;
    avgTurnaround: number | null;
  };
  denialReasons: Record<string, number>;
}> {
  const res = await fetch(
    buildApiUrl(`/prior-auth/${configId}/analytics`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch analytics') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function createPriorAuthConfig(
  clientId: number,
  data: Partial<PriorAuthConfig>,
): Promise<PriorAuthConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/prior-auth`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create prior auth config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

async function submitPARequest(requestId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/prior-auth/requests/${requestId}/submit`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to submit PA request') as ApiError;
    error.status = res.status;
    throw error;
  }
}

async function checkPAStatus(
  requestId: number,
): Promise<{ statusChanged: boolean; currentStatus: string }> {
  const res = await fetch(
    buildApiUrl(`/prior-auth/requests/${requestId}/check-status`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to check PA status') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function PriorAuthPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'requests' | 'appeals' | 'analytics'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['prior-auth-configs'],
    queryFn: fetchPriorAuthConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const requestsQuery = useQuery({
    queryKey: ['pa-requests', selectedConfigId, statusFilter],
    queryFn: () =>
      fetchPARequests(selectedConfigId!, statusFilter || undefined),
    enabled: !!selectedConfigId && activeTab === 'requests',
  });

  const analyticsQuery = useQuery({
    queryKey: ['pa-analytics', selectedConfigId],
    queryFn: () => fetchAnalytics(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'analytics',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      clientId: number;
      config: Partial<PriorAuthConfig>;
    }) => createPriorAuthConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prior-auth-configs'] });
      setShowCreateModal(false);
      showToast({
        message: 'Prior Auth configuration created',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: submitPARequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pa-requests'] });
      showToast({ message: 'PA request submitted', variant: 'success' });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: checkPAStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pa-requests'] });
      if (data.statusChanged) {
        showToast({
          message: `Status updated to ${data.currentStatus}`,
          variant: 'success',
        });
      } else {
        showToast({ message: 'No status change', variant: 'neutral' });
      }
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  // Redirect to login on 401 errors from queries or mutations
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createConfigMutation.error);
  useRedirectOnUnauthorized(submitMutation.error);
  useRedirectOnUnauthorized(checkStatusMutation.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);

    createConfigMutation.mutate({
      clientId,
      config: {
        practiceName: (formData.get('practiceName') as string) || null,
        practiceNPI: (formData.get('practiceNPI') as string) || null,
        ehrSystem: (formData.get('ehrSystem') as string) || null,
        isHipaaEnabled: formData.get('isHipaaEnabled') === 'on',
        notifyOnSubmission: formData.get('notifyOnSubmission') === 'on',
        notifyOnStatusChange: formData.get('notifyOnStatusChange') === 'on',
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prior Authorization Bot"
        subtitle="Automated PA submission, status tracking, and appeals management"
        icon={ShieldCheck}
        actions={
          <div className="flex gap-2">
            {selectedConfigId && (
              <Button onClick={() => setShowNewRequestModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New PA Request
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              New Configuration
            </Button>
          </div>
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
                  {config.client?.name ||
                    config.practiceName ||
                    `Config ${config.id}`}
                </option>
              ))}
            </Select>

            {selectedConfigId && activeTab === 'requests' && (
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="DENIED">Denied</option>
              </Select>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      {selectedConfigId && (
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: ShieldCheck },
              { id: 'requests', label: 'Requests', icon: FileText },
              { id: 'appeals', label: 'Appeals', icon: Scale },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-600'
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
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Practice
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.practiceName || 'Not set'}
                  </p>
                </div>
                <ShieldCheck className="h-8 w-8 text-blue-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    NPI
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.practiceNPI || 'Not set'}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    EHR System
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.ehrSystem || 'Not connected'}
                  </p>
                </div>
                <Settings className="h-8 w-8 text-purple-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    HIPAA
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.isHipaaEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Requests Tab */}
      {selectedConfigId && activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">PA Requests</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['pa-requests'] })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {requestsQuery.isLoading ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                Loading requests...
              </div>
            ) : requestsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No PA requests found. Create your first request to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Request #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Payer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Urgency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {requestsQuery.data?.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {request.requestNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {request.patientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {request.payerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {request.serviceType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              URGENCY_VARIANTS[request.urgency] || 'neutral'
                            }
                          >
                            {request.urgency}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {STATUS_ICONS[request.status]}
                            <Badge
                              variant={
                                STATUS_VARIANTS[request.status] || 'neutral'
                              }
                            >
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-1">
                            {request.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  submitMutation.mutate(request.id)
                                }
                                disabled={submitMutation.isPending}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Submit
                              </Button>
                            )}
                            {['SUBMITTED', 'PENDING'].includes(
                              request.status,
                            ) && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  checkStatusMutation.mutate(request.id)
                                }
                                disabled={checkStatusMutation.isPending}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Check
                              </Button>
                            )}
                            {request.status === 'DENIED' &&
                              request.appealStatus === 'NOT_APPEALED' && (
                                <Button size="sm" variant="secondary">
                                  <Scale className="h-3 w-3 mr-1" />
                                  Appeal
                                </Button>
                              )}
                          </div>
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

      {/* Analytics Tab */}
      {selectedConfigId && activeTab === 'analytics' && analyticsQuery.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Summary</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <div className="text-3xl font-bold">
                    {analyticsQuery.data.summary.totalRequests}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Requests
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {analyticsQuery.data.summary.approvedRequests}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Approved
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {analyticsQuery.data.summary.deniedRequests}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Denied
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {analyticsQuery.data.summary.pendingRequests}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Pending
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {analyticsQuery.data.summary.approvalRate}%
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  Approval Rate
                </div>
              </div>
              {analyticsQuery.data.summary.avgTurnaround !== null && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {analyticsQuery.data.summary.avgTurnaround.toFixed(1)} days
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Avg. Turnaround
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Denial Reasons</h3>
            </CardHeader>
            <CardBody>
              {Object.keys(analyticsQuery.data.denialReasons).length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No denials recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analyticsQuery.data.denialReasons).map(
                    ([reason, count]) => (
                      <div
                        key={reason}
                        className="flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
                      >
                        <span className="text-sm">
                          {reason.replace(/_/g, ' ')}
                        </span>
                        <span className="text-lg font-semibold">{count}</span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Create Prior Auth Configuration
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

              <Input
                label="Practice Name"
                name="practiceName"
                placeholder="Healthcare Practice LLC"
              />
              <Input
                label="Practice NPI"
                name="practiceNPI"
                placeholder="1234567890"
                maxLength={10}
              />

              <Select label="EHR System" name="ehrSystem">
                <option value="">Select EHR...</option>
                <option value="epic">Epic</option>
                <option value="cerner">Cerner</option>
                <option value="drchrono">DrChrono</option>
                <option value="athenahealth">athenahealth</option>
                <option value="other">Other</option>
              </Select>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isHipaaEnabled" defaultChecked />
                  <span className="text-sm">Enable HIPAA Compliance</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="notifyOnSubmission"
                    defaultChecked
                  />
                  <span className="text-sm">Notify on Submission</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="notifyOnStatusChange"
                    defaultChecked
                  />
                  <span className="text-sm">Notify on Status Change</span>
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

export default PriorAuthPage;
