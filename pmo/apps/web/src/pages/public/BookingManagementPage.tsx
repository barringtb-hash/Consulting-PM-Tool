/**
 * Booking Management Page
 *
 * Self-service page for customers to view, reschedule, or cancel their appointments.
 * Accessed via confirmation code.
 */

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  XCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Search,
} from 'lucide-react';
import {
  generateCalendarLinks,
  downloadICSFile,
  formatEventDate,
  formatEventTime,
  getRelativeTime,
} from '../../utils/calendarUtils';

// Types
interface AppointmentDetails {
  id: number;
  confirmationCode: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  provider: {
    id: number;
    name: string;
    title: string | null;
  } | null;
  appointmentType: {
    id: number;
    name: string;
    description: string | null;
    price: number | null;
    currency: string | null;
  } | null;
  videoMeetingUrl: string | null;
  config: {
    practiceName: string | null;
    timezone: string;
    logoUrl: string | null;
    primaryColor: string;
  };
}

interface TimeSlot {
  datetime: string;
  providerId: number | null;
  providerName: string | null;
  available: boolean;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// API functions
async function lookupAppointment(
  slug: string,
  confirmationCode: string,
): Promise<AppointmentDetails> {
  const res = await fetch(
    `${API_BASE}/booking/${slug}/appointments/${confirmationCode}`,
  );
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Appointment not found');
    }
    throw new Error('Failed to load appointment');
  }
  return (await res.json()).data;
}

async function fetchRescheduleSlots(
  slug: string,
  appointmentId: number,
  params: { startDate: string; endDate: string },
): Promise<{ slots: TimeSlot[] }> {
  const searchParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    appointmentId: appointmentId.toString(),
  });

  const res = await fetch(
    `${API_BASE}/booking/${slug}/availability?${searchParams}`,
  );
  if (!res.ok) throw new Error('Failed to load availability');
  return (await res.json()).data;
}

async function rescheduleAppointment(
  slug: string,
  confirmationCode: string,
  newDateTime: string,
): Promise<AppointmentDetails> {
  const res = await fetch(
    `${API_BASE}/booking/${slug}/appointments/${confirmationCode}/reschedule`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: newDateTime }),
    },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to reschedule');
  }
  return (await res.json()).data;
}

async function cancelAppointment(
  slug: string,
  confirmationCode: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/booking/${slug}/appointments/${confirmationCode}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to cancel');
  }
}

// Utility functions
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

type PageView = 'details' | 'reschedule' | 'cancel' | 'success';

