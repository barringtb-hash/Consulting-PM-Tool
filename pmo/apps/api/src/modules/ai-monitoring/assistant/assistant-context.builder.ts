/**
 * Assistant Context Builder
 *
 * Gathers monitoring data from various services to provide
 * context for the AI assistant's responses.
 */

import { prisma } from '../../../prisma/client';
import {
  getRealtimeUsageStats,
  getAICostBreakdown,
  getCostForecast,
} from '../ai-usage.service';
import {
  getAPILatencyStats,
  getErrorRates,
  getSystemHealth,
  getSlowQueries,
} from '../../monitoring/metrics.service';
import {
  getOpenAnomalies,
  getAnomalyStats,
} from '../../monitoring/anomaly-detection.service';
import { getAlertRules, getAlertHistory } from '../../monitoring/alert.service';
import { logger } from '../../../utils/logger';
import {
  AssistantContext,
  AssistantIntent,
  TenantUsageTrend,
  INTENT_KEYWORDS,
} from './monitoring-assistant.types';

// ============================================================================
// Intent Detection
// ============================================================================

/**
 * Detect the intent of a user message
 */
export function detectIntent(message: string): AssistantIntent {
  const lowerMessage = message.toLowerCase();

  // Check each intent's keywords
  const intentScores: Record<AssistantIntent, number> = {} as Record<
    AssistantIntent,
    number
  >;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += 1;
        // Boost score for longer keyword matches
        if (keyword.includes(' ')) {
          score += 0.5;
        }
      }
    }
    intentScores[intent as AssistantIntent] = score;
  }

  // Find the intent with the highest score
  let bestIntent: AssistantIntent = 'general_question';
  let bestScore = 0;

  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as AssistantIntent;
    }
  }

  return bestIntent;
}

// ============================================================================
// Context Builders
// ============================================================================

/**
 * Build context for AI usage/cost queries
 */
async function buildUsageContext(
  tenantId: string,
): Promise<Partial<AssistantContext>> {
  const [usage, costBreakdown, forecast] = await Promise.all([
    getRealtimeUsageStats(tenantId, 24).catch(() => null),
    getAICostBreakdown(tenantId, 30).catch(() => null),
    getCostForecast(tenantId).catch(() => null),
  ]);

  const context: Partial<AssistantContext> = {};

  if (usage) {
    context.currentUsage = {
      totalCalls: usage.totalCalls,
      successfulCalls: usage.successfulCalls,
      failedCalls: usage.failedCalls,
      successRate: usage.successRate,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      avgLatencyMs: usage.avgLatencyMs,
      period: {
        start: usage.period.start,
        end: usage.period.end,
        hours: 24,
      },
    };
  }

  if (costBreakdown) {
    context.costBreakdown = costBreakdown.byTool.map((t) => ({
      toolId: t.toolId,
      toolName: t.toolName,
      cost: t.cost,
      tokens: t.tokens,
      calls: t.calls,
      percentage: t.percentage,
    }));
  }

  if (forecast) {
    context.forecast = {
      currentMonth: {
        actual: forecast.currentMonthActual,
        projected: forecast.currentMonthProjected,
        daysRemaining: forecast.daysRemaining,
        dailyAverage: forecast.dailyAverage,
      },
      nextMonth: {
        projected: forecast.nextMonthForecast,
        confidence: forecast.confidenceLevel,
      },
      trend: {
        direction: forecast.trend,
        percentage: forecast.trendPercentage,
      },
      budgetStatus: {
        warningThreshold: 100, // Default thresholds
        criticalThreshold: 150,
        status: forecast.budgetStatus,
      },
    };
  }

  return context;
}

/**
 * Build context for system health queries
 */
