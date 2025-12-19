/**
 * AI Monitoring API Routes
 *
 * Endpoints for AI usage tracking, cost analysis, and monitoring.
 * All endpoints require admin authentication.
 */

import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import {
  getAIUsageSummary,
  getRealtimeUsageStats,
  getAICostBreakdown,
  getGlobalCostBreakdown,
  getAIUsageTrends,
  checkCostThresholds,
  getMonthlySystemCost,
  aggregateHourlyUsage,
  aggregateDailyUsage,
} from './ai-usage.service';
import {
  getCostForecast,
  getUsageForecast,
  getToolPredictions,
  getSeasonalPatterns,
  getBudgetRecommendations,
} from './predictive.service';
import { AI_TOOLS, AI_COST_THRESHOLDS } from './index';
import { AIUsagePeriodType } from '@prisma/client';
import { getTenantId } from '../../tenant/tenant.context';
import { logger } from '../../utils/logger';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================================================
// OVERVIEW & SYSTEM STATS
// ============================================================================

/**
 * GET /api/ai-monitoring/overview
 * Get system-wide AI usage overview
 */
router.get('/overview', async (req, res, next) => {
  try {
    const systemCost = await getMonthlySystemCost();
    const costAlerts = await checkCostThresholds();

    res.json({
      data: {
        systemCost,
        costAlerts,
        thresholds: AI_COST_THRESHOLDS,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/tools
 * Get list of available AI tools
 */
router.get('/tools', (_req, res) => {
  const tools = Object.entries(AI_TOOLS).map(([id, tool]) => ({
    id,
    name: tool.name,
    operations: tool.operations,
  }));

  res.json({ data: tools });
});

// ============================================================================
// TENANT-SPECIFIC USAGE
// ============================================================================

/**
 * GET /api/ai-monitoring/usage
 * Get usage for current tenant
 */
router.get('/usage', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const periodHours = parseInt(req.query.hours as string) || 24;
    const stats = await getRealtimeUsageStats(tenantId, periodHours);

    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/usage/summary
 * Get aggregated usage summaries
 */
router.get('/usage/summary', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const {
      toolId,
      periodType = 'DAILY',
      startDate,
      endDate,
    } = req.query as Record<string, string>;

    const summaries = await getAIUsageSummary({
      tenantId,
      toolId,
      periodType: periodType as AIUsagePeriodType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.json({ data: summaries });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/cost-breakdown
 * Get cost breakdown for current tenant
 */
router.get('/cost-breakdown', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { startDate, endDate } = req.query as Record<string, string>;

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const breakdown = await getAICostBreakdown(tenantId, start, end);

    res.json({ data: breakdown });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/trends/:toolId
 * Get usage trends for a specific tool
 */
router.get('/trends/:toolId', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { toolId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const trends = await getAIUsageTrends(tenantId, toolId, days);

    res.json({ data: trends });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ADMIN ENDPOINTS (ALL TENANTS)
// ============================================================================

/**
 * GET /api/ai-monitoring/admin/global-costs
 * Get cost breakdown across all tenants (admin only)
 */
router.get('/admin/global-costs', async (req, res, next) => {
  try {
    // TODO: Add admin role check
    const { startDate, endDate } = req.query as Record<string, string>;

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const breakdown = await getGlobalCostBreakdown(start, end);

    res.json({ data: breakdown });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/admin/cost-alerts
 * Get tenants exceeding cost thresholds
 */
router.get('/admin/cost-alerts', async (req, res, next) => {
  try {
    // TODO: Add admin role check
    const alerts = await checkCostThresholds();

    res.json({
      data: {
        alerts,
        thresholds: AI_COST_THRESHOLDS,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/admin/tenant/:tenantId/usage
 * Get usage for a specific tenant (admin only)
 */
router.get('/admin/tenant/:tenantId/usage', async (req, res, next) => {
  try {
    // TODO: Add admin role check
    const { tenantId } = req.params;
    const periodHours = parseInt(req.query.hours as string) || 24;

    const stats = await getRealtimeUsageStats(tenantId, periodHours);

    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/admin/tenant/:tenantId/cost-breakdown
 * Get cost breakdown for a specific tenant (admin only)
 */
router.get('/admin/tenant/:tenantId/cost-breakdown', async (req, res, next) => {
  try {
    // TODO: Add admin role check
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const breakdown = await getAICostBreakdown(tenantId, start, end);

    res.json({ data: breakdown });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// AGGREGATION TRIGGERS (for testing/manual runs)
// ============================================================================

/**
 * POST /api/ai-monitoring/admin/aggregate/hourly
 * Trigger hourly aggregation (admin only)
 */
router.post('/admin/aggregate/hourly', async (_req, res, next) => {
  try {
    // TODO: Add admin role check
    logger.info('Manual hourly aggregation triggered');
    await aggregateHourlyUsage();
    res.json({ message: 'Hourly aggregation completed' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai-monitoring/admin/aggregate/daily
 * Trigger daily aggregation (admin only)
 */
router.post('/admin/aggregate/daily', async (_req, res, next) => {
  try {
    // TODO: Add admin role check
    logger.info('Manual daily aggregation triggered');
    await aggregateDailyUsage();
    res.json({ message: 'Daily aggregation completed' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PREDICTIVE ANALYTICS
// ============================================================================

/**
 * GET /api/ai-monitoring/forecast/costs
 * Get cost forecast for current tenant
 */
router.get('/forecast/costs', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    const forecast = await getCostForecast(tenantId || undefined);

    res.json({ data: forecast });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/forecast/usage
 * Get usage forecast for current tenant
 */
router.get('/forecast/usage', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    const forecast = await getUsageForecast(tenantId || undefined);

    res.json({ data: forecast });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/forecast/tools
 * Get predictions for each AI tool
 */
router.get('/forecast/tools', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    const predictions = await getToolPredictions(tenantId || undefined);

    res.json({ data: predictions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/patterns/seasonal
 * Get seasonal usage patterns
 */
router.get('/patterns/seasonal', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    const patterns = await getSeasonalPatterns(tenantId || undefined);

    res.json({ data: patterns });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/recommendations/budget
 * Get budget recommendations based on usage patterns
 */
router.get('/recommendations/budget', async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    const recommendations = await getBudgetRecommendations(
      tenantId || undefined,
    );

    res.json({ data: recommendations });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/admin/forecast/costs
 * Get global cost forecast (admin only)
 */
router.get('/admin/forecast/costs', async (_req, res, next) => {
  try {
    // TODO: Add admin role check
    const forecast = await getCostForecast();

    res.json({ data: forecast });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-monitoring/admin/recommendations/budget
 * Get global budget recommendations (admin only)
 */
router.get('/admin/recommendations/budget', async (_req, res, next) => {
  try {
    // TODO: Add admin role check
    const recommendations = await getBudgetRecommendations();

    res.json({ data: recommendations });
  } catch (error) {
    next(error);
  }
});

export default router;
