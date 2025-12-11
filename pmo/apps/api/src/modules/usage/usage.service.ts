/**
 * Usage Metering Service
 *
 * Tracks API calls, feature usage, and resource consumption
 * for billing and analytics purposes.
 */

import { prisma } from '../../prisma/client';
import type {
  UsageEventInput,
  UsageSummary,
  UsagePeriod,
  UsageReportOptions,
  ModuleUsageStats,
  UsageTrendPoint,
} from './usage.types';

// Type for JSON fields compatible with Prisma
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ============================================================================
// USAGE EVENT TRACKING
// ============================================================================

/**
 * Track a usage event.
 */
export async function trackUsage(params: UsageEventInput): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      tenantId: params.tenantId,
      moduleId: params.moduleId,
      eventType: params.eventType,
      quantity: params.quantity || 1,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as JsonValue | undefined,
    },
  });

  // Check usage limits and trigger alerts if needed
  await checkUsageLimitsAndNotify(params.tenantId, params.moduleId);
}

/**
 * Track multiple usage events in bulk.
 */
export async function trackUsageBulk(events: UsageEventInput[]): Promise<void> {
  if (events.length === 0) return;

  await prisma.usageEvent.createMany({
    data: events.map((e) => ({
      tenantId: e.tenantId,
      moduleId: e.moduleId,
      eventType: e.eventType,
      quantity: e.quantity || 1,
      userId: e.userId,
      entityType: e.entityType,
      entityId: e.entityId,
      metadata: e.metadata as JsonValue | undefined,
    })),
  });
}

// ============================================================================
// USAGE SUMMARIES
// ============================================================================

/**
 * Get usage summary for a period.
 */
