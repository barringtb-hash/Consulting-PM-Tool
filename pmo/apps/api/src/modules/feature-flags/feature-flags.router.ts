/**
 * Feature Flags & Module Configuration Router
 *
 * Provides API endpoints for managing feature flags and per-tenant module configurations.
 *
 * Public endpoints:
 * - GET /api/modules - Get enabled modules for the current deployment
 *
 * Admin endpoints (require ADMIN role):
 * - GET/POST/PATCH/DELETE /api/admin/feature-flags - Manage feature flags
 * - GET/POST/PATCH /api/admin/modules - Manage tenant module configurations
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { requireRole } from '../../auth/role.middleware';
import {
  MODULE_DEFINITIONS,
  ModuleId,
  getEnabledModuleDefinitions,
  getNavigationItems,
} from '../../../../../packages/modules';
import {
  // Feature flags
  getAllFeatureFlags,
  getFeatureFlag,
  isFeatureFlagEnabled,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  // Tenant module config
  getTenantModuleConfig,
  getEnabledModulesForTenant,
  setTenantModuleConfig,
  updateTenantModuleConfig,
  deleteTenantModuleConfig,
  bulkSetTenantModuleConfig,
  getAllTenantConfigs,
} from './feature-flags.service';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const featureFlagCreateSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_-]*$/i, 'Key must start with a letter and contain only alphanumeric characters, underscores, and hyphens'),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  config: z.record(z.unknown()).optional(),
});

const featureFlagUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  config: z.record(z.unknown()).optional(),
});

const tenantModuleConfigSchema = z.object({
  tenantId: z.string().min(1),
  moduleId: z.string().min(1),
  enabled: z.boolean(),
  settings: z.record(z.unknown()).optional(),
});

const tenantModuleUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

const bulkModuleConfigSchema = z.object({
  tenantId: z.string().min(1),
  enabledModules: z.array(z.string()),
});

// ============================================================================
// Public Endpoints
// ============================================================================

/**
 * GET /api/modules
 * Get enabled modules for the current deployment or specific tenant
 *
 * Query params:
 * - tenantId (optional): Get configuration for a specific tenant
 *
 * Returns module definitions, navigation items, and enabled status
 */
router.get('/modules', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || 'default';

    // Get tenant-specific configuration from database (falls back to env/defaults)
    const tenantConfig = await getTenantModuleConfig(tenantId);
    const enabledModules = tenantConfig.modules
      .filter((m) => m.enabled)
      .map((m) => m.moduleId);

    const enabledDefinitions = getEnabledModuleDefinitions(enabledModules);
    const navigationItems = getNavigationItems(enabledModules);

    // Build response with all module info
    const allModules = Object.values(MODULE_DEFINITIONS).map((def) => ({
      id: def.id,
      label: def.label,
      description: def.description,
      navGroup: def.navGroup,
      path: def.path,
      icon: def.icon,
      isCore: def.isCore,
      enabled: enabledModules.includes(def.id),
      dependencies: def.dependencies || [],
    }));

    res.json({
      tenantId: tenantConfig.tenantId,
      source: tenantConfig.source,
      enabledModules,
      modules: allModules,
      enabledDefinitions,
      navigationItems,
    });
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch module configuration' });
  }
});

/**
 * GET /api/modules/check/:moduleId
 * Check if a specific module is enabled for a tenant
 *
 * Query params:
 * - tenantId (optional): Check for a specific tenant
 */
router.get('/modules/check/:moduleId', async (req, res: Response) => {
  const moduleId = req.params.moduleId as ModuleId;
  const tenantId = (req.query.tenantId as string) || 'default';

  if (!MODULE_DEFINITIONS[moduleId]) {
    res.status(400).json({ error: 'Invalid module ID' });
    return;
  }

  const tenantConfig = await getTenantModuleConfig(tenantId);
  const moduleConfig = tenantConfig.modules.find((m) => m.moduleId === moduleId);
  const enabled = moduleConfig?.enabled ?? true;

  res.json({
    moduleId,
    tenantId: tenantConfig.tenantId,
    source: tenantConfig.source,
    enabled,
    isCore: MODULE_DEFINITIONS[moduleId].isCore,
  });
});

// ============================================================================
// Protected Endpoints (require authentication)
// ============================================================================

/**
 * GET /api/feature-flags/check/:key
 * Check if a feature flag is enabled for the current user
 */
