# PMO Web App

This workspace hosts the AI Consulting PMO web shell.

- Start development server: `npm run dev --workspace pmo-web`.
- Lint the source (configured as `eslint src --ext .ts,.tsx`): `npm run lint --workspace pmo-web`.
- After running the Prisma seed from `/pmo`, sign in with `admin@pmo.test` / `AdminDemo123!` (or the demo consultant accounts listed in the root README) to explore the flows end-to-end.

## Environment

- Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
- In production (Vercel), `VITE_API_BASE_URL` must point at the Render API base URL (e.g., `https://your-api.onrender.com/api`) so requests reach the backend.

## Frontend Structure

The frontend is a Vite + React + TypeScript SPA with the following organization:

- **`/src/pages`** – Top-level page components (LoginPage, DashboardPage, ClientsPage, etc.)
- **`/src/components`** – Shared components used across features (ClientForm, ContactForm, etc.)
- **`/src/features`** – Feature-specific components (meetings, status)
- **`/src/ui`** – Design system primitives and layout components
- **`/src/api`** – API client layer (HTTP calls, React Query hooks)
- **`/src/auth`** – Authentication context and protected route logic
- **`/src/hooks`** – Shared custom hooks
- **`/src/test`** – Test utilities and setup

### Key Dependencies

- **React Router** – Client-side routing
- **React Query (TanStack Query)** – Server state management and data fetching
- **Tailwind CSS** – Utility-first styling framework

## UI System

The design system is built with **Tailwind CSS** and provides a consistent set of reusable primitives for building interfaces.

### Design Tokens

Defined in `tailwind.config.js`:

#### Color Palette

The application uses a **warm, high-contrast color scheme** optimized for readability and extended viewing:

- **Primary (Blue)** – `#2563eb` base
  - Brand identity color for navigation, buttons, links, and focus states
  - Deeper, more readable blue compared to standard palettes
  - Usage: Primary CTAs, active nav items, interactive elements, logo

- **Neutral (Warm Grays)** – `#fafaf9` to `#1c1917`
  - Warm grays with subtle brown/beige undertones to reduce eye strain
  - Enhanced contrast between background layers for better visual hierarchy
  - Usage: Backgrounds, text, borders, dividers, labels

- **Success (Forest Green)** – `#16a34a` base
  - Professional forest green (not lime) for positive states
  - Usage: Success toasts, "ON_TRACK" status, success badges, validation

- **Warning (Amber)** – `#eab308` base
  - Warm amber/yellow for caution states
  - Better differentiation from danger (red) and success (green)
  - Usage: Warning toasts, "AT_RISK" status, warning badges

- **Danger (Authoritative Red)** – `#dc2626` base
  - Deeper, more serious red for error states
  - Enhanced contrast for critical messages
  - Usage: Error toasts, "OFF_TRACK" status, destructive actions, form errors

**Accessibility**: All color combinations meet **WCAG 2.1 Level AA** standards, with most achieving **AAA** compliance for contrast ratios.

- **Typography**: System font stack with responsive sizes
- **Spacing**: Standard Tailwind scale (4px increments)
- **Border Radius**: `sm`, `md`, `lg`, `xl`, `2xl`, `full`

### UI Components

All UI primitives live in `/src/ui` and are exported from `/src/ui/index.ts`:

#### Form Controls

- **`<Input>`** – Text input with label, helper text, and error states
- **`<Textarea>`** – Multi-line text input
- **`<Select>`** – Dropdown select with custom styling
- **`<Checkbox>`** – Checkbox with label and helper text

#### Buttons & Actions

- **`<Button>`** – Primary, secondary, subtle, and destructive variants; small and default sizes; loading state support

#### Display & Layout

- **`<Badge>`** – Small colored labels (default, primary, success, warning, danger, neutral)
- **`<Card>`** – Container with header, body, and footer slots
  - `<CardHeader>`, `<CardTitle>`, `<CardBody>`, `<CardFooter>`
- **`<PageHeader>`** – Consistent page title with optional description and actions
- **`<Section>`** – Page section with consistent padding
- **`<Container>`** – Content width constraint (sm, md, lg, xl, 2xl, full)

### Usage Example

```tsx
import { Button, Card, CardBody, CardHeader, CardTitle, Input, PageHeader, Section } from '../ui';

function MyPage() {
  return (
    <div>
      <PageHeader
        title="Page Title"
        description="Optional description"
        actions={<Button>Action</Button>}
      />
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="space-y-4">
              <Input label="Name" required />
              <Button type="submit">Submit</Button>
            </form>
          </CardBody>
        </Card>
      </Section>
    </div>
  );
}
```

