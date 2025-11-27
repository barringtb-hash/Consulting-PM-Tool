/**
 * Frontend Module System
 *
 * This module provides configuration and context for enabling/disabling
 * features based on customer deployment needs.
 */

// Re-export types and utilities from shared package
export {
  type ModuleId,
  type ModuleDefinition,
  type NavGroup,
  MODULE_DEFINITIONS,
  NAV_GROUP_CONFIG,
  DEFAULT_ENABLED_MODULES,
} from '../../../../packages/modules';

// Export React context and hooks
export {
  ModuleProvider,
  useModules,
  useModuleEnabled,
  type ModuleProviderProps,
} from './ModuleContext';
