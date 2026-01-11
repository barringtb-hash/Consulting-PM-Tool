# PR: M2 - Global Layout & Navigation

## Summary

This PR implements **Milestone M2: Global Layout & Navigation**, creating a modern, cohesive, and accessible application shell for all authenticated pages.

### What Changed

**New Components:**
- `AppLayout` (`/src/layouts/AppLayout.tsx`) - Main layout wrapper that combines TopBar, Sidebar, and scrollable content area
- `Sidebar` (`/src/layouts/Sidebar.tsx`) - Desktop navigation with icons, active state highlighting, and grouped nav items
- `TopBar` (`/src/layouts/TopBar.tsx`) - Header with hamburger menu button, branding, and user dropdown menu
- `MobileMenu` (`/src/layouts/MobileMenu.tsx`) - Accessible mobile/tablet drawer navigation with focus trapping

**Updated Components:**
- `App.tsx` - Refactored to use new AppLayout with proper route nesting
- `DashboardPage.tsx` - Updated to use M1 primitives (PageHeader, Section, Card)

**Documentation:**
- `docs/AppLayout.md` - Comprehensive guide for using AppLayout and registering new routes

**Dependencies:**
- Added `lucide-react` for consistent iconography

### Key Features

#### Responsive Design
- **Desktop (≥1024px)**: Always-visible 240px sidebar with full navigation
- **Tablet/Mobile (<1024px)**: Collapsible drawer menu with hamburger toggle

#### Navigation
- **Active State Highlighting**: Current route automatically highlighted in both sidebar and mobile menu
- **Icon Support**: Clean icons from lucide-react for visual hierarchy
- **Grouped Items**: Main navigation and Admin section clearly separated

#### Accessibility
- **ARIA Attributes**: Proper `aria-modal`, `aria-label`, `aria-expanded`, `aria-current` throughout
- **Focus Trapping**: Mobile menu traps focus within drawer when open
- **Keyboard Navigation**:
  - ESC key closes mobile menu
  - Tab navigation properly loops within mobile menu
  - All interactive elements keyboard-accessible
- **Screen Reader Support**: Clear labels and semantic HTML structure
- **Focus States**: Visible focus indicators on all interactive elements

#### User Experience
- **User Menu**: Displays current user name/email with logout functionality
- **Click Outside**: Mobile menu closes when clicking backdrop
- **Body Scroll Lock**: Prevents background scroll when mobile menu is open
- **Smooth Transitions**: Drawer slides in/out with CSS transitions

### Layout Structure

```
┌──────────────────────────────────────────────┐
│              TopBar (64px)                   │
│  [≡ Menu] [Logo] ............... [User Menu] │
├─────────┬────────────────────────────────────┤
│         │                                    │
│ Sidebar │    Main Content Area               │
│ (240px) │    (scrollable)                    │
│         │                                    │
│  Nav    │    - PageHeader (from M1)          │
│  Items  │    - Section(s) (from M1)          │
│         │    - Page-specific content         │
│         │                                    │
└─────────┴────────────────────────────────────┘
```

### Navigation Items

**Main Group:**
- Dashboard - `/dashboard` (LayoutDashboard icon)
- My Tasks - `/tasks` (CheckSquare icon)
- Clients - `/clients` (Users icon)
- Projects - `/projects` (FolderKanban icon)
- Assets - `/assets` (FileText icon)

**Admin Group:**
- Create User - `/admin/users/new` (UserPlus icon)

### Technical Details

**Route Structure:**
- Login page (`/login`) - Remains minimal, no layout
- All authenticated routes - Wrapped in `AuthenticatedLayout` with full AppLayout
- Deep links (e.g., `/clients/:id`, `/projects/:id`) - Work seamlessly within layout

**Mobile Menu Implementation:**
- Uses React portals with fixed positioning
- Backdrop overlay with click-to-close
- Drawer slides from left with CSS transforms
- Automatically closes on route change
- Focus management with refs and useEffect hooks

**User Menu:**
- Dropdown positioned absolute to TopBar
- Click outside detection with refs
- Displays user name or email
- Async logout with error handling

### Files Changed

```
pmo/apps/web/
├── docs/
│   └── AppLayout.md (NEW)
├── src/
│   ├── layouts/ (NEW)
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── MobileMenu.tsx
│   ├── App.tsx (UPDATED - routing refactor)
│   └── pages/
│       └── DashboardPage.tsx (UPDATED - use M1 primitives)
├── package.json (lucide-react added)
└── package-lock.json (updated)
```

## Manual Test Checklist

### Desktop Testing (≥1024px viewport)

