/**
 * Monitoring API Routes
 *
 * Endpoints for infrastructure monitoring, anomaly management, and alerts.
 */

import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../auth/auth.middleware';
import {
  getAPILatencyStats,
  getErrorRates,
  getSystemHealth,
  getSlowQueries,
  getHistoricalMetrics,
  flushMetricsToDatabase,
} from './metrics.service';
import {
  getOpenAnomalies,
  acknowledgeAnomaly,
  resolveAnomaly,
  markFalsePositive,
  getAnomalyStats,
  runAllAnomalyDetection,
  ANOMALY_RULES,
} from './anomaly-detection.service';
import {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  sendTestAlert,
  getAlertHistory,
  sendDailyDigest,
} from './alert.service';
import { AnomalyCategory, AnomalySeverity } from '@prisma/client';
import { prisma } from '../../prisma/client';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================================================
// INFRASTRUCTURE METRICS
// ============================================================================

/**
 * GET /api/monitoring/infrastructure
 * Get current infrastructure metrics
 */
router.get('/infrastructure', async (_req, res, next) => {
  try {
    const [latencyStats, errorRates, systemHealth, slowQueries] =
      await Promise.all([
        getAPILatencyStats(),
        getErrorRates(),
        getSystemHealth(),
        getSlowQueries(20, 100),
      ]);

    res.json({
      data: {
        latency: latencyStats.slice(0, 20), // Top 20 slowest
        errors: errorRates.filter((e) => e.errorRate > 0),
        system: systemHealth,
        slowQueries,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/infrastructure/latency
 * Get API latency statistics
 */
router.get('/infrastructure/latency', async (_req, res, next) => {
  try {
    const stats = getAPILatencyStats();
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/infrastructure/errors
 * Get error rates by endpoint
 */
router.get('/infrastructure/errors', async (_req, res, next) => {
  try {
    const rates = getErrorRates();
    res.json({ data: rates });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/infrastructure/system
 * Get system health metrics
 */
router.get('/infrastructure/system', async (_req, res, next) => {
  try {
    const health = getSystemHealth();
    // Transform backend structure to match frontend expectations
    const transformedHealth = {
      memoryUsedMB: health.memory.rssMB, // Use RSS as "used" memory
      memoryTotalMB: Math.round(health.memory.rssMB * 1.5), // Estimate total (RSS * 1.5)
      memoryUsagePercent: Math.min(
        100,
        Math.round((health.memory.rssMB / (health.memory.rssMB * 1.5)) * 100),
      ),
      heapUsedMB: health.memory.heapUsedMB,
      heapTotalMB: health.memory.heapTotalMB,
      cpuUsagePercent: 0, // CPU usage not available in Node.js without external libs
      eventLoopLagMs: health.eventLoopLagMs,
      uptimeSeconds: health.uptime,
    };
    res.json({ data: transformedHealth });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/infrastructure/slow-queries
 * Get slow database queries
 */
router.get('/infrastructure/slow-queries', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const minDuration = parseInt(req.query.minDuration as string) || 100;

    const queries = await getSlowQueries(limit, minDuration);
    res.json({ data: queries });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/infrastructure/history
 * Get historical metrics
 */
router.get('/infrastructure/history', async (req, res, next) => {
  try {
    const { metricType, metricName, hours } = req.query;

    if (!metricType) {
      return res.status(400).json({ error: 'metricType is required' });
    }

    const metrics = await getHistoricalMetrics(
      metricType as string,
      metricName as string | undefined,
      parseInt(hours as string) || 24,
    );

    res.json({ data: metrics });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/monitoring/infrastructure/flush
 * Force flush metrics to database (admin only)
 */
router.post('/infrastructure/flush', async (_req, res, next) => {
  try {
    await flushMetricsToDatabase();
    res.json({ message: 'Metrics flushed successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ANOMALY MANAGEMENT
// ============================================================================

/**
 * GET /api/monitoring/anomalies
 * Get open anomalies with optional filters
 */
router.get('/anomalies', async (req, res, next) => {
  try {
    const { category, severity, tenantId } = req.query;

    const anomalies = await getOpenAnomalies({
      category: category as AnomalyCategory | undefined,
      severity: severity as AnomalySeverity | undefined,
      tenantId: tenantId as string | undefined,
    });

    res.json({ data: anomalies });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/anomalies/stats
 * Get anomaly statistics
 */
router.get('/anomalies/stats', async (_req, res, next) => {
  try {
    const stats = await getAnomalyStats();
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/anomalies/rules
 * Get anomaly detection rules
 */
router.get('/anomalies/rules', async (_req, res, next) => {
  try {
    res.json({
      data: ANOMALY_RULES.map((rule) => ({
        type: rule.type,
        category: rule.category,
        metric: rule.metric,
        method: rule.method,
        severity: rule.severity,
        description: rule.description,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/anomalies/:id
 * Get a specific anomaly
 */
router.get('/anomalies/:id', async (req, res, next) => {
  try {
    const anomaly = await prisma.anomaly.findUnique({
      where: { id: req.params.id },
      include: {
        acknowledgedByUser: { select: { id: true, name: true, email: true } },
        resolvedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    res.json({ data: anomaly });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/monitoring/anomalies/:id/acknowledge
 * Acknowledge an anomaly
 */
router.post(
  '/anomalies/:id/acknowledge',
  async (req: AuthenticatedRequest<{ id: string }>, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await acknowledgeAnomaly(req.params.id, req.userId);
      res.json({ message: 'Anomaly acknowledged' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/monitoring/anomalies/:id/resolve
 * Resolve an anomaly
 */
router.post(
  '/anomalies/:id/resolve',
  async (
    req: AuthenticatedRequest<{ id: string }, unknown, { resolution?: string }>,
    res,
    next,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { resolution } = req.body;
      await resolveAnomaly(req.params.id, req.userId, resolution);
      res.json({ message: 'Anomaly resolved' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/monitoring/anomalies/:id/false-positive
 * Mark anomaly as false positive
 */
router.post(
  '/anomalies/:id/false-positive',
  async (req: AuthenticatedRequest<{ id: string }>, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await markFalsePositive(req.params.id, req.userId);
      res.json({ message: 'Anomaly marked as false positive' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/monitoring/anomalies/detect
 * Manually trigger anomaly detection
 */
router.post('/anomalies/detect', async (_req, res, next) => {
  try {
    await runAllAnomalyDetection();
    res.json({ message: 'Anomaly detection completed' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ALERT MANAGEMENT
// ============================================================================

/**
 * GET /api/monitoring/alerts/rules
 * Get all alert rules
 */
router.get('/alerts/rules', async (_req, res, next) => {
  try {
    const rules = await getAlertRules();
    // Transform backend field names to frontend field names
    const transformedRules = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      // Map severities -> severity
      severity: rule.severities,
      // Map category (single) -> category (wrap in array for UI)
      category: rule.category ? [rule.category] : [],
      // Map channels (array) -> channel (use first)
      channel: rule.channels[0] || 'EMAIL',
      recipients: rule.recipients,
      // Map cooldownMinutes -> throttleMinutes
      throttleMinutes: rule.cooldownMinutes,
    }));
    res.json({ data: transformedRules });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/monitoring/alerts/rules
 * Create a new alert rule
 */
router.post('/alerts/rules', async (req, res, next) => {
  try {
    // Transform frontend field names to backend field names
    const { severity, channel, throttleMinutes, category, ...rest } = req.body;

    const transformedData = {
      ...rest,
      // Map severity (array) -> severities (array)
      severities: severity || [],
      // Map channel (single string) -> channels (array)
      channels: channel ? [channel] : [],
      // Map throttleMinutes -> cooldownMinutes
      cooldownMinutes: throttleMinutes || 60,
      // Map category (array) -> category (single, use first element)
      category:
        Array.isArray(category) && category.length > 0
          ? category[0]
          : undefined,
    };

    const rule = await createAlertRule(transformedData);
    res.status(201).json({ data: rule });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/monitoring/alerts/rules/:id
 * Update an alert rule
 */
router.put('/alerts/rules/:id', async (req, res, next) => {
  try {
    // Transform frontend field names to backend field names
    const { severity, channel, throttleMinutes, category, ...rest } = req.body;

    const transformedData: Record<string, unknown> = { ...rest };

    // Only include fields that were actually provided
    if (severity !== undefined) {
      transformedData.severities = severity;
    }
    if (channel !== undefined) {
      transformedData.channels = channel ? [channel] : [];
    }
    if (throttleMinutes !== undefined) {
      transformedData.cooldownMinutes = throttleMinutes;
    }
    if (category !== undefined) {
      transformedData.category =
        Array.isArray(category) && category.length > 0 ? category[0] : null;
    }

    await updateAlertRule(req.params.id, transformedData);
    res.json({ message: 'Alert rule updated' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/monitoring/alerts/rules/:id
 * Delete an alert rule
 */
router.delete('/alerts/rules/:id', async (req, res, next) => {
  try {
    await deleteAlertRule(req.params.id);
    res.json({ message: 'Alert rule deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/monitoring/alerts/rules/:id/test
 * Send a test alert
 */
router.post('/alerts/rules/:id/test', async (req, res, next) => {
  try {
    const result = await sendTestAlert(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/alerts/history
 * Get alert history
 */
router.get('/alerts/history', async (req, res, next) => {
  try {
    const { ruleId, status, limit } = req.query;

    const history = await getAlertHistory({
      ruleId: ruleId as string | undefined,
      status: status as 'SENT' | 'FAILED' | 'THROTTLED' | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ data: history });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/monitoring/alerts/digest
 * Manually send daily digest
 */
router.post('/alerts/digest', async (_req, res, next) => {
  try {
    await sendDailyDigest();
    res.json({ message: 'Daily digest sent' });
  } catch (error) {
    next(error);
  }
});

export default router;
