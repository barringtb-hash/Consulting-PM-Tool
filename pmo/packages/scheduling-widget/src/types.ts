/**
 * Scheduling Widget Types
 */

// ============================================================================
// BOOKING PAGE CONFIG
// ============================================================================

export interface BookingPageConfig {
  id: number;
  slug: string;
  title: string;
  description?: string;
  logoUrl?: string;
  primaryColor: string;
  showProviderSelection: boolean;
  showAppointmentTypes: boolean;
  requirePhone: boolean;
  requireIntakeForm: boolean;
  config: {
    id: number;
    practiceName?: string;
    timezone: string;
    defaultSlotDurationMin: number;
    bufferBetweenSlotsMin: number;
    minAdvanceBookingHours: number;
    maxAdvanceBookingDays: number;
    providers: Provider[];
    appointmentTypes: AppointmentType[];
  };
  intakeForms: IntakeForm[];
}

export interface Provider {
  id: number;
  name: string;
  title?: string;
  photoUrl?: string;
  isActive: boolean;
}

export interface AppointmentType {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency?: string;
  color: string;
  isActive: boolean;
}

export interface IntakeForm {
  id: number;
  name: string;
  description?: string;
  fields: IntakeFormField[];
  isRequired: boolean;
}

export interface IntakeFormField {
  name: string;
  type:
    | 'text'
    | 'email'
    | 'phone'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'date';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

// ============================================================================
// TIME SLOTS
// ============================================================================

export interface TimeSlot {
  datetime: string;
  providerId: number | null;
  providerName: string | null;
  available: boolean;
}

export interface AvailabilityQuery {
  startDate: string;
  endDate: string;
  providerId?: number;
  appointmentTypeId?: number;
  timezone?: string;
}

// ============================================================================
// BOOKING
// ============================================================================

export interface BookingInput {
  appointmentTypeId?: number;
  providerId?: number;
  scheduledAt: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  timezone?: string;
  intakeFormResponses?: Record<string, unknown>;
}

export interface BookingResult {
  appointment: Appointment;
  confirmationCode: string;
  paymentRequired: boolean;
  paymentInfo?: {
    amount?: number;
    currency?: string;
    clientSecret?: string;
    paymentIntentId?: string;
  };
}

export interface Appointment {
  id: number;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  scheduledAt: string;
  durationMinutes: number;
  confirmationCode?: string;
  status: AppointmentStatus;
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
  | 'NO_SHOW';

// ============================================================================
// CONFIRMATION & SELF-SERVICE
// ============================================================================

export interface ConfirmationLookup {
  appointment: Appointment;
  canReschedule: boolean;
  canCancel: boolean;
}

// ============================================================================
// WIDGET CONFIG
// ============================================================================

export interface WidgetConfig {
  /** Base URL of the scheduling API */
  apiUrl: string;
  /** Booking page slug */
  slug: string;
  /** Optional: Override primary color */
  primaryColor?: string;
  /** Optional: Override button text */
  buttonText?: string;
  /** Optional: Show as inline embed instead of floating button */
  inline?: boolean;
  /** Optional: Initial position of the floating button */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Optional: Callback when booking is completed */
  onBookingComplete?: (result: BookingResult) => void;
  /** Optional: Callback when booking fails */
  onBookingError?: (error: Error) => void;
  /** Optional: Custom locale/language */
  locale?: string;
  /** Optional: Timezone for displaying times */
  timezone?: string;
}

export interface SchedulingWindowConfig {
  /** Base URL of the scheduling API */
  apiUrl: string;
  /** Booking page slug */
  slug: string;
  /** Optional: Override primary color */
  primaryColor?: string;
  /** Optional: Initial selected provider */
  initialProviderId?: number;
  /** Optional: Initial selected appointment type */
  initialAppointmentTypeId?: number;
  /** Optional: Pre-fill patient name */
  patientName?: string;
  /** Optional: Pre-fill patient email */
  patientEmail?: string;
  /** Optional: Pre-fill patient phone */
  patientPhone?: string;
  /** Optional: Callback when booking is completed */
  onBookingComplete?: (result: BookingResult) => void;
  /** Optional: Callback when booking fails */
  onBookingError?: (error: Error) => void;
  /** Optional: Custom locale/language */
  locale?: string;
  /** Optional: Timezone for displaying times */
  timezone?: string;
}

// ============================================================================
// HOOK OPTIONS
// ============================================================================

export interface UseSchedulingOptions {
  /** Base URL of the scheduling API */
  apiUrl: string;
  /** Booking page slug */
  slug: string;
  /** Optional: Timezone for displaying times */
  timezone?: string;
  /** Optional: Auto-load booking page config on mount */
  autoLoad?: boolean;
}

export interface UseSchedulingReturn {
  /** Booking page configuration */
  config: BookingPageConfig | null;
  /** Loading state for config */
  isLoadingConfig: boolean;
  /** Error loading config */
  configError: Error | null;
  /** Available time slots */
  slots: TimeSlot[];
  /** Loading state for slots */
  isLoadingSlots: boolean;
  /** Currently selected provider */
  selectedProvider: Provider | null;
  /** Currently selected appointment type */
  selectedAppointmentType: AppointmentType | null;
  /** Currently selected date */
  selectedDate: Date | null;
  /** Currently selected time slot */
  selectedSlot: TimeSlot | null;
  /** Load booking page config */
  loadConfig: () => Promise<void>;
  /** Load available slots for a date range */
  loadSlots: (query: AvailabilityQuery) => Promise<void>;
  /** Select a provider */
  selectProvider: (provider: Provider | null) => void;
  /** Select an appointment type */
  selectAppointmentType: (type: AppointmentType | null) => void;
  /** Select a date */
  selectDate: (date: Date | null) => void;
  /** Select a time slot */
  selectSlot: (slot: TimeSlot | null) => void;
  /** Create a booking */
  createBooking: (input: BookingInput) => Promise<BookingResult>;
  /** Lookup booking by confirmation code */
  lookupBooking: (code: string) => Promise<ConfirmationLookup>;
  /** Reschedule a booking */
  rescheduleBooking: (
    code: string,
    newScheduledAt: string,
  ) => Promise<Appointment>;
  /** Cancel a booking */
  cancelBooking: (code: string, reason?: string) => Promise<void>;
  /** Reset all selections */
  reset: () => void;
}
