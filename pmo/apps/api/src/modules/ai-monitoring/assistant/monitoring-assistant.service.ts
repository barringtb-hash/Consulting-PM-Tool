/**
 * Monitoring Assistant Service
 *
 * Provides AI-powered assistance for monitoring queries.
 * Uses OpenAI to generate natural language responses based on monitoring data.
 */

import { randomUUID } from 'crypto';
import { trackedChatCompletion } from '../ai-client';
import { trackAIUsage } from '../ai-usage.service';
import { logger } from '../../../utils/logger';
import {
  buildAssistantContext,
  detectIntent,
  getSuggestedQueries,
} from './assistant-context.builder';
import {
  AssistantContext,
  AssistantMessage,
  ChatRequest,
  ChatResponse,
  MonitoringAssistantConfig,
  DEFAULT_ASSISTANT_CONFIG,
} from './monitoring-assistant.types';

// ============================================================================
// Conversation Store
// ============================================================================
//
// NOTE: This is an in-memory implementation with the following limitations:
// - Conversations are lost on server restart
// - Does not scale horizontally across multiple server instances
// - No persistence guarantee
//
// For production use at scale, consider migrating to:
// - Redis for distributed caching with TTL support
// - Database (PostgreSQL) for persistent conversation history
// - Add proper locking for concurrent access if needed
// ============================================================================

interface StoredConversation {
  id: string;
  tenantId: string;
  userId: number;
  messages: AssistantMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store - suitable for single-instance deployments
const conversationStore = new Map<string, StoredConversation>();

// Cleanup old conversations (older than 24 hours)
setInterval(
  () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, conv] of conversationStore.entries()) {
      if (conv.updatedAt.getTime() < cutoff) {
        conversationStore.delete(id);
      }
    }
  },
  60 * 60 * 1000,
); // Run every hour

// ============================================================================
// System Prompt Builder
// ============================================================================

