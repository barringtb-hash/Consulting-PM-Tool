/**
 * Feature Flags Service
 *
 * Manages feature flags and per-tenant module configuration.
 * Provides functions for checking feature flags and managing module access.
 */

import { FeatureFlag, TenantModuleConfig } from '@prisma/client';
import { prisma } from '../../prisma/client';
import {
  ModuleId,
  MODULE_DEFINITIONS,
  parseEnabledModules,
} from '../../../../../packages/modules';

// ============================================================================
// Types
// ============================================================================

export interface FeatureFlagResult {
  key: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface TenantModuleResult {
  moduleId: ModuleId;
  enabled: boolean;
  isCore: boolean;
  settings?: Record<string, unknown>;
}

export interface ModuleConfigResult {
  tenantId: string;
  modules: TenantModuleResult[];
  source: 'database' | 'environment' | 'default';
}

export type CreateFeatureFlagInput = {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  config?: Record<string, unknown>;
};

export type UpdateFeatureFlagInput = Partial<
  Omit<CreateFeatureFlagInput, 'key'>
>;

export type CreateTenantModuleConfigInput = {
  tenantId: string;
  moduleId: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
};

export type UpdateTenantModuleConfigInput = {
  enabled?: boolean;
  settings?: Record<string, unknown>;
};

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  return prisma.featureFlag.findMany({
    orderBy: { key: 'asc' },
  });
}

/**
 * Get a feature flag by key
 */
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  return prisma.featureFlag.findUnique({
    where: { key },
  });
}

/**
 * Check if a feature flag is enabled
 * Supports percentage rollout based on user ID
 */
export async function isFeatureFlagEnabled(
  key: string,
  userId?: number,
): Promise<FeatureFlagResult> {
  const flag = await getFeatureFlag(key);

  if (!flag) {
    return { key, enabled: false };
  }

  // Check if globally disabled
  if (!flag.enabled) {
    return {
      key,
      enabled: false,
      config: flag.config as Record<string, unknown>,
    };
  }

  // Check percentage rollout if user ID provided
  if (userId && flag.rolloutPercentage < 100) {
    const userBucket = userId % 100;
    const enabled = userBucket < flag.rolloutPercentage;
    return { key, enabled, config: flag.config as Record<string, unknown> };
  }

  return { key, enabled: true, config: flag.config as Record<string, unknown> };
}

/**
 * Create a new feature flag
 */
export async function createFeatureFlag(
  input: CreateFeatureFlagInput,
): Promise<FeatureFlag> {
  return prisma.featureFlag.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      enabled: input.enabled ?? false,
      rolloutPercentage: input.rolloutPercentage ?? 100,
      config: input.config ?? null,
    },
  });
}

/**
 * Update a feature flag
 */
export async function updateFeatureFlag(
  key: string,
  input: UpdateFeatureFlagInput,
): Promise<FeatureFlag | null> {
  try {
    return await prisma.featureFlag.update({
      where: { key },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.rolloutPercentage !== undefined && {
          rolloutPercentage: input.rolloutPercentage,
        }),
        ...(input.config !== undefined && { config: input.config }),
      },
    });
  } catch {
    return null;
  }
}

/**
 * Delete a feature flag
 */
