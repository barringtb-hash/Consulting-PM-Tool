/**
 * Anomaly Detection Service
 *
 * Detects anomalies across multiple dimensions:
 * - Usage patterns (spikes, drops)
 * - Health score changes
 * - Cost anomalies
 * - Security patterns
 * - Infrastructure metrics
 * - Data quality issues
 */

import { prisma } from '../../prisma/client';
import {
  AnomalyCategory,
  AnomalySeverity,
  AnomalyStatus,
  Prisma,
} from '@prisma/client';
import { logger } from '../../utils/logger';
import { AI_COST_THRESHOLDS } from '../ai-monitoring/ai-pricing.config';

// ============================================================================
// ANOMALY RULES CONFIGURATION
// ============================================================================

export interface AnomalyRule {
  type: string;
  category: AnomalyCategory;
  metric: string;
  method: 'zscore' | 'threshold' | 'rate_of_change' | 'time_based';
  params: {
    threshold?: number;
    lookbackDays?: number;
    minDataPoints?: number;
    offHoursStart?: number;
    offHoursEnd?: number;
  };
  severity: AnomalySeverity;
  description: string;
}

export const ANOMALY_RULES: AnomalyRule[] = [
  // Usage anomalies
  {
    type: 'USAGE_SPIKE',
    category: 'USAGE',
    metric: 'daily_api_calls',
    method: 'zscore',
    params: { threshold: 3, lookbackDays: 14, minDataPoints: 7 },
    severity: 'WARNING',
    description: 'API call volume significantly higher than normal',
  },
  {
    type: 'USAGE_DROP',
    category: 'USAGE',
    metric: 'daily_active_users',
    method: 'rate_of_change',
    params: { threshold: -0.5, lookbackDays: 7 },
    severity: 'CRITICAL',
    description: 'Active user count dropped by more than 50%',
  },
  {
    type: 'INACTIVE_TENANT',
    category: 'USAGE',
    metric: 'days_since_activity',
    method: 'threshold',
    params: { threshold: 7 },
    severity: 'WARNING',
    description: 'Tenant has been inactive for over 7 days',
  },

  // Health anomalies
  {
    type: 'HEALTH_DECLINE',
    category: 'HEALTH',
    metric: 'health_score',
    method: 'rate_of_change',
    params: { threshold: -0.2, lookbackDays: 7 },
    severity: 'WARNING',
    description: 'Health score declined by more than 20%',
  },
  {
    type: 'CRITICAL_HEALTH',
    category: 'HEALTH',
    metric: 'health_score',
    method: 'threshold',
    params: { threshold: 30 },
    severity: 'CRITICAL',
    description: 'Health score dropped to critical level',
  },
  {
    type: 'CHURN_RISK_HIGH',
    category: 'HEALTH',
    metric: 'churn_risk',
    method: 'threshold',
    params: { threshold: 0.7 },
    severity: 'CRITICAL',
    description: 'Churn risk exceeds 70%',
  },

  // Cost anomalies
  {
    type: 'AI_COST_SPIKE',
    category: 'COST',
    metric: 'daily_ai_cost',
    method: 'zscore',
    params: { threshold: 2.5, lookbackDays: 14, minDataPoints: 7 },
    severity: 'WARNING',
    description: 'AI spending significantly higher than normal',
  },
  {
    type: 'AI_COST_WARNING',
    category: 'COST',
    metric: 'monthly_ai_cost',
    method: 'threshold',
    params: { threshold: AI_COST_THRESHOLDS.warningMonthly },
    severity: 'WARNING',
    description: `Monthly AI cost exceeded $${AI_COST_THRESHOLDS.warningMonthly}`,
  },
  {
    type: 'AI_COST_CRITICAL',
    category: 'COST',
    metric: 'monthly_ai_cost',
    method: 'threshold',
    params: { threshold: AI_COST_THRESHOLDS.criticalMonthly },
    severity: 'CRITICAL',
    description: `Monthly AI cost exceeded $${AI_COST_THRESHOLDS.criticalMonthly}`,
  },

  // Infrastructure anomalies
  {
    type: 'LATENCY_SPIKE',
    category: 'INFRASTRUCTURE',
    metric: 'api_p95_latency',
    method: 'threshold',
    params: { threshold: 2000 },
    severity: 'WARNING',
    description: 'API p95 latency exceeded 2 seconds',
  },
  {
    type: 'ERROR_RATE_HIGH',
    category: 'INFRASTRUCTURE',
    metric: 'error_rate',
    method: 'threshold',
    params: { threshold: 5 },
    severity: 'CRITICAL',
    description: 'Error rate exceeded 5%',
  },
  {
    type: 'MEMORY_HIGH',
    category: 'INFRASTRUCTURE',
    metric: 'memory_usage_percent',
    method: 'threshold',
    params: { threshold: 90 },
    severity: 'WARNING',
    description: 'Memory usage exceeded 90%',
  },

  // Security anomalies
  {
    type: 'FAILED_LOGIN_SPIKE',
    category: 'SECURITY',
    metric: 'failed_logins_hourly',
    method: 'threshold',
    params: { threshold: 10 },
    severity: 'CRITICAL',
    description: 'More than 10 failed login attempts in an hour',
  },
  {
    type: 'OFF_HOURS_ACCESS',
    category: 'SECURITY',
    metric: 'api_calls',
    method: 'time_based',
    params: { offHoursStart: 22, offHoursEnd: 6, threshold: 100 },
    severity: 'WARNING',
    description: 'Unusual activity during off-hours',
  },

  // Data quality anomalies
  {
    type: 'STALE_DATA',
    category: 'DATA_QUALITY',
    metric: 'last_sync_hours',
    method: 'threshold',
    params: { threshold: 48 },
    severity: 'INFO',
    description: 'Data sync has not occurred in over 48 hours',
  },
];

