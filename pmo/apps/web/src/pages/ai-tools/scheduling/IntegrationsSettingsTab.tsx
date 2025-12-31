/**
 * Integrations Settings Tab
 * UI for managing calendar, video, and payment integrations
 */

import { useState } from 'react';
import {
  Calendar,
  Video,
  CreditCard,
  Bell,
  ExternalLink,
  Check,
  Loader2,
  Settings,
  Trash2,
} from 'lucide-react';
import { Card, Button, Badge } from '../../../ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl } from '../../../api/config';
import { buildOptions } from '../../../api/http';
import { VideoSettingsModal } from './VideoSettingsModal';

interface IntegrationsSettingsTabProps {
  configId: number;
}

// ============================================================================
// TYPES
// ============================================================================

interface CalendarIntegration {
  id: number;
  platform: 'GOOGLE' | 'OUTLOOK';
  calendarId: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  provider?: { id: number; name: string } | null;
}

interface VideoConfig {
  id: number;
  platform: 'ZOOM' | 'GOOGLE_MEET' | 'TEAMS';
  isActive: boolean;
  defaultSettings?: {
    autoRecord?: boolean;
    waitingRoom?: boolean;
    muteParticipantsOnEntry?: boolean;
    joinBeforeHost?: boolean;
    defaultDurationMinutes?: number;
  };
  createdAt: string;
}

interface PaymentConfig {
  id: number;
  configId: number;
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
  collectPaymentAt: 'BOOKING' | 'APPOINTMENT' | 'NONE';
  currency: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchCalendarIntegrations(
  configId: number,
): Promise<CalendarIntegration[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/calendar/integrations/${configId}`),
    buildOptions(),
  );
  if (!res.ok) throw new Error('Failed to fetch calendar integrations');
  const data = await res.json();
  return data.data;
}

async function initiateCalendarOAuth(
  configId: number,
  platform: 'GOOGLE' | 'OUTLOOK',
): Promise<{ authUrl: string }> {
  const res = await fetch(buildApiUrl('/scheduling/calendar/oauth/initiate'), {
    ...buildOptions(),
    method: 'POST',
    body: JSON.stringify({ configId, platform }),
  });
  if (!res.ok) throw new Error('Failed to initiate OAuth');
  const data = await res.json();
  return data.data;
}

async function deleteCalendarIntegration(integrationId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/calendar/integrations/${integrationId}`),
    {
      ...buildOptions(),
      method: 'DELETE',
    },
  );
  if (!res.ok) throw new Error('Failed to delete integration');
}

async function fetchVideoConfigs(configId: number): Promise<VideoConfig[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/video/config`),
    buildOptions(),
  );
  if (!res.ok) throw new Error('Failed to fetch video configs');
  const data = await res.json();
  return data.data;
}

async function getVideoOAuthUrl(
  configId: number,
  platform: string,
): Promise<{ authUrl: string }> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/video/oauth/${platform}`),
    buildOptions(),
  );
  if (!res.ok) throw new Error('Failed to get OAuth URL');
  const data = await res.json();
  return data.data;
}

