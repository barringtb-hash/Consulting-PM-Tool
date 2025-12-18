/**
 * BookingWidget Component
 *
 * Embeddable React component for appointment booking.
 * Can be integrated into any React application to provide booking functionality.
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface BookingWidgetProps {
  /** Your booking page slug */
  slug: string;
  /** API base URL (defaults to production) */
  apiBaseUrl?: string;
  /** Theme customization */
  theme?: BookingWidgetTheme;
  /** Called when booking is completed */
  onBookingComplete?: (booking: BookingResult) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Show in compact mode */
  compact?: boolean;
  /** Pre-fill customer details */
  customerDetails?: CustomerDetails;
  /** Stripe publishable key (for payment-enabled bookings) */
  stripePublishableKey?: string;
}

export interface BookingWidgetTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

export interface BookingResult {
  appointmentId: number;
  confirmationCode: string;
  scheduledAt: string;
  providerName?: string;
  serviceName?: string;
}

export interface CustomerDetails {
  name?: string;
  email?: string;
  phone?: string;
}

interface BookingPage {
  slug: string;
  title: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  providers: Provider[];
  appointmentTypes: AppointmentType[];
  bookingSettings: BookingSettings;
}

interface Provider {
  id: number;
  name: string;
  title?: string;
  avatarUrl?: string;
}

interface AppointmentType {
  id: number;
  name: string;
  durationMinutes: number;
  price?: number;
  description?: string;
}

interface BookingSettings {
  requirePhone: boolean;
  requirePayment: boolean;
  cancellationPolicy?: string;
  bufferMinutes: number;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  providerId?: number;
}

// ============================================================================
// DEFAULT STYLES
// ============================================================================

