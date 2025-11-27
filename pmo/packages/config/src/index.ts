/**
 * @pmo/config
 *
 * Module configuration system for the AI Consulting PMO Tool.
 * Enables per-customer feature customization by allowing modules
 * to be enabled or disabled based on configuration.
 *
 * @example
 * ```typescript
 * import { loadConfig, isModuleEnabled } from '@pmo/config';
 *
 * // Load configuration from environment
 * const config = loadConfig({
 *   env: {
 *     ENABLED_MODULES: process.env.ENABLED_MODULES,
 *     MODULE_PRESET: process.env.MODULE_PRESET,
 *   },
 * });
 *
 * // Check if a module is enabled
 * if (isModuleEnabled(config, 'marketing')) {
 *   // Register marketing routes
 * }
 * ```
 */

// Types
export type {
  ModuleName,
  SidebarGroup,
  UserRole,
  PresetName,
  ModuleRoutes,
  NavItem,
  ModuleDefinition,
  BrandingConfig,
  CustomerConfig,
  PresetDefinition,
  AppConfig,
  ConfigLoaderOptions,
  ModuleCheckResult,
} from './types';

// Module definitions
export {
  MODULE_DEFINITIONS,
  ALL_MODULES,
  coreModule,
  tasksModule,
  clientsModule,
  projectsModule,
  assetsModule,
  marketingModule,
  salesModule,
  adminModule,
  getModuleDefinition,
  getModuleDependencies,
  resolveModulesWithDependencies,
  canEnableModule,
  getEnabledNavItems,
} from './modules';

// Presets
export {
  CONFIG_PRESETS,
  ALL_PRESETS,
  fullPreset,
  projectManagementPreset,
  marketingFocusPreset,
  salesFocusPreset,
  minimalPreset,
  customPreset,
  getPresetDefinition,
  getPresetModules,
  findMatchingPreset,
  getAvailableDowngrades,
  getAvailableUpgrades,
} from './presets';

// Configuration loader
export {
  DEFAULT_CONFIG,
  parseModulesFromEnv,
  loadConfig,
  isModuleEnabled,
  isRouteEnabled,
  getConfigSummary,
  validateConfig,
  createPresetConfig,
} from './loader';
