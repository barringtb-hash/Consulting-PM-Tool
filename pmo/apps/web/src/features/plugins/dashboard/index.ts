/**
 * Dashboard Plugin Architecture Module
 *
 * This module provides a plugin system for the main dashboard,
 * allowing modular, extensible dashboard panels.
 *
 * @example
 * // Initialize plugins in app entry
 * import { registerCorePlugins } from './features/plugins/dashboard';
 * registerCorePlugins();
 *
 * @example
 * // Use in a dashboard page
 * import {
 *   DashboardPluginProvider,
 *   DashboardLayout
 * } from './features/plugins/dashboard';
 *
 * function MyDashboard() {
 *   return (
 *     <DashboardPluginProvider>
 *       <DashboardLayout />
 *     </DashboardPluginProvider>
 *   );
 * }
 *
 * @example
 * // Create a custom plugin
 * import { dashboardPluginRegistry } from './features/plugins/dashboard';
 *
 * const myPlugin = {
 *   config: {
 *     id: 'my-custom-panel',
 *     name: 'My Panel',
 *     position: 'main-left',
 *     priority: 50,
 *   },
 *   component: MyPanelComponent,
 * };
 *
 * dashboardPluginRegistry.register(myPlugin);
 */

// Types
export type {
  DashboardPanelPosition,
  SummaryCardVariant,
  PanelPriority,
  DashboardPanelConfig,
  DashboardPanelProps,
  SummaryCardPanelProps,
  DashboardPanelPlugin,
  DashboardPluginContext,
  DashboardPreferences,
  DashboardData,
  RegisteredPlugin,
  DashboardPluginEvent,
  DashboardPluginEventListener,
  DashboardPanelPluginFactory,
  PluginProps,
} from './types';

// Registry
export { dashboardPluginRegistry, DashboardPluginRegistry } from './registry';

// Context & Provider
export {
  DashboardPluginProvider,
  useDashboardPluginContext,
  useDashboardData,
  useDashboardNavigate,
} from './DashboardPluginContext';

// Rendering Components
export {
  DashboardPanelRenderer,
  DashboardPanelGrid,
  DashboardTwoColumnLayout,
  DashboardLayout,
} from './DashboardPanelRenderer';

// Core Plugin Registration
export {
  registerCorePlugins,
  resetCorePlugins,
  areCorePluginsRegistered,
  corePlugins,
} from './registerCorePlugins';

// Individual Panel Plugins (for custom composition)
export {
  ActiveClientsCardPlugin,
  ActiveProjectsCardPlugin,
  OpenTasksCardPlugin,
  OverdueTasksCardPlugin,
  UpcomingTasksPanelPlugin,
  RecentProjectsPanelPlugin,
  SummaryCard,
  type SummaryCardProps,
} from './panels';
