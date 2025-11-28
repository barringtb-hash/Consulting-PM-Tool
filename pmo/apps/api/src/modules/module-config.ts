/**
 * Backend Module Configuration
 *
 * Provides module configuration for the API server.
 * Reads ENABLED_MODULES environment variable to determine which modules are active.
 */

import {
  ModuleId,
  parseEnabledModules,
  isModuleEnabled as checkModuleEnabled,
  isApiEndpointAccessible as checkApiEndpoint,
  getEnabledModuleDefinitions,
} from '../../../../packages/modules';

/**
 * Read enabled modules from environment variable
 * ENABLED_MODULES should be a comma-separated list of module IDs
 * If not set, all modules are enabled by default
 */
const ENABLED_MODULES_ENV = process.env.ENABLED_MODULES;

/**
 * Parsed list of enabled module IDs (cached at startup)
 */
export const enabledModules: ModuleId[] =
  parseEnabledModules(ENABLED_MODULES_ENV);

/**
 * Check if a specific module is enabled
 */
export function isModuleEnabled(moduleId: ModuleId): boolean {
  return checkModuleEnabled(moduleId, enabledModules);
}

/**
 * Check if an API endpoint should be accessible
 */
export function isApiEndpointAccessible(endpoint: string): boolean {
  return checkApiEndpoint(endpoint, enabledModules);
}

/**
 * Get all enabled module definitions
 */
export function getEnabledModules() {
  return getEnabledModuleDefinitions(enabledModules);
}

/**
 * Log enabled modules at startup (for debugging)
 */
export function logEnabledModules(): void {
  const modules = getEnabledModules();
  console.log('Enabled modules:', modules.map((m) => m.id).join(', '));
}
