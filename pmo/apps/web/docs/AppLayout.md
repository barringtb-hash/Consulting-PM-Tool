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
    icon: YourIcon, // from lucide-react
    group: 'main', // or 'admin'
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
      <Section>{/* Your content here */}</Section>
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

## Dark Mode Support

The application uses Tailwind CSS class-based dark mode (`darkMode: 'class'`). When creating new pages, **all UI elements must include dark mode variants**.

### Color Palette

The neutral color scale uses cool Slate tones (configured in `tailwind.config.js`):

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Page background | `bg-neutral-50` | `dark:bg-neutral-900` |
| Card/container | `bg-white` | `dark:bg-neutral-800` |
| Card border | `border-neutral-200` | `dark:border-neutral-700` |
| Input background | `bg-white` | `dark:bg-neutral-900/50` |
| Input border | `border-neutral-300` | `dark:border-neutral-600` |

### Text Colors

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary text | `text-neutral-900` | `dark:text-neutral-100` |
| Secondary text | `text-neutral-600` | `dark:text-neutral-400` |
| Muted/tertiary | `text-neutral-500` | `dark:text-neutral-400` |
| Labels | `text-neutral-700` | `dark:text-neutral-300` |
| Disabled | `text-neutral-400` | `dark:text-neutral-500` |

### Interactive Elements

```tsx
// Buttons (secondary/ghost)
className="hover:bg-neutral-100 dark:hover:bg-neutral-700"

// Table rows
className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"

// Active/selected states
className="bg-primary-50 dark:bg-primary-900/30"
```

### Tables

```tsx
// Table container
<table className="divide-y divide-neutral-200 dark:divide-neutral-700">

// Table header
<thead className="bg-neutral-50 dark:bg-neutral-800/50">
  <th className="text-neutral-600 dark:text-neutral-400">Header</th>
</thead>

// Table body
<tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
  <td className="text-neutral-900 dark:text-neutral-100">Cell</td>
</tbody>
```

### Cards and Containers

```tsx
// Standard card
<div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm dark:shadow-dark-md">

// Glass effect card (semi-transparent)
<div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700/80">
```

### Empty States

```tsx
<div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-8 text-center">
  <IconComponent className="text-neutral-400 dark:text-neutral-500" />
  <p className="text-neutral-600 dark:text-neutral-400">No items found</p>
</div>
```

### Form Elements

```tsx
// Input fields
<input className="bg-white dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-primary-500 dark:focus:ring-primary-400" />

// Labels
<label className="text-neutral-700 dark:text-neutral-300">Label</label>

// Help text
<p className="text-neutral-500 dark:text-neutral-400">Help text</p>
```

### Shadows in Dark Mode

Standard shadows are invisible on dark backgrounds. Use the custom dark mode shadow utilities:

```tsx
// Instead of just shadow-sm
className="shadow-sm dark:shadow-dark-sm"

// Available utilities: shadow-dark-sm, shadow-dark-md, shadow-dark-lg, shadow-dark-elevated
```

### Status Colors

Keep semantic colors but adjust for dark mode contrast:

```tsx
// Success
className="text-green-600 dark:text-green-500"
className="bg-green-100 dark:bg-green-900/30"

// Warning
className="text-orange-600 dark:text-orange-500"
className="bg-orange-100 dark:bg-orange-900/30"

// Error
className="text-red-600 dark:text-red-500"
className="bg-red-100 dark:bg-red-900/30"

// Info
className="text-blue-600 dark:text-blue-500"
className="bg-blue-100 dark:bg-blue-900/30"
```

### Page Template

When creating a new page, use this template structure:

```tsx
function NewPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 space-y-6">
      <PageHeader
        title="Page Title"
        description="Page description"
      />

      {/* Card container */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Section Title
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Content description
        </p>
      </div>
    </div>
  );
}
```

### Theme Toggle

The theme is managed by `ThemeContext` (`/src/contexts/ThemeContext.tsx`). Users can toggle between light, dark, and system preference modes via the theme toggle in the TopBar.

The Login page automatically respects system preference using:

```tsx
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const applySystemTheme = (e) => {
    document.documentElement.classList.toggle('dark', e.matches);
  };
  applySystemTheme(mediaQuery);
  mediaQuery.addEventListener('change', applySystemTheme);
  return () => mediaQuery.removeEventListener('change', applySystemTheme);
}, []);
```

## Public Routes

Routes that should NOT have the AppLayout (e.g., login page) should be placed outside the `AuthenticatedLayout` wrapper:

```tsx
<Routes>
  {/* Public routes without layout */}
  <Route path="/login" element={<LoginPage />} />

  {/* Protected routes with layout */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AuthenticatedLayout />}>{/* ... */}</Route>
  </Route>
</Routes>
```
