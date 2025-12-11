/**
 * Module Licensing Service
 *
 * Handles module access checks, trial management, and feature gating
 * for the multi-tenant CRM platform.
 */

import { prisma } from '../../prisma/client';
import {
  MODULE_REGISTRY,
  getDefaultLimits,
  isEnterpriseModule,
} from './module-registry';
import type {
  ModuleAccessResult,
  TenantModuleStatus,
  ModuleActivationRequest,
  ModuleTier,
} from './licensing.types';

// ============================================================================
// MODULE ACCESS CHECKS
// ============================================================================

/**
 * Check if a tenant has access to a specific module.
 */
export async function checkModuleAccess(
  tenantId: string,
  moduleId: string,
): Promise<ModuleAccessResult> {
  // Check if module exists in registry
  const moduleDefinition = MODULE_REGISTRY[moduleId];
  if (!moduleDefinition) {
    return {
      allowed: false,
      reason: `Module "${moduleId}" does not exist`,
    };
  }

  // Core modules are always accessible
  if (moduleDefinition.tier === 'core') {
    return { allowed: true };
  }

  // Get tenant's plan
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, status: true },
  });

  if (!tenant || tenant.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason: 'Tenant account is not active',
    };
  }

  // Check if module is enabled for tenant
  const tenantModule = await prisma.tenantModule.findUnique({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
  });

  if (!tenantModule || !tenantModule.enabled) {
    return {
      allowed: false,
      reason: `Module "${moduleDefinition.name}" is not enabled for your account`,
      upgradeUrl: '/settings/billing',
    };
  }

  // Check if trial expired
  if (tenantModule.tier === 'TRIAL' && tenantModule.trialEndsAt) {
    const now = new Date();
    if (now > tenantModule.trialEndsAt) {
      return {
        allowed: false,
        reason: `Your trial for "${moduleDefinition.name}" has expired`,
        upgradeUrl: '/settings/billing',
        trialDaysRemaining: 0,
      };
    }

    // Calculate days remaining
    const msRemaining = tenantModule.trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    return {
      allowed: true,
      trialDaysRemaining: daysRemaining,
    };
  }

  // Check enterprise module restrictions
  if (isEnterpriseModule(moduleId) && tenant.plan !== 'ENTERPRISE') {
    return {
      allowed: false,
      reason: `"${moduleDefinition.name}" requires an Enterprise plan`,
      upgradeUrl: '/settings/billing',
    };
  }

  return { allowed: true };
}

/**
 * Get detailed status of a module for a tenant.
 */
export async function getModuleStatus(
  tenantId: string,
  moduleId: string,
): Promise<TenantModuleStatus | null> {
  const tenantModule = await prisma.tenantModule.findUnique({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
  });

  if (!tenantModule) {
    return null;
  }

  const now = new Date();
  const isTrialExpired =
    tenantModule.tier === 'TRIAL' &&
    tenantModule.trialEndsAt !== null &&
    now > tenantModule.trialEndsAt;

  const usageLimits =
    (tenantModule.usageLimits as Record<string, number>) || {};
  const currentUsage =
    (tenantModule.currentUsage as Record<string, number>) || {};

  // Calculate usage percentages and warnings
  const usagePercentage: Record<string, number> = {};
  const limitWarnings: string[] = [];
  let isOverLimit = false;

  for (const [key, limit] of Object.entries(usageLimits)) {
    if (limit === -1) {
      usagePercentage[key] = 0; // Unlimited
      continue;
    }

    const used = currentUsage[key] || 0;
    const percentage = Math.round((used / limit) * 100);
    usagePercentage[key] = percentage;

    if (percentage >= 100) {
      isOverLimit = true;
      limitWarnings.push(`${key}: limit reached (${used}/${limit})`);
    } else if (percentage >= 80) {
      limitWarnings.push(`${key}: approaching limit (${percentage}%)`);
    }
  }

  return {
    moduleId,
    enabled: tenantModule.enabled,
    tier: tenantModule.tier as ModuleTier,
    trialEndsAt: tenantModule.trialEndsAt || undefined,
    isTrialExpired,
    usageLimits,
    currentUsage,
    usagePercentage,
    isOverLimit,
    limitWarnings,
  };
}

/**
 * Get all module statuses for a tenant.
 */
export async function getAllModuleStatuses(
  tenantId: string,
): Promise<TenantModuleStatus[]> {
  const tenantModules = await prisma.tenantModule.findMany({
    where: { tenantId },
  });

  const statuses: TenantModuleStatus[] = [];

  for (const tm of tenantModules) {
    const status = await getModuleStatus(tenantId, tm.moduleId);
    if (status) {
      statuses.push(status);
    }
  }

  return statuses;
}

// ============================================================================
// MODULE ACTIVATION
// ============================================================================

/**
 * Activate a module for a tenant.
 */
