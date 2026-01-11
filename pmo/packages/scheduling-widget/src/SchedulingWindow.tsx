/**
 * SchedulingWindow Component
 *
 * The main booking interface component.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useScheduling } from './useScheduling';
import type {
  SchedulingWindowConfig,
  BookingResult,
  Provider,
  AppointmentType,
  TimeSlot,
} from './types';

export interface SchedulingWindowProps extends SchedulingWindowConfig {}

type Step =
  | 'type'
  | 'provider'
  | 'datetime'
  | 'details'
  | 'confirm'
  | 'success';

export function SchedulingWindow({
  apiUrl,
  slug,
  primaryColor = '#2563eb',
  initialProviderId,
  initialAppointmentTypeId,
  patientName: initialPatientName = '',
  patientEmail: initialPatientEmail = '',
  patientPhone: initialPatientPhone = '',
  onBookingComplete,
  onBookingError,
  timezone: propTimezone,
}: SchedulingWindowProps) {
  // Get user's timezone
  const timezone =
    propTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const {
    config,
    isLoadingConfig,
    configError,
    slots,
    isLoadingSlots,
    selectedProvider,
    selectedAppointmentType,
    selectedDate,
    selectedSlot,
    loadSlots,
    selectProvider,
    selectAppointmentType,
    selectDate,
    selectSlot,
    createBooking,
    reset,
  } = useScheduling({ apiUrl, slug, timezone });

  // Form state
  const [step, setStep] = useState<Step>('type');
  const [patientName, setPatientName] = useState(initialPatientName);
  const [patientEmail, setPatientEmail] = useState(initialPatientEmail);
  const [patientPhone, setPatientPhone] = useState(initialPatientPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Initialize selections from props
  useEffect(() => {
    if (config) {
      if (initialAppointmentTypeId) {
        const type = config.config.appointmentTypes.find(
          (t) => t.id === initialAppointmentTypeId,
        );
        if (type) selectAppointmentType(type);
      }
      if (initialProviderId) {
        const provider = config.config.providers.find(
          (p) => p.id === initialProviderId,
        );
        if (provider) selectProvider(provider);
      }
    }
  }, [
    config,
    initialAppointmentTypeId,
    initialProviderId,
    selectAppointmentType,
    selectProvider,
  ]);

  // Determine initial step based on config
  useEffect(() => {
    if (config) {
      if (
        config.showAppointmentTypes &&
        config.config.appointmentTypes.length > 0
      ) {
        setStep('type');
      } else if (
        config.showProviderSelection &&
        config.config.providers.length > 0
      ) {
        setStep('provider');
      } else {
        setStep('datetime');
      }
    }
  }, [config]);

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate && config) {
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 7);

      loadSlots({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        providerId: selectedProvider?.id,
        appointmentTypeId: selectedAppointmentType?.id,
        timezone,
      });
    }
  }, [
    selectedDate,
    selectedProvider,
    selectedAppointmentType,
    config,
    loadSlots,
    timezone,
  ]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    for (const slot of slots) {
      if (slot.available) {
        const date = new Date(slot.datetime).toLocaleDateString('en-CA');
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(slot);
      }
    }
    return grouped;
  }, [slots]);

  // Handle booking submission
  const handleSubmit = async () => {
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createBooking({
        appointmentTypeId: selectedAppointmentType?.id,
        providerId: selectedProvider?.id,
        scheduledAt: selectedSlot.datetime,
        patientName,
        patientEmail: patientEmail || undefined,
        patientPhone: patientPhone || undefined,
        timezone,
      });

      setBookingResult(result);
      setStep('success');
      onBookingComplete?.(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to book appointment';
      setError(errorMessage);
      onBookingError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset and start over
  const handleReset = () => {
    reset();
    setPatientName(initialPatientName);
    setPatientEmail(initialPatientEmail);
    setPatientPhone(initialPatientPhone);
    setBookingResult(null);
    setError(null);
    setStep('type');
  };

  // Loading state
  if (isLoadingConfig) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${primaryColor}20`,
            borderTopColor: primaryColor,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#666', margin: 0 }}>Loading...</p>
      </div>
    );
  }

  // Error state
  if (configError || !config) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', margin: 0 }}>
          {configError?.message || 'Failed to load booking page'}
        </p>
      </div>
    );
  }

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 'type':
        return (
          <StepAppointmentType
            types={config.config.appointmentTypes}
            selected={selectedAppointmentType}
            onSelect={(type) => {
              selectAppointmentType(type);
              if (
                config.showProviderSelection &&
                config.config.providers.length > 0
              ) {
                setStep('provider');
              } else {
                setStep('datetime');
              }
            }}
            primaryColor={primaryColor}
          />
        );

      case 'provider':
        return (
          <StepProvider
            providers={config.config.providers}
            selected={selectedProvider}
            onSelect={(provider) => {
              selectProvider(provider);
              setStep('datetime');
            }}
            onSkip={() => {
              selectProvider(null);
              setStep('datetime');
            }}
            primaryColor={primaryColor}
          />
        );

      case 'datetime':
        return (
          <StepDateTime
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            slotsByDate={slotsByDate}
            isLoading={isLoadingSlots}
            onSelectDate={selectDate}
            onSelectSlot={(slot) => {
              selectSlot(slot);
              setStep('details');
            }}
            primaryColor={primaryColor}
            timezone={timezone}
            maxAdvanceDays={config.config.maxAdvanceBookingDays}
          />
        );

      case 'details':
        return (
          <StepDetails
            patientName={patientName}
            patientEmail={patientEmail}
            patientPhone={patientPhone}
            requirePhone={config.requirePhone}
            onChangeName={setPatientName}
            onChangeEmail={setPatientEmail}
            onChangePhone={setPatientPhone}
            onSubmit={() => setStep('confirm')}
            onBack={() => setStep('datetime')}
            primaryColor={primaryColor}
          />
        );

      case 'confirm':
        return (
          <StepConfirm
            appointmentType={selectedAppointmentType}
            provider={selectedProvider}
            slot={selectedSlot}
            patientName={patientName}
            patientEmail={patientEmail}
            patientPhone={patientPhone}
            isSubmitting={isSubmitting}
            error={error}
            onConfirm={handleSubmit}
            onBack={() => setStep('details')}
            primaryColor={primaryColor}
            timezone={timezone}
          />
        );

      case 'success':
        return (
          <StepSuccess
            result={bookingResult!}
            onBookAnother={handleReset}
            primaryColor={primaryColor}
            timezone={timezone}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {config.logoUrl && (
          <img
            src={config.logoUrl}
            alt={config.title}
            style={{ height: '32px', marginBottom: '8px' }}
          />
        )}
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {config.title}
        </h2>
        {config.description && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            {config.description}
          </p>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          padding: '24px',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        {renderStep()}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StepAppointmentTypeProps {
  types: AppointmentType[];
  selected: AppointmentType | null;
  onSelect: (type: AppointmentType) => void;
  primaryColor: string;
}

function StepAppointmentType({
  types,
  selected,
  onSelect,
  primaryColor,
}: StepAppointmentTypeProps) {
  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
        Select Appointment Type
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type)}
            style={{
              padding: '16px',
              border: `2px solid ${selected?.id === type.id ? primaryColor : '#e5e7eb'}`,
              borderRadius: '12px',
              background:
                selected?.id === type.id ? `${primaryColor}10` : 'white',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {type.name}
              </span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                {type.durationMinutes} min
              </span>
            </div>
            {type.description && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '14px',
                  color: '#6b7280',
                }}
              >
                {type.description}
              </p>
            )}
            {type.price && (
              <p
                style={{
                  margin: '8px 0 0',
                  fontWeight: 600,
                  color: primaryColor,
                }}
              >
                ${type.price} {type.currency || 'USD'}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface StepProviderProps {
  providers: Provider[];
  selected: Provider | null;
  onSelect: (provider: Provider) => void;
  onSkip: () => void;
  primaryColor: string;
}

function StepProvider({
  providers,
  selected,
  onSelect,
  onSkip,
  primaryColor,
}: StepProviderProps) {
  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
        Select Provider
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider)}
            style={{
              padding: '16px',
              border: `2px solid ${selected?.id === provider.id ? primaryColor : '#e5e7eb'}`,
              borderRadius: '12px',
              background:
                selected?.id === provider.id ? `${primaryColor}10` : 'white',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
            }}
          >
            {provider.photoUrl ? (
              <img
                src={provider.photoUrl}
                alt={provider.name}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#6b7280',
                }}
              >
                {provider.name.charAt(0)}
              </div>
            )}
            <div>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {provider.name}
              </span>
              {provider.title && (
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: '14px',
                    color: '#6b7280',
                  }}
                >
                  {provider.title}
                </p>
              )}
            </div>
          </button>
        ))}
        <button
          onClick={onSkip}
          style={{
            padding: '12px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '14px',
          }}
        >
          No preference
        </button>
      </div>
    </div>
  );
}

interface StepDateTimeProps {
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  slotsByDate: Record<string, TimeSlot[]>;
  isLoading: boolean;
  onSelectDate: (date: Date) => void;
  onSelectSlot: (slot: TimeSlot) => void;
  primaryColor: string;
  timezone: string;
  maxAdvanceDays: number;
}

function StepDateTime({
  selectedDate,
  selectedSlot,
  slotsByDate,
  isLoading,
  onSelectDate,
  onSelectSlot,
  primaryColor,
  timezone,
  maxAdvanceDays,
}: StepDateTimeProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  // Initialize with current week
  useEffect(() => {
    if (!selectedDate) {
      onSelectDate(new Date());
    }
  }, [selectedDate, onSelectDate]);

  // Generate week days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(viewDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [viewDate]);

  const selectedDateStr = selectedDate?.toLocaleDateString('en-CA') || '';
  const availableSlots = slotsByDate[selectedDateStr] || [];

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
        Select Date & Time
      </h3>

      {/* Date picker */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <button
            onClick={() => {
              const newDate = new Date(viewDate);
              newDate.setDate(newDate.getDate() - 7);
              setViewDate(newDate);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#6b7280',
            }}
          >
            &larr;
          </button>
          <span style={{ fontWeight: 500 }}>
            {viewDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <button
            onClick={() => {
              const newDate = new Date(viewDate);
              newDate.setDate(newDate.getDate() + 7);
              setViewDate(newDate);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#6b7280',
            }}
          >
            &rarr;
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#6b7280',
                padding: '4px',
              }}
            >
              {day}
            </div>
          ))}
          {weekDays.map((day) => {
            const dateStr = day.toLocaleDateString('en-CA');
            const isSelected = dateStr === selectedDateStr;
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
            const isFuture = day > maxDate;

            return (
              <button
                key={dateStr}
                onClick={() => !isPast && !isFuture && onSelectDate(day)}
                disabled={isPast || isFuture}
                style={{
                  padding: '10px 4px',
                  border: `2px solid ${isSelected ? primaryColor : 'transparent'}`,
                  borderRadius: '8px',
                  background: isSelected ? `${primaryColor}10` : 'transparent',
                  cursor: isPast || isFuture ? 'not-allowed' : 'pointer',
                  opacity: isPast || isFuture ? 0.4 : 1,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <div>
        <h4
          style={{
            margin: '0 0 12px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#6b7280',
          }}
        >
          Available Times
        </h4>
        {isLoading ? (
          <div
            style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}
          >
            Loading available times...
          </div>
        ) : availableSlots.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}
          >
            No available times for this date
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {availableSlots.map((slot) => (
              <button
                key={slot.datetime}
                onClick={() => onSelectSlot(slot)}
                style={{
                  padding: '12px 8px',
                  border: `2px solid ${selectedSlot?.datetime === slot.datetime ? primaryColor : '#e5e7eb'}`,
                  borderRadius: '8px',
                  background:
                    selectedSlot?.datetime === slot.datetime
                      ? `${primaryColor}10`
                      : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {formatTime(slot.datetime)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StepDetailsProps {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  requirePhone: boolean;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePhone: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  primaryColor: string;
}

function StepDetails({
  patientName,
  patientEmail,
  patientPhone,
  requirePhone,
  onChangeName,
  onChangeEmail,
  onChangePhone,
  onSubmit,
  onBack,
  primaryColor,
}: StepDetailsProps) {
  const isValid =
    patientName.trim().length > 0 &&
    (!requirePhone || patientPhone.trim().length > 0);

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
        Your Information
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Your full name"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={patientEmail}
            onChange={(e) => onChangeEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Phone {requirePhone && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <input
            type="tel"
            value={patientPhone}
            onChange={(e) => onChangePhone(e.target.value)}
            placeholder="(555) 123-4567"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: '14px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 500,
          }}
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!isValid}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            borderRadius: '8px',
            background: isValid ? primaryColor : '#e5e7eb',
            color: isValid ? 'white' : '#9ca3af',
            cursor: isValid ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

interface StepConfirmProps {
  appointmentType: AppointmentType | null;
  provider: Provider | null;
  slot: TimeSlot | null;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
  primaryColor: string;
  timezone: string;
}

function StepConfirm({
  appointmentType,
  provider,
  slot,
  patientName,
  patientEmail,
  patientPhone,
  isSubmitting,
  error,
  onConfirm,
  onBack,
  primaryColor,
  timezone,
}: StepConfirmProps) {
  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
        Confirm Your Appointment
      </h3>

      <div
        style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        {appointmentType && (
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'uppercase',
              }}
            >
              Service
            </span>
            <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
              {appointmentType.name} ({appointmentType.durationMinutes} min)
            </p>
          </div>
        )}

        {provider && (
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'uppercase',
              }}
            >
              Provider
            </span>
            <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
              {provider.name}
            </p>
          </div>
        )}

        {slot && (
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'uppercase',
              }}
            >
              Date & Time
            </span>
            <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
              {formatDateTime(slot.datetime)}
            </p>
          </div>
        )}

        <div>
          <span
            style={{
              fontSize: '12px',
              color: '#6b7280',
              textTransform: 'uppercase',
            }}
          >
            Contact
          </span>
          <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{patientName}</p>
          {patientEmail && (
            <p
              style={{ margin: '2px 0 0', fontSize: '14px', color: '#6b7280' }}
            >
              {patientEmail}
            </p>
          )}
          {patientPhone && (
            <p
              style={{ margin: '2px 0 0', fontSize: '14px', color: '#6b7280' }}
            >
              {patientPhone}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#dc2626',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onBack}
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '14px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: 'white',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 500,
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            borderRadius: '8px',
            background: primaryColor,
            color: 'white',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 600,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

interface StepSuccessProps {
  result: BookingResult;
  onBookAnother: () => void;
  primaryColor: string;
  timezone: string;
}

function StepSuccess({
  result,
  onBookAnother,
  primaryColor,
  timezone,
}: StepSuccessProps) {
  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>
        Booking Confirmed!
      </h3>
      <p style={{ margin: '0 0 24px', color: '#6b7280' }}>
        Your appointment has been scheduled.
      </p>

      <div
        style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <span
            style={{
              fontSize: '12px',
              color: '#6b7280',
              textTransform: 'uppercase',
            }}
          >
            Confirmation Code
          </span>
          <p
            style={{
              margin: '2px 0 0',
              fontFamily: 'monospace',
              fontSize: '20px',
              fontWeight: 700,
              color: primaryColor,
              letterSpacing: '2px',
            }}
          >
            {result.confirmationCode}
          </p>
        </div>

        <div>
          <span
            style={{
              fontSize: '12px',
              color: '#6b7280',
              textTransform: 'uppercase',
            }}
          >
            Date & Time
          </span>
          <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
            {formatDateTime(result.appointment.scheduledAt)}
          </p>
        </div>
      </div>

      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
        Save your confirmation code to manage your appointment.
      </p>

      <button
        onClick={onBookAnother}
        style={{
          padding: '14px 24px',
          border: `1px solid ${primaryColor}`,
          borderRadius: '8px',
          background: 'white',
          color: primaryColor,
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
        }}
      >
        Book Another Appointment
      </button>
    </div>
  );
}
