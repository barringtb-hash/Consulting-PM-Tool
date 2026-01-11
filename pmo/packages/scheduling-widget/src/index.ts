/**
 * @pmo/scheduling-widget
 *
 * React components and hooks for embedding appointment scheduling.
 *
 * @example
 * ```tsx
 * import { SchedulingWidget, SchedulingWindow, useScheduling } from '@pmo/scheduling-widget';
 *
 * // Floating widget
 * <SchedulingWidget
 *   apiUrl="https://api.example.com"
 *   slug="my-business"
 *   onBookingComplete={(result) => console.log('Booked!', result)}
 * />
 *
 * // Inline embedded booking
 * <SchedulingWidget
 *   apiUrl="https://api.example.com"
 *   slug="my-business"
 *   inline={true}
 * />
 *
 * // Embedded window only
 * <SchedulingWindow
 *   apiUrl="https://api.example.com"
 *   slug="my-business"
 * />
 *
 * // Custom implementation with hook
 * const {
 *   config,
 *   slots,
 *   createBooking,
 *   selectDate,
 * } = useScheduling({
 *   apiUrl: "https://api.example.com",
 *   slug: "my-business",
 * });
 * ```
 */

// Components
export { SchedulingWidget } from './SchedulingWidget';
export type { SchedulingWidgetProps } from './SchedulingWidget';

export { SchedulingWindow } from './SchedulingWindow';
export type { SchedulingWindowProps } from './SchedulingWindow';

// Hooks
export { useScheduling } from './useScheduling';

// Types
export type {
  BookingPageConfig,
  Provider,
  AppointmentType,
  IntakeForm,
  IntakeFormField,
  TimeSlot,
  AvailabilityQuery,
  BookingInput,
  BookingResult,
  Appointment,
  AppointmentStatus,
  ConfirmationLookup,
  WidgetConfig,
  SchedulingWindowConfig,
  UseSchedulingOptions,
  UseSchedulingReturn,
} from './types';
