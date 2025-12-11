/**
 * Analytics & Reporting Type Definitions
 */

export type DateRange = {
  start: Date;
  end: Date;
};

export type TimeGranularity =
  | 'HOUR'
  | 'DAY'
  | 'WEEK'
  | 'MONTH'
  | 'QUARTER'
  | 'YEAR';

export type MetricType =
  | 'COUNT'
  | 'SUM'
  | 'AVERAGE'
  | 'MIN'
  | 'MAX'
  | 'PERCENTAGE'
  | 'CURRENCY';

/**
 * Dashboard widget types
 */
export type WidgetType =
  | 'METRIC_CARD'
  | 'LINE_CHART'
  | 'BAR_CHART'
  | 'PIE_CHART'
  | 'FUNNEL'
  | 'TABLE'
  | 'LEADERBOARD'
  | 'HEATMAP';

/**
 * Single metric data point
 */
export interface MetricDataPoint {
  date: Date;
  value: number;
  label?: string;
}

/**
 * Metric definition
 */
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  entity: string;
  aggregation: string;
  filters?: Record<string, unknown>;
  format?: string;
}

/**
 * Dashboard widget configuration
 */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  metrics: string[];
  dateRange?: DateRange;
  granularity?: TimeGranularity;
  filters?: Record<string, unknown>;
  options?: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  defaultDateRange?: DateRange;
  refreshInterval?: number; // seconds
}

/**
 * Report configuration
 */
export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  type: 'STANDARD' | 'CUSTOM';
  entity: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  sortBy?: { column: string; direction: 'ASC' | 'DESC' };
  groupBy?: string[];
  schedule?: ReportSchedule;
}

/**
 * Report column definition
 */
export interface ReportColumn {
  field: string;
  label: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'PERCENTAGE' | 'BOOLEAN';
  aggregation?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  format?: string;
  width?: number;
}

/**
 * Report filter
 */
export interface ReportFilter {
  field: string;
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'CONTAINS'
    | 'GT'
    | 'GTE'
    | 'LT'
    | 'LTE'
    | 'BETWEEN'
    | 'IN';
  value: unknown;
}

/**
 * Report schedule
 */
export interface ReportSchedule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  time: string; // HH:MM
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  recipients: string[];
  format: 'CSV' | 'EXCEL' | 'PDF';
}

/**
 * Sales dashboard metrics
 */
export interface SalesDashboardData {
  pipeline: {
    total: number;
    weighted: number;
    byStage: Array<{ stage: string; count: number; value: number }>;
  };
  deals: {
    open: number;
    won: number;
    lost: number;
    avgDealSize: number;
    winRate: number;
  };
  activities: {
    total: number;
    byType: Array<{ type: string; count: number }>;
    completionRate: number;
  };
  trends: {
    pipelineHistory: MetricDataPoint[];
    dealsClosedHistory: MetricDataPoint[];
    revenueHistory: MetricDataPoint[];
  };
}

/**
 * Activity dashboard metrics
 */
export interface ActivityDashboardData {
  summary: {
    totalActivities: number;
    completedActivities: number;
    overdueActivities: number;
    upcomingActivities: number;
  };
  byType: Array<{ type: string; count: number; percentage: number }>;
  byUser: Array<{ userId: number; userName: string; count: number }>;
  trends: {
    dailyActivities: MetricDataPoint[];
    completionRate: MetricDataPoint[];
  };
}

/**
 * Account dashboard metrics
 */
export interface AccountDashboardData {
  summary: {
    totalAccounts: number;
    customers: number;
    prospects: number;
    avgHealthScore: number;
  };
  byType: Array<{ type: string; count: number }>;
  byIndustry: Array<{ industry: string; count: number }>;
  healthDistribution: Array<{ range: string; count: number }>;
  atRisk: Array<{
    id: number;
    name: string;
    healthScore: number;
    churnRisk: number;
  }>;
}

/**
 * Team dashboard metrics
 */
export interface TeamDashboardData {
  leaderboard: Array<{
    userId: number;
    userName: string;
    dealsWon: number;
    revenue: number;
    activities: number;
    winRate: number;
  }>;
  quotaAttainment: Array<{
    userId: number;
    userName: string;
    target: number;
    actual: number;
    percentage: number;
  }>;
  activityMetrics: Array<{
    userId: number;
    userName: string;
    calls: number;
    emails: number;
    meetings: number;
    tasks: number;
  }>;
}

/**
 * Export format options
 */
export interface ExportOptions {
  format: 'CSV' | 'EXCEL' | 'PDF';
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  currencyFormat?: string;
}
