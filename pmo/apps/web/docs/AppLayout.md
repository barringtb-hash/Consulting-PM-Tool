# AppLayout Documentation

## Overview

The `AppLayout` component provides a consistent application shell for all authenticated pages in the AI Consulting PMO platform. It includes:

- **Top Bar**: Product branding, user menu with logout functionality
- **Sidebar**: Navigation menu with active state highlighting (desktop only)
- **Mobile Menu**: Collapsible drawer navigation for mobile/tablet viewports
- **Main Content Area**: Scrollable content area for page content

## Component Structure

```
/src/layouts/
├── AppLayout.tsx       # Main layout wrapper
├── TopBar.tsx          # Header with user menu and mobile hamburger
├── Sidebar.tsx         # Desktop navigation sidebar
└── MobileMenu.tsx      # Mobile/tablet drawer navigation
```

## Usage

### Basic Usage

The AppLayout is automatically applied to all authenticated routes via the `AuthenticatedLayout` wrapper in `App.tsx`:

```tsx
// App.tsx
function AuthenticatedLayout(): JSX.Element {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
```

### Adding New Routes

To add a new authenticated route with the layout:

1. Add the route inside the `AuthenticatedLayout` route:

```tsx
<Route element={<ProtectedRoute />}>
  <Route element={<AuthenticatedLayout />}>
    {/* Add your new route here */}
    <Route path="/your-path" element={<YourPage />} />
  </Route>
</Route>
```

2. Add the navigation item to the sidebar in `/src/layouts/Sidebar.tsx`:

```tsx
const navItems: NavItem[] = [
  // ... existing items
  {
    label: 'Your Feature',
    path: '/your-path',
    icon: YourIcon,  // from lucide-react
    group: 'main',   // or 'admin'
  },
];
```

The same navigation items are automatically used in the mobile menu.

## Features

### Responsive Behavior

- **Desktop (≥1024px)**: Sidebar is always visible at 240px width
- **Tablet/Mobile (<1024px)**: Sidebar collapses, hamburger menu button appears in top bar

### Active State Highlighting

The sidebar and mobile menu automatically highlight the active navigation item based on the current route pathname using React Router's `useLocation` hook.

### Accessibility

The mobile menu includes:
- ARIA attributes (`aria-modal`, `aria-label`, `aria-expanded`, `aria-current`)
- Focus trapping when open
- ESC key to close
- Click outside to close
- Body scroll lock when open

### User Menu

The top bar includes a user menu dropdown showing:
- Current user name or email
- Logout button

## Layout Structure

```
┌─────────────────────────────────────────┐
│           TopBar (TopBar.tsx)           │
├────────┬────────────────────────────────┤
│        │                                │
│ Side   │                                │
│ bar    │   Main Content Area            │
│ (240px)│   (scrollable)                 │
│        │                                │
│        │   - PageHeader                 │
│        │   - Section(s)                 │
│        │   - Page content               │
│        │                                │
└────────┴────────────────────────────────┘
```

## Page Content Recommendations

Pages rendered inside AppLayout should use the M1 UI primitives for consistency:

```tsx
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';

function YourPage() {
  return (
    <>
      <PageHeader
        title="Page Title"
        description="Page description"
        actions={<Button>Action</Button>}
      />
      <Section>
        {/* Your content here */}
      </Section>
    </>
  );
}
```

## Navigation Items

Current navigation structure:

**Main Group:**
- Dashboard (`/dashboard`)
- My Tasks (`/tasks`)
- Clients (`/clients`)
- Projects (`/projects`)
- Assets (`/assets`)

**Admin Group:**
- Create User (`/admin/users/new`)

To modify navigation, edit the `navItems` array in both `Sidebar.tsx` and `MobileMenu.tsx`.

## Icons

The layout uses [Lucide React](https://lucide.dev/) for icons. Available icons include:
- `LayoutDashboard`
- `CheckSquare`
- `Users`
- `FolderKanban`
- `FileText`
- `UserPlus`
- `Menu`
- `X`
- `LogOut`
- `User`

## Public Routes

Routes that should NOT have the AppLayout (e.g., login page) should be placed outside the `AuthenticatedLayout` wrapper:

```tsx
<Routes>
  {/* Public routes without layout */}
  <Route path="/login" element={<LoginPage />} />

  {/* Protected routes with layout */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AuthenticatedLayout />}>
      {/* ... */}
    </Route>
  </Route>
</Routes>
```
