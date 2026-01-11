/**
 * useScheduling Hook
 *
 * React hook for managing scheduling state and API interactions.
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  UseSchedulingOptions,
  UseSchedulingReturn,
  BookingPageConfig,
  TimeSlot,
  Provider,
  AppointmentType,
  AvailabilityQuery,
  BookingInput,
  BookingResult,
  ConfirmationLookup,
  Appointment,
} from './types';

export function useScheduling(
  options: UseSchedulingOptions,
): UseSchedulingReturn {
  const { apiUrl, slug, timezone, autoLoad = true } = options;

  // State
  const [config, setConfig] = useState<BookingPageConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<Error | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [selectedAppointmentType, setSelectedAppointmentType] =
    useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // API helper
  const fetchApi = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      const url = `${apiUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    },
    [apiUrl],
  );

  // Load booking page config
  const loadConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setConfigError(null);

    try {
      const data = await fetchApi<BookingPageConfig>(`/booking/${slug}`);
      setConfig(data);
    } catch (error) {
      setConfigError(
        error instanceof Error ? error : new Error('Failed to load config'),
      );
    } finally {
      setIsLoadingConfig(false);
    }
  }, [fetchApi, slug]);

  // Load available slots
  const loadSlots = useCallback(
    async (query: AvailabilityQuery) => {
      setIsLoadingSlots(true);

      try {
        const params = new URLSearchParams({
          startDate: query.startDate,
          endDate: query.endDate,
          ...(query.providerId && { providerId: String(query.providerId) }),
          ...(query.appointmentTypeId && {
            appointmentTypeId: String(query.appointmentTypeId),
          }),
          ...(query.timezone || timezone
            ? { timezone: query.timezone || timezone! }
            : {}),
        });

        const data = await fetchApi<{ slots: TimeSlot[] }>(
          `/booking/${slug}/availability?${params.toString()}`,
        );
        setSlots(data.slots || []);
      } catch (error) {
        console.error('Failed to load slots:', error);
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [fetchApi, slug, timezone],
  );

  // Selection handlers
  const selectProvider = useCallback((provider: Provider | null) => {
    setSelectedProvider(provider);
    setSelectedSlot(null); // Reset slot when provider changes
  }, []);

  const selectAppointmentType = useCallback((type: AppointmentType | null) => {
    setSelectedAppointmentType(type);
    setSelectedSlot(null); // Reset slot when type changes
  }, []);

  const selectDate = useCallback((date: Date | null) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Reset slot when date changes
  }, []);

  const selectSlot = useCallback((slot: TimeSlot | null) => {
    setSelectedSlot(slot);
  }, []);

  // Create booking
  const createBooking = useCallback(
    async (input: BookingInput): Promise<BookingResult> => {
      const data = await fetchApi<BookingResult>(`/booking/${slug}/book`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return data;
    },
    [fetchApi, slug],
  );

  // Lookup booking by confirmation code
  const lookupBooking = useCallback(
    async (code: string): Promise<ConfirmationLookup> => {
      const data = await fetchApi<ConfirmationLookup>(
        `/booking/confirmation/${code}`,
      );
      return data;
    },
    [fetchApi],
  );

  // Reschedule booking
  const rescheduleBooking = useCallback(
    async (code: string, newScheduledAt: string): Promise<Appointment> => {
      const data = await fetchApi<Appointment>(
        `/booking/confirmation/${code}/reschedule`,
        {
          method: 'POST',
          body: JSON.stringify({ scheduledAt: newScheduledAt, timezone }),
        },
      );
      return data;
    },
    [fetchApi, timezone],
  );

  // Cancel booking
  const cancelBooking = useCallback(
    async (code: string, reason?: string): Promise<void> => {
      await fetchApi(`/booking/confirmation/${code}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    [fetchApi],
  );

  // Reset all selections
  const reset = useCallback(() => {
    setSelectedProvider(null);
    setSelectedAppointmentType(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
  }, []);

  // Auto-load config on mount
  useEffect(() => {
    if (autoLoad) {
      loadConfig();
    }
  }, [autoLoad, loadConfig]);

  return {
    config,
    isLoadingConfig,
    configError,
    slots,
    isLoadingSlots,
    selectedProvider,
    selectedAppointmentType,
    selectedDate,
    selectedSlot,
    loadConfig,
    loadSlots,
    selectProvider,
    selectAppointmentType,
    selectDate,
    selectSlot,
    createBooking,
    lookupBooking,
    rescheduleBooking,
    cancelBooking,
    reset,
  };
}
