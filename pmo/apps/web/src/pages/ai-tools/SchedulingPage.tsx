/**
 * AI Scheduling Assistant Page
 *
 * Tool 1.3: AI-powered scheduling with no-show prediction and automated reminders
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
import { useAccounts } from '../../api/hooks/crm';
import {
  Plus,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  User,
  CheckCircle,
  XCircle,
  Briefcase,
  Brain,
  Tag,
  Settings,
  Edit2,
} from 'lucide-react';
import {
  ShiftSchedulingTab,
  AIInsightsTab,
  IntegrationsSettingsTab,
  ProviderFormModal,
  AppointmentTypeFormModal,
} from './scheduling';

// Types
interface SchedulingConfig {
  id: number;
  accountId: number | null; // Primary reference (preferred)
  clientId: number | null; // Legacy reference (deprecated)
  practiceName: string | null;
  timezone: string;
  enableNoShowPrediction: boolean;
  enableReminders: boolean;
  enableWaitlist: boolean;
  account?: { id: number; name: string; industry: string | null };
  client?: { id: number; name: string };
  _count?: {
    providers: number;
    appointments: number;
    appointmentTypes: number;
  };
}

interface Provider {
  id: number;
  name: string;
  email: string | null;
  specialty: string | null;
  isActive: boolean;
}

interface AppointmentType {
  id: number;
  name: string;
  durationMinutes: number;
  color: string | null;
  isActive: boolean;
}

interface Appointment {
  id: number;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  noShowRiskScore: number | null;
  provider?: Provider;
  appointmentType?: AppointmentType;
}

const STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  SCHEDULED: 'primary',
  CONFIRMED: 'primary',
  CHECKED_IN: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'secondary',
  RESCHEDULED: 'neutral',
};

// API functions
async function fetchConfigs(): Promise<SchedulingConfig[]> {
  const res = await fetch(buildApiUrl('/scheduling/configs'), buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchProviders(configId: number): Promise<Provider[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/providers`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch providers') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.providers || [];
}

async function fetchAppointmentTypes(
  configId: number,
): Promise<AppointmentType[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/appointment-types`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch appointment types') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointmentTypes || [];
}

async function fetchAppointments(
  configId: number,
  params: { date?: string; providerId?: number; status?: string },
): Promise<Appointment[]> {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.append('date', params.date);
  if (params.providerId)
    searchParams.append('providerId', params.providerId.toString());
  if (params.status) searchParams.append('status', params.status);

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/appointments?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch appointments') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointments || [];
}

async function updateAppointmentStatus(
  appointmentId: number,
  status: string,
): Promise<Appointment> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointments/${appointmentId}/status`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update appointment status') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.appointment;
}

async function createConfigForAccount(
  accountId: number,
  data: Partial<SchedulingConfig>,
): Promise<SchedulingConfig> {
  const res = await fetch(
    buildApiUrl(`/accounts/${accountId}/scheduling`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

function SchedulingPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    | 'calendar'
    | 'appointments'
    | 'providers'
    | 'appointment-types'
    | 'integrations'
    | 'analytics'
    | 'shifts'
    | 'ai-insights'
  >('calendar');
  const [showCreateConfigModal, setShowCreateConfigModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showAppointmentTypeModal, setShowAppointmentTypeModal] =
    useState(false);
  const [editingAppointmentType, setEditingAppointmentType] =
    useState<AppointmentType | null>(null);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const accountsQuery = useAccounts({ archived: false });
  const configsQuery = useQuery({
    queryKey: ['scheduling-configs'],
    queryFn: fetchConfigs,
  });

  const providersQuery = useQuery({
    queryKey: ['scheduling-providers', selectedConfigId],
    queryFn: () => fetchProviders(selectedConfigId!),
    enabled: !!selectedConfigId,
  });

  const appointmentTypesQuery = useQuery({
    queryKey: ['scheduling-appointment-types', selectedConfigId],
    queryFn: () => fetchAppointmentTypes(selectedConfigId!),
    enabled: !!selectedConfigId,
  });

  const appointmentsQuery = useQuery({
    queryKey: [
      'scheduling-appointments',
      selectedConfigId,
      selectedDate,
      selectedProviderId,
      statusFilter,
    ],
    queryFn: () =>
      fetchAppointments(selectedConfigId!, {
        date: selectedDate,
        providerId: selectedProviderId ? Number(selectedProviderId) : undefined,
        status: statusFilter || undefined,
      }),
    enabled: !!selectedConfigId && activeTab === 'appointments',
  });

  // Redirect to login on 401 errors from queries
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(accountsQuery.error);
  useRedirectOnUnauthorized(providersQuery.error);
  useRedirectOnUnauthorized(appointmentsQuery.error);
  useRedirectOnUnauthorized(appointmentTypesQuery.error);

  const accounts = accountsQuery.data?.data ?? [];
  const providers = providersQuery.data ?? [];
  const appointments = appointmentsQuery.data ?? [];
  const appointmentTypes = appointmentTypesQuery.data ?? [];

  const selectedConfig = useMemo(() => {
    const configList = configsQuery.data ?? [];
    if (!selectedConfigId) return null;
    return configList.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const filteredConfigs = useMemo(() => {
    const configList = configsQuery.data ?? [];
    if (!selectedClientId) return configList;
    return configList.filter((c) => c.clientId === Number(selectedClientId));
  }, [configsQuery.data, selectedClientId]);

  // High-risk appointments (no-show prediction)
  const highRiskAppointments = useMemo(() => {
    const appointmentList = appointmentsQuery.data ?? [];
    return appointmentList.filter(
      (a) => a.noShowRiskScore && a.noShowRiskScore > 0.5,
    );
  }, [appointmentsQuery.data]);

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: ({
      accountId,
      data,
    }: {
      accountId: number;
      data: Partial<SchedulingConfig>;
    }) => createConfigForAccount(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-configs'] });
      setShowCreateConfigModal(false);
      showToast('Scheduling configuration created successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to create config',
        'error',
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      appointmentId,
      status,
    }: {
      appointmentId: number;
      status: string;
    }) => updateAppointmentStatus(appointmentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-appointments'] });
      showToast('Appointment status updated', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to update status',
        'error',
      );
    },
  });

  // Redirect to login on 401 errors from mutations
  useRedirectOnUnauthorized(createConfigMutation.error);
  useRedirectOnUnauthorized(updateStatusMutation.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createConfigMutation.mutate({
      accountId: Number(formData.get('accountId')),
      data: {
        practiceName: formData.get('practiceName') as string,
        timezone: formData.get('timezone') as string,
      },
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="AI Scheduling"
        description="Smart appointment scheduling with no-show prediction and automated reminders"
        actions={
          <Button onClick={() => setShowCreateConfigModal(true)}>
            <Plus className="w-4 h-4" />
            New Configuration
          </Button>
        }
      />

      <div className="container-padding py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="Client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">All Clients</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Configuration"
                value={selectedConfigId?.toString() || ''}
                onChange={(e) =>
                  setSelectedConfigId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Select a configuration...</option>
                {filteredConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.practiceName ||
                      config.account?.name ||
                      config.client?.name ||
                      `Config ${config.id}`}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                label="Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => configsQuery.refetch()}
                  disabled={configsQuery.isFetching}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${configsQuery.isFetching ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tab Navigation */}
        {selectedConfig && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1 sm:gap-2 border-b border-neutral-200 dark:border-neutral-700 min-w-max">
              {[
                { id: 'calendar', label: 'Calendar', icon: Calendar },
                { id: 'appointments', label: 'Appointments', icon: Clock },
                { id: 'providers', label: 'Providers', icon: Users },
                { id: 'appointment-types', label: 'Services', icon: Tag },
                { id: 'integrations', label: 'Integrations', icon: Settings },
                { id: 'shifts', label: 'Shifts', icon: Briefcase },
                { id: 'ai-insights', label: 'AI Insights', icon: Brain },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                    activeTab === id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        {!selectedConfig ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  Select a scheduling configuration to view appointments, or
                  create a new one.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* High Risk Alert */}
            {highRiskAppointments.length > 0 && activeTab !== 'analytics' && (
              <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        {highRiskAppointments.length} appointments with high
                        no-show risk
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-300">
                        Consider sending additional reminders or confirming
                        these appointments.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Appointments for{' '}
                          {new Date(selectedDate).toLocaleDateString()}
                        </h3>
                        <Button onClick={() => setShowBookModal(true)}>
                          <Plus className="w-4 h-4" />
                          Book Appointment
                        </Button>
                      </div>
                    </CardHeader>
                    <CardBody>
                      {appointmentsQuery.isLoading ? (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                          Loading...
                        </p>
                      ) : appointments.length === 0 ? (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                          No appointments scheduled for this date.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {appointments.map((appt) => (
                            <div
                              key={appt.id}
                              className={`p-3 sm:p-4 rounded-lg border ${
                                appt.noShowRiskScore &&
                                appt.noShowRiskScore > 0.5
                                  ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
                                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                      {appt.patientName}
                                    </span>
                                    <Badge
                                      variant={
                                        STATUS_VARIANTS[appt.status] ||
                                        'neutral'
                                      }
                                    >
                                      {appt.status.replace('_', ' ')}
                                    </Badge>
                                    {appt.noShowRiskScore &&
                                      appt.noShowRiskScore > 0.5 && (
                                        <Badge variant="warning">
                                          {Math.round(
                                            appt.noShowRiskScore * 100,
                                          )}
                                          % risk
                                        </Badge>
                                      )}
                                  </div>
                                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {formatTime(appt.scheduledAt)} (
                                    {appt.durationMinutes} min)
                                  </p>
                                  {appt.provider && (
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      Provider: {appt.provider.name}
                                    </p>
                                  )}
                                  {appt.appointmentType && (
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      Type: {appt.appointmentType.name}
                                    </p>
                                  )}
                                </div>
                                {appt.status === 'SCHEDULED' && (
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          appointmentId: appt.id,
                                          status: 'CONFIRMED',
                                        })
                                      }
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="sm:hidden ml-1">
                                        Confirm
                                      </span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          appointmentId: appt.id,
                                          status: 'CANCELLED',
                                        })
                                      }
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span className="sm:hidden ml-1">
                                        Cancel
                                      </span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Quick Stats</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">
                            Total Today
                          </span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {appointments.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">
                            Confirmed
                          </span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {
                              appointments.filter(
                                (a) => a.status === 'CONFIRMED',
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">
                            Pending
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {
                              appointments.filter(
                                (a) => a.status === 'SCHEDULED',
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">
                            High Risk
                          </span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {highRiskAppointments.length}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Providers</h3>
                    </CardHeader>
                    <CardBody>
                      {providers.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          No providers configured.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {providers.slice(0, 5).map((provider) => (
                            <div
                              key={provider.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                              <span className="text-neutral-900 dark:text-neutral-100">
                                {provider.name}
                              </span>
                              {provider.specialty && (
                                <Badge variant="neutral" className="text-xs">
                                  {provider.specialty}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-4">
                <Card>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Select
                        label="Provider"
                        value={selectedProviderId}
                        onChange={(e) => setSelectedProviderId(e.target.value)}
                      >
                        <option value="">All Providers</option>
                        {providers.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All Statuses</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="NO_SHOW">No Show</option>
                      </Select>
                    </div>
                  </CardBody>
                </Card>

                {appointmentsQuery.isLoading ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
                        Loading appointments...
                      </p>
                    </CardBody>
                  </Card>
                ) : appointments.length === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
                        No appointments found.
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  appointments.map((appt) => (
                    <Card key={appt.id}>
                      <CardBody>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                {appt.patientName}
                              </span>
                              <Badge
                                variant={
                                  STATUS_VARIANTS[appt.status] || 'neutral'
                                }
                              >
                                {appt.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {new Date(appt.scheduledAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {appt.provider?.name} -{' '}
                              {appt.appointmentType?.name}
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Service Providers</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingProvider(null);
                        setShowProviderModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Provider
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {providers.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                      <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                        No providers configured. Add providers to enable
                        scheduling.
                      </p>
                      <Button
                        onClick={() => {
                          setEditingProvider(null);
                          setShowProviderModal(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Your First Provider
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {providers.map((provider) => (
                        <div
                          key={provider.id}
                          className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                {provider.name}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {provider.specialty || 'General'}
                                {provider.email && ` • ${provider.email}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                provider.isActive ? 'success' : 'neutral'
                              }
                            >
                              {provider.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProvider(provider);
                                setShowProviderModal(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Appointment Types Tab */}
            {activeTab === 'appointment-types' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Appointment Types</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingAppointmentType(null);
                        setShowAppointmentTypeModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Type
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {appointmentTypes.length === 0 ? (
                    <div className="text-center py-8">
                      <Tag className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                      <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                        No appointment types configured. Create types to define
                        your services.
                      </p>
                      <Button
                        onClick={() => {
                          setEditingAppointmentType(null);
                          setShowAppointmentTypeModal(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Create Your First Type
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {appointmentTypes.map((type) => (
                        <div
                          key={type.id}
                          className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-8 rounded"
                                style={{
                                  backgroundColor: type.color || '#3B82F6',
                                }}
                              />
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {type.name}
                                </p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {type.durationMinutes} min
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingAppointmentType(type);
                                setShowAppointmentTypeModal(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={type.isActive ? 'success' : 'neutral'}
                            >
                              {type.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && selectedConfig && (
              <IntegrationsSettingsTab configId={selectedConfig.id} />
            )}

            {/* Shift Scheduling Tab */}
            {activeTab === 'shifts' && (
              <ShiftSchedulingTab configId={selectedConfig.id} />
            )}

            {/* AI Insights Tab */}
            {activeTab === 'ai-insights' && (
              <AIInsightsTab configId={selectedConfig.id} />
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {selectedConfig._count?.appointments ?? 0}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Total Appointments
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {selectedConfig._count?.providers ?? 0}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Active Providers
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {selectedConfig._count?.appointmentTypes ?? 0}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Appointment Types
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {highRiskAppointments.length}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      High-Risk (Today)
                    </p>
                  </CardBody>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Config Modal */}
      {showCreateConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold">
                New Scheduling Configuration
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <Select label="Account" name="accountId" required>
                  <option value="">Select an account...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Practice Name"
                  name="practiceName"
                  placeholder="e.g., Downtown Medical Center"
                />
                <Select label="Timezone" name="timezone">
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </Select>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateConfigModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createConfigMutation.isPending}
                  >
                    {createConfigMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold">Book Appointment</h2>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
                Appointment booking form coming soon. Configure providers and
                appointment types first.
              </p>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowBookModal(false)}
                >
                  Close
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Provider Form Modal */}
      {showProviderModal && selectedConfig && (
        <ProviderFormModal
          configId={selectedConfig.id}
          provider={editingProvider}
          onClose={() => {
            setShowProviderModal(false);
            setEditingProvider(null);
          }}
        />
      )}

      {/* Appointment Type Form Modal */}
      {showAppointmentTypeModal && selectedConfig && (
        <AppointmentTypeFormModal
          configId={selectedConfig.id}
          appointmentType={editingAppointmentType}
          onClose={() => {
            setShowAppointmentTypeModal(false);
            setEditingAppointmentType(null);
          }}
        />
      )}
    </div>
  );
}

export default SchedulingPage;
