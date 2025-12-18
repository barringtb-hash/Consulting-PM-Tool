/**
 * @pmo/booking-widget
 *
 * Embeddable booking widget for scheduling appointments.
 *
 * Usage:
 *
 * ```tsx
 * import { BookingWidget } from '@pmo/booking-widget';
 *
 * function App() {
 *   return (
 *     <BookingWidget
 *       slug="your-booking-page-slug"
 *       apiBaseUrl="https://api.yourapp.com"
 *       onBookingComplete={(booking) => {
 *         console.log('Booked!', booking);
 *       }}
 *     />
 *   );
 * }
 * ```
 */

export {
  BookingWidget,
  type BookingWidgetProps,
  type BookingWidgetTheme,
  type BookingResult,
  type CustomerDetails,
} from './BookingWidget';

// Re-export default
export { default } from './BookingWidget';
