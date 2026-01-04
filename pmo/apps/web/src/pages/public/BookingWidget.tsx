/**
 * Embeddable Booking Widget
 *
 * A lightweight, iframe-friendly booking component that can be
 * embedded on external websites. Supports customization via URL params.
 */

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  generateCalendarLinks,
  downloadICSFile,
} from '../../utils/calendarUtils';

// Types
interface WidgetConfig {
  id: number;
  slug: string;
  title: string;
  primaryColor: string;
  providers: {
    id: number;
    name: string;
    title: string | null;
  }[];
  appointmentTypes: {
    id: number;
    name: string;
    durationMinutes: number;
    price: number | null;
    currency: string | null;
  }[];
  config: {
    timezone: string;
    minAdvanceBookingHours: number;
    maxAdvanceBookingDays: number;
  };
}

interface TimeSlot {
  datetime: string;
  providerId: number | null;
  providerName: string | null;
  available: boolean;
}

interface BookingConfirmation {
  appointment: {
    id: number;
    confirmationCode: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    provider: { id: number; name: string } | null;
    appointmentType: { id: number; name: string } | null;
    videoMeetingUrl?: string;
  };
  confirmationCode: string;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// API functions
async function fetchWidgetConfig(slug: string): Promise<WidgetConfig> {
  const res = await fetch(`${API_BASE}/booking/${slug}`);
  if (!res.ok) throw new Error('Failed to load booking widget');
  return (await res.json()).data;
}

async function fetchWidgetAvailability(
  slug: string,
  params: {
    startDate: string;
    endDate: string;
    providerId?: number;
    appointmentTypeId?: number;
  },
): Promise<{ slots: TimeSlot[] }> {
  const searchParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  if (params.providerId)
    searchParams.set('providerId', params.providerId.toString());
  if (params.appointmentTypeId)
    searchParams.set('appointmentTypeId', params.appointmentTypeId.toString());

  const res = await fetch(
    `${API_BASE}/booking/${slug}/availability?${searchParams}`,
  );
  if (!res.ok) throw new Error('Failed to load availability');
  return (await res.json()).data;
}

async function createWidgetBooking(
  slug: string,
  data: {
    appointmentTypeId?: number;
    providerId?: number;
    scheduledAt: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    timezone?: string;
  },
): Promise<BookingConfirmation> {
  const res = await fetch(`${API_BASE}/booking/${slug}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create booking');
  }
  return (await res.json()).data;
}

// Format helpers
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getDaysInRange(start: Date, count: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Get user's timezone with fallback for older browsers
 */
function getUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    // Intl API not supported
  }
  // Fallback to UTC if timezone detection fails
  return 'UTC';
}

type WidgetStep = 'service' | 'time' | 'details' | 'done';

export function BookingWidget(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // URL-based customization
  const preselectedType = searchParams.get('type');
  const preselectedProvider = searchParams.get('provider');
  const hideHeader = searchParams.get('hideHeader') === 'true';
  const compactMode = searchParams.get('compact') === 'true';

  // State
  const [step, setStep] = useState<WidgetStep>('service');
  const [selectedType, setSelectedType] = useState<number | null>(
    preselectedType ? parseInt(preselectedType, 10) : null,
  );
  const [selectedProvider, setSelectedProvider] = useState<number | null>(
    preselectedProvider ? parseInt(preselectedProvider, 10) : null,
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Fetch config
  const {
    data: config,
    isLoading: loadingConfig,
    error: configError,
  } = useQuery({
    queryKey: ['widget-config', slug],
    queryFn: () => fetchWidgetConfig(slug!),
    enabled: !!slug,
  });

  // Date range for availability
  const dateRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }, [weekOffset]);

  // Fetch availability
  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: [
      'widget-availability',
      slug,
      dateRange.start.toISOString(),
      selectedType,
      selectedProvider,
    ],
    queryFn: () =>
      fetchWidgetAvailability(slug!, {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        providerId: selectedProvider || undefined,
        appointmentTypeId: selectedType || undefined,
      }),
    enabled: !!slug && step === 'time',
  });

  // Group slots by day
  const slotsByDay = useMemo(() => {
    if (!availability?.slots) return new Map<string, TimeSlot[]>();
    const map = new Map<string, TimeSlot[]>();
    availability.slots.forEach((slot) => {
      const key = new Date(slot.datetime).toDateString();
      const arr = map.get(key) || [];
      arr.push(slot);
      map.set(key, arr);
    });
    return map;
  }, [availability]);

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: (data: Parameters<typeof createWidgetBooking>[1]) =>
      createWidgetBooking(slug!, data),
    onSuccess: (data) => {
      setConfirmation(data);
      setStep('done');
      // Post message to parent window for iframe integration
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'BOOKING_CONFIRMED',
            confirmationCode: data.confirmationCode,
          },
          '*',
        );
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  // Handle service selection
  const handleSelectService = (typeId: number) => {
    setSelectedType(typeId);
    if (config && config.providers.length <= 1) {
      // Skip provider selection if only one or no providers
      setSelectedProvider(config.providers[0]?.id || null);
      setStep('time');
    } else {
      setStep('time');
    }
  };

  // Handle time selection
  const handleSelectTime = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('details');
  };

  // Submit booking
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    bookingMutation.mutate({
      appointmentTypeId: selectedType || undefined,
      providerId: selectedSlot.providerId || undefined,
      scheduledAt: selectedSlot.datetime,
      patientName: customerName,
      patientEmail: customerEmail,
      patientPhone: customerPhone || undefined,
      timezone: getUserTimezone(),
    });
  };

  // Loading state
  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[300px] bg-white dark:bg-neutral-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Error state
  if (configError || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-white text-center p-4">
        <p className="text-gray-600 dark:text-neutral-300">
          Unable to load booking widget
        </p>
      </div>
    );
  }

  const primaryColor = config.primaryColor || '#3B82F6';

  // Confirmation step
  if (step === 'done' && confirmation) {
    const calendarLinks = generateCalendarLinks({
      title: confirmation.appointment.appointmentType?.name || 'Appointment',
      startTime: confirmation.appointment.scheduledAt,
      durationMinutes: confirmation.appointment.durationMinutes,
      description: `Confirmation: ${confirmation.confirmationCode}`,
      location: confirmation.appointment.videoMeetingUrl || '',
    });

    return (
      <div className="bg-white p-6 text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: primaryColor }}
        >
          <Check className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
          <p
            className="text-lg font-mono font-bold"
            style={{ color: primaryColor }}
          >
            {confirmation.confirmationCode}
          </p>
        </div>

        <div className="text-left space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-300">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(
                confirmation.appointment.scheduledAt,
              ).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-300">
            <Clock className="w-4 h-4" />
            <span>
              {formatTime(confirmation.appointment.scheduledAt)} (
              {confirmation.appointment.durationMinutes} min)
            </span>
          </div>
          {confirmation.appointment.provider && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-300">
              <User className="w-4 h-4" />
              <span>{confirmation.appointment.provider.name}</span>
            </div>
          )}
        </div>

        {/* Video meeting link */}
        {confirmation.appointment.videoMeetingUrl && (
          <a
            href={confirmation.appointment.videoMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 mb-4 rounded-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <ExternalLink className="w-4 h-4" />
            Join Video Meeting
          </a>
        )}

        {/* Add to calendar buttons */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            Add to Calendar
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <a
              href={calendarLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Google
            </a>
            <a
              href={calendarLinks.outlook}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Outlook
            </a>
            <button
              onClick={() =>
                downloadICSFile({
                  title:
                    confirmation.appointment.appointmentType?.name ||
                    'Appointment',
                  startTime: confirmation.appointment.scheduledAt,
                  durationMinutes: confirmation.appointment.durationMinutes,
                  description: `Confirmation: ${confirmation.confirmationCode}`,
                  location: confirmation.appointment.videoMeetingUrl || '',
                })
              }
              className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Download .ics
            </button>
          </div>
        </div>

        {/* Manage booking link */}
        <p className="mt-4 text-xs text-gray-500 dark:text-neutral-400">
          Need to reschedule or cancel?{' '}
          <a
            href={`/booking/${slug}/manage?code=${confirmation.confirmationCode}`}
            className="underline"
            style={{ color: primaryColor }}
          >
            Manage Booking
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800">
      {/* Header */}
      {!hideHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="font-semibold text-gray-900 dark:text-neutral-100">
            {config.title}
          </h2>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className={`p-4 ${compactMode ? 'space-y-3' : 'space-y-4'}`}>
        {/* Step 1: Select Service */}
        {step === 'service' && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-neutral-100">
              Select a Service
            </h3>
            <div className="space-y-2">
              {config.appointmentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelectService(type.id)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedType === type.id
                      ? 'border-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={
                    selectedType === type.id
                      ? { borderColor: primaryColor }
                      : undefined
                  }
                >
                  <div className="font-medium text-gray-900 dark:text-neutral-100">
                    {type.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {type.durationMinutes} min
                    </span>
                    {type.price && (
                      <span>
                        {type.currency || '$'}
                        {type.price}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Time */}
        {step === 'time' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('service')}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-neutral-100"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <h3 className="font-medium text-gray-900 dark:text-neutral-100">
                Select Time
              </h3>
              <div className="w-12" />
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <button
                onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                disabled={weekOffset === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                {formatShortDate(dateRange.start)} -{' '}
                {formatShortDate(dateRange.end)}
              </span>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-1 rounded hover:bg-gray-200 dark:bg-neutral-700"
                disabled={
                  weekOffset >=
                  Math.floor((config.config.maxAdvanceBookingDays || 90) / 7)
                }
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Time slots */}
            {loadingSlots ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {getDaysInRange(dateRange.start, 7).map((date) => {
                  const slots = slotsByDay.get(date.toDateString()) || [];
                  if (slots.length === 0) return null;

                  return (
                    <div key={date.toDateString()}>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {formatShortDate(date)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectTime(slot)}
                            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                              selectedSlot?.datetime === slot.datetime
                                ? 'border-blue-500 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={
                              selectedSlot?.datetime === slot.datetime
                                ? {
                                    borderColor: primaryColor,
                                    color: primaryColor,
                                  }
                                : undefined
                            }
                          >
                            {formatTime(slot.datetime)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {Array.from(slotsByDay.values()).every(
                  (s) => s.length === 0,
                ) && (
                  <p className="text-center text-gray-500 py-8">
                    No available times this week
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === 'details' && selectedSlot && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('time')}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-neutral-100"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <h3 className="font-medium text-gray-900 dark:text-neutral-100">
                Your Details
              </h3>
              <div className="w-12" />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-600 dark:text-neutral-300">
                {new Date(selectedSlot.datetime).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at {formatTime(selectedSlot.datetime)}
              </p>
              {selectedSlot.providerName && (
                <p className="text-gray-500 dark:text-neutral-400">
                  with {selectedSlot.providerName}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full Name *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={bookingMutation.isPending}
                className="w-full px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {bookingMutation.isPending ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingWidget;
