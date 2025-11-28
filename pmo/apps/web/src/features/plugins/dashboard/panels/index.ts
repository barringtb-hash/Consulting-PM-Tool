/**
 * Dashboard Panel Plugins Export
 *
 * This module exports all built-in dashboard panel plugins.
 */

// Summary Card Plugins
export { ActiveClientsCardPlugin } from './ActiveClientsCard';
export { ActiveProjectsCardPlugin } from './ActiveProjectsCard';
export { OpenTasksCardPlugin } from './OpenTasksCard';
export { OverdueTasksCardPlugin } from './OverdueTasksCard';

// Main Content Panel Plugins
export { UpcomingTasksPanelPlugin } from './UpcomingTasksPanel';
export { RecentProjectsPanelPlugin } from './RecentProjectsPanel';

// Reusable Components
export { SummaryCard, type SummaryCardProps } from './SummaryCard';

// Plugin Collection for easy registration
export const corePlugins = [
  // Import dynamically to avoid circular dependencies
] as const;
