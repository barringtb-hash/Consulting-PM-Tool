/**
 * Scheduling - Appointments API
 * API functions for appointment scheduling management
 */

import { buildOptions, ApiError } from '../http';
import { buildApiUrl } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface SchedulingConfig {
  id: number;
  accountId: number | null; // Primary reference (preferred for new implementations)
  clientId: number | null; // Legacy reference (deprecated)
  practiceName: string | null;
  timezone: string;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  defaultSlotDurationMin: number;
  bufferBetweenSlotsMin: number;
  enableReminders: boolean;
  reminderHoursBefore: number[];
  enableNoShowPrediction: boolean;
  noShowThreshold: number;
  enableOverbooking: boolean;
  enableWaitlist: boolean;
  isHipaaEnabled: boolean;
  account?: { id: number; name: string; industry: string | null };
  client?: { id: number; name: string };
  _count?: {
    providers: number;
    appointments: number;
    appointmentTypes: number;
  };
}

export interface Provider {
  id: number;
  configId: number;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  specialty: string | null;
  isActive: boolean;
  availabilitySchedule: Record<string, { start: string; end: string }[]> | null;
}

export interface AppointmentType {
  id: number;
  configId: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string | null;
  requiresDeposit: boolean;
  depositAmount: number | null;
  color: string | null;
  isActive: boolean;
}

