/**
 * AI Client Wrapper
 *
 * Provides a tracked wrapper around OpenAI API calls that automatically:
 * - Measures latency
 * - Extracts token usage
 * - Calculates costs
 * - Records usage events
 *
 * Use this instead of calling fetch directly to OpenAI endpoints.
 */

import { env } from '../../config/env';
import { trackAIUsage } from './ai-usage.service';
import { calculateAICost } from './ai-pricing.config';
import {
  AICallOptions,
  TrackedAICallResult,
  OpenAIChatCompletionResponse,
} from './ai-monitoring.types';
import { logger } from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

// ============================================================================
// MAIN TRACKED AI CALL FUNCTION
// ============================================================================

/**
 * Make a tracked call to OpenAI Chat Completions API
 *
 * @example
 * ```typescript
 * const result = await trackedChatCompletion(
 *   {
 *     model: 'gpt-4o-mini',
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *   },
 *   {
 *     tenantId: 'tenant-123',
 *     toolId: 'chatbot',
 *     operation: 'chat',
 *     userId: 1,
 *   }
 * );
 * console.log(result.result.choices[0].message.content);
 * console.log(`Cost: $${result.usage.estimatedCost.toFixed(4)}`);
 * ```
 */
export async function trackedChatCompletion(
  request: ChatCompletionRequest,
  options: AICallOptions
): Promise<TrackedAICallResult<OpenAIChatCompletionResponse>> {
  const startTime = Date.now();
  let success = true;
  let errorType: string | undefined;
  let response: OpenAIChatCompletionResponse | null = null;

  try {
    if (!env.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const fetchResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.openaiApiKey}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.text();
      success = false;
      errorType = `HTTP_${fetchResponse.status}`;
      throw new Error(
        `OpenAI API error: ${fetchResponse.status} - ${errorBody}`
      );
    }

    response = (await fetchResponse.json()) as OpenAIChatCompletionResponse;
  } catch (error) {
    success = false;
    errorType = errorType || (error instanceof Error ? error.name : 'UNKNOWN');
    throw error;
  } finally {
    const latencyMs = Date.now() - startTime;

    // Track usage even on failure (with zero tokens)
    const promptTokens = response?.usage?.prompt_tokens || 0;
    const completionTokens = response?.usage?.completion_tokens || 0;
    const model = response?.model || request.model;

    if (!options.skipTracking) {
      try {
        await trackAIUsage({
          tenantId: options.tenantId,
          toolId: options.toolId,
          operation: options.operation,
          model,
          promptTokens,
          completionTokens,
          latencyMs,
          success,
          errorType,
          userId: options.userId,
          entityType: options.entityType,
          entityId: options.entityId,
          metadata: options.metadata,
        });
      } catch (trackError) {
        // Don't fail the request if tracking fails
        logger.error('Failed to track AI usage', { error: trackError });
      }
    }
  }

  const promptTokens = response?.usage?.prompt_tokens || 0;
  const completionTokens = response?.usage?.completion_tokens || 0;
  const model = response?.model || request.model;
  const estimatedCost = calculateAICost(model, promptTokens, completionTokens);

  return {
    result: response!,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model,
      latencyMs: Date.now() - startTime,
      estimatedCost,
    },
  };
}

/**
 * Simple wrapper that returns just the content string
 * Useful when you only need the response text
 */
export async function trackedChatCompletionSimple(
  request: ChatCompletionRequest,
  options: AICallOptions
): Promise<{ content: string; usage: TrackedAICallResult<OpenAIChatCompletionResponse>['usage'] }> {
  const result = await trackedChatCompletion(request, options);
  const content = result.result.choices[0]?.message?.content || '';
  return { content, usage: result.usage };
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON PATTERNS
// ============================================================================

/**
 * Create a simple prompt completion
 */
export async function simplePrompt(
  prompt: string,
  options: AICallOptions & {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ content: string; usage: TrackedAICallResult<OpenAIChatCompletionResponse>['usage'] }> {
  const messages: ChatCompletionMessage[] = [];

  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  return trackedChatCompletionSimple(
    {
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    },
    options
  );
}

/**
 * JSON-mode completion with parsing
 */
export async function jsonPrompt<T>(
  prompt: string,
  options: AICallOptions & {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ data: T; usage: TrackedAICallResult<OpenAIChatCompletionResponse>['usage'] }> {
  const systemPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\nRespond only with valid JSON.`
    : 'Respond only with valid JSON.';

  const result = await simplePrompt(prompt, {
    ...options,
    systemPrompt,
  });

  // Parse JSON from response
  let data: T;
  try {
    // Handle markdown code blocks
    let jsonStr = result.content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    data = JSON.parse(jsonStr.trim());
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${result.content}`);
  }

  return { data, usage: result.usage };
}

// ============================================================================
// LEGACY WRAPPER FOR GRADUAL MIGRATION
// ============================================================================

/**
 * Drop-in replacement for existing fetch-based OpenAI calls
 *
 * This function matches the signature pattern used in existing code
 * to make migration easier. Use the newer trackedChatCompletion
 * for new code.
 *
 * @example
 * // Before:
 * const response = await fetch('https://api.openai.com/v1/chat/completions', {
 *   method: 'POST',
 *   headers: { Authorization: `Bearer ${apiKey}` },
 *   body: JSON.stringify({ model: 'gpt-4o-mini', messages: [...] })
 * });
 *
 * // After:
 * const response = await trackedOpenAIFetch(
 *   { model: 'gpt-4o-mini', messages: [...] },
 *   { tenantId, toolId: 'chatbot', operation: 'chat' }
 * );
 */
export async function trackedOpenAIFetch(
  body: ChatCompletionRequest,
  options: AICallOptions
): Promise<OpenAIChatCompletionResponse> {
  const result = await trackedChatCompletion(body, options);
  return result.result;
}

// ============================================================================
// TOKEN ESTIMATION (for pre-flight checks)
// ============================================================================

/**
 * Rough token count estimation
 * Uses approximation of ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost before making a call
 */
export function estimateCost(
  model: string,
  promptText: string,
  expectedCompletionTokens: number = 500
): number {
  const promptTokens = estimateTokens(promptText);
  return calculateAICost(model, promptTokens, expectedCompletionTokens);
}

// ============================================================================
// UTILITY: CHECK IF AI IS AVAILABLE
// ============================================================================

/**
 * Check if OpenAI is configured and available
 */
export function isAIAvailable(): boolean {
  return !!env.openaiApiKey;
}
