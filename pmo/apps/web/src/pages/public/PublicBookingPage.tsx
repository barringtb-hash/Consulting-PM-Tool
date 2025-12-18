/**
 * Public Booking Page
 *
 * Customer-facing booking interface accessible without authentication.
 * Supports provider selection, appointment type selection, and self-service booking.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

// Types
interface BookingPage {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string;
  showProviderSelection: boolean;
  showAppointmentTypes: boolean;
  requirePhone: boolean;
  requireIntakeForm: boolean;
  config: {
    practiceName: string | null;
    timezone: string;
    minAdvanceBookingHours: number;
    maxAdvanceBookingDays: number;
    defaultSlotDurationMin: number;
  };
  providers: {
    id: number;
    name: string;
    title: string | null;
    specialty: string | null;
  }[];
  appointmentTypes: {
    id: number;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: number | null;
    currency: string | null;
  }[];
  intakeForms: {
    id: number;
    name: string;
    description: string | null;
    fields: unknown[];
    isRequired: boolean;
  }[];
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
    provider: { id: number; name: string; title: string | null } | null;
    appointmentType: { id: number; name: string } | null;
  };
  confirmationCode: string;
  message: string;
}

// API Base URL from environment
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// API functions
async function fetchBookingPage(slug: string): Promise<BookingPage> {
  const res = await fetch(`${API_BASE}/booking/${slug}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Booking page not found');
    }
    throw new Error('Failed to load booking page');
  }
  const json = await res.json();
  return json.data;
}

async function fetchAvailability(
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
  if (params.providerId) {
    searchParams.set('providerId', params.providerId.toString());
  }
  if (params.appointmentTypeId) {
    searchParams.set('appointmentTypeId', params.appointmentTypeId.toString());
  }

  const res = await fetch(
    `${API_BASE}/booking/${slug}/availability?${searchParams}`,
  );
  if (!res.ok) {
    throw new Error('Failed to load availability');
  }
  const json = await res.json();
  return json.data;
}

async function createBooking(
  slug: string,
  data: {
    appointmentTypeId?: number;
    providerId?: number;
    scheduledAt: string;
    patientName: string;
    patientEmail?: string;
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
  const json = await res.json();
  return json.data;
}

// Utility to get dates for a week
function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Format time for display
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Step Components
type BookingStep = 'select' | 'datetime' | 'details' | 'confirm';

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // Booking state
  const [step, setStep] = useState<BookingStep>('select');
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Confirmation
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Fetch booking page
  const {
    data: bookingPage,
    isLoading: isLoadingPage,
    error: pageError,
  } = useQuery({
    queryKey: ['booking-page', slug],
    queryFn: () => fetchBookingPage(slug!),
    enabled: !!slug,
  });

  // Calculate availability date range
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 7);
    return end;
  }, [weekStart]);

  // Fetch availability
  const { data: availability, isLoading: isLoadingSlots } = useQuery({
    queryKey: [
      'booking-availability',
      slug,
      weekStart.toISOString(),
      selectedProvider,
      selectedType,
    ],
    queryFn: () =>
      fetchAvailability(slug!, {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        providerId: selectedProvider || undefined,
        appointmentTypeId: selectedType || undefined,
      }),
    enabled: !!slug && step === 'datetime',
  });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: (data: Parameters<typeof createBooking>[1]) =>
      createBooking(slug!, data),
    onSuccess: (data) => {
      setConfirmation(data);
      setStep('confirm');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Handle initial provider/type selection from URL
  useEffect(() => {
    const providerParam = searchParams.get('provider');
    const typeParam = searchParams.get('type');
    if (providerParam) {
      setSelectedProvider(parseInt(providerParam, 10));
    }
    if (typeParam) {
      setSelectedType(parseInt(typeParam, 10));
    }
  }, [searchParams]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    if (!availability?.slots) return new Map<string, TimeSlot[]>();

    const grouped = new Map<string, TimeSlot[]>();
    availability.slots.forEach((slot) => {
      const dateKey = new Date(slot.datetime).toDateString();
      const existing = grouped.get(dateKey) || [];
      existing.push(slot);
      grouped.set(dateKey, existing);
    });
    return grouped;
  }, [availability]);

  // Loading state
  if (isLoadingPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (pageError || !bookingPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Page Not Found
          </h1>
          <p className="text-gray-600">
            The booking page you&apos;re looking for doesn&apos;t exist or has
            been disabled.
          </p>
        </div>
      </div>
    );
  }

  // Confirmation step
  if (step === 'confirm' && confirmation) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={
          { '--primary-color': bookingPage.primaryColor } as React.CSSProperties
        }
      >
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: bookingPage.primaryColor }}
            >
              <Check className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 mb-6">
              Your appointment has been scheduled successfully.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
              <p
                className="text-xl font-mono font-bold"
                style={{ color: bookingPage.primaryColor }}
              >
                {confirmation.confirmationCode}
              </p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>
                  {new Date(
                    confirmation.appointment.scheduledAt,
                  ).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>
                  {formatTime(confirmation.appointment.scheduledAt)} (
                  {confirmation.appointment.durationMinutes} min)
                </span>
              </div>
              {confirmation.appointment.provider && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span>
                    {confirmation.appointment.provider.name}
                    {confirmation.appointment.provider.title &&
                      `, ${confirmation.appointment.provider.title}`}
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500">
              A confirmation email has been sent to your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={
        { '--primary-color': bookingPage.primaryColor } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {bookingPage.logoUrl && (
              <img
                src={bookingPage.logoUrl}
                alt=""
                className="h-12 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {bookingPage.title}
              </h1>
              {bookingPage.config.practiceName && (
                <p className="text-sm text-gray-500">
                  {bookingPage.config.practiceName}
                </p>
              )}
            </div>
          </div>
          {bookingPage.description && (
            <p className="mt-3 text-gray-600">{bookingPage.description}</p>
          )}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {['select', 'datetime', 'details'].map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'text-white'
                    : ['datetime', 'details'].indexOf(step) >
                        ['datetime', 'details'].indexOf(s as BookingStep)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-200 text-gray-600'
                }`}
                style={
                  step === s
                    ? { backgroundColor: bookingPage.primaryColor }
                    : undefined
                }
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-12 h-1 ${
                    ['datetime', 'details'].indexOf(step) > i
                      ? 'bg-green-200'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button className="ml-2 underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* Step 1: Select Provider/Type */}
        {step === 'select' && (
          <div className="space-y-6">
            {/* Appointment Types */}
            {bookingPage.showAppointmentTypes &&
              bookingPage.appointmentTypes.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Service
                  </h2>
                  <div className="grid gap-3">
                    {bookingPage.appointmentTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          selectedType === type.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        style={
                          selectedType === type.id
                            ? {
                                borderColor: bookingPage.primaryColor,
                                backgroundColor: `${bookingPage.primaryColor}10`,
                              }
                            : undefined
                        }
                      >
                        <div className="font-medium text-gray-900">
                          {type.name}
                        </div>
                        {type.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {type.description}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
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

            {/* Providers */}
            {bookingPage.showProviderSelection &&
              bookingPage.providers.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Provider
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bookingPage.providers.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          selectedProvider === provider.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        style={
                          selectedProvider === provider.id
                            ? {
                                borderColor: bookingPage.primaryColor,
                                backgroundColor: `${bookingPage.primaryColor}10`,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                            style={{
                              backgroundColor: bookingPage.primaryColor,
                            }}
                          >
                            {provider.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {provider.name}
                            </div>
                            {provider.title && (
                              <div className="text-sm text-gray-500">
                                {provider.title}
                              </div>
                            )}
                            {provider.specialty && (
                              <div className="text-sm text-gray-400">
                                {provider.specialty}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    {/* "Any Provider" option */}
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        selectedProvider === null
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={
                        selectedProvider === null
                          ? {
                              borderColor: bookingPage.primaryColor,
                              backgroundColor: `${bookingPage.primaryColor}10`,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            Any Provider
                          </div>
                          <div className="text-sm text-gray-500">
                            First available
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

            {/* Continue Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setStep('datetime')}
                disabled={
                  bookingPage.showAppointmentTypes &&
                  bookingPage.appointmentTypes.length > 0 &&
                  !selectedType
                }
                className="px-6 py-3 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: bookingPage.primaryColor }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Date/Time */}
        {step === 'datetime' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                Select Date & Time
              </h2>
              <div className="w-16" />
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
              <button
                onClick={() => {
                  const newStart = new Date(weekStart);
                  newStart.setDate(weekStart.getDate() - 7);
                  if (newStart >= new Date()) {
                    setWeekStart(newStart);
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                disabled={weekStart <= new Date()}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {formatDate(weekStart)} -{' '}
                {formatDate(
                  new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
                )}
              </span>
              <button
                onClick={() => {
                  const newStart = new Date(weekStart);
                  newStart.setDate(weekStart.getDate() + 7);
                  const maxDate = new Date();
                  maxDate.setDate(
                    maxDate.getDate() +
                      (bookingPage.config.maxAdvanceBookingDays || 90),
                  );
                  if (newStart <= maxDate) {
                    setWeekStart(newStart);
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Time Slots */}
            {isLoadingSlots ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {getWeekDates(weekStart).map((date) => {
                  const dateKey = date.toDateString();
                  const slots = slotsByDate.get(dateKey) || [];

                  return (
                    <div
                      key={dateKey}
                      className="bg-white rounded-lg border border-gray-200 p-4"
                    >
                      <h3 className="font-medium text-gray-900 mb-3">
                        {formatDate(date)}
                      </h3>
                      {slots.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No available times
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {slots.map((slot, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                selectedSlot?.datetime === slot.datetime
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              style={
                                selectedSlot?.datetime === slot.datetime
                                  ? {
                                      borderColor: bookingPage.primaryColor,
                                      color: bookingPage.primaryColor,
                                      backgroundColor: `${bookingPage.primaryColor}10`,
                                    }
                                  : undefined
                              }
                            >
                              {formatTime(slot.datetime)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Continue Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setStep('details')}
                disabled={!selectedSlot}
                className="px-6 py-3 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: bookingPage.primaryColor }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === 'details' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep('datetime')}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                Your Details
              </h2>
              <div className="w-16" />
            </div>

            {/* Selected Appointment Summary */}
            {selectedSlot && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(selectedSlot.datetime).toLocaleDateString(
                      'en-US',
                      {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(selectedSlot.datetime)}</span>
                </div>
                {selectedSlot.providerName && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                    <User className="w-4 h-4" />
                    <span>{selectedSlot.providerName}</span>
                  </div>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedSlot) return;

                bookingMutation.mutate({
                  appointmentTypeId: selectedType || undefined,
                  providerId: selectedSlot.providerId || undefined,
                  scheduledAt: selectedSlot.datetime,
                  patientName: customerName,
                  patientEmail: customerEmail || undefined,
                  patientPhone: customerPhone || undefined,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number {bookingPage.requirePhone && '*'}
                </label>
                <input
                  type="tel"
                  required={bookingPage.requirePhone}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>

              <button
                type="submit"
                disabled={bookingMutation.isPending}
                className="w-full px-6 py-3 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: bookingPage.primaryColor }}
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