export async function getUsageSummary(
  tenantId: string,
  moduleId: string,
  period: UsagePeriod,
  periodStart: Date,
): Promise<UsageSummary> {
  const periodEnd = getPeriodEnd(periodStart, period);

  const events = await prisma.usageEvent.groupBy({
    by: ['eventType'],
    where: {
      tenantId,
      moduleId,
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    _count: true,
    _sum: {
      quantity: true,
    },
  });

  const breakdown: Record<string, number> = {};
  let totalEvents = 0;
  let totalQuantity = 0;

  for (const event of events) {
    breakdown[event.eventType] = event._sum.quantity || event._count;
    totalEvents += event._count;
    totalQuantity += event._sum.quantity || event._count;
  }

  return {
    tenantId,
    moduleId,
    period,
    periodStart,
    periodEnd,
    totalEvents,
    totalQuantity,
    breakdown,
  };
}

/**
 * Get usage summaries for all modules of a tenant.
 */
export async function getAllModuleUsageSummaries(
  tenantId: string,
  period: UsagePeriod,
  periodStart: Date,
): Promise<UsageSummary[]> {
  const periodEnd = getPeriodEnd(periodStart, period);

  const events = await prisma.usageEvent.groupBy({
    by: ['moduleId', 'eventType'],
    where: {
      tenantId,
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    _count: true,
    _sum: {
      quantity: true,
    },
  });

  // Group by module
  const moduleData = new Map<
    string,
    { events: number; quantity: number; breakdown: Record<string, number> }
  >();

  for (const event of events) {
    const existing = moduleData.get(event.moduleId) || {
      events: 0,
      quantity: 0,
      breakdown: {},
    };

    existing.events += event._count;
    existing.quantity += event._sum.quantity || event._count;
    existing.breakdown[event.eventType] = event._sum.quantity || event._count;

    moduleData.set(event.moduleId, existing);
  }

  return Array.from(moduleData.entries()).map(([moduleId, data]) => ({
    tenantId,
    moduleId,
    period,
    periodStart,
    periodEnd,
    totalEvents: data.events,
    totalQuantity: data.quantity,
    breakdown: data.breakdown,
  }));
}

// ============================================================================
// USAGE STATISTICS & TRENDS
// ============================================================================

/**
 * Get detailed usage statistics for a module.
 */
export async function getModuleUsageStats(
  tenantId: string,
  moduleId: string,
): Promise<ModuleUsageStats> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Get current and previous period usage
  const [currentSummary, previousSummary] = await Promise.all([
    getUsageSummary(tenantId, moduleId, 'MONTHLY', currentMonthStart),
    getUsageSummary(tenantId, moduleId, 'MONTHLY', previousMonthStart),
  ]);

  // Get tenant module limits
  const tenantModule = await prisma.tenantModule.findUnique({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
  });

  const usageLimits =
    (tenantModule?.usageLimits as Record<string, number>) || {};

  // Calculate percentage of limits
  const percentOfLimit: Record<string, number> = {};
  for (const [key, limit] of Object.entries(usageLimits)) {
    if (limit === -1) {
      percentOfLimit[key] = 0; // Unlimited
    } else {
      percentOfLimit[key] = Math.round(
        ((currentSummary.breakdown[key] || 0) / limit) * 100,
      );
    }
  }

  // Calculate projected month-end usage
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const projectedMultiplier = daysInMonth / dayOfMonth;

  const projectedMonthEnd: Record<string, number> = {};
  for (const [key, value] of Object.entries(currentSummary.breakdown)) {
    projectedMonthEnd[key] = Math.round(value * projectedMultiplier);
  }

  // Get daily trends for last 30 days
  const trends = await getDailyTrends(tenantId, moduleId, 30);

  return {
    moduleId,
    currentPeriodUsage: currentSummary.breakdown,
    previousPeriodUsage: previousSummary.breakdown,
    trends,
    projectedMonthEnd,
    percentOfLimit,
  };
}

/**
 * Get daily usage trends.
 */
async function getDailyTrends(
  tenantId: string,
  moduleId: string,
  days: number,
): Promise<Record<string, UsageTrendPoint[]>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const events = await prisma.usageEvent.findMany({
    where: {
      tenantId,
      moduleId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      eventType: true,
      quantity: true,
      createdAt: true,
    },
  });

  // Group by eventType and date
  const trendData = new Map<string, Map<string, number>>();

  for (const event of events) {
    const dateKey = event.createdAt.toISOString().split('T')[0];
    const eventType = event.eventType;

    if (!trendData.has(eventType)) {
      trendData.set(eventType, new Map());
    }

    const typeData = trendData.get(eventType)!;
    typeData.set(dateKey, (typeData.get(dateKey) || 0) + event.quantity);
  }

  // Convert to trend points
  const trends: Record<string, UsageTrendPoint[]> = {};

  for (const [eventType, dateData] of trendData.entries()) {
    const points: UsageTrendPoint[] = [];
    let previousValue: number | null = null;

    // Generate all dates in range
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = d.toISOString().split('T')[0];
      const value = dateData.get(dateKey) || 0;

      const point: UsageTrendPoint = {
        date: new Date(d),
        value,
      };

      if (previousValue !== null && previousValue > 0) {
        point.changePercent = Math.round(
          ((value - previousValue) / previousValue) * 100,
        );
      }

      points.push(point);
      previousValue = value;
    }

    trends[eventType] = points;
  }

  return trends;
}

// ============================================================================
// USAGE LIMITS & ALERTS
// ============================================================================

/**
 * Check usage limits and create notifications if thresholds are crossed.
 */
