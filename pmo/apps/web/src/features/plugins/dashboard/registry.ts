/**
 * Dashboard Plugin Registry
 *
 * Central registry for managing dashboard panel plugins. Provides methods for
 * registering, unregistering, and querying plugins.
 */

import type {
  DashboardPanelPlugin,
  DashboardPanelPosition,
  RegisteredPlugin,
  DashboardPluginEvent,
  DashboardPluginEventListener,
  DashboardPanelProps,
} from './types';

/**
 * Dashboard Plugin Registry class
 * Manages the lifecycle and organization of dashboard plugins
 */
class DashboardPluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private listeners: Set<DashboardPluginEventListener> = new Set();
  private defaultEnabledPlugins: Set<string> = new Set();

  /**
   * Register a new dashboard panel plugin
   * @param plugin - The plugin to register
   * @returns The registered plugin entry
   */
  register<TProps extends DashboardPanelProps>(
    plugin: DashboardPanelPlugin<TProps>,
  ): RegisteredPlugin {
    const { id, defaultEnabled = true, priority } = plugin.config;

    if (this.plugins.has(id)) {
      console.warn(
        `Dashboard plugin "${id}" is already registered. Overwriting.`,
      );
    }

    const entry: RegisteredPlugin = {
      plugin: plugin as DashboardPanelPlugin,
      enabled: defaultEnabled,
      order: priority,
    };

    this.plugins.set(id, entry);

    if (defaultEnabled) {
      this.defaultEnabledPlugins.add(id);
    }

    this.emit({ type: 'PLUGIN_REGISTERED', pluginId: id });

    return entry;
  }

  /**
   * Unregister a plugin by ID
   * @param pluginId - The ID of the plugin to remove
   * @returns true if the plugin was removed, false if it wasn't found
   */
  unregister(pluginId: string): boolean {
    const existed = this.plugins.delete(pluginId);
    this.defaultEnabledPlugins.delete(pluginId);

    if (existed) {
      this.emit({ type: 'PLUGIN_UNREGISTERED', pluginId });
    }

    return existed;
  }

  /**
   * Get a plugin by ID
   * @param pluginId - The ID of the plugin to retrieve
   * @returns The registered plugin entry or undefined
   */
  get(pluginId: string): RegisteredPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if a plugin is registered
   * @param pluginId - The ID of the plugin to check
   * @returns true if the plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get all registered plugins
   * @returns Array of all registered plugin entries
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all plugin IDs
   * @returns Array of plugin IDs
   */
  getAllIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugins by position, sorted by priority
   * @param position - The dashboard position to filter by
   * @param enabledOnly - Only return enabled plugins (default: true)
   * @returns Array of plugins for the specified position
   */
  getByPosition(
    position: DashboardPanelPosition,
    enabledOnly = true,
  ): RegisteredPlugin[] {
    return Array.from(this.plugins.values())
      .filter(
        (entry) =>
          entry.plugin.config.position === position &&
          (!enabledOnly || entry.enabled),
      )
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get all enabled plugins grouped by position
   * @returns Object with positions as keys and arrays of plugins as values
   */
  getGroupedByPosition(): Record<DashboardPanelPosition, RegisteredPlugin[]> {
    const grouped: Record<DashboardPanelPosition, RegisteredPlugin[]> = {
      'summary-cards': [],
      'main-left': [],
      'main-right': [],
      'full-width': [],
    };

    for (const entry of this.plugins.values()) {
      if (entry.enabled) {
        grouped[entry.plugin.config.position].push(entry);
      }
    }

    // Sort each group by priority
    for (const position of Object.keys(grouped) as DashboardPanelPosition[]) {
      grouped[position].sort((a, b) => a.order - b.order);
    }

    return grouped;
  }

  /**
   * Enable a plugin
   * @param pluginId - The ID of the plugin to enable
   * @returns true if the state changed
   */
  enable(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry || entry.enabled) return false;

    entry.enabled = true;
    this.emit({ type: 'PLUGIN_ENABLED', pluginId });
    return true;
  }

  /**
   * Disable a plugin
   * @param pluginId - The ID of the plugin to disable
   * @returns true if the state changed
   */
  disable(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry || !entry.enabled) return false;

    entry.enabled = false;
    this.emit({ type: 'PLUGIN_DISABLED', pluginId });
    return true;
  }

  /**
   * Toggle a plugin's enabled state
   * @param pluginId - The ID of the plugin to toggle
   * @returns The new enabled state, or undefined if plugin not found
   */
  toggle(pluginId: string): boolean | undefined {
    const entry = this.plugins.get(pluginId);
    if (!entry) return undefined;

    if (entry.enabled) {
      this.disable(pluginId);
    } else {
      this.enable(pluginId);
    }

    return entry.enabled;
  }

  /**
   * Set the order for a plugin
   * @param pluginId - The ID of the plugin
   * @param order - The new order value
   * @returns true if the order was updated
   */
  setOrder(pluginId: string, order: number): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) return false;

    entry.order = order;
    return true;
  }

  /**
   * Apply user preferences to plugin states
   * @param enabledPluginIds - Array of plugin IDs that should be enabled
   */
  applyPreferences(enabledPluginIds: string[]): void {
    const enabledSet = new Set(enabledPluginIds);

    for (const [pluginId, entry] of this.plugins) {
      entry.enabled = enabledSet.has(pluginId);
    }
  }

  /**
   * Reset all plugins to their default enabled state
   */
  resetToDefaults(): void {
    for (const [pluginId, entry] of this.plugins) {
      entry.enabled = this.defaultEnabledPlugins.has(pluginId);
      entry.order = entry.plugin.config.priority;
    }
  }

  /**
   * Subscribe to registry events
   * @param listener - Callback function to receive events
   * @returns Unsubscribe function
   */
  subscribe(listener: DashboardPluginEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   * @param event - The event to emit
   */
  private emit(event: DashboardPluginEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in dashboard plugin event listener:', error);
      }
    }
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.plugins.clear();
    this.defaultEnabledPlugins.clear();
  }
}

// Export a singleton instance for the application
export const dashboardPluginRegistry = new DashboardPluginRegistry();

// Also export the class for testing or custom registries
export { DashboardPluginRegistry };
