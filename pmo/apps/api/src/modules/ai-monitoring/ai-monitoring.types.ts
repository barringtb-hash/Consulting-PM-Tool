/**
 * AI Monitoring Types
 *
 * Type definitions for AI usage tracking and monitoring
 */

import { AIUsagePeriodType } from '@prisma/client';

// ============================================================================
// AI Tool Definitions
// ============================================================================

export const AI_TOOLS = {
  chatbot: {
    id: 'chatbot',
    name: 'AI Chatbot',
    operations: ['chat', 'intent-detection', 'response-generation'],
  },
  'document-analyzer': {
    id: 'document-analyzer',
    name: 'Document Analyzer',
    operations: ['analyze', 'extract', 'classify', 'ocr'],
  },
  'content-generator': {
    id: 'content-generator',
    name: 'Content Generator',
    operations: ['generate', 'rewrite', 'summarize'],
  },
  'lead-scoring': {
    id: 'lead-scoring',
    name: 'Lead Scoring',
    operations: ['score', 'analyze', 'predict'],
  },
  'product-descriptions': {
    id: 'product-descriptions',
    name: 'Product Descriptions',
    operations: ['generate', 'optimize', 'translate'],
  },
  scheduling: {
    id: 'scheduling',
    name: 'Scheduling Assistant',
    operations: ['suggest', 'optimize', 'analyze'],
  },
  intake: {
    id: 'intake',
    name: 'Intelligent Intake',
    operations: ['process', 'extract', 'classify'],
  },
  'prior-auth': {
    id: 'prior-auth',
    name: 'Prior Authorization',
    operations: ['analyze', 'generate', 'verify'],
  },
  'inventory-forecasting': {
    id: 'inventory-forecasting',
    name: 'Inventory Forecasting',
    operations: ['forecast', 'analyze', 'optimize'],
  },
  'compliance-monitor': {
    id: 'compliance-monitor',
    name: 'Compliance Monitor',
    operations: ['scan', 'analyze', 'report'],
  },
  'predictive-maintenance': {
    id: 'predictive-maintenance',
    name: 'Predictive Maintenance',
    operations: ['predict', 'analyze', 'alert'],
  },
  'revenue-management': {
    id: 'revenue-management',
    name: 'Revenue Management',
    operations: ['optimize', 'forecast', 'analyze'],
  },
  'safety-monitor': {
    id: 'safety-monitor',
    name: 'Safety Monitor',
    operations: ['detect', 'analyze', 'alert'],
  },
  finance: {
    id: 'finance',
    name: 'Finance AI',
    operations: ['categorize', 'detect-anomaly', 'forecast', 'insight'],
  },
  mcp: {
    id: 'mcp',
    name: 'MCP AI Query',
    operations: ['query', 'analyze'],
  },
  'customer-success-ml': {
    id: 'customer-success-ml',
    name: 'Customer Success ML',
    operations: ['churn-prediction', 'health-analysis', 'cta-generation'],
  },
} as const;

export type AIToolId = keyof typeof AI_TOOLS;

// ============================================================================
// AI Usage Event Types
// ============================================================================

export interface AIUsageEventInput {
  tenantId: string;
  toolId: AIToolId | string;
  operation: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  userId?: number;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AIUsageEventResult {
  id: string;
  tenantId: string;
  toolId: string;
  toolName: string;
  operation: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  success: boolean;
  createdAt: Date;
}

// ============================================================================
// AI Usage Summary Types
// ============================================================================

export interface AIUsageSummaryFilters {
  tenantId?: string;
  toolId?: string;
  periodType?: AIUsagePeriodType;
  startDate?: Date;
  endDate?: Date;
}

export interface AIUsageSummaryResult {
  toolId: string;
  toolName: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: AIUsagePeriodType;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface AIUsageCostBreakdown {
  tenantId: string;
  tenantName?: string;
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  byTool: Array<{
    toolId: string;
    toolName: string;
    cost: number;
    tokens: number;
    calls: number;
    percentage: number;
  }>;
  byDay?: Array<{
    date: string;
    cost: number;
    tokens: number;
    calls: number;
  }>;
}

export interface AIUsageTrendPoint {
  date: string;
  cost: number;
  tokens: number;
  calls: number;
  avgLatencyMs: number;
}

export interface AIUsageTrends {
  toolId: string;
  toolName: string;
  period: {
    start: Date;
    end: Date;
  };
  dataPoints: AIUsageTrendPoint[];
  summary: {
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
    avgDailyCost: number;
    costTrend: 'UP' | 'DOWN' | 'STABLE';
    costTrendPercentage: number;
  };
}

// ============================================================================
// OpenAI Response Types (for token extraction)
// ============================================================================

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: OpenAIUsage;
}

// ============================================================================
// AI Wrapper Options
// ============================================================================

export interface AICallOptions {
  tenantId: string;
  toolId: AIToolId | string;
  operation: string;
  userId?: number;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  skipTracking?: boolean;
}

export interface TrackedAICallResult<T> {
  result: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    latencyMs: number;
    estimatedCost: number;
  };
}