async function checkUsageLimitsAndNotify(
  tenantId: string,
  moduleId: string,
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

  const usageLimits =
    (tenantModule.usageLimits as Record<string, number>) || {};

  // No limits configured
  if (Object.keys(usageLimits).length === 0) return;

  // Calculate current usage from events in the current month
  const periodStart = getCurrentPeriodStart('MONTHLY');
  const usageEvents = await prisma.usageEvent.groupBy({
    by: ['eventType'],
    where: {
      tenantId,
      moduleId,
      createdAt: { gte: periodStart },
    },
    _sum: { quantity: true },
  });

  const currentUsage: Record<string, number> = {};
  for (const event of usageEvents) {
    currentUsage[event.eventType] = event._sum.quantity || 0;
  }

  for (const [key, limit] of Object.entries(usageLimits)) {
    if (limit === -1) continue; // Unlimited

    const used = currentUsage[key] || 0;
    const percentage = (used / limit) * 100;

    // Get tenant owner for notifications
    const tenantOwner = await prisma.tenantUser.findFirst({
      where: {
        tenantId,
        role: 'OWNER',
      },
      select: { userId: true },
    });

    if (!tenantOwner) continue;

    if (percentage >= 100) {
      // Limit reached - create urgent notification
      await createUsageNotification(
        tenantId,
        tenantOwner.userId,
        'USAGE_LIMIT_REACHED',
        `${moduleId} ${key} limit reached`,
        `You've reached your ${key} limit for ${moduleId}. Some features may be restricted.`,
        'URGENT',
      );
    } else if (percentage >= 80) {
      // Approaching limit - create warning notification
      await createUsageNotification(
        tenantId,
        tenantOwner.userId,
        'USAGE_LIMIT_WARNING',
        `${moduleId} approaching ${key} limit`,
        `You've used ${Math.round(percentage)}% of your ${key} limit for ${moduleId}.`,
        'HIGH',
      );
    }
  }
}

/**
 * Create a usage notification.
 */
async function createUsageNotification(
  tenantId: string,
  userId: number,
  type: string,
  title: string,
  message: string,
  priority: string,
): Promise<void> {
  // Check if notification already exists for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.notification.findFirst({
    where: {
      tenantId,
      userId,
      type: type as 'USAGE_LIMIT_WARNING' | 'USAGE_LIMIT_REACHED',
      title,
      createdAt: {
        gte: today,
      },
    },
  });

  if (existing) return; // Don't spam notifications

  await prisma.notification.create({
    data: {
      tenantId,
      userId,
      type: type as 'USAGE_LIMIT_WARNING' | 'USAGE_LIMIT_REACHED',
      title,
      message,
      priority: priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
      channels: ['IN_APP', 'EMAIL'],
      actionUrl: '/settings/billing',
    },
  });
}

// ============================================================================
// USAGE REPORTS
// ============================================================================

/**
 * Generate a usage report.
 */
export async function generateUsageReport(
  options: UsageReportOptions,
): Promise<{
  summary: UsageSummary[];
  details: Array<{
    date: string;
    moduleId: string;
    eventType: string;
    quantity: number;
    userId?: number;
  }>;
}> {
  const { tenantId, moduleId, period, startDate, endDate } = options;

  const whereClause: Record<string, unknown> = {
    tenantId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (moduleId) {
    whereClause.moduleId = moduleId;
  }

  // Get detailed events
  const events = await prisma.usageEvent.findMany({
    where: whereClause,
    select: {
      createdAt: true,
      moduleId: true,
      eventType: true,
      quantity: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Generate summaries based on groupBy
  let summaries: UsageSummary[] = [];

  if (moduleId) {
    summaries = [await getUsageSummary(tenantId, moduleId, period, startDate)];
  } else {
    summaries = await getAllModuleUsageSummaries(tenantId, period, startDate);
  }

  return {
    summary: summaries,
    details: events.map(
      (e: {
        createdAt: Date;
        moduleId: string;
        eventType: string;
        quantity: number;
        userId: number | null;
      }) => ({
        date: e.createdAt.toISOString(),
        moduleId: e.moduleId,
        eventType: e.eventType,
        quantity: e.quantity,
        userId: e.userId || undefined,
      }),
    ),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the end date for a period.
 */
function getPeriodEnd(start: Date, period: UsagePeriod): Date {
  const end = new Date(start);

  switch (period) {
    case 'DAILY':
      end.setDate(end.getDate() + 1);
      break;
    case 'WEEKLY':
      end.setDate(end.getDate() + 7);
      break;
    case 'MONTHLY':
      end.setMonth(end.getMonth() + 1);
      break;
  }

  return end;
}

/**
 * Get the start of the current period.
 */
export function getCurrentPeriodStart(period: UsagePeriod): Date {
  const now = new Date();

  switch (period) {
    case 'DAILY':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'WEEKLY': {
      const day = now.getDay();
      const diff = now.getDate() - day;
      return new Date(now.getFullYear(), now.getMonth(), diff);
    }
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
