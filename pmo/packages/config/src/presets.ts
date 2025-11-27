/**
 * Configuration Presets
 *
 * Pre-defined module configurations for common use cases.
 * Customers can select a preset or create a custom configuration.
 */

import type { PresetDefinition, PresetName, ModuleName } from './types';

/**
 * Full Suite - All modules enabled
 * Best for customers who want the complete PMO experience
 */
export const fullPreset: PresetDefinition = {
  name: 'full',
  displayName: 'Full Suite',
  description:
    'Complete PMO toolset with all features: tasks, clients, projects, assets, marketing, sales, and administration.',
  modules: [
    'core',
    'tasks',
    'clients',
    'projects',
    'assets',
    'marketing',
    'sales',
    'admin',
  ],
};

/**
 * Project Management - Focus on project delivery
 * Best for consultants focused on project execution
 */
export const projectManagementPreset: PresetDefinition = {
  name: 'project-management',
  displayName: 'Project Management',
  description:
    'Core project management features: tasks, clients, and projects with milestones and meetings.',
  modules: ['core', 'tasks', 'clients', 'projects'],
};

/**
 * Marketing Focus - Content and campaigns
 * Best for consultants focused on content marketing
 */
export const marketingFocusPreset: PresetDefinition = {
  name: 'marketing-focus',
  displayName: 'Marketing Focus',
  description:
    'Marketing content management with client context for personalized content creation.',
  modules: ['core', 'clients', 'marketing'],
};

/**
 * Sales Focus - Lead management and pipeline
 * Best for consultants focused on business development
 */
export const salesFocusPreset: PresetDefinition = {
  name: 'sales-focus',
  displayName: 'Sales Focus',
  description:
    'Sales pipeline management with lead tracking and project visibility for proposals.',
  modules: ['core', 'clients', 'projects', 'sales'],
};

/**
 * Minimal - Just task management
 * Best for simple personal task tracking
 */
export const minimalPreset: PresetDefinition = {
  name: 'minimal',
  displayName: 'Minimal',
  description: 'Simple task management dashboard for personal productivity.',
  modules: ['core', 'tasks'],
};

/**
 * Custom - User-defined configuration
 * Placeholder for custom configurations
 */
export const customPreset: PresetDefinition = {
  name: 'custom',
  displayName: 'Custom',
  description: 'Custom module selection based on your specific needs.',
  modules: ['core'], // Will be overridden by user selection
};

/**
 * All preset definitions indexed by name
 */
export const CONFIG_PRESETS: Record<PresetName, PresetDefinition> = {
  full: fullPreset,
  'project-management': projectManagementPreset,
  'marketing-focus': marketingFocusPreset,
  'sales-focus': salesFocusPreset,
  minimal: minimalPreset,
  custom: customPreset,
};

/**
 * List of all preset names
 */
export const ALL_PRESETS: PresetName[] = Object.keys(
  CONFIG_PRESETS,
) as PresetName[];

/**
 * Get a preset definition by name
 */
export function getPresetDefinition(name: PresetName): PresetDefinition {
  return CONFIG_PRESETS[name];
}

/**
 * Get modules for a preset
 */
export function getPresetModules(name: PresetName): ModuleName[] {
  return CONFIG_PRESETS[name].modules;
}

/**
 * Find which preset matches a given module list (if any)
 */
export function findMatchingPreset(
  modules: ModuleName[],
): PresetName | undefined {
  const sortedModules = [...modules].sort();

  for (const [presetName, preset] of Object.entries(CONFIG_PRESETS)) {
    if (presetName === 'custom') continue; // Skip custom preset

    const sortedPresetModules = [...preset.modules].sort();

    if (
      sortedModules.length === sortedPresetModules.length &&
      sortedModules.every((m, i) => m === sortedPresetModules[i])
    ) {
      return presetName as PresetName;
    }
  }

  return undefined;
}

/**
 * Get presets that are subsets of a given module list
 * Useful for suggesting downgrades
 */
export function getAvailableDowngrades(
  currentModules: ModuleName[],
): PresetDefinition[] {
  return Object.values(CONFIG_PRESETS).filter((preset) => {
    if (preset.name === 'custom') return false;
    return preset.modules.every((m) => currentModules.includes(m));
  });
}

/**
 * Get presets that are supersets of a given module list
 * Useful for suggesting upgrades
 */
export function getAvailableUpgrades(
  currentModules: ModuleName[],
): PresetDefinition[] {
  return Object.values(CONFIG_PRESETS).filter((preset) => {
    if (preset.name === 'custom') return false;
    return (
      currentModules.every((m) => preset.modules.includes(m)) &&
      preset.modules.length > currentModules.length
    );
  });
}