function buildSystemPrompt(context: AssistantContext): string {
  const parts: string[] = [];

  parts.push(`You are an AI Monitoring Assistant for the ${context.tenantName || 'system'} platform.
Your role is to help users understand their AI usage, diagnose issues, analyze trends, and optimize costs.

## Response Guidelines
- Be concise and actionable
- Use bullet points and structured formatting
- Include specific numbers, percentages, and timestamps
- When diagnosing issues, suggest root causes and next steps
- For cost queries, always mention budget status and trends
- Use markdown formatting for clarity

## Current Time
${context.timestamp.toISOString()}
`);

  // Add AI Usage data
  if (context.currentUsage) {
    const u = context.currentUsage;
    parts.push(`
## AI Usage (Last ${u.period.hours} Hours)
- Total Calls: ${u.totalCalls.toLocaleString()}
- Successful: ${u.successfulCalls.toLocaleString()} (${u.successRate.toFixed(1)}% success rate)
- Failed: ${u.failedCalls.toLocaleString()}
- Total Tokens: ${u.totalTokens.toLocaleString()}
- Total Cost: $${u.totalCost.toFixed(2)}
- Avg Latency: ${u.avgLatencyMs.toFixed(0)}ms
`);
  }

  // Add cost breakdown
  if (context.costBreakdown && context.costBreakdown.length > 0) {
    parts.push(`
## Cost Breakdown by Tool (Last 30 Days)
${context.costBreakdown
  .map(
    (t) =>
      `- ${t.toolName}: $${t.cost.toFixed(2)} (${t.percentage.toFixed(1)}%) - ${t.calls.toLocaleString()} calls`,
  )
  .join('\n')}
`);
  }

  // Add forecast
  if (context.forecast) {
    const f = context.forecast;
    parts.push(`
## Cost Forecast
- Current Month Actual: $${f.currentMonth.actual.toFixed(2)}
- Projected Month-End: $${f.currentMonth.projected.toFixed(2)}
- Days Remaining: ${f.currentMonth.daysRemaining}
- Daily Average: $${f.currentMonth.dailyAverage.toFixed(2)}
- Trend: ${f.trend.direction} (${f.trend.percentage > 0 ? '+' : ''}${f.trend.percentage.toFixed(1)}%)
- Budget Status: ${f.budgetStatus.status.toUpperCase()}
  - Warning Threshold: $${f.budgetStatus.warningThreshold}
  - Critical Threshold: $${f.budgetStatus.criticalThreshold}
`);
  }

  // Add system health
  if (context.systemHealth) {
    const h = context.systemHealth;
    parts.push(`
## System Health
- Memory: ${h.memory.used.toFixed(1)}MB / ${h.memory.total.toFixed(1)}MB (${h.memory.percentage.toFixed(1)}%)
- Event Loop Lag: ${h.eventLoop.lag.toFixed(0)}ms
- Uptime: ${(h.uptime / 3600).toFixed(1)} hours
`);
  }

  // Add API latency
  if (context.apiLatency && context.apiLatency.endpoints.length > 0) {
    const topEndpoints = context.apiLatency.endpoints
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 5);
    parts.push(`
## API Latency (Top Endpoints)
${topEndpoints
  .map(
    (e) =>
      `- ${e.method} ${e.path}: avg ${e.avgMs.toFixed(0)}ms, P95 ${e.p95Ms.toFixed(0)}ms (${e.requestCount} requests)`,
  )
  .join('\n')}
`);
  }

  // Add error rates
  if (context.errorRates && context.errorRates.endpoints.length > 0) {
    const highErrorEndpoints = context.errorRates.endpoints
      .filter((e) => e.errorRate > 1)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
    if (highErrorEndpoints.length > 0) {
      parts.push(`
## Endpoints with Elevated Error Rates
${highErrorEndpoints
  .map(
    (e) =>
      `- ${e.method} ${e.path}: ${e.errorRate.toFixed(1)}% error rate (${e.errorCount}/${e.totalRequests})`,
  )
  .join('\n')}
`);
    }
  }

  // Add anomalies
  if (context.anomalies && context.anomalies.length > 0) {
    parts.push(`
## Active Anomalies (${context.anomalies.length})
${context.anomalies
  .map(
    (a) =>
      `- [${a.severity}] ${a.title}: ${a.description} (detected ${formatTimeAgo(a.detectedAt)})`,
  )
  .join('\n')}
`);
  }

  // Add database metrics
  if (context.databaseMetrics) {
    const db = context.databaseMetrics;
    if (db.slowQueries.length > 0) {
      parts.push(`
## Slow Database Queries (Last ${db.slowQueries.length})
${db.slowQueries
  .slice(0, 5)
  .map((q) => `- ${q.duration.toFixed(0)}ms: ${q.query.substring(0, 100)}...`)
  .join('\n')}
`);
    }
  }

  // Add external services
  if (context.externalServices) {
    const ext = context.externalServices;
    parts.push(`
## External Service Status
- Vercel: ${ext.vercel.status.toUpperCase()} (checked ${formatTimeAgo(ext.vercel.lastCheck)})
- Render: ${ext.render.status.toUpperCase()} (checked ${formatTimeAgo(ext.render.lastCheck)})
- OpenAI: ${ext.openai.status.toUpperCase()} (checked ${formatTimeAgo(ext.openai.lastCheck)})
`);
  }

  // Add alert information
  if (context.activeAlerts && context.activeAlerts.length > 0) {
    parts.push(`
## Active Alert Rules (${context.activeAlerts.length})
${context.activeAlerts
  .map((a) => `- ${a.name}: ${a.condition} [${a.severity}]`)
  .join('\n')}
`);
  }

  // Add tenant trends (if admin)
  if (context.tenantTrends && context.tenantTrends.length > 0) {
    parts.push(`
## Tenant Usage Trends
${context.tenantTrends
  .map(
    (t) =>
      `- ${t.tenantName}: ${t.usage.totalCalls} calls, $${t.usage.totalCost.toFixed(2)} (${t.trend.direction})`,
  )
  .join('\n')}
`);
  }

  return parts.join('\n');
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// Main Chat Function
// ============================================================================

/**
 * Process a chat message from the user
 */
