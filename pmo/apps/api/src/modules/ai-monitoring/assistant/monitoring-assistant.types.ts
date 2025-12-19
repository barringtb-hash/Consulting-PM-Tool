/**
 * Monitoring Assistant Types
 *
 * Type definitions for the AI-powered monitoring assistant
 */

import type { AnomalyCategory, AnomalySeverity, AnomalyStatus } from '@prisma/client';

// ============================================================================
// Assistant Message Types
// ============================================================================

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: AssistantIntent;
    dataFetched?: string[];
    tokensUsed?: number;
    latencyMs?: number;
  };
}

export interface AssistantConversation {
  id: string;
  tenantId: string;
  userId: number;
  messages: AssistantMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Intent Classification
// ============================================================================

export type AssistantIntent =
  | 'status_overview' // General system status
  | 'cost_inquiry' // AI cost questions
  | 'usage_inquiry' // Usage statistics
  | 'issue_diagnosis' // Diagnosing problems
  | 'anomaly_check' // Checking for anomalies
  | 'trend_analysis' // Usage/cost trends
  | 'recommendation' // Getting suggestions
  | 'alert_status' // Alert information
  | 'database_status' // Database health and usage
  | 'external_services' // Vercel, Render, OpenAI status
  | 'tenant_trends' // Tenant usage patterns
  | 'performance_inquiry' // API performance questions
  | 'general_question'; // General/other questions

export const INTENT_KEYWORDS: Record<AssistantIntent, string[]> = {
  status_overview: [
    'status',
    'overview',
    'summary',
    'how is',
    'what is going on',
    'health',
    'dashboard',
  ],
  cost_inquiry: [
    'cost',
    'spend',
    'spending',
    'expense',
    'money',
    'budget',
    'price',
    'expensive',
    'cheap',
    'bill',
  ],
  usage_inquiry: [
    'usage',
    'used',
    'using',
    'calls',
    'requests',
    'tokens',
    'how much',
    'how many',
  ],
  issue_diagnosis: [
    'problem',
    'issue',
    'wrong',
    'error',
    'fail',
    'broken',
    'slow',
    'why',
    'investigate',
    'debug',
    'diagnose',
  ],
  anomaly_check: [
    'anomaly',
    'anomalies',
    'unusual',
    'abnormal',
    'spike',
    'alert',
    'warning',
    'critical',
  ],
  trend_analysis: [
    'trend',
    'compare',
    'comparison',
    'week',
    'month',
    'day',
    'over time',
    'history',
    'historical',
    'growth',
  ],
  recommendation: [
    'recommend',
    'suggestion',
    'optimize',
    'improve',
    'reduce',
    'save',
    'should',
    'advice',
    'tip',
    'best practice',
  ],
  alert_status: [
    'alert',
    'alerts',
    'notification',
    'notify',
    'triggered',
    'rule',
    'threshold',
  ],
  database_status: [
    'database',
    'db',
    'postgres',
    'query',
    'queries',
    'connection',
    'pool',
    'slow query',
    'table',
  ],
  external_services: [
    'vercel',
    'render',
    'openai',
    'api',
    'external',
    'service',
    'deployment',
    'deploy',
    'rate limit',
  ],
  tenant_trends: [
    'tenant',
    'customer',
    'user',
    'account',
    'organization',
    'client',
  ],
  performance_inquiry: [
    'performance',
    'latency',
    'response time',
    'p95',
    'p99',
    'percentile',
    'fast',
    'speed',
  ],
  general_question: [],
};

// ============================================================================
// Context Types - Data gathered for assistant
// ============================================================================

export interface RealtimeUsageStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  period: {
    start: Date;
    end: Date;
    hours: number;
  };
}

export interface CostBreakdownItem {
  toolId: string;
  toolName: string;
  cost: number;
  tokens: number;
  calls: number;
  percentage: number;
}

export interface SystemHealthMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  uptime: number;
}

export interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
  };
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>;
  queryStats: {
    avgDuration: number;
    p95Duration: number;
    totalQueries: number;
  };
}

export interface ExternalServiceStatus {
  vercel: {
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    lastCheck: Date;
    deploymentStatus?: string;
    responseTime?: number;
  };
  render: {
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    lastCheck: Date;
    serviceHealth?: string;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  openai: {
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    lastCheck: Date;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    modelsAvailable?: string[];
  };
}

export interface AnomalySummary {
  id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  title: string;
  description: string;
  detectedAt: Date;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface CostForecast {
  currentMonth: {
    actual: number;
    projected: number;
    daysRemaining: number;
    dailyAverage: number;
  };
  nextMonth: {
    projected: number;
    confidence: number;
  };
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
  };
  budgetStatus: {
    warningThreshold: number;
    criticalThreshold: number;
    status: 'safe' | 'warning' | 'critical';
  };
}

export interface TenantUsageTrend {
  tenantId: string;
  tenantName: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    avgDailyCalls: number;
  };
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  healthScore?: number;
}

// ============================================================================
// Assistant Context - Full context for AI response generation
// ============================================================================

export interface AssistantContext {
  tenantId: string;
  tenantName?: string;
  timestamp: Date;
  intent: AssistantIntent;

  // Core monitoring data
  currentUsage?: RealtimeUsageStats;
  costBreakdown?: CostBreakdownItem[];
  systemHealth?: SystemHealthMetrics;
  anomalies?: AnomalySummary[];
  forecast?: CostForecast;

  // Extended monitoring data
  databaseMetrics?: DatabaseMetrics;
  externalServices?: ExternalServiceStatus;
  tenantTrends?: TenantUsageTrend[];

  // Performance data
  apiLatency?: {
    endpoints: Array<{
      path: string;
      method: string;
      avgMs: number;
      p95Ms: number;
      p99Ms: number;
      requestCount: number;
    }>;
  };
  errorRates?: {
    endpoints: Array<{
      path: string;
      method: string;
      errorRate: number;
      totalRequests: number;
      errorCount: number;
    }>;
  };

  // Alert data
  activeAlerts?: Array<{
    id: number;
    name: string;
    condition: string;
    severity: string;
    lastTriggered?: Date;
  }>;
  recentAlertHistory?: Array<{
    alertName: string;
    deliveredAt: Date;
    channel: string;
    status: string;
  }>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ChatRequest {
  message: string;
  conversationId?: string;
  includeContext?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  message: AssistantMessage;
  suggestedFollowUps?: string[];
}

export interface SuggestionsResponse {
  suggestions: string[];
  basedOn: {
    hasAnomalies: boolean;
    hasCostWarning: boolean;
    hasPerformanceIssues: boolean;
  };
}

// ============================================================================
// Configuration
// ============================================================================

export interface MonitoringAssistantConfig {
  maxTokensPerResponse: number;
  conversationHistoryLimit: number;
  enableRecommendations: boolean;
  enableDiagnosis: boolean;
  enableExternalServiceChecks: boolean;
  model: string;
}

export const DEFAULT_ASSISTANT_CONFIG: MonitoringAssistantConfig = {
  maxTokensPerResponse: 2000,
  conversationHistoryLimit: 50,
  enableRecommendations: true,
  enableDiagnosis: true,
  enableExternalServiceChecks: true,
  model: 'gpt-4o-mini',
};
