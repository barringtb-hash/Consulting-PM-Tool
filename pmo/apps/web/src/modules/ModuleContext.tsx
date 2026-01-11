import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  ModuleId,
  ModuleDefinition,
  parseEnabledModules,
  isModuleEnabled as checkModuleEnabled,
  getEnabledModuleDefinitions,
  getNavigationItems,
  isRouteAccessible as checkRouteAccessible,
} from '../../../../packages/modules';

/**
 * Read enabled modules from environment variable
 * VITE_ENABLED_MODULES should be a comma-separated list of module IDs
 * If not set, all modules are enabled by default
 */
const ENABLED_MODULES_ENV = import.meta.env.VITE_ENABLED_MODULES as
  | string
  | undefined;

interface ModuleContextValue {
  /** Array of enabled module IDs */
  enabledModules: ModuleId[];
  /** Check if a specific module is enabled */
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  /** Get all enabled module definitions */
  enabledModuleDefinitions: ModuleDefinition[];
  /** Get navigation items grouped by nav group */
  navigationItems: ReturnType<typeof getNavigationItems>;
  /** Check if a route path is accessible */
  isRouteAccessible: (path: string) => boolean;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

export interface ModuleProviderProps {
  children: ReactNode;
  /** Override enabled modules (useful for testing) */
  enabledModulesOverride?: ModuleId[];
}

/**
 * ModuleProvider - Provides module configuration to the app
 *
 * Reads VITE_ENABLED_MODULES environment variable to determine which modules are enabled.
 * Format: comma-separated list of module IDs
 *
 * Example .env:
 *   VITE_ENABLED_MODULES=dashboard,tasks,clients,projects,assets,leads,pipeline
 *
 * Core modules (dashboard, tasks, clients, projects) are always enabled regardless of config.
 */
export function ModuleProvider({
  children,
  enabledModulesOverride,
}: ModuleProviderProps): JSX.Element {
  const value = useMemo<ModuleContextValue>(() => {
    const enabledModules =
      enabledModulesOverride ?? parseEnabledModules(ENABLED_MODULES_ENV);

    return {
      enabledModules,
      isModuleEnabled: (moduleId: ModuleId) =>
        checkModuleEnabled(moduleId, enabledModules),
      enabledModuleDefinitions: getEnabledModuleDefinitions(enabledModules),
      navigationItems: getNavigationItems(enabledModules),
      isRouteAccessible: (path: string) =>
        checkRouteAccessible(path, enabledModules),
    };
  }, [enabledModulesOverride]);

  return (
    <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>
  );
}

/**
 * Hook to access module configuration
 *
 * @throws Error if used outside of ModuleProvider
 */
export function useModules(): ModuleContextValue {
  const context = useContext(ModuleContext);

  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }

  return context;
}

/**
 * Hook to check if a specific module is enabled
 * Convenience wrapper around useModules().isModuleEnabled()
 */
export function useModuleEnabled(moduleId: ModuleId): boolean {
  const { isModuleEnabled } = useModules();
  return isModuleEnabled(moduleId);
}

export default ModuleContext;
