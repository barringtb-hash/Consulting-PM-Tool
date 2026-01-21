/**
 * Tenant Health Routes
 *
 * Routes for accessing tenant health metrics and monitoring data.
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/auth.middleware';
import { requireAdmin } from '../auth/auth.middleware';
import { requireTenant, TenantRequest } from '../tenant/tenant.middleware';
import * as tenantHealthService from '../services/tenant-health.service';

const router = Router();

/**
 * GET /api/tenant-health
 * Get health summary for the current tenant
 */
router.get(
  '/',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const health = await tenantHealthService.getTenantHealth(tenantId);
      return res.json({ data: health });
    } catch (error) {
      console.error('Error getting tenant health:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get tenant health',
      });
    }
  },
);

/**
 * GET /api/tenant-health/history
 * Get health metrics history for the current tenant
 */
router.get(
  '/history',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const days = parseInt(req.query.days as string) || 30;
      const history = await tenantHealthService.getHealthHistory(
        tenantId,
        days,
      );
      return res.json({ data: history });
    } catch (error) {
      console.error('Error getting health history:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get health history',
      });
    }
  },
);

/**
 * GET /api/tenant-health/plan-limits
 * Get plan limits for reference
 */
router.get(
  '/plan-limits',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response) => {
    try {
      return res.json({ data: tenantHealthService.PLAN_LIMITS });
    } catch (error) {
      console.error('Error getting plan limits:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to get plan limits',
      });
    }
  },
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /api/tenant-health/admin/all
 * Get health summaries for all tenants (admin only)
 */
router.get(
  '/admin/all',
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const summaries = await tenantHealthService.getAllTenantsHealth();
      return res.json({ data: summaries });
    } catch (error) {
      console.error('Error getting all tenants health:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get tenants health',
      });
    }
  },
);

/**
 * GET /api/tenant-health/admin/:tenantId
 * Get health summary for a specific tenant (admin only)
 */
router.get(
  '/admin/:tenantId',
  requireAdmin,
  async (req: AuthenticatedRequest<{ tenantId: string }>, res: Response) => {
    try {
      const { tenantId } = req.params;
      const health = await tenantHealthService.getTenantHealth(tenantId);
      return res.json({ data: health });
    } catch (error) {
      console.error('Error getting tenant health:', error);
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get tenant health',
      });
    }
  },
);

/**
 * GET /api/tenant-health/admin/:tenantId/history
 * Get health history for a specific tenant (admin only)
 */
router.get(
  '/admin/:tenantId/history',
  requireAdmin,
  async (req: AuthenticatedRequest<{ tenantId: string }>, res: Response) => {
    try {
      const { tenantId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const history = await tenantHealthService.getHealthHistory(
        tenantId,
        days,
      );
      return res.json({ data: history });
    } catch (error) {
      console.error('Error getting tenant health history:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get tenant health history',
      });
    }
  },
);

/**
 * POST /api/tenant-health/admin/:tenantId/record
 * Manually record health metrics for a tenant (admin only)
 */
router.post(
  '/admin/:tenantId/record',
  requireAdmin,
  async (req: AuthenticatedRequest<{ tenantId: string }>, res: Response) => {
    try {
      const { tenantId } = req.params;
      await tenantHealthService.recordHealthMetrics(tenantId);
      return res.json({ success: true, message: 'Health metrics recorded' });
    } catch (error) {
      console.error('Error recording health metrics:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to record health metrics',
      });
    }
  },
);

export default router;
