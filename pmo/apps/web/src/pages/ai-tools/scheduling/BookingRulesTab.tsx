/**
 * Booking Rules Tab
 * UI for managing booking modification rules, limits, and blackout dates
 */

import { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { Card, Button, Badge, Input } from '../../../ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl } from '../../../api/config';
import { buildOptions } from '../../../api/http';

interface BookingRulesTabProps {
  configId: number;
}

// ============================================================================
// TYPES
// ============================================================================

interface ModificationRules {
  allowReschedule: boolean;
  rescheduleMinHoursNotice: number;
  rescheduleMaxTimes: number;
  rescheduleFee: number;
  rescheduleFeeCurrency: string;
  allowCancel: boolean;
  cancelMinHoursNotice: number;
  cancelFee: number;
  cancelFeeCurrency: string;
  fullRefundHoursNotice: number;
  partialRefundPercent: number;
  noShowFee: number;
  noShowFeeCurrency: string;
  noShowCountMax: number;
}

interface BookingLimits {
  maxActiveBookingsPerCustomer: number;
  maxBookingsPerDay: number;
  maxBookingsPerProviderPerDay: number;
  minIntervalBetweenBookingsHours: number;
}

interface BufferSettings {
  bufferBetweenAppointmentsMin: number;
  bufferByAppointmentType: Record<
    string,
    { before: number; after: number }
  > | null;
  breakTimes: Array<{
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
  }> | null;
}

interface BlackoutDate {
  id: number;
  date: string;
  reason?: string;
  providerIds?: number[];
}

interface AllBookingRules {
  modificationRules: ModificationRules;
  bookingLimits: BookingLimits;
  bufferSettings: BufferSettings;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchBookingRules(configId: number): Promise<AllBookingRules> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/booking-rules`),
    buildOptions(),
  );
  if (!res.ok) throw new Error('Failed to fetch booking rules');
  const data = await res.json();
  return data.data;
}

async function updateBookingRules(
  configId: number,
  updates: Partial<AllBookingRules>,
): Promise<AllBookingRules> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/booking-rules`),
    {
      ...buildOptions(),
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
  );
  if (!res.ok) throw new Error('Failed to update booking rules');
  const data = await res.json();
  return data.data;
}

async function fetchBlackoutDates(configId: number): Promise<BlackoutDate[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/booking-rules/blackout-dates`),
    buildOptions(),
  );
  if (!res.ok) throw new Error('Failed to fetch blackout dates');
  const data = await res.json();
  return data.data;
}

async function addBlackoutDate(
  configId: number,
  blackout: { date: string; reason?: string },
): Promise<BlackoutDate> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/booking-rules/blackout-dates`),
    {
      ...buildOptions(),
      method: 'POST',
      body: JSON.stringify(blackout),
    },
  );
  if (!res.ok) throw new Error('Failed to add blackout date');
  const data = await res.json();
  return data.data;
}

