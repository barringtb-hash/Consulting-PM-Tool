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

- **Colors**: `primary` (blue), `neutral` (grays), `success`, `warning`, `danger`
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

### Accessibility

- All form controls support proper labeling and ARIA attributes
- Focus states are visible with `focus-visible` styles
- Error states use `aria-invalid` and `aria-describedby`
- Interactive elements meet WCAG contrast requirements
