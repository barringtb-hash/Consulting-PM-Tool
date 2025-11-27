/**
 * Configuration Loader
 *
 * Loads and resolves module configuration from various sources:
 * - Environment variables
 * - Preset selection
 * - Customer-specific configuration
 * - Explicit module list
 */

import type {
  AppConfig,
  ConfigLoaderOptions,
  CustomerConfig,
  ModuleCheckResult,
  ModuleName,
} from './types';
import { MODULE_DEFINITIONS, resolveModulesWithDependencies } from './modules';
import { CONFIG_PRESETS, findMatchingPreset } from './presets';

/**
 * Default configuration when nothing is specified
 * Enables all modules for backwards compatibility
 */
export const DEFAULT_CONFIG: CustomerConfig = {
  enabledModules: [
    'core',
    'tasks',
    'clients',
    'projects',
    'assets',
    'marketing',
    'sales',
    'admin',
  ],
  preset: 'full',
};

/**
 * Parse enabled modules from environment variable
 * Format: ENABLED_MODULES=core,tasks,projects
 */
export function parseModulesFromEnv(envValue: string): ModuleName[] {
  const modules = envValue
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter((m) => m in MODULE_DEFINITIONS) as ModuleName[];

  // Always include core
  if (!modules.includes('core')) {
    modules.unshift('core');
  }

  return modules;
}

/**
 * Load configuration from various sources with priority:
 * 1. Explicit enabledModules option
 * 2. Environment variables
 * 3. Preset selection
 * 4. Default (full) configuration
 */
export function loadConfig(options: ConfigLoaderOptions = {}): AppConfig {
  let enabledModules: ModuleName[];
  let preset = options.preset;

  // Priority 1: Explicit module list
  if (options.enabledModules && options.enabledModules.length > 0) {
    enabledModules = options.enabledModules;
    preset = findMatchingPreset(enabledModules) ?? 'custom';
  }
  // Priority 2: Environment variables
  else if (options.env?.ENABLED_MODULES) {
    enabledModules = parseModulesFromEnv(options.env.ENABLED_MODULES);
    preset = findMatchingPreset(enabledModules) ?? 'custom';
  } else if (options.env?.MODULE_PRESET) {
    const envPreset = options.env.MODULE_PRESET as keyof typeof CONFIG_PRESETS;
    if (envPreset in CONFIG_PRESETS) {
      preset = envPreset;
      enabledModules = CONFIG_PRESETS[envPreset].modules;
    } else {
      enabledModules = DEFAULT_CONFIG.enabledModules;
      preset = 'full';
    }
  }
  // Priority 3: Preset option
  else if (preset && preset in CONFIG_PRESETS) {
    enabledModules = CONFIG_PRESETS[preset].modules;
  }
  // Priority 4: Default
  else {
    enabledModules = DEFAULT_CONFIG.enabledModules;
    preset = 'full';
  }

  // Resolve dependencies
  const resolvedModules = resolveModulesWithDependencies(enabledModules);

  const customerConfig: CustomerConfig = {
    customerId: options.customerId ?? options.env?.CUSTOMER_ID,
    enabledModules: resolvedModules,
    preset,
  };

  return {
    customer: customerConfig,
    modules: MODULE_DEFINITIONS,
    enabledModules: resolvedModules,
  };
}

/**
 * Check if a specific module is enabled
 */
export function isModuleEnabled(
  config: AppConfig,
  moduleName: ModuleName,
  userRole?: 'USER' | 'ADMIN',
): ModuleCheckResult {
  const module = config.modules[moduleName];

  // Check if module is in enabled list
  if (!config.enabledModules.includes(moduleName)) {
    return {
      enabled: false,
      reason: 'not_configured',
    };
  }

  // Check dependencies
  const missingDeps = module.dependencies.filter(
    (dep) => !config.enabledModules.includes(dep),
  );

  if (missingDeps.length > 0) {
    return {
      enabled: false,
      reason: 'missing_dependency',
      missingDependencies: missingDeps,
    };
  }

  // Check role requirement
  if (module.roleRequired && userRole !== module.roleRequired) {
    return {
      enabled: false,
      reason: 'role_required',
    };
  }

  return { enabled: true };
}

/**
 * Check if a route is accessible given the configuration
 */
export function isRouteEnabled(
  config: AppConfig,
  path: string,
  type: 'frontend' | 'backend',
): { enabled: boolean; module?: ModuleName } {
  for (const [moduleName, module] of Object.entries(config.modules)) {
    const routes =
      type === 'frontend' ? module.routes.frontend : module.routes.backend;

    for (const route of routes) {
      // Convert route pattern to regex
      const pattern = route.replace(/\*/g, '.*').replace(/:[\w]+/g, '[^/]+');

      const regex = new RegExp(`^${pattern}$`);

      if (regex.test(path)) {
        const isEnabled = config.enabledModules.includes(
          moduleName as ModuleName,
        );
        return {
          enabled: isEnabled,
          module: moduleName as ModuleName,
        };
      }
    }
  }

  // Route not found in any module - allow by default (might be static/public)
  return { enabled: true };
}

/**
 * Get configuration summary for logging/debugging
 */
export function getConfigSummary(config: AppConfig): string {
  const enabled = config.enabledModules.join(', ');
  const preset = config.customer.preset ?? 'custom';
  const customerId = config.customer.customerId ?? 'default';

  return `[Config] Customer: ${customerId}, Preset: ${preset}, Modules: ${enabled}`;
}

/**
 * Validate a customer configuration
 */
export function validateConfig(config: CustomerConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check that core is included
  if (!config.enabledModules.includes('core')) {
    errors.push('Core module must always be enabled');
  }

  // Check that all dependencies are satisfied
  for (const moduleName of config.enabledModules) {
    const module = MODULE_DEFINITIONS[moduleName];
    for (const dep of module.dependencies) {
      if (!config.enabledModules.includes(dep)) {
        errors.push(
          `Module "${moduleName}" requires "${dep}" which is not enabled`,
        );
      }
    }
  }

  // Check for invalid module names
  for (const moduleName of config.enabledModules) {
    if (!(moduleName in MODULE_DEFINITIONS)) {
      errors.push(`Unknown module: "${moduleName}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a configuration for a specific preset
 */
export function createPresetConfig(
  presetName: keyof typeof CONFIG_PRESETS,
  customerId?: string,
): CustomerConfig {
  const preset = CONFIG_PRESETS[presetName];
  return {
    customerId,
    enabledModules: resolveModulesWithDependencies(preset.modules),
    preset: presetName,
  };
}
