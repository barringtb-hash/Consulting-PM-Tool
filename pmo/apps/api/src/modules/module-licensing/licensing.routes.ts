/**
 * Module Licensing Routes
 *
 * API endpoints for managing module licensing, trials, and usage.
 */

import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import { requireTenant } from '../../tenant/tenant.middleware';
import { getTenantContext } from '../../tenant/tenant.context';
import * as licensingService from './licensing.service';
import {
  MODULE_REGISTRY,
  getModulesByCategory,
  getAllModuleIds,
} from './module-registry';
import { z } from 'zod';

const router = Router();

// Validation schemas
const activateModuleSchema = z.object({
  tier: z
    .enum(['TRIAL', 'BASIC', 'PREMIUM', 'ENTERPRISE'])
    .optional()
    .default('BASIC'),
  startTrial: z.boolean().optional(),
  trialDays: z.number().min(1).max(90).optional(),
  customLimits: z.record(z.number()).optional(),
});

// ============================================================================
// MODULE CATALOG (Public)
// ============================================================================

/**
 * GET /api/modules/catalog
 * Get all available modules with their definitions.
 */
router.get('/modules/catalog', (_req, res) => {
  const modules = Object.values(MODULE_REGISTRY).map((module) => ({
    id: module.id,
    name: module.name,
    description: module.description,
    category: module.category,
    tier: module.tier,
    features: module.features,
    pricing: module.pricing,
  }));

  res.json({ data: modules });
});

/**
 * GET /api/modules/catalog/:category
 * Get modules by category.
 */
router.get('/modules/catalog/:category', (req, res) => {
  const { category } = req.params;
  const modules = getModulesByCategory(category);

  res.json({
    data: modules.map((module) => ({
      id: module.id,
      name: module.name,
      description: module.description,
      tier: module.tier,
      features: module.features,
      pricing: module.pricing,
    })),
  });
});

/**
 * GET /api/modules/catalog/module/:moduleId
 * Get a specific module's definition.
 */
router.get('/modules/catalog/module/:moduleId', (req, res) => {
  const { moduleId } = req.params;
  const module = MODULE_REGISTRY[moduleId];

  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }

  res.json({ data: module });
});

// ============================================================================
// TENANT MODULE MANAGEMENT (Authenticated)
// ============================================================================

/**
 * GET /api/modules/status
 * Get all module statuses for the current tenant.
 */
router.get(
  '/modules/status',
  requireAuth,
  requireTenant,
  async (_req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const statuses = await licensingService.getAllModuleStatuses(tenantId);

      res.json({ data: statuses });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/modules/status/:moduleId
 * Get status of a specific module for the current tenant.
 */
router.get(
  '/modules/status/:moduleId',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;

      const status = await licensingService.getModuleStatus(tenantId, moduleId);

      if (!status) {
        return res.status(404).json({
          error: 'Module not found or not configured',
        });
      }

      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/modules/access/:moduleId
 * Check if current tenant has access to a module.
 */
router.get(
  '/modules/access/:moduleId',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;

      const accessResult = await licensingService.checkModuleAccess(
        tenantId,
        moduleId,
      );

      res.json({ data: accessResult });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/modules/:moduleId/activate
 * Activate a module for the current tenant.
 */
router.post(
  '/modules/:moduleId/activate',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;

      // Validate request body
      const validation = activateModuleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { tier, startTrial, trialDays, customLimits } = validation.data;

      const status = await licensingService.activateModule(tenantId, {
        moduleId,
        tier,
        startTrial,
        trialDays,
        customLimits,
      });

      res.status(201).json({ data: status });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/modules/:moduleId/deactivate
 * Deactivate a module for the current tenant.
 */
router.post(
  '/modules/:moduleId/deactivate',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;

      await licensingService.deactivateModule(tenantId, moduleId);

      res.json({ message: 'Module deactivated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/modules/:moduleId/trial
 * Start a trial for a module.
 */
router.post(
  '/modules/:moduleId/trial',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;
      const { trialDays } = req.body;

      const status = await licensingService.startModuleTrial(
        tenantId,
        moduleId,
        trialDays || 14,
      );

      res.status(201).json({ data: status });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/modules/:moduleId/upgrade
 * Upgrade a module's tier.
 */
router.post(
  '/modules/:moduleId/upgrade',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;
      const { tier } = req.body;

      if (!tier || !['BASIC', 'PREMIUM', 'ENTERPRISE'].includes(tier)) {
        return res.status(400).json({
          error: 'Invalid tier',
          message: 'Tier must be one of: BASIC, PREMIUM, ENTERPRISE',
        });
      }

      const status = await licensingService.upgradeModuleTier(
        tenantId,
        moduleId,
        tier,
      );

      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * GET /api/modules/:moduleId/usage
 * Get usage information for a module.
 */
router.get(
  '/modules/:moduleId/usage',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;

      const status = await licensingService.getModuleStatus(tenantId, moduleId);

      if (!status) {
        return res.status(404).json({
          error: 'Module not found or not configured',
        });
      }

      res.json({
        data: {
          moduleId: status.moduleId,
          tier: status.tier,
          usageLimits: status.usageLimits,
          currentUsage: status.currentUsage,
          usagePercentage: status.usagePercentage,
          isOverLimit: status.isOverLimit,
          limitWarnings: status.limitWarnings,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/modules/:moduleId/usage/reset
 * Reset usage counters for a module (admin only).
 */
router.post(
  '/modules/:moduleId/usage/reset',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;

      // TODO: Add admin role check

      await licensingService.resetModuleUsage(tenantId, moduleId);

      res.json({ message: 'Usage counters reset successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/modules/available
 * Get list of all available module IDs.
 */
router.get('/modules/available', (_req, res) => {
  res.json({ data: getAllModuleIds() });
});

export default router;
