/**
 * AI Usage Tracking Service
 *
 * Provides comprehensive tracking of AI tool usage including:
 * - Individual call tracking with token counts and costs
 * - Aggregated usage summaries by period
 * - Cost breakdown by tenant and tool
 * - Usage trend analysis
 */

import { prisma } from '../../prisma/client';
import { AIUsagePeriodType, Prisma } from '@prisma/client';
import { calculateAICost, AI_COST_THRESHOLDS } from './ai-pricing.config';
import {
  AI_TOOLS,
  AIToolId,
  AIUsageEventInput,
  AIUsageEventResult,
  AIUsageSummaryFilters,
  AIUsageSummaryResult,
  AIUsageCostBreakdown,
  AIUsageTrends,
  AIUsageTrendPoint,
} from './ai-monitoring.types';
import { logger } from '../../utils/logger';

// ============================================================================
// TRACK USAGE
// ============================================================================

/**
 * Track a single AI usage event
 */
export async function trackAIUsage(
  input: AIUsageEventInput,
): Promise<AIUsageEventResult> {
  const toolDef = AI_TOOLS[input.toolId as AIToolId];
  const toolName = toolDef?.name || input.toolId;
  const totalTokens = input.promptTokens + input.completionTokens;
  const estimatedCost = calculateAICost(
    input.model,
    input.promptTokens,
    input.completionTokens,
  );

  try {
    const event = await prisma.aIUsageEvent.create({
      data: {
        tenantId: input.tenantId,
        toolId: input.toolId,
        toolName,
        operation: input.operation,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens,
        estimatedCost: new Prisma.Decimal(estimatedCost),
        latencyMs: input.latencyMs,
        success: input.success,
        errorType: input.errorType,
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });

    return {
      id: event.id,
      tenantId: event.tenantId,
      toolId: event.toolId,
      toolName: event.toolName,
      operation: event.operation,
      model: event.model,
      promptTokens: event.promptTokens,
      completionTokens: event.completionTokens,
      totalTokens: event.totalTokens,
      estimatedCost: Number(event.estimatedCost),
      latencyMs: event.latencyMs,
      success: event.success,
      createdAt: event.createdAt,
    };
  } catch (error) {
    logger.error('Failed to track AI usage', { error, input });
    throw error;
  }
}

/**
 * Track multiple AI usage events in batch
 */
export async function trackAIUsageBatch(
  inputs: AIUsageEventInput[],
): Promise<number> {
  const data = inputs.map((input) => {
    const toolDef = AI_TOOLS[input.toolId as AIToolId];
    const toolName = toolDef?.name || input.toolId;
    const totalTokens = input.promptTokens + input.completionTokens;
    const estimatedCost = calculateAICost(
      input.model,
      input.promptTokens,
      input.completionTokens,
    );

    return {
      tenantId: input.tenantId,
      toolId: input.toolId,
      toolName,
      operation: input.operation,
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens,
      estimatedCost: new Prisma.Decimal(estimatedCost),
      latencyMs: input.latencyMs,
      success: input.success,
      errorType: input.errorType,
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonValue,
    };
  });

  const result = await prisma.aIUsageEvent.createMany({ data });
  return result.count;
}

// ============================================================================
// USAGE SUMMARIES
// ============================================================================

/**
 * Get usage summary for a tenant
 */
export async function getAIUsageSummary(
  filters: AIUsageSummaryFilters,
): Promise<AIUsageSummaryResult[]> {
  const { tenantId, toolId, periodType, startDate, endDate } = filters;

  const where: Prisma.AIUsageSummaryWhereInput = {};
  if (tenantId) where.tenantId = tenantId;
  if (toolId) where.toolId = toolId;
  if (periodType) where.periodType = periodType;
  if (startDate) where.periodStart = { gte: startDate };
  if (endDate) where.periodEnd = { lte: endDate };

  const summaries = await prisma.aIUsageSummary.findMany({
    where,
    orderBy: { periodStart: 'desc' },
  });

  return summaries.map((s) => {
    const toolDef = AI_TOOLS[s.toolId as AIToolId];
    return {
      toolId: s.toolId,
      toolName: toolDef?.name || s.toolId,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      periodType: s.periodType,
      totalCalls: s.totalCalls,
      successfulCalls: s.successfulCalls,
      failedCalls: s.failedCalls,
      successRate:
        s.totalCalls > 0 ? (s.successfulCalls / s.totalCalls) * 100 : 0,
      totalTokens: s.totalTokens,
      totalCost: Number(s.totalCost),
      avgLatencyMs: s.avgLatencyMs,
      p95LatencyMs: s.p95LatencyMs,
    };
  });
}

/**
 * Get real-time usage stats (from raw events, not summaries)
 */
export async function getRealtimeUsageStats(
  tenantId: string,
  periodHours: number = 24,
): Promise<{
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  errorRate: number;
  byTool: Record<
    string,
    { calls: number; tokens: number; cost: number; errors: number }
  >;
}> {
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);

  const events = await prisma.aIUsageEvent.findMany({
    where: {
      tenantId,
      createdAt: { gte: since },
    },
    select: {
      toolId: true,
      totalTokens: true,
      estimatedCost: true,
      latencyMs: true,
      success: true,
    },
  });

  const byTool: Record<
    string,
    { calls: number; tokens: number; cost: number; errors: number }
  > = {};
  let totalLatency = 0;
  let errorCount = 0;

  for (const event of events) {
    if (!byTool[event.toolId]) {
      byTool[event.toolId] = { calls: 0, tokens: 0, cost: 0, errors: 0 };
    }
    byTool[event.toolId].calls++;
    byTool[event.toolId].tokens += event.totalTokens;
    byTool[event.toolId].cost += Number(event.estimatedCost);
    if (!event.success) {
      byTool[event.toolId].errors++;
      errorCount++;
    }
    totalLatency += event.latencyMs;
  }

  const totalCalls = events.length;
  const totalTokens = events.reduce((sum, e) => sum + e.totalTokens, 0);
  const totalCost = events.reduce((sum, e) => sum + Number(e.estimatedCost), 0);

  return {
    totalCalls,
    totalTokens,
    totalCost,
    avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    errorRate: totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0,
    byTool,
  };
}

