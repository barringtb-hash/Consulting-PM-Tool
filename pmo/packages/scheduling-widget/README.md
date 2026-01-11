# @pmo/scheduling-widget

React components and hooks for embedding appointment scheduling in your application.

## Installation

```bash
npm install @pmo/scheduling-widget
# or
yarn add @pmo/scheduling-widget
```

## Usage

### Floating Widget

Add a floating booking button to your application:

```tsx
import { SchedulingWidget } from '@pmo/scheduling-widget';

function App() {
  return (
    <SchedulingWidget
      apiUrl="https://your-api.example.com/api"
      slug="your-booking-page-slug"
      buttonText="Book Appointment"
      position="bottom-right"
      onBookingComplete={(result) => {
        console.log('Booking confirmed:', result.confirmationCode);
      }}
    />
  );
}
```

### Inline Embed

Embed the booking interface directly in your page:

```tsx
import { SchedulingWidget } from '@pmo/scheduling-widget';

function BookingPage() {
  return (
    <div className="booking-container">
      <SchedulingWidget
        apiUrl="https://your-api.example.com/api"
        slug="your-booking-page-slug"
        inline={true}
      />
    </div>
  );
}
```

### Embedded Window

Use just the scheduling window component without the floating button:

```tsx
import { SchedulingWindow } from '@pmo/scheduling-widget';

function BookingPage() {
  return (
    <SchedulingWindow
      apiUrl="https://your-api.example.com/api"
      slug="your-booking-page-slug"
      patientName="John Doe"
      patientEmail="john@example.com"
      onBookingComplete={(result) => {
        console.log('Booked!', result);
      }}
    />
  );
}
```

### Custom Implementation with Hook

Build your own UI using the `useScheduling` hook:

```tsx
import { useScheduling } from '@pmo/scheduling-widget';

function CustomBooking() {
  const {
    config,
    isLoadingConfig,
    slots,
    isLoadingSlots,
    selectedDate,
    selectedSlot,
    loadSlots,
    selectDate,
    selectSlot,
    createBooking,
  } = useScheduling({
    apiUrl: 'https://your-api.example.com/api',
    slug: 'your-booking-page-slug',
  });

  // Build your custom UI...
}
```

## Props

### SchedulingWidget

| Prop                | Type       | Default            | Description                                                                          |
| ------------------- | ---------- | ------------------ | ------------------------------------------------------------------------------------ |
| `apiUrl`            | `string`   | **Required**       | Base URL of the scheduling API                                                       |
| `slug`              | `string`   | **Required**       | Booking page slug                                                                    |
| `primaryColor`      | `string`   | `#2563eb`          | Primary color for buttons and accents                                                |
| `buttonText`        | `string`   | `Book Appointment` | Text for the floating button                                                         |
| `inline`            | `boolean`  | `false`            | Show as inline embed instead of floating button                                      |
| `position`          | `string`   | `bottom-right`     | Position of floating button (`bottom-right`, `bottom-left`, `top-right`, `top-left`) |
| `onBookingComplete` | `function` | -                  | Callback when booking is completed                                                   |
| `onBookingError`    | `function` | -                  | Callback when booking fails                                                          |
| `locale`            | `string`   | -                  | Custom locale/language                                                               |
| `timezone`          | `string`   | Browser timezone   | Timezone for displaying times                                                        |

### SchedulingWindow

| Prop                       | Type       | Default      | Description                           |
| -------------------------- | ---------- | ------------ | ------------------------------------- |
| `apiUrl`                   | `string`   | **Required** | Base URL of the scheduling API        |
| `slug`                     | `string`   | **Required** | Booking page slug                     |
| `primaryColor`             | `string`   | `#2563eb`    | Primary color for buttons and accents |
| `initialProviderId`        | `number`   | -            | Pre-select a provider                 |
| `initialAppointmentTypeId` | `number`   | -            | Pre-select an appointment type        |
| `patientName`              | `string`   | -            | Pre-fill patient name                 |
| `patientEmail`             | `string`   | -            | Pre-fill patient email                |
| `patientPhone`             | `string`   | -            | Pre-fill patient phone                |
| `onBookingComplete`        | `function` | -            | Callback when booking is completed    |
| `onBookingError`           | `function` | -            | Callback when booking fails           |

### useScheduling Hook

```typescript
const {
  // State
  config, // BookingPageConfig | null
  isLoadingConfig, // boolean
  configError, // Error | null
  slots, // TimeSlot[]
  isLoadingSlots, // boolean
  selectedProvider, // Provider | null
  selectedAppointmentType, // AppointmentType | null
  selectedDate, // Date | null
  selectedSlot, // TimeSlot | null

  // Methods
  loadConfig, // () => Promise<void>
  loadSlots, // (query: AvailabilityQuery) => Promise<void>
  selectProvider, // (provider: Provider | null) => void
  selectAppointmentType, // (type: AppointmentType | null) => void
  selectDate, // (date: Date | null) => void
  selectSlot, // (slot: TimeSlot | null) => void
  createBooking, // (input: BookingInput) => Promise<BookingResult>
  lookupBooking, // (code: string) => Promise<ConfirmationLookup>
  rescheduleBooking, // (code: string, newScheduledAt: string) => Promise<Appointment>
  cancelBooking, // (code: string, reason?: string) => Promise<void>
  reset, // () => void
} = useScheduling({
  apiUrl: 'https://your-api.example.com/api',
  slug: 'your-booking-page-slug',
  timezone: 'America/New_York', // optional
  autoLoad: true, // optional, default true
});
```

## API Endpoints Required

The widget expects these API endpoints to be available:

- `GET /booking/:slug` - Get booking page configuration
- `GET /booking/:slug/availability` - Get available time slots
- `POST /booking/:slug/book` - Create a booking
- `GET /booking/confirmation/:code` - Lookup booking by confirmation code
- `POST /booking/confirmation/:code/reschedule` - Reschedule a booking
- `POST /booking/confirmation/:code/cancel` - Cancel a booking

## Styling

The widget uses inline styles for maximum compatibility. You can override the primary color using the `primaryColor` prop. For more extensive customization, use the `useScheduling` hook to build your own UI.

## License

MIT
