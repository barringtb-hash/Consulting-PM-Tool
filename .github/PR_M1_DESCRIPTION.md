# Pull Request: uiux/M1-design-system

**Branch:** `claude/pmo-ui-redesign-017W5o5eTv653mnZEnpB5bQD`
**Title:** `uiux/M1-design-system`

---

## Summary

Milestone 1 establishes the foundation and design system for the AI Consulting PMO platform. This PR introduces **Tailwind CSS** as the single styling approach and creates a comprehensive set of reusable UI primitives that will be used throughout the application.

## Changes

### Design System Setup
- ✅ Installed Tailwind CSS v3 with PostCSS and autoprefixer
- ✅ Created `tailwind.config.js` with custom color palette:
  - **Primary**: Blue scale for brand and interactive elements
  - **Neutral**: Gray scale for text and backgrounds
  - **Semantic**: Success, warning, and danger colors
- ✅ Set up global typography, spacing, and accessibility-focused styles in `src/index.css`

### UI Primitives (`/src/ui`)

All components are fully typed with TypeScript and support accessibility features:

**Form Controls:**
- `Input` – Text input with label, helper text, and error states
- `Textarea` – Multi-line text input
- `Select` – Dropdown with custom styling and SVG arrow
- `Checkbox` – Checkbox with label and helper text

**Buttons & Actions:**
- `Button` – Variants: primary, secondary, subtle, destructive | Sizes: default, sm | Loading state with spinner

**Display & Layout:**
- `Badge` – Small colored labels (6 variants)
- `Card` – Flexible container with `CardHeader`, `CardTitle`, `CardBody`, `CardFooter`
- `PageHeader` – Consistent page title with optional description and actions
- `Section` & `Container` – Layout primitives for consistent spacing and max-width

### Proof of Concept
- ✅ Upgraded `/admin/users/new` (AdminCreateUserPage) to use the new design system
- **Before:** Bare HTML with inline styles, inconsistent spacing
- **After:** Clean, consistent UI using Card, PageHeader, Input, Select, Button components

### Documentation
- ✅ Updated `pmo/apps/web/README.md` with:
  - Frontend structure overview
  - Complete UI System documentation
  - Usage examples and conventions
  - Accessibility notes

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Button | `/src/ui/Button.tsx` | Primary actions with variants and loading states |
| Input | `/src/ui/Input.tsx` | Text input with integrated label and validation |
| Textarea | `/src/ui/Textarea.tsx` | Multi-line text input |
| Select | `/src/ui/Select.tsx` | Dropdown select |
| Checkbox | `/src/ui/Checkbox.tsx` | Boolean input |
| Badge | `/src/ui/Badge.tsx` | Status and tag labels |
| Card | `/src/ui/Card.tsx` | Content container with sections |
| PageHeader | `/src/ui/PageHeader.tsx` | Page title with description and actions |
| Section | `/src/ui/Section.tsx` | Page section wrapper |
| Container | `/src/ui/Section.tsx` | Max-width content constraint |

## Manual Test Checklist

- [x] Build completes without errors (`npm run build`)
- [x] All existing tests pass (`npm run test`)
- [x] Tailwind classes generate correctly
- [x] Global typography renders properly
- [x] AdminCreateUserPage displays with new UI components
- [x] Form inputs show labels, placeholders, and helper text
- [x] Button variants render correctly (primary, secondary)
- [x] Loading state spinner appears
- [x] Focus states visible on all interactive elements
- [x] Success/error alerts display with proper semantic colors
- [x] Card component properly structures content

## Screenshots

**Before (AdminCreateUserPage):**
- Bare HTML with inline styles
- Inconsistent spacing
- No design system

**After (AdminCreateUserPage):**
- PageHeader with title and description
- Card with header and organized form
- Consistent Input/Select components with labels
- Primary and secondary Button variants
- Semantic color-coded success/error alerts
- Proper spacing and typography hierarchy

## Impact

- ✅ No API or schema changes
- ✅ No breaking changes to existing routes
- ✅ All existing tests pass (14/14 passed)
- ✅ Single page upgraded to demonstrate system
- ✅ Foundation in place for M2+ milestone work

## Files Changed

- **Modified**: `pmo/apps/web/package.json`, `pmo/package-lock.json`
- **Modified**: `pmo/apps/web/README.md`, `pmo/apps/web/src/main.tsx`
- **Modified**: `pmo/apps/web/src/pages/AdminCreateUserPage.tsx`
- **Created**: `pmo/apps/web/tailwind.config.js`, `pmo/apps/web/postcss.config.js`
- **Created**: `pmo/apps/web/src/index.css`
- **Created**: `/src/ui/` (10 new component files + utils + index)

## Next Steps (Future Milestones)

- M2: Migrate remaining pages to use design system
- M3+: Navigation redesign, layout improvements, page-specific enhancements

---

**Note:** This PR intentionally keeps changes scoped to the design system foundation. Navigation and other page redesigns are deferred to subsequent milestones as specified in the project plan.

---

## How to Create This PR

Visit: https://github.com/barringtb-hash/Consulting-PM-Tool/pull/new/claude/pmo-ui-redesign-017W5o5eTv653mnZEnpB5bQD

Or use the CLI:
```bash
gh pr create --title "uiux/M1-design-system" --body-file .github/PR_M1_DESCRIPTION.md
```