async function buildSystemContext(): Promise<Partial<AssistantContext>> {
  const [health, latency, errors, slowQueries] = await Promise.all([
    getSystemHealth().catch(() => null),
    getAPILatencyStats().catch(() => null),
    getErrorRates().catch(() => null),
    getSlowQueries(10).catch(() => []),
  ]);

  const context: Partial<AssistantContext> = {};

  if (health) {
    context.systemHealth = {
      memory: {
        used: health.heapUsedMb,
        total: health.heapTotalMb,
        percentage: (health.heapUsedMb / health.heapTotalMb) * 100,
      },
      cpu: {
        usage: 0, // CPU usage not directly available
      },
      eventLoop: {
        lag: health.eventLoopLagMs,
        utilization: 0,
      },
      uptime: health.uptimeSeconds,
    };
  }

  if (latency) {
    context.apiLatency = {
      endpoints: Object.entries(latency).map(([endpoint, stats]) => {
        const s = stats as {
          count: number;
          avg: number;
          p95: number;
          p99?: number;
        };
        return {
          path: endpoint.split(' ')[1] || endpoint,
          method: endpoint.split(' ')[0] || 'GET',
          avgMs: s.avg,
          p95Ms: s.p95,
          p99Ms: s.p99 || s.p95,
          requestCount: s.count,
        };
      }),
    };
  }

  if (errors) {
    context.errorRates = {
      endpoints: Object.entries(errors).map(([endpoint, data]) => {
        const e = data as { total: number; errors: number };
        return {
          path: endpoint.split(' ')[1] || endpoint,
          method: endpoint.split(' ')[0] || 'GET',
          errorRate: e.total > 0 ? (e.errors / e.total) * 100 : 0,
          totalRequests: e.total,
          errorCount: e.errors,
        };
      }),
    };
  }

  if (slowQueries.length > 0) {
    context.databaseMetrics = {
      connectionPool: {
        active: 0,
        idle: 0,
        waiting: 0,
        total: 0,
      },
      slowQueries: slowQueries.map((q) => ({
        query: q.query,
        duration: q.durationMs,
        timestamp: q.timestamp,
      })),
      queryStats: {
        avgDuration:
          slowQueries.reduce((sum, q) => sum + q.durationMs, 0) /
          slowQueries.length,
        p95Duration: 0,
        totalQueries: slowQueries.length,
      },
    };
  }

  return context;
}

/**
 * Build context for anomaly queries
 */
async function buildAnomalyContext(
  tenantId: string,
): Promise<Partial<AssistantContext>> {
  const [anomalies, _stats] = await Promise.all([
    getOpenAnomalies({ tenantId, limit: 20 }).catch(() => []),
    getAnomalyStats(tenantId).catch(() => null),
  ]);

  const context: Partial<AssistantContext> = {};

  if (anomalies && anomalies.length > 0) {
    context.anomalies = anomalies.map((a) => ({
      id: a.id,
      category: a.category,
      severity: a.severity,
      status: a.status,
      title: a.title,
      description: a.description,
      detectedAt: a.detectedAt,
      entityType: a.entityType || undefined,
      entityId: a.entityId || undefined,
      metadata: a.metadata as Record<string, unknown> | undefined,
    }));
  }

  return context;
}

/**
 * Build context for alert queries
 */
async function buildAlertContext(
  tenantId: string,
): Promise<Partial<AssistantContext>> {
  const [rules, history] = await Promise.all([
    getAlertRules(tenantId).catch(() => []),
    getAlertHistory(tenantId, { limit: 20 }).catch(() => []),
  ]);

  const context: Partial<AssistantContext> = {};

  if (rules && rules.length > 0) {
    context.activeAlerts = rules
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        name: r.name,
        condition: r.condition,
        severity: r.severity,
        lastTriggered: r.lastTriggeredAt || undefined,
      }));
  }

  if (history && history.length > 0) {
    context.recentAlertHistory = history.map((h) => ({
      alertName: h.alertName,
      deliveredAt: h.sentAt,
      channel: h.channel,
      status: h.status,
    }));
  }

  return context;
}

/**
 * Build context for external service status
 */
async function buildExternalServicesContext(): Promise<
  Partial<AssistantContext>
> {
  // In a real implementation, these would call actual health check endpoints
  // For now, we provide placeholder data that can be extended
  const context: Partial<AssistantContext> = {
    externalServices: {
      vercel: {
        status: 'healthy',
        lastCheck: new Date(),
        deploymentStatus: 'active',
      },
      render: {
        status: 'healthy',
        lastCheck: new Date(),
        serviceHealth: 'running',
      },
      openai: {
        status: 'healthy',
        lastCheck: new Date(),
        modelsAvailable: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
      },
    },
  };

  return context;
}

/**
 * Build context for tenant trends (admin-level data)
 */
async function buildTenantTrendsContext(
  _tenantId: string,
): Promise<Partial<AssistantContext>> {
  // Get all tenants with their usage data
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const trends: TenantUsageTrend[] = [];

  for (const tenant of tenants) {
    const usage = await getRealtimeUsageStats(tenant.id, 24 * 7).catch(
      () => null,
    );
    if (usage) {
      trends.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        period: {
          start: usage.period.start,
          end: usage.period.end,
        },
        usage: {
          totalCalls: usage.totalCalls,
          totalTokens: usage.totalTokens,
          totalCost: usage.totalCost,
          avgDailyCalls: usage.totalCalls / 7,
        },
        trend: {
          direction: 'stable',
          percentage: 0,
        },
      });
    }
  }

  return { tenantTrends: trends };
}