async function deleteVideoConfig(
  configId: number,
  videoConfigId: number,
): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/video/config/${videoConfigId}`),
    {
      ...buildOptions(),
      method: 'DELETE',
    },
  );
  if (!res.ok) throw new Error('Failed to delete video config');
}

async function fetchPaymentConfig(
  configId: number,
): Promise<PaymentConfig | null> {
  const res = await fetch(
    buildApiUrl(`/scheduling/payments/config/${configId}`),
    buildOptions(),
  );
  if (!res.ok) throw new Error('Failed to fetch payment config');
  const data = await res.json();
  return data.data;
}

async function updatePaymentConfig(
  configId: number,
  updates: Partial<PaymentConfig>,
): Promise<PaymentConfig> {
  const res = await fetch(
    buildApiUrl(`/scheduling/payments/config/${configId}`),
    {
      ...buildOptions(),
      method: 'PUT',
      body: JSON.stringify(updates),
    },
  );
  if (!res.ok) throw new Error('Failed to update payment config');
  const data = await res.json();
  return data.data;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function IntegrationsSettingsTab({
  configId,
}: IntegrationsSettingsTabProps): JSX.Element {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<
    'calendar' | 'video' | 'payment' | 'notifications'
  >('calendar');
  const [selectedVideoConfig, setSelectedVideoConfig] =
    useState<VideoConfig | null>(null);

  // Fetch data
  const calendarQuery = useQuery({
    queryKey: ['calendar-integrations', configId],
    queryFn: () => fetchCalendarIntegrations(configId),
  });

  const videoQuery = useQuery({
    queryKey: ['video-configs', configId],
    queryFn: () => fetchVideoConfigs(configId),
  });

  const paymentQuery = useQuery({
    queryKey: ['payment-config', configId],
    queryFn: () => fetchPaymentConfig(configId),
  });

  // Mutations
  const connectCalendarMutation = useMutation({
    mutationFn: (platform: 'GOOGLE' | 'OUTLOOK') =>
      initiateCalendarOAuth(configId, platform),
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: deleteCalendarIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['calendar-integrations', configId],
      });
    },
  });

  const connectVideoMutation = useMutation({
    mutationFn: (platform: string) => getVideoOAuthUrl(configId, platform),
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
  });

  const disconnectVideoMutation = useMutation({
    mutationFn: (videoConfigId: number) =>
      deleteVideoConfig(configId, videoConfigId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['video-configs', configId],
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: (updates: Partial<PaymentConfig>) =>
      updatePaymentConfig(configId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payment-config', configId],
      });
    },
  });

  const calendarIntegrations = calendarQuery.data ?? [];
  const videoConfigs = videoQuery.data ?? [];
  const paymentConfig = paymentQuery.data;

  const sections = [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'payment', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 sm:gap-2 border-b pb-4 min-w-max">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Integrations */}
      {activeSection === 'calendar' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Calendar Integrations</h3>
            <p className="text-sm text-gray-600">
              Sync appointments with your calendar to keep everything organized.
            </p>
          </div>

          {/* Connected Calendars */}
          {calendarIntegrations.length > 0 && (
            <Card>
              <h4 className="mb-3 font-medium">Connected Calendars</h4>
              <div className="space-y-3">
                {calendarIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {integration.platform === 'GOOGLE' ? (
                          <span className="text-lg font-bold text-red-500">
                            G
                          </span>
                        ) : (
                          <span className="text-lg font-bold text-blue-500">
                            O
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {integration.platform === 'GOOGLE'
                            ? 'Google Calendar'
                            : 'Outlook Calendar'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {integration.calendarId}
                        </p>
                        {integration.lastSyncAt && (
                          <p className="text-xs text-gray-400">
                            Last synced:{' '}
                            {new Date(integration.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {integration.syncEnabled ? (
                        <Badge variant="success">
                          <Check className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          disconnectCalendarMutation.mutate(integration.id)
                        }
                        disabled={disconnectCalendarMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Connect New Calendar */}
          <Card>
            <h4 className="mb-3 font-medium">Connect a Calendar</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => connectCalendarMutation.mutate('GOOGLE')}
                disabled={connectCalendarMutation.isPending}
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <span className="text-lg font-bold text-red-500">G</span>
                </div>
                <div className="text-left">
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-gray-500">
                    Sync with Google Calendar
                  </p>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={() => connectCalendarMutation.mutate('OUTLOOK')}
                disabled={connectCalendarMutation.isPending}
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <span className="text-lg font-bold text-blue-500">O</span>
                </div>
                <div className="text-left">
                  <p className="font-medium">Outlook Calendar</p>
                  <p className="text-sm text-gray-500">
                    Sync with Microsoft Outlook
                  </p>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-gray-400" />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Video Integrations */}
      {activeSection === 'video' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Video Conferencing</h3>
            <p className="text-sm text-gray-600">
              Automatically create video meetings for appointments.
            </p>
          </div>

          {/* Connected Video Platforms */}
          {videoConfigs.length > 0 && (
            <Card>
              <h4 className="mb-3 font-medium">Connected Platforms</h4>
              <div className="space-y-3">
                {videoConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                        <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {config.platform === 'ZOOM'
                            ? 'Zoom'
                            : config.platform === 'GOOGLE_MEET'
                              ? 'Google Meet'
                              : 'Microsoft Teams'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Connected{' '}
                          {new Date(config.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {config.isActive ? (
                        <Badge variant="success">
                          <Check className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVideoConfig(config)}
                        title="Configure settings"
                      >
                        <Settings className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          disconnectVideoMutation.mutate(config.id)
                        }
                        disabled={disconnectVideoMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Video Settings Modal */}
          {selectedVideoConfig && (
            <VideoSettingsModal
              configId={configId}
              videoConfig={selectedVideoConfig}
              onClose={() => setSelectedVideoConfig(null)}
            />
          )}

          {/* Connect Video Platform */}
          <Card>
            <h4 className="mb-3 font-medium">Connect a Platform</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {['ZOOM', 'GOOGLE_MEET', 'TEAMS'].map((platform) => {
                const isConnected = videoConfigs.some(
                  (c) => c.platform === platform,
                );
                return (
                  <button
                    key={platform}
                    onClick={() =>
                      !isConnected && connectVideoMutation.mutate(platform)
                    }
                    disabled={connectVideoMutation.isPending || isConnected}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 ${
                      isConnected ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <Video className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="font-medium">
                      {platform === 'ZOOM'
                        ? 'Zoom'
                        : platform === 'GOOGLE_MEET'
                          ? 'Google Meet'
                          : 'MS Teams'}
                    </p>
                    {isConnected && (
                      <Badge variant="success" className="text-xs">
                        Connected
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Payment Settings */}
      {activeSection === 'payment' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Payment Settings</h3>
            <p className="text-sm text-gray-600">
              Configure payment collection for appointments.
            </p>
          </div>

          <Card>
            <div className="space-y-4">
              {/* Stripe Connection Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Stripe</p>
                    <p className="text-sm text-gray-500">
                      {paymentConfig?.stripeOnboarded
                        ? 'Connected and ready to accept payments'
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                {paymentConfig?.stripeOnboarded ? (
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm">
                    Connect Stripe
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Payment Timing */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Collect Payment
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      value: 'BOOKING',
                      label: 'At Booking',
                      desc: 'Pay when booking',
                    },
                    {
                      value: 'APPOINTMENT',
                      label: 'At Appointment',
                      desc: 'Pay at time of service',
                    },
                    {
                      value: 'NONE',
                      label: 'No Payment',
                      desc: 'Free appointments',
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        updatePaymentMutation.mutate({
                          collectPaymentAt: option.value as
                            | 'BOOKING'
                            | 'APPOINTMENT'
                            | 'NONE',
                        })
                      }
                      className={`rounded-lg border p-3 text-left ${
                        paymentConfig?.collectPaymentAt === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-gray-500">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Currency
                </label>
                <select
                  value={paymentConfig?.currency || 'usd'}
                  onChange={(e) =>
                    updatePaymentMutation.mutate({ currency: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="usd">USD - US Dollar</option>
                  <option value="eur">EUR - Euro</option>
                  <option value="gbp">GBP - British Pound</option>
                  <option value="cad">CAD - Canadian Dollar</option>
                  <option value="aud">AUD - Australian Dollar</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Notification Settings */}
      {activeSection === 'notifications' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Notification Settings</h3>
            <p className="text-sm text-gray-600">
              Configure how and when notifications are sent.
            </p>
          </div>

          <Card>
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">
                      Booking confirmations and reminders
                    </p>
                  </div>
                </div>
                <Badge variant="success">
                  <Check className="mr-1 h-3 w-3" />
                  Enabled
                </Badge>
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Bell className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-gray-500">
                      Text message reminders (requires Twilio)
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                  <Settings className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Reminder Settings */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Reminder Timing
                </label>
                <p className="mb-3 text-sm text-gray-500">
                  Send reminders before appointments
                </p>
                <div className="flex flex-wrap gap-2">
                  {[24, 12, 4, 1].map((hours) => (
                    <Badge key={hours} variant="secondary">
                      {hours} {hours === 1 ? 'hour' : 'hours'} before
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {(calendarQuery.isLoading ||
        videoQuery.isLoading ||
        paymentQuery.isLoading) && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
