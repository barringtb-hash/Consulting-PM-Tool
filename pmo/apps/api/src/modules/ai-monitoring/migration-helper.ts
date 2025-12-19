/**
 * AI Monitoring Migration Helper
 *
 * Provides utilities to help migrate existing AI tool code to use tracked calls.
 * This allows gradual migration without breaking existing functionality.
 *
 * MIGRATION GUIDE:
 *
 * Step 1: Replace direct fetch calls with trackedOpenAIFetch
 *
 * BEFORE:
 * ```typescript
 * const response = await fetch('https://api.openai.com/v1/chat/completions', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     Authorization: `Bearer ${env.openaiApiKey}`,
 *   },
 *   body: JSON.stringify({
 *     model: 'gpt-4o-mini',
 *     messages: [...],
 *   }),
 * });
 * const data = await response.json();
 * ```
 *
 * AFTER:
 * ```typescript
 * import { trackedOpenAIFetch } from '../ai-monitoring';
 *
 * const data = await trackedOpenAIFetch(
 *   {
 *     model: 'gpt-4o-mini',
 *     messages: [...],
 *   },
 *   {
 *     tenantId: getTenantId() || 'default',
 *     toolId: 'chatbot',
 *     operation: 'chat',
 *     userId: req.user?.id,
 *   }
 * );
 * ```
 *
 * Step 2: For new code, use the simpler helpers
 *
 * ```typescript
 * import { simplePrompt, jsonPrompt } from '../ai-monitoring';
 *
 * // Simple text response
 * const { content } = await simplePrompt('Summarize this...', {
 *   tenantId,
 *   toolId: 'content-generator',
 *   operation: 'summarize',
 * });
 *
 * // JSON response with parsing
 * const { data } = await jsonPrompt<{ score: number }>('Score this lead...', {
 *   tenantId,
 *   toolId: 'lead-scoring',
 *   operation: 'score',
 * });
 * ```
 */

import { trackAIUsage } from './ai-usage.service';
import { calculateAICost } from './ai-pricing.config';
import { AIToolId } from './ai-monitoring.types';
import { logger } from '../../utils/logger';

/**
 * Wrap an existing async function that makes AI calls to add tracking
 *
 * This is useful for migrating existing code without rewriting the entire function.
 * The wrapper will track timing but cannot automatically extract token counts
 * from the wrapped function's response.
 *
 * @example
 * ```typescript
 * // Wrap an existing function
 * const trackedGenerateResponse = wrapWithTracking(
 *   generateBotResponse,
 *   'chatbot',
 *   'response-generation'
 * );
 *
 * // Call it with tracking context
 * const response = await trackedGenerateResponse(
 *   { tenantId: 'tenant-123', userId: 1 },
 *   message, config
 * );
 * ```
 */
export function wrapWithTracking<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  toolId: AIToolId | string,
  operation: string,
): (
  context: { tenantId: string; userId?: number },
  ...args: TArgs
) => Promise<TResult> {
  return async (context, ...args) => {
    const startTime = Date.now();
    let success = true;
    let errorType: string | undefined;

    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.name : 'UNKNOWN';
      throw error;
    } finally {
      const latencyMs = Date.now() - startTime;

      // Track with estimated tokens (we can't get actual tokens from wrapped function)
      try {
        await trackAIUsage({
          tenantId: context.tenantId,
          toolId,
          operation,
          model: 'unknown', // Can't determine from wrapped function
          promptTokens: 0, // Can't determine from wrapped function
          completionTokens: 0,
          latencyMs,
          success,
          errorType,
          userId: context.userId,
          metadata: { wrapped: true },
        });
      } catch (trackError) {
        logger.error('Failed to track wrapped AI call', { error: trackError });
      }
    }
  };
}

/**
 * Manual tracking for cases where you want to track after the call
 *
 * @example
 * ```typescript
 * const startTime = Date.now();
 * const response = await existingAICall();
 * const latencyMs = Date.now() - startTime;
 *
 * await manualTrack({
 *   tenantId: 'tenant-123',
 *   toolId: 'chatbot',
 *   operation: 'chat',
 *   model: response.model,
 *   promptTokens: response.usage?.prompt_tokens || 0,
 *   completionTokens: response.usage?.completion_tokens || 0,
 *   latencyMs,
 *   success: true,
 * });
 * ```
 */
export async function manualTrack(params: {
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
}): Promise<void> {
  await trackAIUsage(params);
}

/**
 * Estimate the cost of an AI call before making it
 * Useful for budget checks or user warnings
 */
export function preflightCostEstimate(
  model: string,
  estimatedPromptTokens: number,
  estimatedCompletionTokens: number,
): {
  estimatedCost: number;
  model: string;
  tokens: { prompt: number; completion: number; total: number };
} {
  const estimatedCost = calculateAICost(
    model,
    estimatedPromptTokens,
    estimatedCompletionTokens,
  );

  return {
    estimatedCost,
    model,
    tokens: {
      prompt: estimatedPromptTokens,
      completion: estimatedCompletionTokens,
      total: estimatedPromptTokens + estimatedCompletionTokens,
    },
  };
}

/**
 * List of modules that need to be instrumented
 * Use this to track migration progress
 */
export const MODULES_TO_INSTRUMENT = [
  {
    module: 'chatbot',
    file: 'modules/chatbot/chatbot.service.ts',
    status: 'pending',
  },
  {
    module: 'document-analyzer',
    file: 'modules/document-analyzer/document-analyzer.service.ts',
    status: 'pending',
  },
  {
    module: 'content-generator',
    file: 'modules/content-generator/content-generator.service.ts',
    status: 'pending',
  },
  {
    module: 'lead-scoring',
    file: 'modules/lead-scoring/lead-scoring.service.ts',
    status: 'pending',
  },
  {
    module: 'product-descriptions',
    file: 'modules/product-descriptions/product-description.service.ts',
    status: 'pending',
  },
  {
    module: 'scheduling',
    file: 'modules/scheduling/scheduling.service.ts',
    status: 'pending',
  },
  {
    module: 'intake',
    file: 'modules/intake/intake.service.ts',
    status: 'pending',
  },
  {
    module: 'prior-auth',
    file: 'modules/prior-auth/prior-auth.service.ts',
    status: 'pending',
  },
  {
    module: 'inventory-forecasting',
    file: 'modules/inventory-forecasting/inventory-forecasting.service.ts',
    status: 'pending',
  },
  {
    module: 'compliance-monitor',
    file: 'modules/compliance-monitor/compliance-monitor.service.ts',
    status: 'pending',
  },
  {
    module: 'predictive-maintenance',
    file: 'modules/predictive-maintenance/predictive-maintenance.service.ts',
    status: 'pending',
  },
  {
    module: 'revenue-management',
    file: 'modules/revenue-management/revenue-management.service.ts',
    status: 'pending',
  },
  {
    module: 'safety-monitor',
    file: 'modules/safety-monitor/safety-monitor.service.ts',
    status: 'pending',
  },
  {
    module: 'finance',
    file: 'modules/finance-tracking/ai/*.service.ts',
    status: 'pending',
  },
  { module: 'mcp', file: 'modules/mcp/ai-query.service.ts', status: 'pending' },
] as const;
