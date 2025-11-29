/**
 * AI Scheduling Assistant Page
 *
 * Tool 1.3: AI-powered scheduling with no-show prediction and automated reminders
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
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
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  User,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// Types
interface SchedulingConfig {
  id: number;
  clientId: number;
  practiceName: string | null;
  timezone: string;
  enableNoShowPrediction: boolean;
  enableReminders: boolean;
  enableWaitlist: boolean;
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
  const res = await fetch('/api/scheduling/configs', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch configs');
  const data = await res.json();
  return data.configs || [];
}

async function fetchProviders(configId: number): Promise<Provider[]> {
  const res = await fetch(`/api/scheduling/${configId}/providers`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch providers');
  const data = await res.json();
  return data.providers || [];
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
    `/api/scheduling/${configId}/appointments?${searchParams}`,
    {
      credentials: 'include',
    },
  );
  if (!res.ok) throw new Error('Failed to fetch appointments');
  const data = await res.json();
  return data.appointments || [];
}

async function updateAppointmentStatus(
  appointmentId: number,
  status: string,
): Promise<Appointment> {
  const res = await fetch(
    `/api/scheduling/appointments/${appointmentId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error('Failed to update appointment status');
  const result = await res.json();
  return result.appointment;
}

async function createConfig(
  clientId: number,
  data: Partial<SchedulingConfig>,
): Promise<SchedulingConfig> {
  const res = await fetch(`/api/clients/${clientId}/scheduling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create config');
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
    'calendar' | 'appointments' | 'providers' | 'analytics'
  >('calendar');
  const [showCreateConfigModal, setShowCreateConfigModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['scheduling-configs'],
    queryFn: fetchConfigs,
  });

  const providersQuery = useQuery({
    queryKey: ['scheduling-providers', selectedConfigId],
    queryFn: () => fetchProviders(selectedConfigId!),
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

  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);

  const clients = clientsQuery.data ?? [];
  const providers = providersQuery.data ?? [];
  const appointments = appointmentsQuery.data ?? [];

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
      clientId,
      data,
    }: {
      clientId: number;
      data: Partial<SchedulingConfig>;
    }) => createConfig(clientId, data),
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

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createConfigMutation.mutate({
      clientId: Number(formData.get('clientId')),
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
    <div className="min-h-screen bg-neutral-50">
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
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
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
          <div className="flex gap-2 border-b border-neutral-200">
            {[
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'appointments', label: 'Appointments', icon: Clock },
              { id: 'providers', label: 'Providers', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        {!selectedConfig ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">
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
              <Card className="border-orange-200 bg-orange-50">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-orange-800">
                        {highRiskAppointments.length} appointments with high
                        no-show risk
                      </p>
                      <p className="text-sm text-orange-600">
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
                        <p className="text-center text-neutral-500 py-8">
                          Loading...
                        </p>
                      ) : appointments.length === 0 ? (
                        <p className="text-center text-neutral-500 py-8">
                          No appointments scheduled for this date.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {appointments.map((appt) => (
                            <div
                              key={appt.id}
                              className={`p-4 rounded-lg border ${
                                appt.noShowRiskScore &&
                                appt.noShowRiskScore > 0.5
                                  ? 'border-orange-200 bg-orange-50'
                                  : 'border-neutral-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">
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
                                          % no-show risk
                                        </Badge>
                                      )}
                                  </div>
                                  <p className="text-sm text-neutral-600">
                                    {formatTime(appt.scheduledAt)} (
                                    {appt.durationMinutes} min)
                                  </p>
                                  {appt.provider && (
                                    <p className="text-sm text-neutral-500">
                                      Provider: {appt.provider.name}
                                    </p>
                                  )}
                                  {appt.appointmentType && (
                                    <p className="text-sm text-neutral-500">
                                      Type: {appt.appointmentType.name}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {appt.status === 'SCHEDULED' && (
                                    <>
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
                                      </Button>
                                    </>
                                  )}
                                </div>
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
                          <span className="text-neutral-600">Total Today</span>
                          <span className="font-semibold">
                            {appointments.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600">Confirmed</span>
                          <span className="font-semibold text-green-600">
                            {
                              appointments.filter(
                                (a) => a.status === 'CONFIRMED',
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600">Pending</span>
                          <span className="font-semibold text-blue-600">
                            {
                              appointments.filter(
                                (a) => a.status === 'SCHEDULED',
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600">High Risk</span>
                          <span className="font-semibold text-orange-600">
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
                        <p className="text-sm text-neutral-500">
                          No providers configured.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {providers.slice(0, 5).map((provider) => (
                            <div
                              key={provider.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <User className="w-4 h-4 text-neutral-400" />
                              <span>{provider.name}</span>
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
                      <p className="text-center text-neutral-500">
                        Loading appointments...
                      </p>
                    </CardBody>
                  </Card>
                ) : appointments.length === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500">
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
                              <span className="font-medium">
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
                            <p className="text-sm text-neutral-600">
                              {new Date(appt.scheduledAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-neutral-500">
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
                    <h3 className="text-lg font-semibold">Providers</h3>
                    <Button size="sm">
                      <Plus className="w-4 h-4" />
                      Add Provider
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {providers.length === 0 ? (
                    <p className="text-center text-neutral-500 py-8">
                      No providers configured. Add providers to enable
                      scheduling.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {providers.map((provider) => (
                        <div
                          key={provider.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-medium">{provider.name}</p>
                              {provider.specialty && (
                                <p className="text-sm text-neutral-500">
                                  {provider.specialty}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={provider.isActive ? 'success' : 'neutral'}
                          >
                            {provider.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600">
                      {selectedConfig._count?.appointments ?? 0}
                    </p>
                    <p className="text-sm text-neutral-600">
                      Total Appointments
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600">
                      {selectedConfig._count?.providers ?? 0}
                    </p>
                    <p className="text-sm text-neutral-600">Active Providers</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600">
                      {selectedConfig._count?.appointmentTypes ?? 0}
                    </p>
                    <p className="text-sm text-neutral-600">
                      Appointment Types
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-orange-600">
                      {highRiskAppointments.length}
                    </p>
                    <p className="text-sm text-neutral-600">
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
                <Select label="Client" name="clientId" required>
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
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
              <p className="text-neutral-500 text-center py-8">
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
    </div>
  );
}

export default SchedulingPage;