export function BookingManagementPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // State
  const [confirmationCode, setConfirmationCode] = useState(
    searchParams.get('code') || '',
  );
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(
    null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [view, setView] = useState<PageView>('details');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Date range for rescheduling
  const dateRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }, [weekOffset]);

  // Fetch reschedule availability
  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: [
      'reschedule-availability',
      slug,
      appointment?.id,
      dateRange.start.toISOString(),
    ],
    queryFn: () =>
      fetchRescheduleSlots(slug!, appointment!.id, {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      }),
    enabled: !!slug && !!appointment && view === 'reschedule',
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

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: (newDateTime: string) =>
      rescheduleAppointment(slug!, confirmationCode, newDateTime),
    onSuccess: (updatedAppointment) => {
      setAppointment(updatedAppointment);
      setSuccessMessage('Your appointment has been rescheduled successfully.');
      setView('success');
      setSelectedSlot(null);
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelAppointment(slug!, confirmationCode, cancelReason),
    onSuccess: () => {
      setSuccessMessage('Your appointment has been cancelled.');
      setView('success');
      setAppointment(null);
    },
  });

  // Handle lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCode.trim() || !slug) return;

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const result = await lookupAppointment(slug, confirmationCode.trim());
      setAppointment(result);
      setView('details');
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'Failed to find appointment',
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  // Handle reschedule confirm
  const handleConfirmReschedule = () => {
    if (!selectedSlot) return;
    rescheduleMutation.mutate(selectedSlot.datetime);
  };

  // Handle cancel confirm
  const handleConfirmCancel = () => {
    cancelMutation.mutate();
  };

  const primaryColor = appointment?.config.primaryColor || '#3B82F6';

  // If no appointment loaded yet, show lookup form
  if (!appointment && view !== 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
              Manage Your Appointment
            </h1>
            <p className="text-gray-600 mt-2">
              Enter your confirmation code to view, reschedule, or cancel your
              appointment.
            </p>
          </div>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmation Code
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) =>
                  setConfirmationCode(e.target.value.toUpperCase())
                }
                placeholder="e.g., ABC123"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-mono uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {lookupError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {lookupError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLookingUp}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLookingUp ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Find My Appointment
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Success view
  if (view === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: primaryColor }}
          >
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {successMessage}
          </h1>
          {appointment && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="font-medium text-gray-900 dark:text-neutral-100">
                {appointment.appointmentType?.name || 'Appointment'}
              </p>
              <p className="text-gray-600 dark:text-neutral-300">
                {formatEventDate(appointment.scheduledAt)}
              </p>
              <p className="text-gray-600 dark:text-neutral-300">
                {formatEventTime(appointment.scheduledAt)} (
                {appointment.durationMinutes} min)
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setView('details');
              if (!appointment) {
                setConfirmationCode('');
              }
            }}
            className="px-6 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {appointment ? 'View Appointment' : 'Done'}
          </button>
        </div>
      </div>
    );
  }

  // Appointment details view
  if (view === 'details' && appointment) {
    const calendarLinks = generateCalendarLinks({
      title: appointment.appointmentType?.name || 'Appointment',
      startTime: appointment.scheduledAt,
      durationMinutes: appointment.durationMinutes,
      description: `Confirmation: ${appointment.confirmationCode}`,
      location: appointment.videoMeetingUrl || '',
    });

    const isPast = new Date(appointment.scheduledAt) < new Date();
    const isCancelled = appointment.status === 'CANCELLED';

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          {appointment.config.logoUrl && (
            <div className="text-center mb-6">
              <img
                src={appointment.config.logoUrl}
                alt=""
                className="h-12 mx-auto"
              />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Status Banner */}
            {isCancelled && (
              <div className="bg-red-100 px-6 py-3 flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">
                  This appointment is cancelled
                </span>
              </div>
            )}
            {isPast && !isCancelled && (
              <div className="bg-gray-100 px-6 py-3 flex items-center gap-2 text-gray-700 dark:text-neutral-300">
                <Clock className="w-5 h-5" />
                <span className="font-medium">This appointment has passed</span>
              </div>
            )}

            {/* Appointment Details */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-sm font-medium px-2 py-1 rounded"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor,
                  }}
                >
                  {getRelativeTime(appointment.scheduledAt)}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {appointment.appointmentType?.name || 'Appointment'}
              </h1>

              <p className="text-gray-500 mb-6">
                {appointment.config.practiceName}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-neutral-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-neutral-100">
                      {formatEventDate(appointment.scheduledAt)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                      {formatEventTime(appointment.scheduledAt)} (
                      {appointment.durationMinutes} min)
                    </p>
                  </div>
                </div>

                {appointment.provider && (
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-gray-400 dark:text-neutral-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-neutral-100">
                        {appointment.provider.name}
                      </p>
                      {appointment.provider.title && (
                        <p className="text-sm text-gray-500 dark:text-neutral-400">
                          {appointment.provider.title}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {appointment.videoMeetingUrl && (
                  <a
                    href={appointment.videoMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <ExternalLink className="w-5 h-5" />
                    Join Video Meeting
                  </a>
                )}
              </div>

              {/* Confirmation Code */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
                <p
                  className="text-xl font-mono font-bold"
                  style={{ color: primaryColor }}
                >
                  {appointment.confirmationCode}
                </p>
              </div>

              {/* Add to Calendar */}
              {!isPast && !isCancelled && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-500 mb-3">Add to Calendar</p>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={calendarLinks.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
                    >
                      Google
                    </a>
                    <a
                      href={calendarLinks.outlook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
                    >
                      Outlook
                    </a>
                    <button
                      onClick={() =>
                        downloadICSFile({
                          title:
                            appointment.appointmentType?.name || 'Appointment',
                          startTime: appointment.scheduledAt,
                          durationMinutes: appointment.durationMinutes,
                          description: `Confirmation: ${appointment.confirmationCode}`,
                          location: appointment.videoMeetingUrl || '',
                        })
                      }
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
                    >
                      Download .ics
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isPast && !isCancelled && (
                <div className="mt-6 pt-6 border-t space-y-3">
                  <button
                    onClick={() => setView('reschedule')}
                    className="w-full px-4 py-3 rounded-lg font-medium border-2 flex items-center justify-center gap-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <RefreshCw className="w-5 h-5" />
                    Reschedule Appointment
                  </button>
                  <button
                    onClick={() => setView('cancel')}
                    className="w-full px-4 py-3 rounded-lg font-medium border-2 border-red-200 text-red-600 flex items-center justify-center gap-2 hover:bg-red-50"
                  >
                    <XCircle className="w-5 h-5" />
                    Cancel Appointment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reschedule view
  if (view === 'reschedule' && appointment) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setView('details')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:bg-neutral-800"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-neutral-100">
                Reschedule Appointment
              </h1>
            </div>

            {/* Current appointment */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Currently scheduled</p>
              <p className="font-medium text-gray-900 dark:text-neutral-100">
                {formatEventDate(appointment.scheduledAt)} at{' '}
                {formatEventTime(appointment.scheduledAt)}
              </p>
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3 mb-4">
              <button
                onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                disabled={weekOffset === 0}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {formatShortDate(dateRange.start)} -{' '}
                {formatShortDate(dateRange.end)}
              </span>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-2 rounded-lg hover:bg-gray-200 dark:bg-neutral-700"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Time slots */}
            {loadingSlots ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
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
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                              selectedSlot?.datetime === slot.datetime
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={
                              selectedSlot?.datetime === slot.datetime
                                ? {
                                    borderColor: primaryColor,
                                    backgroundColor: `${primaryColor}10`,
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
              </div>
            )}

            {/* Error message */}
            {rescheduleMutation.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {rescheduleMutation.error instanceof Error
                  ? rescheduleMutation.error.message
                  : 'Failed to reschedule'}
              </div>
            )}

            {/* Confirm button */}
            {selectedSlot && (
              <div className="mt-6 pt-6 border-t">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>New time:</strong>{' '}
                    {formatEventDate(selectedSlot.datetime)} at{' '}
                    {formatEventTime(selectedSlot.datetime)}
                  </p>
                </div>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={rescheduleMutation.isPending}
                  className="w-full px-4 py-3 rounded-lg font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {rescheduleMutation.isPending
                    ? 'Rescheduling...'
                    : 'Confirm Reschedule'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Cancel view
  if (view === 'cancel' && appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setView('details')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:bg-neutral-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-neutral-100">
              Cancel Appointment
            </h1>
          </div>

          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">
                Are you sure you want to cancel?
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                This action cannot be undone. You may need to book a new
                appointment.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="font-medium text-gray-900 dark:text-neutral-100">
              {appointment.appointmentType?.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {formatEventDate(appointment.scheduledAt)} at{' '}
              {formatEventTime(appointment.scheduledAt)}
            </p>
            {appointment.provider && (
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                with {appointment.provider.name}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for cancellation (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Let us know why you're cancelling..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Error message */}
          {cancelMutation.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {cancelMutation.error instanceof Error
                ? cancelMutation.error.message
                : 'Failed to cancel'}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="w-full px-4 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancelMutation.isPending
                ? 'Cancelling...'
                : 'Yes, Cancel Appointment'}
            </button>
            <button
              onClick={() => setView('details')}
              className="w-full px-4 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Keep My Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default BookingManagementPage;