export async function chat(
  tenantId: string,
  userId: number,
  request: ChatRequest,
  config: MonitoringAssistantConfig = DEFAULT_ASSISTANT_CONFIG,
): Promise<ChatResponse> {
  const startTime = Date.now();
  const conversationId = request.conversationId || randomUUID();

  // Get or create conversation
  let conversation = conversationStore.get(conversationId);
  if (!conversation) {
    conversation = {
      id: conversationId,
      tenantId,
      userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    conversationStore.set(conversationId, conversation);
  }

  // Add user message
  const userMessage: AssistantMessage = {
    id: randomUUID(),
    role: 'user',
    content: request.message,
    timestamp: new Date(),
  };
  conversation.messages.push(userMessage);

  // Detect intent
  const intent = detectIntent(request.message);

  // Build context
  const context = await buildAssistantContext(tenantId, intent);

  // Build system prompt
  const systemPrompt = buildSystemPrompt(context);

  // Prepare messages for OpenAI
  const openaiMessages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [{ role: 'system', content: systemPrompt }];

  // Add conversation history (limited to last N messages)
  const historyLimit = config.conversationHistoryLimit;
  const recentMessages = conversation.messages.slice(-historyLimit);
  for (const msg of recentMessages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      openaiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  try {
    // Call OpenAI
    const response = await trackedChatCompletion(
      {
        model: config.model,
        messages: openaiMessages,
        max_tokens: config.maxTokensPerResponse,
        temperature: 0.7,
      },
      {
        tenantId,
        toolId: 'monitoring-assistant',
        operation: 'chat',
        userId,
        metadata: { intent, conversationId },
      },
    );

    const assistantContent =
      response.result.choices[0]?.message?.content ||
      'I apologize, but I could not generate a response.';

    // Create assistant message
    const assistantMessage: AssistantMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
      metadata: {
        intent,
        dataFetched: Object.keys(context).filter(
          (k) => context[k as keyof AssistantContext] !== undefined,
        ),
        tokensUsed: response.usage.totalTokens,
        latencyMs: response.usage.latencyMs,
      },
    };

    // Save to conversation
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();

    // Generate suggested follow-ups
    const suggestedFollowUps = generateFollowUps(intent, context);

    return {
      conversationId,
      message: assistantMessage,
      suggestedFollowUps,
    };
  } catch (error) {
    logger.error('Error in monitoring assistant chat', {
      error,
      tenantId,
      conversationId,
    });

    // Track failed attempt
    await trackAIUsage({
      tenantId,
      toolId: 'monitoring-assistant',
      operation: 'chat',
      model: config.model,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      errorType: error instanceof Error ? error.name : 'Unknown',
      userId,
    });

    // Return error message
    const errorMessage: AssistantMessage = {
      id: randomUUID(),
      role: 'assistant',
      content:
        'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
      timestamp: new Date(),
      metadata: { intent },
    };

    conversation.messages.push(errorMessage);
    conversation.updatedAt = new Date();

    return {
      conversationId,
      message: errorMessage,
      suggestedFollowUps: [
        "What's the system status?",
        'Show me AI usage summary',
      ],
    };
  }
}

/**
 * Generate follow-up suggestions based on intent and context
 */
function generateFollowUps(
  intent: string,
  context: AssistantContext,
): string[] {
  const followUps: string[] = [];

  switch (intent) {
    case 'status_overview':
      followUps.push('Tell me more about the anomalies');
      if (context.forecast?.budgetStatus.status !== 'safe') {
        followUps.push('How can I reduce costs?');
      }
      followUps.push('Show me API performance details');
      break;

    case 'cost_inquiry':
      followUps.push('Which tool is most expensive?');
      followUps.push("What's the cost forecast?");
      followUps.push('How can I optimize spending?');
      break;

    case 'usage_inquiry':
      followUps.push('Show me usage trends');
      followUps.push('Which tools are used most?');
      followUps.push('Compare to last week');
      break;

    case 'issue_diagnosis':
      followUps.push('What caused this issue?');
      followUps.push('Show me similar past issues');
      followUps.push('How can I prevent this?');
      break;

    case 'anomaly_check':
      followUps.push('Show me anomaly details');
      followUps.push('How do I resolve these?');
      followUps.push('What are the alert rules?');
      break;

    default:
      followUps.push("What's the system status?");
      followUps.push('Show me cost breakdown');
      followUps.push('Are there any issues?');
  }

  return followUps.slice(0, 3);
}

/**
 * Get suggested queries for the current state
 */
export async function getSuggestions(tenantId: string) {
  return getSuggestedQueries(tenantId);
}

/**
 * Get conversation history
 */
export function getConversation(
  conversationId: string,
  tenantId: string,
): StoredConversation | null {
  const conversation = conversationStore.get(conversationId);
  if (conversation && conversation.tenantId === tenantId) {
    return conversation;
  }
  return null;
}

/**
 * Get all conversations for a user
 */
export function getUserConversations(
  tenantId: string,
  userId: number,
): StoredConversation[] {
  const conversations: StoredConversation[] = [];
  for (const conv of conversationStore.values()) {
    if (conv.tenantId === tenantId && conv.userId === userId) {
      conversations.push(conv);
    }
  }
  return conversations.sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

/**
 * Clear a conversation
 */
export function clearConversation(
  conversationId: string,
  tenantId: string,
): boolean {
  const conversation = conversationStore.get(conversationId);
  if (conversation && conversation.tenantId === tenantId) {
    conversationStore.delete(conversationId);
    return true;
  }
  return false;
}
