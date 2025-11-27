/**
 * Core Plugin Registration
 *
 * Registers all built-in dashboard panel plugins with the registry.
 * Call this function during application initialization.
 */

import { dashboardPluginRegistry } from './registry';
import { ActiveClientsCardPlugin } from './panels/ActiveClientsCard';
import { ActiveProjectsCardPlugin } from './panels/ActiveProjectsCard';
import { OpenTasksCardPlugin } from './panels/OpenTasksCard';
import { OverdueTasksCardPlugin } from './panels/OverdueTasksCard';
import { UpcomingTasksPanelPlugin } from './panels/UpcomingTasksPanel';
import { RecentProjectsPanelPlugin } from './panels/RecentProjectsPanel';

/**
 * List of all core dashboard plugins
 */
export const corePlugins = [
  // Summary Cards (order matters for display)
  ActiveClientsCardPlugin,
  ActiveProjectsCardPlugin,
  OpenTasksCardPlugin,
  OverdueTasksCardPlugin,
  // Main Content Panels
  UpcomingTasksPanelPlugin,
  RecentProjectsPanelPlugin,
];

/**
 * Flag to track if core plugins have been registered
 */
let isInitialized = false;

/**
 * Register all core dashboard plugins
 * Safe to call multiple times - will only register once
 */
export function registerCorePlugins(): void {
  if (isInitialized) {
    return;
  }

  for (const plugin of corePlugins) {
    dashboardPluginRegistry.register(plugin);
  }

  isInitialized = true;
}

/**
 * Reset registration state (primarily for testing)
 */
export function resetCorePlugins(): void {
  dashboardPluginRegistry.clear();
  isInitialized = false;
}

/**
 * Check if core plugins have been registered
 */
export function areCorePluginsRegistered(): boolean {
  return isInitialized;
}