### Adding New Variants

To extend component variants:

1. Add new variant to the type union (e.g., `ButtonVariant`)
2. Define styles in the `variantStyles` object
3. Export the type for consumers

#### Navigation & Feedback

- **`<Tabs>`** – Context-based tab navigation with TabsList, TabsTrigger, and TabsContent
- **`<ToastProvider>` & `useToast()`** – Toast notification system for user feedback
  - Supports `success`, `error`, and `info` variants
  - Auto-dismisses after 5 seconds
  - Accessible with `aria-live` regions

**Toast Usage:**
```tsx
import { useToast } from '../ui/Toast';

function MyComponent() {
  const { showToast } = useToast();

  const handleAction = async () => {
    try {
      await someAction();
      showToast('Action completed successfully!', 'success');
    } catch (error) {
      showToast('Failed to complete action', 'error');
    }
  };
}
```

### Accessibility

- All form controls support proper labeling and ARIA attributes
- Focus states are visible with `focus-visible` styles
- Error states use `aria-invalid` and `aria-describedby`
- Interactive elements meet WCAG contrast requirements
- Toast notifications use `aria-live="polite"` for screen reader support

## Application Layout & Routing

### AppLayout

The main application layout (`/src/layouts/AppLayout.tsx`) provides:
- Persistent sidebar navigation
- Top navigation bar with user menu
- Mobile-responsive hamburger menu
- Protected route wrapper

All authenticated pages should be wrapped in `<AppLayout>`:
```tsx
<AppLayout>
  <YourPageContent />
</AppLayout>
```

### Routing Conventions

Routes are defined in `/src/App.tsx` using React Router v6:

- `/` – Dashboard (protected)
- `/login` – Login page (public)
- `/clients` – Clients list (protected)
- `/client-intake` – Client creation wizard (protected)
- `/clients/:id` – Client detail page (protected)
- `/tasks` – My tasks page (protected)
- `/projects/new` – Project creation wizard (protected)
- `/projects/:id` – Project dashboard (protected)
- `/assets` – Assets library (protected)
- `/admin/users/new` – Create user (protected, admin only)

Protected routes require authentication and redirect to `/login` if the user is not authenticated.

## Testing

### Running Tests

```bash
# Run all tests
npm test --workspace pmo-web

# Run tests in watch mode
npm test --workspace pmo-web -- --watch

# Run tests with coverage
npm test --workspace pmo-web -- --coverage
```

### Test Structure

Tests are organized in `/src/test`:
- **`setup.ts`** – Global test configuration and jest-dom matchers
- **`utils.tsx`** – Test utilities including `renderWithProviders()`
- **`*.test.tsx`** – Test files colocated with test utilities

### Test Utilities

**`renderWithProviders()`** wraps components with:
- `MemoryRouter` for routing
- `QueryClientProvider` for React Query
- `ToastProvider` for notifications

Example:
```tsx
import { renderWithProviders } from './test/utils';

it('renders component', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Smoke Tests

Comprehensive smoke tests ensure core flows work:
- **NavigationSmokeTest.test.tsx** – All major pages render without crashing
- **ClientIntakeFlow.test.tsx** – Client creation wizard happy path
- **ProjectSetupFlow.test.tsx** – Project creation wizard happy path

### Mocking APIs

Use Vitest mocks for API calls:
```tsx
vi.mock('../api/queries', () => ({
  useClients: vi.fn(() => ({
    data: mockData,
    isLoading: false,
    error: null,
  })),
}));
```

## Development Workflow

### Adding a New Page

1. Create page component in `/src/pages`
2. Add route in `/src/App.tsx`
3. Add navigation link in `/src/layouts/Sidebar.tsx`
4. Wrap with `<AppLayout>` if authenticated
5. Add smoke test in `/src/test`

### Adding a New Form

1. Use existing form components from `/src/ui`
2. Implement validation with local state or validation library
3. Use React Query mutations for submission
4. Show success/error feedback with `useToast()`
5. Handle loading states with `isLoading` props

### Styling Guidelines

- Use Tailwind utility classes for styling
- Follow existing color palette (primary, neutral, success, warning, danger)
- Use design system components instead of raw HTML elements
- Maintain responsive design with `sm:`, `md:`, `lg:` breakpoints
- Use semantic HTML (`<header>`, `<section>`, `<nav>`, etc.)

## Linting & Code Quality

```bash
# Run ESLint
npm run lint --workspace pmo-web

# Fix auto-fixable issues
npm run lint --workspace pmo-web -- --fix
```

ESLint is configured with:
- React and TypeScript support
- React Hooks rules
- Accessibility (a11y) checks