export interface Appointment {
  id: number;
  configId: number;
  providerId: number | null;
  appointmentTypeId: number | null;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  status: AppointmentStatus;
  scheduledAt: string;
  durationMinutes: number;
  notes: string | null;
  noShowRiskScore: number | null;
  confirmationCode: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: Provider;
  appointmentType?: AppointmentType;
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export interface TimeSlot {
  datetime: string;
  providerId: number | null;
  providerName: string | null;
  available: boolean;
}

export interface WaitlistEntry {
  id: number;
  configId: number;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  preferredProviderId: number | null;
  preferredDays: string[] | null;
  preferredTimeStart: string | null;
  preferredTimeEnd: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SchedulingAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  noShowRate: number;
  averageLeadTimeDays: number;
  utilizationRate: number;
  byProvider: {
    providerId: number;
    providerName: string;
    total: number;
    completed: number;
    noShows: number;
  }[];
  byAppointmentType: {
    typeId: number;
    typeName: string;
    total: number;
    completed: number;
  }[];
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateConfigInput {
  practiceName?: string;
  timezone?: string;
  minAdvanceBookingHours?: number;
  maxAdvanceBookingDays?: number;
  defaultSlotDurationMin?: number;
  bufferBetweenSlotsMin?: number;
  enableReminders?: boolean;
  reminderHoursBefore?: number[];
  enableNoShowPrediction?: boolean;
  noShowThreshold?: number;
  enableOverbooking?: boolean;
  enableWaitlist?: boolean;
  isHipaaEnabled?: boolean;
}

export interface CreateProviderInput {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  specialty?: string;
  availabilitySchedule?: Record<string, { start: string; end: string }[]>;
}

export interface CreateAppointmentTypeInput {
  name: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  currency?: string;
  requiresDeposit?: boolean;
  depositAmount?: number;
  color?: string;
}

export interface CreateAppointmentInput {
  providerId?: number;
  appointmentTypeId?: number;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
}

export interface ListAppointmentsParams {
  providerId?: number;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AvailabilityParams {
  startDate?: string;
  endDate?: string;
  providerId?: number;
  appointmentTypeId?: number;
}

// ============================================================================
// API FUNCTIONS - CONFIGS (Account-based - Preferred)
// ============================================================================

/**
 * List scheduling configs with optional filtering
 */
export async function listConfigs(params?: {
  accountId?: number;
  clientId?: number;
}): Promise<SchedulingConfig[]> {
  const searchParams = new URLSearchParams();
  if (params?.accountId)
    searchParams.set('accountId', params.accountId.toString());
  if (params?.clientId)
    searchParams.set('clientId', params.clientId.toString());

  const res = await fetch(
    buildApiUrl(`/scheduling/configs?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

/**
 * Get scheduling config by Account ID (preferred)
 */
export async function getConfigByAccount(
  accountId: number,
): Promise<SchedulingConfig | null> {
  const res = await fetch(
    buildApiUrl(`/accounts/${accountId}/scheduling`),
    buildOptions(),
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    const error = new Error('Failed to fetch config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.config;
}

/**
 * Get scheduling config by Client ID
 * @deprecated Use getConfigByAccount instead
 */
export async function getConfig(
  clientId: number,
): Promise<SchedulingConfig | null> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/scheduling`),
    buildOptions(),
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    const error = new Error('Failed to fetch config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.config;
}

/**
 * Create scheduling config for an Account (preferred)
 */
export async function createConfigForAccount(
  accountId: number,
  input: CreateConfigInput,
): Promise<SchedulingConfig> {
  const res = await fetch(
    buildApiUrl(`/accounts/${accountId}/scheduling`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const data = await res.json();
    const error = new Error(
      data.error || 'Failed to create config',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.config;
}

/**
 * Create scheduling config for a Client
 * @deprecated Use createConfigForAccount instead
 */
export async function createConfig(
  clientId: number,
  input: CreateConfigInput,
): Promise<SchedulingConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/scheduling`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const data = await res.json();
    const error = new Error(
      data.error || 'Failed to create config',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.config;
}

/**
 * Update scheduling config for an Account (preferred)
 */
export async function updateConfigForAccount(
  accountId: number,
  input: Partial<CreateConfigInput>,
): Promise<SchedulingConfig> {
  const res = await fetch(
    buildApiUrl(`/accounts/${accountId}/scheduling`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.config;
}

/**
 * Update scheduling config for a Client
 * @deprecated Use updateConfigForAccount instead
 */
export async function updateConfig(
  clientId: number,
  input: Partial<CreateConfigInput>,
): Promise<SchedulingConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/scheduling`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.config;
}

// ============================================================================
// API FUNCTIONS - PROVIDERS
// ============================================================================

export async function listProviders(configId: number): Promise<Provider[]> {
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

export async function getProvider(providerId: number): Promise<Provider> {
  const res = await fetch(
    buildApiUrl(`/scheduling/providers/${providerId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch provider') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.provider;
}

export async function createProvider(
  configId: number,
  input: CreateProviderInput,
): Promise<Provider> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/providers`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create provider') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.provider;
}

export async function updateProvider(
  providerId: number,
  input: Partial<CreateProviderInput>,
): Promise<Provider> {
  const res = await fetch(
    buildApiUrl(`/scheduling/providers/${providerId}`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update provider') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.provider;
}

export async function deleteProvider(providerId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/providers/${providerId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to delete provider') as ApiError;
    error.status = res.status;
    throw error;
  }
}

// ============================================================================
// API FUNCTIONS - APPOINTMENT TYPES
// ============================================================================

export async function listAppointmentTypes(
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

export async function createAppointmentType(
  configId: number,
  input: CreateAppointmentTypeInput,
): Promise<AppointmentType> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/appointment-types`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create appointment type') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointmentType;
}

export async function updateAppointmentType(
  typeId: number,
  input: Partial<CreateAppointmentTypeInput>,
): Promise<AppointmentType> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointment-types/${typeId}`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update appointment type') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointmentType;
}

export async function deleteAppointmentType(typeId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointment-types/${typeId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to delete appointment type') as ApiError;
    error.status = res.status;
    throw error;
  }
}

// ============================================================================
// API FUNCTIONS - APPOINTMENTS
// ============================================================================

export async function listAppointments(
  configId: number,
  params: ListAppointmentsParams = {},
): Promise<Appointment[]> {
  const searchParams = new URLSearchParams();
  if (params.providerId)
    searchParams.set('providerId', params.providerId.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

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

export async function getAppointment(
  appointmentId: number,
): Promise<Appointment> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointments/${appointmentId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch appointment') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointment;
}

export async function createAppointment(
  configId: number,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/appointments`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const data = await res.json();
    const error = new Error(
      data.error || 'Failed to create appointment',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointment;
}

export async function updateAppointmentStatus(
  appointmentId: number,
  status: AppointmentStatus,
  options?: {
    notes?: string;
    cancellationReason?: string;
    cancelledBy?: string;
  },
): Promise<Appointment> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointments/${appointmentId}/status`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify({ status, ...options }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update appointment status') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointment;
}

export async function rescheduleAppointment(
  appointmentId: number,
  newScheduledAt: string,
  newProviderId?: number,
): Promise<Appointment> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointments/${appointmentId}/reschedule`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ newScheduledAt, newProviderId }),
    }),
  );
  if (!res.ok) {
    const data = await res.json();
    const error = new Error(
      data.error || 'Failed to reschedule appointment',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointment;
}

// ============================================================================
// API FUNCTIONS - AVAILABILITY
// ============================================================================

export async function getAvailability(
  configId: number,
  params: AvailabilityParams = {},
): Promise<TimeSlot[]> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.providerId)
    searchParams.set('providerId', params.providerId.toString());
  if (params.appointmentTypeId)
    searchParams.set('appointmentTypeId', params.appointmentTypeId.toString());

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/availability?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch availability') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.slots || [];
}

// ============================================================================
// API FUNCTIONS - WAITLIST
// ============================================================================

export async function getWaitlist(
  configId: number,
  params?: { isActive?: boolean },
): Promise<WaitlistEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.isActive !== undefined)
    searchParams.set('active', String(params.isActive));

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/waitlist?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch waitlist') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.waitlist || [];
}

export async function addToWaitlist(
  configId: number,
  input: {
    patientName: string;
    patientEmail?: string;
    patientPhone?: string;
    preferredProviderId?: number;
    preferredDays?: string[];
    preferredTimeStart?: string;
    preferredTimeEnd?: string;
  },
): Promise<WaitlistEntry> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/waitlist`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to add to waitlist') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.entry;
}

export async function removeFromWaitlist(entryId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/waitlist/${entryId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to remove from waitlist') as ApiError;
    error.status = res.status;
    throw error;
  }
}

// ============================================================================
// API FUNCTIONS - ANALYTICS
// ============================================================================

export async function getAnalytics(
  configId: number,
  params?: { start?: string; end?: string },
): Promise<SchedulingAnalytics> {
  const searchParams = new URLSearchParams();
  if (params?.start) searchParams.set('start', params.start);
  if (params?.end) searchParams.set('end', params.end);

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/analytics?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch analytics') as ApiError;
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

export async function getHighRiskAppointments(
  configId: number,
  threshold?: number,
): Promise<Appointment[]> {
  const searchParams = new URLSearchParams();
  if (threshold) searchParams.set('threshold', threshold.toString());

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/high-risk?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error(
      'Failed to fetch high-risk appointments',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.appointments || [];
}