// ============================================================================
// BASELINE CALCULATION
// ============================================================================

interface Baseline {
  mean: number;
  stdDev: number;
  dataPoints: number;
}

/**
 * Calculate baseline statistics for a metric
 */
async function calculateBaseline(
  _tenantId: string | null,
  _metric: string,
  _lookbackDays: number,
): Promise<Baseline | null> {
  // This is a simplified version - in production, you'd query from
  // historical metric tables or pre-computed baselines
  const dataPoints: number[] = [];

  // For demo, return mock baseline
  // In production, query from TenantHealthMetrics, AIUsageSummary, etc.
  if (dataPoints.length < 7) {
    return null; // Not enough data for reliable baseline
  }

  const mean = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  const variance =
    dataPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    dataPoints.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev, dataPoints: dataPoints.length };
}

/**
 * Calculate z-score for anomaly detection
 */
function calculateZScore(value: number, baseline: Baseline): number {
  if (baseline.stdDev === 0) return 0;
  return (value - baseline.mean) / baseline.stdDev;
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Create an anomaly record
 */
async function createAnomaly(
  rule: AnomalyRule,
  tenantId: string | null,
  actualValue: number,
  expectedValue: number | null,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const deviation = expectedValue
    ? ((actualValue - expectedValue) / expectedValue) * 100
    : null;

  // Check if similar anomaly already exists and is open
  const existing = await prisma.anomaly.findFirst({
    where: {
      tenantId,
      type: rule.type,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (existing) {
    logger.debug('Skipping duplicate anomaly', { type: rule.type, tenantId });
    return;
  }

  await prisma.anomaly.create({
    data: {
      tenantId,
      type: rule.type,
      severity: rule.severity,
      category: rule.category,
      metric: rule.metric,
      expectedValue,
      actualValue,
      deviation,
      entityType,
      entityId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  logger.info('Anomaly detected', {
    type: rule.type,
    severity: rule.severity,
    tenantId,
    actualValue,
    expectedValue,
  });
}

/**
 * Run anomaly detection for a specific rule
 */
async function detectAnomalyForRule(
  rule: AnomalyRule,
  tenantId: string | null,
  currentValue: number,
): Promise<void> {
  switch (rule.method) {
    case 'threshold': {
      const threshold = rule.params.threshold!;
      if (rule.type.includes('DROP') || rule.type.includes('DECLINE')) {
        if (currentValue < threshold) {
          await createAnomaly(rule, tenantId, currentValue, threshold);
        }
      } else {
        if (currentValue > threshold) {
          await createAnomaly(rule, tenantId, currentValue, threshold);
        }
      }
      break;
    }

    case 'zscore': {
      const baseline = await calculateBaseline(
        tenantId,
        rule.metric,
        rule.params.lookbackDays || 14,
      );

      if (baseline && baseline.dataPoints >= (rule.params.minDataPoints || 7)) {
        const zScore = calculateZScore(currentValue, baseline);
        if (Math.abs(zScore) > (rule.params.threshold || 3)) {
          await createAnomaly(
            rule,
            tenantId,
            currentValue,
            baseline.mean,
            undefined,
            undefined,
            {
              zScore,
              baseline: baseline.mean,
              stdDev: baseline.stdDev,
            },
          );
        }
      }
      break;
    }

    case 'rate_of_change': {
      // Compare current to previous period
      // In production, query historical data
      break;
    }

    case 'time_based': {
      const hour = new Date().getHours();
      const offStart = rule.params.offHoursStart || 22;
      const offEnd = rule.params.offHoursEnd || 6;
      const isOffHours =
        offStart > offEnd
          ? hour >= offStart || hour < offEnd
          : hour >= offStart && hour < offEnd;

      if (isOffHours && currentValue > (rule.params.threshold || 0)) {
        await createAnomaly(
          rule,
          tenantId,
          currentValue,
          0,
          undefined,
          undefined,
          {
            hour,
            offHoursStart: offStart,
            offHoursEnd: offEnd,
          },
        );
      }
      break;
    }
  }
}

// ============================================================================
// SCHEDULED DETECTION
// ============================================================================

/**
 * Run cost threshold checks
 */
export async function runCostAnomalyDetection(): Promise<void> {
  logger.info('Running cost anomaly detection');

  // Get current month AI costs per tenant
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const costsByTenant = await prisma.aIUsageEvent.groupBy({
    by: ['tenantId'],
    where: { createdAt: { gte: monthStart } },
    _sum: { estimatedCost: true },
  });

  for (const tenant of costsByTenant) {
    const monthlyCost = Number(tenant._sum.estimatedCost || 0);

    // Check warning threshold
    const warningRule = ANOMALY_RULES.find((r) => r.type === 'AI_COST_WARNING');
    if (warningRule && monthlyCost >= AI_COST_THRESHOLDS.warningMonthly) {
      await detectAnomalyForRule(warningRule, tenant.tenantId, monthlyCost);
    }

    // Check critical threshold
    const criticalRule = ANOMALY_RULES.find(
      (r) => r.type === 'AI_COST_CRITICAL',
    );
    if (criticalRule && monthlyCost >= AI_COST_THRESHOLDS.criticalMonthly) {
      await detectAnomalyForRule(criticalRule, tenant.tenantId, monthlyCost);
    }
  }
}

/**
 * Run health anomaly detection
 */
export async function runHealthAnomalyDetection(): Promise<void> {
  logger.info('Running health anomaly detection');

  // Get health scores from customer success
  const healthScores = await prisma.customerHealthScore.findMany({
    where: { overallScore: { lte: 30 } },
    select: {
      id: true,
      clientId: true,
      overallScore: true,
      category: true,
    },
  });

  for (const score of healthScores) {
    // Critical health
    const criticalRule = ANOMALY_RULES.find(
      (r) => r.type === 'CRITICAL_HEALTH',
    );
    if (criticalRule) {
      await createAnomaly(
        criticalRule,
        null, // No tenantId on CustomerHealthScore
        score.overallScore,
        30,
        'Client',
        String(score.clientId),
      );
    }

    // High churn risk (category is AT_RISK or CHURNING)
    if (score.category === 'CHURNING') {
      const churnRule = ANOMALY_RULES.find((r) => r.type === 'CHURN_RISK_HIGH');
      if (churnRule) {
        await createAnomaly(
          churnRule,
          null, // No tenantId on CustomerHealthScore
          score.overallScore,
          30,
          'Client',
          String(score.clientId),
        );
      }
    }
  }
}

/**
 * Run infrastructure anomaly detection
 */
export async function runInfrastructureAnomalyDetection(): Promise<void> {
  logger.info('Running infrastructure anomaly detection');

  // Check recent metrics for high latency
  const recentMetrics = await prisma.infrastructureMetric.findMany({
    where: {
      metricType: 'API_LATENCY',
      windowStart: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    select: { p95: true, metricName: true },
  });

  for (const metric of recentMetrics) {
    if (metric.p95 && metric.p95 > 2000) {
      const rule = ANOMALY_RULES.find((r) => r.type === 'LATENCY_SPIKE');
      if (rule) {
        await createAnomaly(
          rule,
          null,
          metric.p95,
          2000,
          'Endpoint',
          metric.metricName,
        );
      }
    }
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  if (heapPercent > 90) {
    const rule = ANOMALY_RULES.find((r) => r.type === 'MEMORY_HIGH');
    if (rule) {
      await createAnomaly(rule, null, heapPercent, 90, 'System', 'memory');
    }
  }
}

/**
 * Run all anomaly detection checks
 */
export async function runAllAnomalyDetection(): Promise<void> {
  try {
    await Promise.all([
      runCostAnomalyDetection(),
      runHealthAnomalyDetection(),
      runInfrastructureAnomalyDetection(),
    ]);
  } catch (error) {
    logger.error('Anomaly detection failed', { error });
  }
}

// ============================================================================
// ANOMALY MANAGEMENT
// ============================================================================

/**
 * Get open anomalies
 */
export async function getOpenAnomalies(filters?: {
  category?: AnomalyCategory;
  severity?: AnomalySeverity;
  tenantId?: string;
}): Promise<
  Array<{
    id: string;
    type: string;
    severity: AnomalySeverity;
    category: AnomalyCategory;
    metric: string;
    actualValue: number;
    expectedValue: number | null;
    deviation: number | null;
    tenantId: string | null;
    entityType: string | null;
    entityId: string | null;
    status: AnomalyStatus;
    detectedAt: Date;
  }>
> {
  const where: Prisma.AnomalyWhereInput = {
    status: { in: ['OPEN', 'ACKNOWLEDGED'] },
  };

  if (filters?.category) where.category = filters.category;
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.tenantId) where.tenantId = filters.tenantId;

  return prisma.anomaly.findMany({
    where,
    orderBy: [{ severity: 'asc' }, { detectedAt: 'desc' }],
  });
}

/**
 * Acknowledge an anomaly
 */
export async function acknowledgeAnomaly(
  anomalyId: string,
  userId: number,
): Promise<void> {
  await prisma.anomaly.update({
    where: { id: anomalyId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
    },
  });
}

/**
 * Resolve an anomaly
 */
export async function resolveAnomaly(
  anomalyId: string,
  userId: number,
  resolution?: string,
): Promise<void> {
  await prisma.anomaly.update({
    where: { id: anomalyId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution,
    },
  });
}

/**
 * Mark anomaly as false positive
 */
export async function markFalsePositive(
  anomalyId: string,
  userId: number,
): Promise<void> {
  await prisma.anomaly.update({
    where: { id: anomalyId },
    data: {
      status: 'FALSE_POSITIVE',
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution: 'Marked as false positive',
    },
  });
}

/**
 * Get anomaly statistics
 */
export async function getAnomalyStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const [byStatus, bySeverity, byCategory] = await Promise.all([
    prisma.anomaly.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.anomaly.groupBy({
      by: ['severity'],
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      _count: true,
    }),
    prisma.anomaly.groupBy({
      by: ['category'],
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      _count: true,
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  byStatus.forEach((s) => (statusCounts[s.status] = s._count));

  const severityCounts: Record<string, number> = {};
  bySeverity.forEach((s) => (severityCounts[s.severity] = s._count));

  const categoryCounts: Record<string, number> = {};
  byCategory.forEach((c) => (categoryCounts[c.category] = c._count));

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return {
    total,
    byStatus: statusCounts,
    bySeverity: severityCounts,
    byCategory: categoryCounts,
  };
}
