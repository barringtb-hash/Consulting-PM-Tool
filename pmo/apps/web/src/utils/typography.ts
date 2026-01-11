/**
 * Typography utilities for consistent text formatting across the app
 */

// Text color classes for consistent usage
export const TEXT_COLORS = {
  primary: 'text-neutral-900',
  secondary: 'text-neutral-700',
  muted: 'text-neutral-600',
  placeholder: 'text-neutral-500',
  disabled: 'text-neutral-400',
  error: 'text-danger-600',
  success: 'text-success-700',
  link: 'text-primary-600 hover:text-primary-700',
} as const;

// Typography size and weight classes
export const TEXT_STYLES = {
  label: 'text-sm font-medium text-neutral-700',
  helperText: 'text-sm text-neutral-600',
  errorText: 'text-sm text-danger-600',
  emptyState: 'text-neutral-600',
  description: 'text-sm text-neutral-600',
} as const;

// Standard empty state messages
export const EMPTY_STATES = {
  // Simple fields - use "Not provided"
  notProvided: 'Not provided',

  // Collections/Lists - use "No [items] yet"
  noClients: 'No clients yet',
  noProjects: 'No projects yet',
  noTasks: 'No tasks yet',
  noAssets: 'No assets yet',
  noContacts: 'No contacts yet',
  noMeetings: 'No meetings yet',
  noMilestones: 'No milestones yet',
  noNotes: 'No notes yet',
  noDecisions: 'No decisions yet',
  noRisks: 'No risks yet',
  noLeads: 'No leads yet',
  accounts: 'No accounts yet',
  opportunities: 'No opportunities yet',

  // Dates - use "Not set"
  noDate: 'Not set',
  noDueDate: 'No due date',

  // Specific contextual messages
  noActiveMilestone: 'No active milestone',
  noUpcomingTasks: 'No upcoming tasks',
  noDescription: 'No description provided',
  noLinkedAssets: 'No assets linked yet',
} as const;

/**
 * Converts a status enum string to title case
 * Example: "IN_PROGRESS" -> "In Progress"
 */
export function formatStatus(status: string): string {
  if (!status) return '';

  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Converts a string to title case
 * Example: "hello world" -> "Hello World"
 */
export function toTitleCase(str: string): string {
  if (!str) return '';

  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a field value with a fallback empty state message
 */
export function formatFieldValue(
  value: string | null | undefined,
  emptyState: string = EMPTY_STATES.notProvided,
): string {
  return value || emptyState;
}

/**
 * Formats a date field with a fallback for missing dates
 */
export function formatDateField(
  date: string | null | undefined,
  emptyState: string = EMPTY_STATES.noDate,
): string {
  return date || emptyState;
}
