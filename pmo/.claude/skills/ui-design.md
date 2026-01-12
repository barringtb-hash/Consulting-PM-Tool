# UI Design

Design and implement user interface components for the PMO/CRM platform.

## When to Use

- Creating new pages, forms, or dashboards
- Designing data tables, charts, or visualizations
- Building modals, dialogs, or navigation components
- Improving layouts or responsive design
- Establishing consistent visual patterns

## Instructions

1. Understand the UI requirements from the user
2. Review existing components and patterns in the codebase
3. Design the component following project conventions
4. Implement with proper accessibility considerations
5. Ensure responsive design for mobile/tablet/desktop

## Project UI Stack

- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Components:** Custom UI primitives in `apps/web/src/ui/`
- **State:** React Query for server state, React Context for client state

## Key Directories

- `apps/web/src/ui/` - Base UI components (Button, Card, Modal, Toast, Badge, Input, Select)
- `apps/web/src/components/` - Reusable feature components
- `apps/web/src/pages/` - Page-level components

## Design Patterns

### Cards

```tsx
<Card className="p-4">
  <h3 className="font-medium mb-2">Title</h3>
  <p className="text-sm text-gray-500">Content</p>
</Card>
```

### Forms

```tsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium mb-1">Label</label>
    <Input value={value} onChange={handleChange} />
  </div>
</div>
```

### Data Display

```tsx
<dl className="grid grid-cols-2 gap-4">
  <div>
    <dt className="text-sm text-gray-500">Label</dt>
    <dd className="font-medium">Value</dd>
  </div>
</dl>
```

## Color Classes

- Primary: `text-primary-600`, `bg-primary-100`
- Success: `text-green-600`, `bg-green-50`
- Warning: `text-yellow-600`, `bg-yellow-50`
- Danger: `text-red-600`, `bg-red-50`
- Neutral: `text-neutral-600`, `bg-neutral-50`

## Dark Mode

Always include dark mode variants:

- `dark:bg-neutral-800`
- `dark:text-neutral-100`
- `dark:border-neutral-700`

## Accessibility

- Use semantic HTML (button, nav, main, section)
- Include aria-labels for icon-only buttons
- Ensure proper heading hierarchy
- Maintain color contrast ratios
