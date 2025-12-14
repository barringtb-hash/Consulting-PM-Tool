/**
 * Dashboard Plugin Architecture Types
 *
 * This module defines the contracts and types for the dashboard plugin system,
 * allowing modular, extensible dashboard panels.
 */

import type { ReactNode, ComponentType } from 'react';

/**
 * Position types for dashboard panel placement
 */
export type DashboardPanelPosition =
  | 'summary-cards' // Top row of metric cards
  | 'main-left' // Left column of main content area
  | 'main-right' // Right column of main content area
  | 'full-width'; // Spans entire width

/**
 * Size variants for summary card panels
 */
export type SummaryCardVariant = 'default' | 'primary' | 'warning' | 'danger';

/**
 * Priority for ordering panels within a position
 * Lower numbers render first
 */
export type PanelPriority = number;

/**
 * Base configuration for all dashboard panel plugins
 */
export interface DashboardPanelConfig {
  /** Unique identifier for the plugin */
  id: string;
  /** Human-readable name for the plugin */
  name: string;
  /** Brief description of what the panel displays */
  description?: string;
  /** Where the panel should be rendered */
  position: DashboardPanelPosition;
  /** Priority for ordering (lower = rendered first) */
  priority: PanelPriority;
  /** Whether the plugin is enabled by default */
  defaultEnabled?: boolean;
  /** Optional icon for the panel */
  icon?: ReactNode;
}

/**
 * Props passed to every dashboard panel component
 */
export interface DashboardPanelProps {
  /** Current authenticated user ID */
  userId?: number;
  /** Whether the panel is in loading state */
  isLoading?: boolean;
  /** Function to navigate to a route */
  onNavigate?: (path: string) => void;
}

/**
 * Summary card specific props
 */
export interface SummaryCardPanelProps extends DashboardPanelProps {
  /** Variant styling for the card */
  variant?: SummaryCardVariant;
}

/**
 * Definition for a dashboard panel plugin
 */
export interface DashboardPanelPlugin<
  TProps extends DashboardPanelProps = DashboardPanelProps,
> {
  /** Plugin configuration */
  config: DashboardPanelConfig;
  /** The React component to render */
  component: ComponentType<TProps>;
  /** Optional function to check if plugin should be visible */
  isVisible?: (context: DashboardPluginContext) => boolean;
  /** Optional function to transform props before rendering */
  mapProps?: (context: DashboardPluginContext) => Partial<TProps>;
}

/**
 * Context data available to all dashboard plugins
 */
export interface DashboardPluginContext {
  /** Current authenticated user */
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  /** User preferences for dashboard */
  preferences?: DashboardPreferences;
  /** Current data loaded in dashboard */
  data?: DashboardData;
}

/**
 * User preferences for dashboard customization
 */
export interface DashboardPreferences {
  /** IDs of enabled plugins */
  enabledPlugins: string[];
  /** Custom ordering overrides */
  panelOrder?: Record<DashboardPanelPosition, string[]>;
  /** Collapsed panel IDs */
  collapsedPanels?: string[];
}

/**
 * Shared dashboard data available to plugins
 */
export interface DashboardData {
  accounts?: {
    total: number;
    active: number;
    isLoading: boolean;
    error?: Error;
    refetch: () => void;
  };
  projects?: {
    total: number;
    active: number;
    recent: Array<{
      id: number;
      name: string;
      status: string;
      healthStatus?: string;
      statusSummary?: string;
      updatedAt: string;
    }>;
    isLoading: boolean;
    error?: Error;
    refetch: () => void;
  };
  tasks?: {
    total: number;
    open: number;
    overdue: number;
    upcoming: Array<{
      id: number;
      title: string;
      status: string;
      priority?: string;
      dueDate?: string;
      projectId: number;
      projectName?: string;
    }>;
    isLoading: boolean;
    error?: Error;
    refetch: () => void;
  };
}

/**
 * Registry entry for a registered plugin
 */
export interface RegisteredPlugin {
  plugin: DashboardPanelPlugin;
  enabled: boolean;
  order: number;
}

/**
 * Events emitted by the plugin system
 */
export type DashboardPluginEvent =
  | { type: 'PLUGIN_REGISTERED'; pluginId: string }
  | { type: 'PLUGIN_UNREGISTERED'; pluginId: string }
  | { type: 'PLUGIN_ENABLED'; pluginId: string }
  | { type: 'PLUGIN_DISABLED'; pluginId: string }
  | { type: 'DATA_UPDATED'; dataKey: keyof DashboardData };

/**
 * Callback type for plugin event listeners
 */
export type DashboardPluginEventListener = (
  event: DashboardPluginEvent,
) => void;

/**
 * Factory function type for creating dashboard plugins
 */
export type DashboardPanelPluginFactory<
  TProps extends DashboardPanelProps = DashboardPanelProps,
> = (config?: Partial<DashboardPanelConfig>) => DashboardPanelPlugin<TProps>;

/**
 * Helper type to extract props from a plugin
 */
export type PluginProps<T> =
  T extends DashboardPanelPlugin<infer P> ? P : never;
