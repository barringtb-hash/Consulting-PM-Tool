/**
 * Usage Metering Type Definitions
 */

export type UsagePeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * Usage event input for tracking
 */
export interface UsageEventInput {
  tenantId: string;
  moduleId: string;
  eventType: string;
  quantity?: number;
  userId?: number;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Usage summary for a period
 */
export interface UsageSummary {
  tenantId: string;
  moduleId: string;
  period: UsagePeriod;
  periodStart: Date;
  periodEnd: Date;
  totalEvents: number;
  totalQuantity: number;
  breakdown: Record<string, number>;
  estimatedCost?: number;
}

/**
 * Usage alert configuration
 */
export interface UsageAlertConfig {
  moduleId: string;
  limitKey: string;
  warningThreshold: number; // 0-100 percentage
  criticalThreshold: number; // 0-100 percentage
  notifyChannels: ('email' | 'in_app' | 'slack')[];
}

/**
 * Usage report options
 */
export interface UsageReportOptions {
  tenantId: string;
  moduleId?: string;
  period: UsagePeriod;
  startDate: Date;
  endDate: Date;
  groupBy?: 'module' | 'user' | 'eventType';
}

/**
 * Usage trend data point
 */
export interface UsageTrendPoint {
  date: Date;
  value: number;
  changePercent?: number;
}

/**
 * Module usage statistics
 */
export interface ModuleUsageStats {
  moduleId: string;
  currentPeriodUsage: Record<string, number>;
  previousPeriodUsage: Record<string, number>;
  trends: Record<string, UsageTrendPoint[]>;
  projectedMonthEnd: Record<string, number>;
  percentOfLimit: Record<string, number>;
}
