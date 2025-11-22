# M3 – Dashboard Redesign

## Summary

This PR implements Milestone M3, transforming the basic dashboard into a functional command center that surfaces key metrics and provides quick access to important information.

## What Changed

### Dashboard Redesign

The dashboard now includes:

1. **Summary Cards** (4 key metrics):
   - **Active Clients**: Shows count of non-archived clients, navigates to /clients
   - **Active Projects**: Shows count of IN_PROGRESS projects, navigates to /clients
   - **My Open Tasks**: Shows count of tasks not marked as DONE, navigates to /tasks
   - **Overdue Tasks**: Shows count of past-due tasks (red variant if > 0), navigates to /tasks

2. **Two-Column Layout**:
   - **Left Column - "Upcoming Tasks"**:
     - Shows next 7 tasks sorted by due date
     - Displays task title, priority badge, project name, status, and due date
     - Overdue tasks highlighted in red
     - Click any task to navigate to its project page
   - **Right Column - "Recent Projects"**:
     - Shows 5 most recently updated projects
     - Displays project name, health status, project status, and status summary
     - Click any project to navigate to its detail page

3. **Loading & Empty States**:
   - Skeleton loaders for summary cards and lists during data fetch
   - Helpful empty states with icons and CTAs when no data exists
   - Error state with retry button if API calls fail

4. **Responsive Design**:
   - 1 column on mobile
   - 2 columns on tablet (summary cards)
   - 4 columns on desktop (summary cards)
   - 2 columns on desktop (task/project lists)

## New Components

All components are co-located in `DashboardPage.tsx`:

- **SummaryCard**: Reusable metric card with variants (default, primary, warning, danger) and optional onClick
- **TaskRow**: Individual task display with badges for status/priority and overdue highlighting
- **ProjectRow**: Individual project display with health status and project status badges
- **TaskListSkeleton**: Loading placeholder for task lists
- **ProjectListSkeleton**: Loading placeholder for project lists

## API Usage

The dashboard uses the following endpoints via React Query hooks:

- `useClients({ includeArchived: false })` - Get active clients count
- `useProjects()` - Get all projects, filter for IN_PROGRESS status
- `useMyTasks(ownerId)` - Get user's tasks with project names
- `useAuth()` - Get current user information

All queries leverage React Query's built-in caching, so data is efficiently shared across the app.

## Manual Test Checklist

Tested with seed account (admin@pmo.test / AdminDemo123!):

- [x] Build passes with no TypeScript errors
- [x] ESLint passes with no warnings
- [ ] Dashboard loads with summary cards showing correct counts
- [ ] Summary cards are clickable and navigate to correct pages
- [ ] Upcoming tasks list shows tasks sorted by due date
- [ ] Overdue tasks are highlighted in red with "Overdue" label
- [ ] Recent projects list shows projects sorted by update time
- [ ] Empty states display when no data exists (with appropriate CTAs)
- [ ] Loading skeletons appear during initial data fetch
- [ ] Error state with retry button works if API fails
- [ ] Task rows navigate to project page on click
- [ ] Project rows navigate to project detail on click
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Badge colors match status (primary for IN_PROGRESS, success for ON_TRACK, etc.)

## Screenshots

_To be added after manual testing on deployed environment_

## Dependencies

No new dependencies added. Uses existing UI components and hooks:

- **UI Components**: Card, CardBody, CardTitle, Badge (with BadgeVariant type), Button, PageHeader, Section
- **Hooks**: useAuth, useClients, useProjects, useMyTasks
- **React Router**: useNavigate, Link

## Notes

- All summary cards are clickable for better UX
- Date formatting includes helpful labels ("Today", "Tomorrow") for better readability
- Overdue detection uses timezone-normalized comparison (00:00:00 local time)
- Task and project counts are computed via useMemo for performance
- Empty states include CTAs to guide users (e.g., "New Project" button when no projects exist)

## Related Issues

Part of UI/UX Redesign epic (M1-M8)
- M1: ✅ Design system & foundations
- M2: ✅ Global layout & navigation
- M3: ✅ Dashboard redesign (this PR)
- M4-M8: Upcoming