async function removeBlackoutDate(
  configId: number,
  blackoutId: number,
): Promise<void> {
  const res = await fetch(
    buildApiUrl(
      `/scheduling/${configId}/booking-rules/blackout-dates/${blackoutId}`,
    ),
    {
      ...buildOptions(),
      method: 'DELETE',
    },
  );
  if (!res.ok) throw new Error('Failed to remove blackout date');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingRulesTab({
  configId,
}: BookingRulesTabProps): JSX.Element {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'modification' | 'limits' | 'buffer' | 'blackout'
  >('modification');
  const [newBlackoutDate, setNewBlackoutDate] = useState('');
  const [newBlackoutReason, setNewBlackoutReason] = useState('');

  // Fetch data
  const rulesQuery = useQuery({
    queryKey: ['booking-rules', configId],
    queryFn: () => fetchBookingRules(configId),
  });

  const blackoutQuery = useQuery({
    queryKey: ['blackout-dates', configId],
    queryFn: () => fetchBlackoutDates(configId),
  });

  // Mutations
  const updateRulesMutation = useMutation({
    mutationFn: (updates: Partial<AllBookingRules>) =>
      updateBookingRules(configId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-rules', configId] });
    },
  });

  const addBlackoutMutation = useMutation({
    mutationFn: (blackout: { date: string; reason?: string }) =>
      addBlackoutDate(configId, blackout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackout-dates', configId] });
      setNewBlackoutDate('');
      setNewBlackoutReason('');
    },
  });

  const removeBlackoutMutation = useMutation({
    mutationFn: (blackoutId: number) =>
      removeBlackoutDate(configId, blackoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackout-dates', configId] });
    },
  });

  const rules = rulesQuery.data;
  const blackoutDates = blackoutQuery.data ?? [];

  const tabs = [
    { id: 'modification', label: 'Modification Rules', icon: RefreshCw },
    { id: 'limits', label: 'Booking Limits', icon: Users },
    { id: 'buffer', label: 'Buffer Times', icon: Clock },
    { id: 'blackout', label: 'Blackout Dates', icon: Ban },
  ] as const;

  if (rulesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Modification Rules */}
      {activeTab === 'modification' && rules && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold dark:text-neutral-100">
              Modification Rules
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Configure rules for rescheduling, cancellation, and no-shows.
            </p>
          </div>

          {/* Reschedule Settings */}
          <Card>
            <h4 className="mb-4 font-medium dark:text-neutral-100">
              Reschedule Policy
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium dark:text-neutral-100">
                    Allow Rescheduling
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Let customers reschedule appointments
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateRulesMutation.mutate({
                      modificationRules: {
                        ...rules.modificationRules,
                        allowReschedule:
                          !rules.modificationRules.allowReschedule,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rules.modificationRules.allowReschedule
                      ? 'bg-blue-600'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      rules.modificationRules.allowReschedule
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {rules.modificationRules.allowReschedule && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Minimum Notice (hours)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="168"
                      value={rules.modificationRules.rescheduleMinHoursNotice}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          updateRulesMutation.mutate({
                            modificationRules: {
                              ...rules.modificationRules,
                              rescheduleMinHoursNotice: value,
                            },
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Max Reschedules
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={rules.modificationRules.rescheduleMaxTimes}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          updateRulesMutation.mutate({
                            modificationRules: {
                              ...rules.modificationRules,
                              rescheduleMaxTimes: value,
                            },
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Reschedule Fee ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rules.modificationRules.rescheduleFee}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          updateRulesMutation.mutate({
                            modificationRules: {
                              ...rules.modificationRules,
                              rescheduleFee: value,
                            },
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Cancellation Settings */}
          <Card>
            <h4 className="mb-4 font-medium dark:text-neutral-100">
              Cancellation Policy
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium dark:text-neutral-100">
                    Allow Cancellation
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Let customers cancel appointments
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateRulesMutation.mutate({
                      modificationRules: {
                        ...rules.modificationRules,
                        allowCancel: !rules.modificationRules.allowCancel,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rules.modificationRules.allowCancel
                      ? 'bg-blue-600'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      rules.modificationRules.allowCancel
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {rules.modificationRules.allowCancel && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Minimum Notice (hours)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="168"
                      value={rules.modificationRules.cancelMinHoursNotice}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          updateRulesMutation.mutate({
                            modificationRules: {
                              ...rules.modificationRules,
                              cancelMinHoursNotice: value,
                            },
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Cancellation Fee ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rules.modificationRules.cancelFee}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          updateRulesMutation.mutate({
                            modificationRules: {
                              ...rules.modificationRules,
                              cancelFee: value,
                            },
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Full Refund Notice (hours)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="168"
                      value={rules.modificationRules.fullRefundHoursNotice}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          updateRulesMutation.mutate({
                            modificationRules: {
                              ...rules.modificationRules,
                              fullRefundHoursNotice: value,
                            },
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Partial Refund (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={rules.modificationRules.partialRefundPercent}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          updateRulesMutation.mutate({
                            modificationRules: {
                              ...rules.modificationRules,
                              partialRefundPercent: value,
                            },
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* No-Show Settings */}
          <Card>
            <h4 className="mb-4 font-medium dark:text-neutral-100">
              No-Show Policy
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  No-Show Fee ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rules.modificationRules.noShowFee}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      updateRulesMutation.mutate({
                        modificationRules: {
                          ...rules.modificationRules,
                          noShowFee: value,
                        },
                      });
                    }
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Max No-Shows Before Block
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={rules.modificationRules.noShowCountMax}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      updateRulesMutation.mutate({
                        modificationRules: {
                          ...rules.modificationRules,
                          noShowCountMax: value,
                        },
                      });
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Booking Limits */}
      {activeTab === 'limits' && rules && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold dark:text-neutral-100">
              Booking Limits
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Set limits to manage capacity and prevent overbooking.
            </p>
          </div>

          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium dark:text-neutral-100">
                  Max Active Bookings per Customer
                </label>
                <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Maximum upcoming appointments per customer
                </p>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={rules.bookingLimits.maxActiveBookingsPerCustomer}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      updateRulesMutation.mutate({
                        bookingLimits: {
                          ...rules.bookingLimits,
                          maxActiveBookingsPerCustomer: value,
                        },
                      });
                    }
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium dark:text-neutral-100">
                  Max Bookings per Day
                </label>
                <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Total daily capacity across all providers
                </p>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={rules.bookingLimits.maxBookingsPerDay}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      updateRulesMutation.mutate({
                        bookingLimits: {
                          ...rules.bookingLimits,
                          maxBookingsPerDay: value,
                        },
                      });
                    }
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium dark:text-neutral-100">
                  Max Bookings per Provider per Day
                </label>
                <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Individual provider daily limit
                </p>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={rules.bookingLimits.maxBookingsPerProviderPerDay}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      updateRulesMutation.mutate({
                        bookingLimits: {
                          ...rules.bookingLimits,
                          maxBookingsPerProviderPerDay: value,
                        },
                      });
                    }
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium dark:text-neutral-100">
                  Min Interval Between Bookings (hours)
                </label>
                <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Minimum time between same customer bookings
                </p>
                <Input
                  type="number"
                  min="0"
                  max="168"
                  value={rules.bookingLimits.minIntervalBetweenBookingsHours}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      updateRulesMutation.mutate({
                        bookingLimits: {
                          ...rules.bookingLimits,
                          minIntervalBetweenBookingsHours: value,
                        },
                      });
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Buffer Times */}
      {activeTab === 'buffer' && rules && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold dark:text-neutral-100">
              Buffer Times
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Set time buffers between appointments and break times.
            </p>
          </div>

          <Card>
            <h4 className="mb-4 font-medium dark:text-neutral-100">
              Default Buffer
            </h4>
            <div>
              <label className="mb-1 block text-sm font-medium dark:text-neutral-100">
                Buffer Between Appointments (minutes)
              </label>
              <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                Time added between consecutive appointments
              </p>
              <Input
                type="number"
                min="0"
                max="120"
                value={rules.bufferSettings.bufferBetweenAppointmentsMin}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value)) {
                    updateRulesMutation.mutate({
                      bufferSettings: {
                        ...rules.bufferSettings,
                        bufferBetweenAppointmentsMin: value,
                      },
                    });
                  }
                }}
                className="max-w-xs"
              />
            </div>
          </Card>

          <Card>
            <h4 className="mb-4 font-medium dark:text-neutral-100">
              Break Times
            </h4>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              Define recurring break times when no appointments can be booked.
            </p>
            {rules.bufferSettings.breakTimes &&
            rules.bufferSettings.breakTimes.length > 0 ? (
              <div className="space-y-2">
                {rules.bufferSettings.breakTimes.map((breakTime, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded border border-neutral-200 dark:border-neutral-700 p-3"
                  >
                    <span className="font-medium dark:text-neutral-100">
                      {breakTime.startTime} - {breakTime.endTime}
                    </span>
                    <div className="flex gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
                        (day, dayIdx) => (
                          <Badge
                            key={dayIdx}
                            variant={
                              breakTime.daysOfWeek.includes(dayIdx)
                                ? 'default'
                                : 'secondary'
                            }
                            className="h-6 w-6 justify-center p-0 text-xs"
                          >
                            {day}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                No break times configured
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Break Time
            </Button>
          </Card>
        </div>
      )}

      {/* Blackout Dates */}
      {activeTab === 'blackout' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold dark:text-neutral-100">
              Blackout Dates
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Block specific dates from accepting appointments.
            </p>
          </div>

          {/* Add New Blackout */}
          <Card>
            <h4 className="mb-4 font-medium dark:text-neutral-100">
              Add Blackout Date
            </h4>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="date"
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Reason (optional)"
                  value={newBlackoutReason}
                  onChange={(e) => setNewBlackoutReason(e.target.value)}
                />
              </div>
              <Button
                onClick={() =>
                  addBlackoutMutation.mutate({
                    date: new Date(newBlackoutDate).toISOString(),
                    reason: newBlackoutReason || undefined,
                  })
                }
                disabled={!newBlackoutDate || addBlackoutMutation.isPending}
              >
                {addBlackoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          </Card>

          {/* Existing Blackout Dates */}
          <Card>
            <h4 className="mb-4 font-medium dark:text-neutral-100">
              Upcoming Blackout Dates
            </h4>
            {blackoutDates.length > 0 ? (
              <div className="space-y-2">
                {blackoutDates.map((blackout) => (
                  <div
                    key={blackout.id}
                    className="flex items-center justify-between rounded border border-neutral-200 dark:border-neutral-700 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                        <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium dark:text-neutral-100">
                          {new Date(blackout.date).toLocaleDateString(
                            undefined,
                            {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            },
                          )}
                        </p>
                        {blackout.reason && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {blackout.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBlackoutMutation.mutate(blackout.id)}
                      disabled={removeBlackoutMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                No blackout dates set
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Save Indicator */}
      {updateRulesMutation.isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