// ============================================================================
// COST BREAKDOWN
// ============================================================================

/**
 * Get AI cost breakdown by tenant
 */
export async function getAICostBreakdown(
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<AIUsageCostBreakdown> {
  const events = await prisma.aIUsageEvent.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      toolId: true,
      toolName: true,
      totalTokens: true,
      estimatedCost: true,
      createdAt: true,
    },
  });

  // Aggregate by tool
  const toolStats: Record<
    string,
    { name: string; cost: number; tokens: number; calls: number }
  > = {};
  let totalCost = 0;
  let totalTokens = 0;

  for (const event of events) {
    if (!toolStats[event.toolId]) {
      toolStats[event.toolId] = {
        name: event.toolName,
        cost: 0,
        tokens: 0,
        calls: 0,
      };
    }
    const cost = Number(event.estimatedCost);
    toolStats[event.toolId].cost += cost;
    toolStats[event.toolId].tokens += event.totalTokens;
    toolStats[event.toolId].calls++;
    totalCost += cost;
    totalTokens += event.totalTokens;
  }

  // Convert to array with percentages
  const byTool = Object.entries(toolStats)
    .map(([toolId, stats]) => ({
      toolId,
      toolName: stats.name,
      cost: stats.cost,
      tokens: stats.tokens,
      calls: stats.calls,
      percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Aggregate by day
  const dayStats: Record<
    string,
    { cost: number; tokens: number; calls: number }
  > = {};
  for (const event of events) {
    const day = event.createdAt.toISOString().split('T')[0];
    if (!dayStats[day]) {
      dayStats[day] = { cost: 0, tokens: 0, calls: 0 };
    }
    dayStats[day].cost += Number(event.estimatedCost);
    dayStats[day].tokens += event.totalTokens;
    dayStats[day].calls++;
  }

  const byDay = Object.entries(dayStats)
    .map(([date, stats]) => ({
      date,
      cost: stats.cost,
      tokens: stats.tokens,
      calls: stats.calls,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    tenantId,
    totalCost,
    totalTokens,
    totalCalls: events.length,
    byTool,
    byDay,
  };
}

/**
 * Get cost breakdown across all tenants (admin view)
 */
export async function getGlobalCostBreakdown(
  startDate: Date,
  endDate: Date,
): Promise<
  Array<{
    tenantId: string;
    tenantName: string;
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
  }>
> {
  const results = await prisma.aIUsageEvent.groupBy({
    by: ['tenantId'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      totalTokens: true,
      estimatedCost: true,
    },
    _count: true,
  });

  // Get tenant names
  const tenantIds = results.map((r) => r.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true },
  });
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  return results
    .map((r) => ({
      tenantId: r.tenantId,
      tenantName: tenantMap.get(r.tenantId) || 'Unknown',
      totalCost: Number(r._sum.estimatedCost || 0),
      totalTokens: r._sum.totalTokens || 0,
      totalCalls: r._count,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}

// ============================================================================
// USAGE TRENDS
// ============================================================================

/**
 * Get usage trends for a specific tool
 */
export async function getAIUsageTrends(
  tenantId: string,
  toolId: string,
  days: number = 30,
): Promise<AIUsageTrends> {
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.aIUsageEvent.findMany({
    where: {
      tenantId,
      toolId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalTokens: true,
      estimatedCost: true,
      latencyMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Aggregate by day
  const dayStats: Record<
    string,
    { cost: number; tokens: number; calls: number; latencySum: number }
  > = {};

  for (const event of events) {
    const day = event.createdAt.toISOString().split('T')[0];
    if (!dayStats[day]) {
      dayStats[day] = { cost: 0, tokens: 0, calls: 0, latencySum: 0 };
    }
    dayStats[day].cost += Number(event.estimatedCost);
    dayStats[day].tokens += event.totalTokens;
    dayStats[day].calls++;
    dayStats[day].latencySum += event.latencyMs;
  }

  const dataPoints: AIUsageTrendPoint[] = Object.entries(dayStats)
    .map(([date, stats]) => ({
      date,
      cost: stats.cost,
      tokens: stats.tokens,
      calls: stats.calls,
      avgLatencyMs:
        stats.calls > 0 ? Math.round(stats.latencySum / stats.calls) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate trend
  const totalCost = dataPoints.reduce((sum, p) => sum + p.cost, 0);
  const totalTokens = dataPoints.reduce((sum, p) => sum + p.tokens, 0);
  const totalCalls = dataPoints.reduce((sum, p) => sum + p.calls, 0);
  const avgDailyCost =
    dataPoints.length > 0 ? totalCost / dataPoints.length : 0;

  // Compare first half to second half for trend
  const midpoint = Math.floor(dataPoints.length / 2);
  const firstHalfCost = dataPoints
    .slice(0, midpoint)
    .reduce((sum, p) => sum + p.cost, 0);
  const secondHalfCost = dataPoints
    .slice(midpoint)
    .reduce((sum, p) => sum + p.cost, 0);

  let costTrend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  let costTrendPercentage = 0;

  if (firstHalfCost > 0 && secondHalfCost > 0) {
    costTrendPercentage =
      ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100;
    if (costTrendPercentage > 10) costTrend = 'UP';
    else if (costTrendPercentage < -10) costTrend = 'DOWN';
  }

  const toolDef = AI_TOOLS[toolId as AIToolId];

  return {
    toolId,
    toolName: toolDef?.name || toolId,
    period: { start: startDate, end: endDate },
    dataPoints,
    summary: {
      totalCost,
      totalTokens,
      totalCalls,
      avgDailyCost,
      costTrend,
      costTrendPercentage,
    },
  };
}

// ============================================================================
// AGGREGATION JOBS
// ============================================================================

/**
 * Aggregate hourly usage into summaries
 * Should be called by a scheduled job every hour
 */
export async function aggregateHourlyUsage(): Promise<void> {
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  const hourEnd = new Date(hourStart);
  hourEnd.setHours(hourEnd.getHours() + 1);

  // Get all events from the previous hour
  const previousHourStart = new Date(hourStart);
  previousHourStart.setHours(previousHourStart.getHours() - 1);

  logger.info('Aggregating AI usage for hour', {
    start: previousHourStart.toISOString(),
    end: hourStart.toISOString(),
  });

  // Group by tenant and tool
  const aggregations = await prisma.aIUsageEvent.groupBy({
    by: ['tenantId', 'toolId'],
    where: {
      createdAt: {
        gte: previousHourStart,
        lt: hourStart,
      },
    },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      estimatedCost: true,
      latencyMs: true,
    },
    _count: true,
    _avg: {
      latencyMs: true,
    },
  });

  // Get success/failure counts
  for (const agg of aggregations) {
    const successCount = await prisma.aIUsageEvent.count({
      where: {
        tenantId: agg.tenantId,
        toolId: agg.toolId,
        createdAt: { gte: previousHourStart, lt: hourStart },
        success: true,
      },
    });

    // Calculate p95 latency
    const latencies = await prisma.aIUsageEvent.findMany({
      where: {
        tenantId: agg.tenantId,
        toolId: agg.toolId,
        createdAt: { gte: previousHourStart, lt: hourStart },
      },
      select: { latencyMs: true },
      orderBy: { latencyMs: 'asc' },
    });

    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    const p95Latency = latencies[p95Index]?.latencyMs || 0;
    const p99Latency = latencies[p99Index]?.latencyMs || 0;

    // Upsert the summary
    await prisma.aIUsageSummary.upsert({
      where: {
        tenantId_periodStart_periodType_toolId: {
          tenantId: agg.tenantId,
          periodStart: previousHourStart,
          periodType: AIUsagePeriodType.HOURLY,
          toolId: agg.toolId,
        },
      },
      update: {
        totalCalls: agg._count,
        successfulCalls: successCount,
        failedCalls: agg._count - successCount,
        totalPromptTokens: agg._sum.promptTokens || 0,
        totalCompletionTokens: agg._sum.completionTokens || 0,
        totalTokens: agg._sum.totalTokens || 0,
        totalCost: agg._sum.estimatedCost || new Prisma.Decimal(0),
        avgLatencyMs: Math.round(agg._avg.latencyMs || 0),
        p95LatencyMs: p95Latency,
        p99LatencyMs: p99Latency,
      },
      create: {
        tenantId: agg.tenantId,
        periodStart: previousHourStart,
        periodEnd: hourStart,
        periodType: AIUsagePeriodType.HOURLY,
        toolId: agg.toolId,
        totalCalls: agg._count,
        successfulCalls: successCount,
        failedCalls: agg._count - successCount,
        totalPromptTokens: agg._sum.promptTokens || 0,
        totalCompletionTokens: agg._sum.completionTokens || 0,
        totalTokens: agg._sum.totalTokens || 0,
        totalCost: agg._sum.estimatedCost || new Prisma.Decimal(0),
        avgLatencyMs: Math.round(agg._avg.latencyMs || 0),
        p95LatencyMs: p95Latency,
        p99LatencyMs: p99Latency,
      },
    });
  }

  logger.info('AI usage aggregation complete', {
    summariesCreated: aggregations.length,
  });
}

/**
 * Aggregate daily usage from hourly summaries
 * Should be called by a scheduled job daily at midnight
 */
export async function aggregateDailyUsage(): Promise<void> {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  // Get yesterday's boundaries
  const previousDayStart = new Date(dayStart);
  previousDayStart.setDate(previousDayStart.getDate() - 1);
  const previousDayEnd = dayStart;

  logger.info('Aggregating daily AI usage', {
    start: previousDayStart.toISOString(),
    end: previousDayEnd.toISOString(),
  });

  // Get hourly summaries for the previous day
  const hourlySummaries = await prisma.aIUsageSummary.findMany({
    where: {
      periodType: AIUsagePeriodType.HOURLY,
      periodStart: {
        gte: previousDayStart,
        lt: previousDayEnd,
      },
    },
  });

  // Group by tenant and tool
  const dailyAggs: Record<
    string,
    {
      tenantId: string;
      toolId: string;
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      totalPromptTokens: number;
      totalCompletionTokens: number;
      totalTokens: number;
      totalCost: number;
      latencySum: number;
      latencies: number[];
    }
  > = {};

  for (const summary of hourlySummaries) {
    const key = `${summary.tenantId}:${summary.toolId}`;
    if (!dailyAggs[key]) {
      dailyAggs[key] = {
        tenantId: summary.tenantId,
        toolId: summary.toolId,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        latencySum: 0,
        latencies: [],
      };
    }

    dailyAggs[key].totalCalls += summary.totalCalls;
    dailyAggs[key].successfulCalls += summary.successfulCalls;
    dailyAggs[key].failedCalls += summary.failedCalls;
    dailyAggs[key].totalPromptTokens += summary.totalPromptTokens;
    dailyAggs[key].totalCompletionTokens += summary.totalCompletionTokens;
    dailyAggs[key].totalTokens += summary.totalTokens;
    dailyAggs[key].totalCost += Number(summary.totalCost);
    dailyAggs[key].latencySum += summary.avgLatencyMs * summary.totalCalls;
    // Add p95 for later calculation
    if (summary.p95LatencyMs > 0) {
      dailyAggs[key].latencies.push(summary.p95LatencyMs);
    }
  }

  // Create daily summaries
  for (const agg of Object.values(dailyAggs)) {
    const avgLatency =
      agg.totalCalls > 0 ? Math.round(agg.latencySum / agg.totalCalls) : 0;

    // Approximate p95 from hourly p95s
    agg.latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(agg.latencies.length * 0.95);
    const p99Index = Math.floor(agg.latencies.length * 0.99);

    await prisma.aIUsageSummary.upsert({
      where: {
        tenantId_periodStart_periodType_toolId: {
          tenantId: agg.tenantId,
          periodStart: previousDayStart,
          periodType: AIUsagePeriodType.DAILY,
          toolId: agg.toolId,
        },
      },
      update: {
        totalCalls: agg.totalCalls,
        successfulCalls: agg.successfulCalls,
        failedCalls: agg.failedCalls,
        totalPromptTokens: agg.totalPromptTokens,
        totalCompletionTokens: agg.totalCompletionTokens,
        totalTokens: agg.totalTokens,
        totalCost: new Prisma.Decimal(agg.totalCost),
        avgLatencyMs: avgLatency,
        p95LatencyMs: agg.latencies[p95Index] || 0,
        p99LatencyMs: agg.latencies[p99Index] || 0,
      },
      create: {
        tenantId: agg.tenantId,
        periodStart: previousDayStart,
        periodEnd: previousDayEnd,
        periodType: AIUsagePeriodType.DAILY,
        toolId: agg.toolId,
        totalCalls: agg.totalCalls,
        successfulCalls: agg.successfulCalls,
        failedCalls: agg.failedCalls,
        totalPromptTokens: agg.totalPromptTokens,
        totalCompletionTokens: agg.totalCompletionTokens,
        totalTokens: agg.totalTokens,
        totalCost: new Prisma.Decimal(agg.totalCost),
        avgLatencyMs: avgLatency,
        p95LatencyMs: agg.latencies[p95Index] || 0,
        p99LatencyMs: agg.latencies[p99Index] || 0,
      },
    });
  }

  logger.info('Daily AI usage aggregation complete', {
    summariesCreated: Object.keys(dailyAggs).length,
  });
}

// ============================================================================
// COST THRESHOLD CHECKS
// ============================================================================

/**
 * Check if any tenant has exceeded cost thresholds
 */
export async function checkCostThresholds(): Promise<
  Array<{
    tenantId: string;
    tenantName: string;
    monthlyCost: number;
    threshold: 'WARNING' | 'CRITICAL';
    thresholdValue: number;
  }>
> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const costsByTenant = await getGlobalCostBreakdown(monthStart, now);
  const alerts: Array<{
    tenantId: string;
    tenantName: string;
    monthlyCost: number;
    threshold: 'WARNING' | 'CRITICAL';
    thresholdValue: number;
  }> = [];

  for (const tenant of costsByTenant) {
    if (tenant.totalCost >= AI_COST_THRESHOLDS.criticalMonthly) {
      alerts.push({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        monthlyCost: tenant.totalCost,
        threshold: 'CRITICAL',
        thresholdValue: AI_COST_THRESHOLDS.criticalMonthly,
      });
    } else if (tenant.totalCost >= AI_COST_THRESHOLDS.warningMonthly) {
      alerts.push({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        monthlyCost: tenant.totalCost,
        threshold: 'WARNING',
        thresholdValue: AI_COST_THRESHOLDS.warningMonthly,
      });
    }
  }

  return alerts;
}

/**
 * Get monthly cost summary for system overview
 */
export async function getMonthlySystemCost(): Promise<{
  currentMonth: {
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
    projectedMonthEnd: number;
  };
  previousMonth: {
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
  };
  trend: {
    direction: 'UP' | 'DOWN' | 'STABLE';
    percentage: number;
  };
  thresholds: {
    warning: number;
    critical: number;
    status: 'OK' | 'WARNING' | 'CRITICAL';
  };
}> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Current month stats
  const currentEvents = await prisma.aIUsageEvent.aggregate({
    where: {
      createdAt: { gte: currentMonthStart },
    },
    _sum: {
      totalTokens: true,
      estimatedCost: true,
    },
    _count: true,
  });

  // Previous month stats
  const previousEvents = await prisma.aIUsageEvent.aggregate({
    where: {
      createdAt: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
    },
    _sum: {
      totalTokens: true,
      estimatedCost: true,
    },
    _count: true,
  });

  const currentCost = Number(currentEvents._sum.estimatedCost || 0);
  const previousCost = Number(previousEvents._sum.estimatedCost || 0);

  // Project month-end cost based on current rate
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const dayOfMonth = now.getDate();
  const projectedMonthEnd =
    dayOfMonth > 0 ? (currentCost / dayOfMonth) * daysInMonth : 0;

  // Calculate trend
  let trendDirection: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  let trendPercentage = 0;
  if (previousCost > 0) {
    // Compare projected to previous for fair comparison
    trendPercentage = ((projectedMonthEnd - previousCost) / previousCost) * 100;
    if (trendPercentage > 10) trendDirection = 'UP';
    else if (trendPercentage < -10) trendDirection = 'DOWN';
  }

  // Determine threshold status
  let thresholdStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
  if (currentCost >= AI_COST_THRESHOLDS.criticalMonthly) {
    thresholdStatus = 'CRITICAL';
  } else if (currentCost >= AI_COST_THRESHOLDS.warningMonthly) {
    thresholdStatus = 'WARNING';
  }

  return {
    currentMonth: {
      totalCost: currentCost,
      totalTokens: currentEvents._sum.totalTokens || 0,
      totalCalls: currentEvents._count,
      projectedMonthEnd,
    },
    previousMonth: {
      totalCost: previousCost,
      totalTokens: previousEvents._sum.totalTokens || 0,
      totalCalls: previousEvents._count,
    },
    trend: {
      direction: trendDirection,
      percentage: trendPercentage,
    },
    thresholds: {
      warning: AI_COST_THRESHOLDS.warningMonthly,
      critical: AI_COST_THRESHOLDS.criticalMonthly,
      status: thresholdStatus,
    },
  };
}