export async function activateModule(
  tenantId: string,
  request: ModuleActivationRequest,
): Promise<TenantModuleStatus> {
  const { moduleId, tier, startTrial, trialDays = 14, customLimits } = request;

  // Validate module exists
  const moduleDefinition = MODULE_REGISTRY[moduleId];
  if (!moduleDefinition) {
    throw new Error(`Module "${moduleId}" does not exist`);
  }

  // Get default limits based on tier
  const defaultLimits = customLimits || getDefaultLimits(moduleId, tier);

  // Calculate trial end date if starting trial
  let trialEndsAt: Date | null = null;
  if (startTrial || tier === 'TRIAL') {
    trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
  }

  // Create or update tenant module
  await prisma.tenantModule.upsert({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    create: {
      tenantId,
      moduleId,
      enabled: true,
      tier: startTrial ? 'TRIAL' : tier,
      usageLimits: defaultLimits,
      currentUsage: {},
      trialEndsAt,
    },
    update: {
      enabled: true,
      tier: startTrial ? 'TRIAL' : tier,
      usageLimits: defaultLimits,
      trialEndsAt,
    },
  });

  const status = await getModuleStatus(tenantId, moduleId);
  if (!status) {
    throw new Error('Failed to retrieve module status after activation');
  }

  return status;
}

/**
 * Deactivate a module for a tenant.
 */
export async function deactivateModule(
  tenantId: string,
  moduleId: string,
): Promise<void> {
  await prisma.tenantModule.update({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    data: {
      enabled: false,
    },
  });
}

/**
 * Start a trial for a module.
 */
export async function startModuleTrial(
  tenantId: string,
  moduleId: string,
  trialDays: number = 14,
): Promise<TenantModuleStatus> {
  return activateModule(tenantId, {
    moduleId,
    tier: 'TRIAL',
    startTrial: true,
    trialDays,
  });
}

/**
 * Upgrade a module tier.
 */
export async function upgradeModuleTier(
  tenantId: string,
  moduleId: string,
  newTier: ModuleTier,
): Promise<TenantModuleStatus> {
  // Get new limits for the tier
  const newLimits = getDefaultLimits(moduleId, newTier);

  await prisma.tenantModule.update({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    data: {
      tier: newTier,
      usageLimits: newLimits,
      trialEndsAt: null, // Clear trial on upgrade
    },
  });

  const status = await getModuleStatus(tenantId, moduleId);
  if (!status) {
    throw new Error('Failed to retrieve module status after upgrade');
  }

  return status;
}

// ============================================================================
// USAGE LIMIT ENFORCEMENT
// ============================================================================

/**
 * Check if a specific usage limit has been reached.
 */
export async function checkUsageLimit(
  tenantId: string,
  moduleId: string,
  limitKey: string,
  additionalQuantity: number = 1,
): Promise<{
  allowed: boolean;
  currentUsage: number;
  limit: number;
  message?: string;
}> {
  const tenantModule = await prisma.tenantModule.findUnique({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
  });

  if (!tenantModule || !tenantModule.enabled) {
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      message: 'Module not enabled',
    };
  }

  const usageLimits =
    (tenantModule.usageLimits as Record<string, number>) || {};
  const currentUsage =
    (tenantModule.currentUsage as Record<string, number>) || {};

  const limit = usageLimits[limitKey];
  const used = currentUsage[limitKey] || 0;

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      currentUsage: used,
      limit: -1,
    };
  }

  if (limit === undefined) {
    // No limit defined for this key - allow by default
    return {
      allowed: true,
      currentUsage: used,
      limit: -1,
    };
  }

  const wouldExceed = used + additionalQuantity > limit;

  return {
    allowed: !wouldExceed,
    currentUsage: used,
    limit,
    message: wouldExceed
      ? `Usage limit reached for ${limitKey}: ${used}/${limit}`
      : undefined,
  };
}

/**
 * Increment usage counter for a module.
 */
export async function incrementUsage(
  tenantId: string,
  moduleId: string,
  usageKey: string,
  quantity: number = 1,
): Promise<void> {
  const tenantModule = await prisma.tenantModule.findUnique({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
  });

  if (!tenantModule) return;

  const currentUsage =
    (tenantModule.currentUsage as Record<string, number>) || {};
  currentUsage[usageKey] = (currentUsage[usageKey] || 0) + quantity;

  await prisma.tenantModule.update({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    data: {
      currentUsage,
    },
  });
}

/**
 * Reset usage counters for a module (typically called at billing cycle reset).
 */
export async function resetModuleUsage(
  tenantId: string,
  moduleId: string,
): Promise<void> {
  await prisma.tenantModule.update({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    data: {
      currentUsage: {},
      usageResetAt: new Date(),
    },
  });
}

/**
 * Reset all module usage counters for a tenant.
 */
export async function resetAllModuleUsage(tenantId: string): Promise<void> {
  await prisma.tenantModule.updateMany({
    where: { tenantId },
    data: {
      currentUsage: {},
      usageResetAt: new Date(),
    },
  });
}