- [ ] **Login Flow**
  - [ ] Navigate to `/login` - should NOT show sidebar/topbar
  - [ ] Login with test credentials (admin@pmo.test / AdminDemo123!)
  - [ ] After login, redirects to dashboard WITH layout

- [ ] **Layout Appearance**
  - [ ] Sidebar visible on left (240px width)
  - [ ] TopBar at top with user menu on right
  - [ ] Main content area scrollable
  - [ ] AI Consulting PMO logo in sidebar
  - [ ] User menu shows email or name

- [ ] **Navigation**
  - [ ] Click Dashboard - highlights in sidebar, navigates correctly
  - [ ] Click My Tasks - highlights in sidebar, navigates correctly
  - [ ] Click Clients - highlights in sidebar, navigates correctly
  - [ ] Click Projects - highlights in sidebar (if route exists)
  - [ ] Click Assets - highlights in sidebar, navigates correctly
  - [ ] Click Create User - highlights in sidebar (Admin section)
  - [ ] Active state persists on page refresh

- [ ] **Deep Links**
  - [ ] Navigate to `/clients/:id` - layout present, Clients highlighted
  - [ ] Navigate to `/projects/:id` - layout present, Projects highlighted
  - [ ] Navigate to `/meetings/:id` - layout present
  - [ ] Back button works correctly

- [ ] **User Menu**
  - [ ] Click user avatar/name - dropdown appears
  - [ ] Dropdown shows user email
  - [ ] Click outside dropdown - closes
  - [ ] Click Logout - logs out and redirects to login (no layout)

### Mobile Testing (<1024px viewport)

- [ ] **Responsive Behavior**
  - [ ] Resize viewport below 1024px
  - [ ] Sidebar disappears
  - [ ] Hamburger menu button appears in TopBar (left side)
  - [ ] Logo appears in TopBar center
  - [ ] User menu remains on right

- [ ] **Mobile Menu**
  - [ ] Click hamburger button - drawer slides in from left
  - [ ] Backdrop overlay appears
  - [ ] Same navigation items as sidebar
  - [ ] Active route highlighted
  - [ ] Click nav item - navigates and closes drawer
  - [ ] Click backdrop - closes drawer
  - [ ] Press ESC key - closes drawer

- [ ] **Accessibility**
  - [ ] Tab through mobile menu - focus stays within drawer
  - [ ] Tab on last item wraps to first
  - [ ] Shift+Tab on first item wraps to last
  - [ ] Body scroll locked when drawer open
  - [ ] Body scroll restored when drawer closed

### Accessibility Testing (All Viewports)

- [ ] **Keyboard Navigation**
  - [ ] Tab through all nav items - visible focus states
  - [ ] Tab through user menu - visible focus states
  - [ ] Enter/Space activates buttons and links
  - [ ] ESC closes mobile menu (mobile only)
  - [ ] ESC closes user dropdown

- [ ] **Screen Reader**
  - [ ] Sidebar has clear navigation landmark
  - [ ] Mobile menu has `aria-modal="true"`
  - [ ] Active nav items have `aria-current="page"`
  - [ ] Hamburger button has `aria-label="Open menu"`
  - [ ] Close button has `aria-label="Close menu"`

### Cross-Page Testing

- [ ] **All Pages Render in Layout**
  - [ ] `/dashboard` - PageHeader + content visible
  - [ ] `/tasks` - renders in layout
  - [ ] `/clients` - renders in layout
  - [ ] `/clients/:id` - renders in layout
  - [ ] `/client-intake` - renders in layout
  - [ ] `/projects/new` - renders in layout
  - [ ] `/projects/:id` - renders in layout
  - [ ] `/assets` - renders in layout
  - [ ] `/meetings/:id` - renders in layout
  - [ ] `/admin/users/new` - renders in layout

- [ ] **No Layout Issues**
  - [ ] No horizontal scrollbars
  - [ ] Content doesn't overflow
  - [ ] PageHeader fits properly
  - [ ] Section padding consistent

### Build & Tests

- [ ] `npm run build` - builds successfully
- [ ] `npm test` - all tests pass (14 tests)
- [ ] No console errors in browser
- [ ] No TypeScript errors

## Screenshots

_[Add screenshots showing:]_
- Desktop layout with sidebar
- Mobile layout with hamburger menu
- Mobile menu drawer open
- Active navigation states
- User menu dropdown

## Related Issues

Closes: M2 - Global Layout & Navigation milestone

## Next Steps

After this PR is merged, Milestone M3 can proceed to enhance individual pages with better UI components and interactions, building on this consistent layout foundation.

---

**Test Account:**
- Email: `admin@pmo.test`
- Password: `AdminDemo123!`