// ============================================================================
// Main Context Builder
// ============================================================================

/**
 * Build full context based on detected intent
 */
export async function buildAssistantContext(
  tenantId: string,
  intent: AssistantIntent,
): Promise<AssistantContext> {
  const baseContext: AssistantContext = {
    tenantId,
    timestamp: new Date(),
    intent,
  };

  // Get tenant name
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (tenant) {
    baseContext.tenantName = tenant.name;
  }

  // Build context based on intent
  try {
    switch (intent) {
      case 'status_overview': {
        // Gather everything for a comprehensive overview
        const [usageCtx, systemCtx, anomalyCtx] = await Promise.all([
          buildUsageContext(tenantId),
          buildSystemContext(),
          buildAnomalyContext(tenantId),
        ]);
        return { ...baseContext, ...usageCtx, ...systemCtx, ...anomalyCtx };
      }

      case 'cost_inquiry':
      case 'usage_inquiry':
        return { ...baseContext, ...(await buildUsageContext(tenantId)) };

      case 'issue_diagnosis':
      case 'performance_inquiry': {
        const [sysCtx, anomCtx] = await Promise.all([
          buildSystemContext(),
          buildAnomalyContext(tenantId),
        ]);
        return { ...baseContext, ...sysCtx, ...anomCtx };
      }

      case 'anomaly_check':
        return { ...baseContext, ...(await buildAnomalyContext(tenantId)) };

      case 'trend_analysis': {
        const [trendUsage, trendTenants] = await Promise.all([
          buildUsageContext(tenantId),
          buildTenantTrendsContext(tenantId),
        ]);
        return { ...baseContext, ...trendUsage, ...trendTenants };
      }

      case 'recommendation': {
        // Need full context for recommendations
        const [recUsage, recSystem, recAnomaly] = await Promise.all([
          buildUsageContext(tenantId),
          buildSystemContext(),
          buildAnomalyContext(tenantId),
        ]);
        return { ...baseContext, ...recUsage, ...recSystem, ...recAnomaly };
      }

      case 'alert_status':
        return { ...baseContext, ...(await buildAlertContext(tenantId)) };

      case 'database_status':
        return { ...baseContext, ...(await buildSystemContext()) };

      case 'external_services':
        return { ...baseContext, ...(await buildExternalServicesContext()) };

      case 'tenant_trends':
        return {
          ...baseContext,
          ...(await buildTenantTrendsContext(tenantId)),
        };

      case 'general_question':
      default:
        // For general questions, provide basic usage data
        return { ...baseContext, ...(await buildUsageContext(tenantId)) };
    }
  } catch (error) {
    logger.error('Error building assistant context', {
      error,
      tenantId,
      intent,
    });
    return baseContext;
  }
}

/**
 * Get suggested queries based on current system state
 */
export async function getSuggestedQueries(tenantId: string): Promise<{
  suggestions: string[];
  basedOn: {
    hasAnomalies: boolean;
    hasCostWarning: boolean;
    hasPerformanceIssues: boolean;
  };
}> {
  const suggestions: string[] = [];
  const basedOn = {
    hasAnomalies: false,
    hasCostWarning: false,
    hasPerformanceIssues: false,
  };

  // Check for anomalies
  const anomalies = await getOpenAnomalies({ tenantId, limit: 5 }).catch(
    () => [],
  );
  if (anomalies && anomalies.length > 0) {
    basedOn.hasAnomalies = true;
    suggestions.push('What anomalies need my attention?');
    suggestions.push(`Tell me about the ${anomalies[0].title}`);
  }

  // Check cost forecast
  const forecast = await getCostForecast(tenantId).catch(() => null);
  if (forecast && forecast.budgetStatus !== 'safe') {
    basedOn.hasCostWarning = true;
    suggestions.push('How can I reduce AI costs?');
    suggestions.push("What's driving our AI spending?");
  }

  // Check for performance issues
  const errors = await getErrorRates().catch(() => ({}));
  const highErrorEndpoints = Object.entries(errors).filter(([_, data]) => {
    const e = data as { total: number; errors: number };
    return e.total > 10 && e.errors / e.total > 0.05;
  });
  if (highErrorEndpoints.length > 0) {
    basedOn.hasPerformanceIssues = true;
    suggestions.push('Are there any API performance issues?');
    suggestions.push('Which endpoints have high error rates?');
  }

  // Default suggestions if nothing specific
  if (suggestions.length === 0) {
    suggestions.push("What's the current system status?");
    suggestions.push('How much have we spent on AI this month?');
    suggestions.push('Show me usage trends for the past week');
    suggestions.push('Are there any slow database queries?');
  }

  return { suggestions, basedOn };
}
