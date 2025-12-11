/**
 * Usage Metering Routes
 *
 * API endpoints for tracking and reporting usage.
 */

import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import { requireTenant } from '../../tenant/tenant.middleware';
import { getTenantContext } from '../../tenant/tenant.context';
import * as usageService from './usage.service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const usageReportSchema = z.object({
  moduleId: z.string().optional(),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('MONTHLY'),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  groupBy: z.enum(['module', 'user', 'eventType']).optional(),
});

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * POST /api/usage/track
 * Track a usage event (internal API).
 */
router.post(
  '/usage/track',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId, eventType, quantity, entityType, entityId, metadata } =
        req.body;

      if (!moduleId || !eventType) {
        return res.status(400).json({
          error: 'moduleId and eventType are required',
        });
      }

      await usageService.trackUsage({
        tenantId,
        moduleId,
        eventType,
        quantity: quantity || 1,
        userId: req.userId,
        entityType,
        entityId,
        metadata,
      });

      res.status(201).json({ message: 'Usage tracked successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/usage/track/bulk
 * Track multiple usage events (internal API).
 */
router.post(
  '/usage/track/bulk',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          error: 'events array is required',
        });
      }

      await usageService.trackUsageBulk(
        events.map((e: Record<string, unknown>) => ({
          tenantId,
          moduleId: e.moduleId as string,
          eventType: e.eventType as string,
          quantity: (e.quantity as number) || 1,
          userId: req.userId,
          entityType: e.entityType as string | undefined,
          entityId: e.entityId as number | undefined,
          metadata: e.metadata as Record<string, unknown> | undefined,
        })),
      );

      res.status(201).json({
        message: 'Usage events tracked successfully',
        count: events.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// USAGE SUMMARIES
// ============================================================================

/**
 * GET /api/usage/summary
 * Get usage summary for all modules.
 */
router.get(
  '/usage/summary',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const period =
        (req.query.period as 'DAILY' | 'WEEKLY' | 'MONTHLY') || 'MONTHLY';
      const periodStart = usageService.getCurrentPeriodStart(period);

      const summaries = await usageService.getAllModuleUsageSummaries(
        tenantId,
        period,
        periodStart,
      );

      res.json({ data: summaries });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/usage/summary/:moduleId
 * Get usage summary for a specific module.
 */
router.get(
  '/usage/summary/:moduleId',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;
      const period =
        (req.query.period as 'DAILY' | 'WEEKLY' | 'MONTHLY') || 'MONTHLY';
      const periodStart = usageService.getCurrentPeriodStart(period);

      const summary = await usageService.getUsageSummary(
        tenantId,
        moduleId,
        period,
        periodStart,
      );

      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// USAGE STATISTICS
// ============================================================================

/**
 * GET /api/usage/stats/:moduleId
 * Get detailed usage statistics for a module.
 */
router.get(
  '/usage/stats/:moduleId',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const { moduleId } = req.params;

      const stats = await usageService.getModuleUsageStats(tenantId, moduleId);

      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// USAGE REPORTS
// ============================================================================

/**
 * POST /api/usage/report
 * Generate a usage report.
 */
router.post(
  '/usage/report',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = usageReportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { moduleId, period, startDate, endDate, groupBy } = validation.data;

      const report = await usageService.generateUsageReport({
        tenantId,
        moduleId,
        period,
        startDate,
        endDate,
        groupBy,
      });

      res.json({ data: report });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