router.get(
  '/feature-flags/check/:key',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await isFeatureFlagEnabled(req.params.key, req.userId);
    res.json(result);
  }
);

// ============================================================================
// Admin Endpoints (require ADMIN role)
// ============================================================================

// Feature Flags Management

/**
 * GET /api/admin/feature-flags
 * Get all feature flags
 */
router.get(
  '/admin/feature-flags',
  requireAuth,
  requireRole('ADMIN'),
  async (_req: AuthenticatedRequest, res: Response) => {
    const flags = await getAllFeatureFlags();
    res.json(flags);
  }
);

/**
 * GET /api/admin/feature-flags/:key
 * Get a specific feature flag
 */
router.get(
  '/admin/feature-flags/:key',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const flag = await getFeatureFlag(req.params.key);

    if (!flag) {
      res.status(404).json({ error: 'Feature flag not found' });
      return;
    }

    res.json(flag);
  }
);

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 */
router.post(
  '/admin/feature-flags',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = featureFlagCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const flag = await createFeatureFlag(parsed.data);
      res.status(201).json(flag);
    } catch (error) {
      if ((error as Error).message.includes('Unique constraint')) {
        res.status(409).json({ error: 'Feature flag with this key already exists' });
        return;
      }
      throw error;
    }
  }
);

/**
 * PATCH /api/admin/feature-flags/:key
 * Update a feature flag
 */
router.patch(
  '/admin/feature-flags/:key',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = featureFlagUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    const flag = await updateFeatureFlag(req.params.key, parsed.data);

    if (!flag) {
      res.status(404).json({ error: 'Feature flag not found' });
      return;
    }

    res.json(flag);
  }
);

/**
 * DELETE /api/admin/feature-flags/:key
 * Delete a feature flag
 */
router.delete(
  '/admin/feature-flags/:key',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await deleteFeatureFlag(req.params.key);

    if (!deleted) {
      res.status(404).json({ error: 'Feature flag not found' });
      return;
    }

    res.status(204).send();
  }
);

// Tenant Module Configuration Management

/**
 * GET /api/admin/modules/tenants
 * Get all tenants with custom module configurations
 */
router.get(
  '/admin/modules/tenants',
  requireAuth,
  requireRole('ADMIN'),
  async (_req: AuthenticatedRequest, res: Response) => {
    const tenants = await getAllTenantConfigs();
    res.json({ tenants });
  }
);

/**
 * GET /api/admin/modules/:tenantId
 * Get module configuration for a specific tenant
 */
router.get(
  '/admin/modules/:tenantId',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const config = await getTenantModuleConfig(req.params.tenantId);
    res.json(config);
  }
);

/**
 * POST /api/admin/modules
 * Set module configuration for a tenant (upsert)
 */
router.post(
  '/admin/modules',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = tenantModuleConfigSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const config = await setTenantModuleConfig(parsed.data, req.userId);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

/**
 * POST /api/admin/modules/bulk
 * Bulk set enabled modules for a tenant
 */
router.post(
  '/admin/modules/bulk',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = bulkModuleConfigSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const configs = await bulkSetTenantModuleConfig(
        parsed.data.tenantId,
        parsed.data.enabledModules,
        req.userId
      );

      const enabledModules = await getEnabledModulesForTenant(parsed.data.tenantId);

      res.json({
        tenantId: parsed.data.tenantId,
        configs,
        enabledModules,
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

/**
 * PATCH /api/admin/modules/:tenantId/:moduleId
 * Update module configuration for a specific tenant and module
 */
router.patch(
  '/admin/modules/:tenantId/:moduleId',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = tenantModuleUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const config = await updateTenantModuleConfig(
        req.params.tenantId,
        req.params.moduleId,
        parsed.data,
        req.userId
      );

      if (!config) {
        res.status(404).json({ error: 'Module configuration not found' });
        return;
      }

      res.json(config);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

/**
 * DELETE /api/admin/modules/:tenantId/:moduleId
 * Delete module configuration for a specific tenant and module (reverts to default)
 */
router.delete(
  '/admin/modules/:tenantId/:moduleId',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await deleteTenantModuleConfig(
      req.params.tenantId,
      req.params.moduleId
    );

    if (!deleted) {
      res.status(404).json({ error: 'Module configuration not found' });
      return;
    }

    res.status(204).send();
  }
);

export default router;