export async function deleteFeatureFlag(key: string): Promise<boolean> {
  try {
    await prisma.featureFlag.delete({
      where: { key },
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Tenant Module Configuration
// ============================================================================

/**
 * Get module configuration for a tenant
 * Falls back to "default" tenant, then environment variable, then system defaults
 */
export async function getTenantModuleConfig(
  tenantId: string = 'default',
): Promise<ModuleConfigResult> {
  // Try to get tenant-specific config
  let configs = await prisma.tenantModuleConfig.findMany({
    where: { tenantId },
  });

  // If no tenant-specific config, try default tenant
  if (configs.length === 0 && tenantId !== 'default') {
    configs = await prisma.tenantModuleConfig.findMany({
      where: { tenantId: 'default' },
    });
    tenantId = 'default';
  }

  // If we have database configs, use them
  if (configs.length > 0) {
    const modules = buildModuleResultsFromConfigs(configs);
    return { tenantId, modules, source: 'database' };
  }

  // Fall back to environment variable
  const envModules = process.env.ENABLED_MODULES;
  if (envModules) {
    const enabledModuleIds = parseEnabledModules(envModules);
    const modules = buildModuleResultsFromIds(enabledModuleIds);
    return { tenantId, modules, source: 'environment' };
  }

  // Fall back to system defaults (all modules enabled)
  const allModuleIds = Object.keys(MODULE_DEFINITIONS) as ModuleId[];
  const modules = buildModuleResultsFromIds(allModuleIds);
  return { tenantId, modules, source: 'default' };
}

/**
 * Get enabled modules for a tenant (just the module IDs)
 */
export async function getEnabledModulesForTenant(
  tenantId: string = 'default',
): Promise<ModuleId[]> {
  const config = await getTenantModuleConfig(tenantId);
  return config.modules.filter((m) => m.enabled).map((m) => m.moduleId);
}

/**
 * Check if a module is enabled for a tenant
 */
export async function isModuleEnabledForTenant(
  moduleId: ModuleId,
  tenantId: string = 'default',
): Promise<boolean> {
  const enabledModules = await getEnabledModulesForTenant(tenantId);
  return enabledModules.includes(moduleId);
}

/**
 * Set module configuration for a tenant
 */
export async function setTenantModuleConfig(
  input: CreateTenantModuleConfigInput,
  updatedBy?: number,
): Promise<TenantModuleConfig> {
  // Validate module ID
  if (!MODULE_DEFINITIONS[input.moduleId as ModuleId]) {
    throw new Error(`Invalid module ID: ${input.moduleId}`);
  }

  // Check if it's a core module - these cannot be disabled
  const moduleDef = MODULE_DEFINITIONS[input.moduleId as ModuleId];
  if (moduleDef.isCore && !input.enabled) {
    throw new Error(`Cannot disable core module: ${input.moduleId}`);
  }

  return prisma.tenantModuleConfig.upsert({
    where: {
      tenantId_moduleId: {
        tenantId: input.tenantId,
        moduleId: input.moduleId,
      },
    },
    create: {
      tenantId: input.tenantId,
      moduleId: input.moduleId,
      enabled: input.enabled,
      settings: input.settings ?? null,
      updatedBy,
    },
    update: {
      enabled: input.enabled,
      settings: input.settings ?? undefined,
      updatedBy,
    },
  });
}

/**
 * Update module configuration for a tenant
 */
export async function updateTenantModuleConfig(
  tenantId: string,
  moduleId: string,
  input: UpdateTenantModuleConfigInput,
  updatedBy?: number,
): Promise<TenantModuleConfig | null> {
  // Check if it's a core module being disabled
  const moduleDef = MODULE_DEFINITIONS[moduleId as ModuleId];
  if (moduleDef?.isCore && input.enabled === false) {
    throw new Error(`Cannot disable core module: ${moduleId}`);
  }

  try {
    return await prisma.tenantModuleConfig.update({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
      data: {
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.settings !== undefined && { settings: input.settings }),
        updatedBy,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Delete module configuration for a tenant (reverts to default)
 */
export async function deleteTenantModuleConfig(
  tenantId: string,
  moduleId: string,
): Promise<boolean> {
  try {
    await prisma.tenantModuleConfig.delete({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Bulk set module configuration for a tenant
 */
export async function bulkSetTenantModuleConfig(
  tenantId: string,
  moduleIds: string[],
  updatedBy?: number,
): Promise<TenantModuleConfig[]> {
  // Validate all module IDs
  for (const moduleId of moduleIds) {
    if (!MODULE_DEFINITIONS[moduleId as ModuleId]) {
      throw new Error(`Invalid module ID: ${moduleId}`);
    }
  }

  // Ensure core modules are always enabled
  const coreModules = Object.values(MODULE_DEFINITIONS)
    .filter((m) => m.isCore)
    .map((m) => m.id);

  const enabledSet = new Set([...coreModules, ...moduleIds]);

  // Create configs for all modules
  const allModuleIds = Object.keys(MODULE_DEFINITIONS) as ModuleId[];
  const results: TenantModuleConfig[] = [];

  for (const moduleId of allModuleIds) {
    const config = await prisma.tenantModuleConfig.upsert({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
      create: {
        tenantId,
        moduleId,
        enabled: enabledSet.has(moduleId),
        updatedBy,
      },
      update: {
        enabled: enabledSet.has(moduleId),
        updatedBy,
      },
    });
    results.push(config);
  }

  return results;
}

/**
 * Get all tenants with custom module configurations
 */
export async function getAllTenantConfigs(): Promise<string[]> {
  const configs = await prisma.tenantModuleConfig.findMany({
    select: { tenantId: true },
    distinct: ['tenantId'],
  });
  return configs.map((c) => c.tenantId);
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildModuleResultsFromConfigs(
  configs: TenantModuleConfig[],
): TenantModuleResult[] {
  const configMap = new Map(configs.map((c) => [c.moduleId, c]));

  return Object.values(MODULE_DEFINITIONS).map((def) => {
    const config = configMap.get(def.id);
    return {
      moduleId: def.id,
      enabled: config?.enabled ?? true,
      isCore: def.isCore,
      settings: config?.settings as Record<string, unknown> | undefined,
    };
  });
}

function buildModuleResultsFromIds(
  moduleIds: ModuleId[],
): TenantModuleResult[] {
  const enabledSet = new Set(moduleIds);

  return Object.values(MODULE_DEFINITIONS).map((def) => ({
    moduleId: def.id,
    enabled: enabledSet.has(def.id),
    isCore: def.isCore,
  }));
}