const defaultTheme: BookingWidgetTheme = {
  primaryColor: '#2563eb',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: '8px',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingWidget({
  slug,
  apiBaseUrl = 'https://api.yourapp.com',
  theme = {},
  onBookingComplete,
  onError,
  compact = false,
  customerDetails,
}: BookingWidgetProps): JSX.Element {
  const mergedTheme = { ...defaultTheme, ...theme };

  // State
  const [step, setStep] = useState<'loading' | 'select' | 'datetime' | 'form'>(
    'loading',
  );
  const [bookingPage, setBookingPage] = useState<BookingPage | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [selectedService, setSelectedService] =
    useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: customerDetails?.name || '',
    email: customerDetails?.email || '',
    phone: customerDetails?.phone || '',
    notes: '',
  });

  // Fetch booking page configuration
  useEffect(() => {
    async function fetchBookingPage() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/booking/${slug}`);
        if (!response.ok) {
          throw new Error('Booking page not found');
        }
        const data = await response.json();
        setBookingPage(data.data);
        setStep('select');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error.message);
        onError?.(error);
      }
    }

    fetchBookingPage();
  }, [slug, apiBaseUrl, onError]);

  // Fetch available slots when date changes
  const fetchSlots = useCallback(async () => {
    if (!selectedDate || !selectedService) return;

    setLoadingSlots(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        appointmentTypeId: String(selectedService.id),
      });

      if (selectedProvider) {
        params.set('providerId', String(selectedProvider.id));
      }

      const response = await fetch(
        `${apiBaseUrl}/api/booking/${slug}/availability?${params}`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      const data = await response.json();
      setAvailableSlots(data.data.slots || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, selectedService, selectedProvider, apiBaseUrl, slug]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Handle booking submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedService) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/booking/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentTypeId: selectedService.id,
          providerId: selectedProvider?.id,
          scheduledAt: selectedSlot.startTime,
          patientName: formData.name,
          patientEmail: formData.email,
          patientPhone: formData.phone || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to book appointment');
      }

      const data = await response.json();
      const bookingResult: BookingResult = {
        appointmentId: data.data.id,
        confirmationCode: data.data.confirmationCode,
        scheduledAt: data.data.scheduledAt,
        providerName: selectedProvider?.name,
        serviceName: selectedService.name,
      };

      setResult(bookingResult);
      onBookingComplete?.(bookingResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      onError?.(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    fontFamily: mergedTheme.fontFamily,
    backgroundColor: mergedTheme.backgroundColor,
    color: mergedTheme.textColor,
    borderRadius: mergedTheme.borderRadius,
    padding: compact ? '16px' : '24px',
    maxWidth: compact ? '400px' : '600px',
    margin: '0 auto',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: mergedTheme.primaryColor,
    color: '#ffffff',
    border: 'none',
    borderRadius: mergedTheme.borderRadius,
    padding: '12px 24px',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: mergedTheme.borderRadius,
    border: '1px solid #d1d5db',
    fontSize: '16px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      </div>
    );
  }

  // Error state
  if (error && !bookingPage) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#dc2626',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  // Success state
  if (result) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}
          >
            &#10003;
          </div>
          <h2 style={{ marginBottom: '8px' }}>Booking Confirmed!</h2>
          <p style={{ marginBottom: '16px', color: '#6b7280' }}>
            Your appointment has been scheduled.
          </p>
          <div
            style={{
              backgroundColor: '#f3f4f6',
              padding: '16px',
              borderRadius: mergedTheme.borderRadius,
              marginBottom: '16px',
            }}
          >
            <p style={{ margin: '4px 0' }}>
              <strong>Confirmation Code:</strong> {result.confirmationCode}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Date:</strong>{' '}
              {new Date(result.scheduledAt).toLocaleString()}
            </p>
            {result.serviceName && (
              <p style={{ margin: '4px 0' }}>
                <strong>Service:</strong> {result.serviceName}
              </p>
            )}
            {result.providerName && (
              <p style={{ margin: '4px 0' }}>
                <strong>Provider:</strong> {result.providerName}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      {bookingPage && (
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          {bookingPage.logoUrl && (
            <img
              src={bookingPage.logoUrl}
              alt={bookingPage.title}
              style={{ maxHeight: '60px', marginBottom: '12px' }}
            />
          )}
          <h2 style={{ margin: '0 0 8px 0' }}>{bookingPage.title}</h2>
          {bookingPage.description && (
            <p style={{ margin: 0, color: '#6b7280' }}>
              {bookingPage.description}
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: mergedTheme.borderRadius,
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Select Service and Provider */}
      {step === 'select' && bookingPage && (
        <div>
          {/* Service Selection */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>Select a Service</h3>
            <div
              style={{
                display: 'grid',
                gap: '12px',
              }}
            >
              {bookingPage.appointmentTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedService(type)}
                  style={{
                    padding: '16px',
                    border: `2px solid ${selectedService?.id === type.id ? mergedTheme.primaryColor : '#e5e7eb'}`,
                    borderRadius: mergedTheme.borderRadius,
                    cursor: 'pointer',
                    backgroundColor:
                      selectedService?.id === type.id ? '#eff6ff' : 'white',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    {type.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {type.durationMinutes} minutes
                    {type.price && ` • $${type.price}`}
                  </div>
                  {type.description && (
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginTop: '4px',
                      }}
                    >
                      {type.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Provider Selection */}
          {bookingPage.providers.length > 1 && selectedService && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px' }}>Select a Provider</h3>
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                }}
              >
                <div
                  onClick={() => setSelectedProvider(null)}
                  style={{
                    padding: '16px',
                    border: `2px solid ${selectedProvider === null ? mergedTheme.primaryColor : '#e5e7eb'}`,
                    borderRadius: mergedTheme.borderRadius,
                    cursor: 'pointer',
                    backgroundColor:
                      selectedProvider === null ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>Any Available Provider</div>
                </div>
                {bookingPage.providers.map((provider) => (
                  <div
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider)}
                    style={{
                      padding: '16px',
                      border: `2px solid ${selectedProvider?.id === provider.id ? mergedTheme.primaryColor : '#e5e7eb'}`,
                      borderRadius: mergedTheme.borderRadius,
                      cursor: 'pointer',
                      backgroundColor:
                        selectedProvider?.id === provider.id
                          ? '#eff6ff'
                          : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    {provider.avatarUrl && (
                      <img
                        src={provider.avatarUrl}
                        alt={provider.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                        }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{provider.name}</div>
                      {provider.title && (
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {provider.title}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setStep('datetime')}
            disabled={!selectedService}
            style={{
              ...buttonStyle,
              opacity: selectedService ? 1 : 0.5,
              cursor: selectedService ? 'pointer' : 'not-allowed',
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Select Date and Time */}
      {step === 'datetime' && (
        <div>
          <button
            onClick={() => setStep('select')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '16px',
              color: mergedTheme.primaryColor,
              padding: 0,
            }}
          >
            &larr; Back
          </button>

          <h3 style={{ marginBottom: '12px' }}>Select Date</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={inputStyle}
          />

          {selectedDate && (
            <>
              <h3 style={{ marginBottom: '12px' }}>Select Time</h3>
              {loadingSlots ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  Loading available times...
                </div>
              ) : availableSlots.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#6b7280',
                  }}
                >
                  No available times for this date. Please select another date.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px',
                    marginBottom: '24px',
                  }}
                >
                  {availableSlots.map((slot, index) => {
                    const time = new Date(slot.startTime).toLocaleTimeString(
                      [],
                      {
                        hour: 'numeric',
                        minute: '2-digit',
                      },
                    );
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '12px',
                          border: `2px solid ${selectedSlot === slot ? mergedTheme.primaryColor : '#e5e7eb'}`,
                          borderRadius: mergedTheme.borderRadius,
                          backgroundColor:
                            selectedSlot === slot ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <button
            onClick={() => setStep('form')}
            disabled={!selectedSlot}
            style={{
              ...buttonStyle,
              opacity: selectedSlot ? 1 : 0.5,
              cursor: selectedSlot ? 'pointer' : 'not-allowed',
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 3: Customer Details Form */}
      {step === 'form' && (
        <div>
          <button
            onClick={() => setStep('datetime')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '16px',
              color: mergedTheme.primaryColor,
              padding: 0,
            }}
          >
            &larr; Back
          </button>

          <h3 style={{ marginBottom: '12px' }}>Your Details</h3>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Your Name *"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="email"
              placeholder="Email Address *"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="tel"
              placeholder={`Phone Number${bookingPage?.bookingSettings.requirePhone ? ' *' : ''}`}
              required={bookingPage?.bookingSettings.requirePhone}
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              style={inputStyle}
            />

            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical',
              }}
            />

            {/* Booking Summary */}
            <div
              style={{
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: mergedTheme.borderRadius,
                marginBottom: '16px',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0' }}>Booking Summary</h4>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                <strong>Service:</strong> {selectedService?.name}
              </p>
              {selectedProvider && (
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Provider:</strong> {selectedProvider.name}
                </p>
              )}
              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                <strong>Date:</strong>{' '}
                {selectedSlot &&
                  new Date(selectedSlot.startTime).toLocaleDateString()}
              </p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                <strong>Time:</strong>{' '}
                {selectedSlot &&
                  new Date(selectedSlot.startTime).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
              </p>
              {selectedService?.price && (
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Price:</strong> ${selectedService.price}
                </p>
              )}
            </div>

            {bookingPage?.bookingSettings.cancellationPolicy && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '16px',
                }}
              >
                {bookingPage.bookingSettings.cancellationPolicy}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...buttonStyle,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default BookingWidget;
