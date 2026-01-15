/**
 * LLM Service
 *
 * Provides a unified interface for AI/LLM operations across the platform.
 * Wraps the tracked AI client for cost monitoring and usage tracking.
 *
 * Security Features:
 * - Input validation to prevent prompt injection attacks
 * - Maximum prompt length enforcement
 * - Suspicious pattern detection with logging
 * - Automatic sanitization of user-provided content
 */

import { env } from '../config/env';
import { ContentType } from '../types/marketing';
import {
  validatePromptInput,
  escapePromptContent,
  ValidationResult,
} from '../utils/prompt-sanitizer';
import { logger } from '../utils/logger';

interface GenerateContentOptions {
  type: ContentType;
  context: {
    clientName?: string;
    projectName?: string;
    projectDescription?: string;
    meetingTitle?: string;
    meetingNotes?: string;
    decisions?: string;
    industry?: string;
    additionalContext?: string;
  };
  tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
  anonymize?: boolean;
}

interface GeneratedContent {
  title?: string;
  body: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

interface LLMCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  timeout?: number; // Timeout in milliseconds
}

interface LLMCompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Default timeout for LLM calls (25 seconds - fits within serverless limits)
const DEFAULT_LLM_TIMEOUT = 25000;

// Maximum prompt length (approximately 100k characters, ~25k tokens)
const DEFAULT_MAX_PROMPT_LENGTH = 100000;

// Maximum system prompt length (typically shorter than user prompts)
const DEFAULT_MAX_SYSTEM_PROMPT_LENGTH = 20000;

/**
 * Input validation options for LLM calls.
 */
interface InputValidationOptions {
  /** Whether to validate the prompt for injection patterns (default: true) */
  validateInjection?: boolean;
  /** Maximum allowed prompt length (default: 100000) */
  maxPromptLength?: number;
  /** Whether to automatically truncate long prompts (default: true) */
  truncateLongPrompts?: boolean;
  /** Whether to log warnings for suspicious patterns (default: true) */
  logWarnings?: boolean;
  /** Context identifier for logging (e.g., 'content-generation', 'raid-extraction') */
  context?: string;
}

/**
 * Result of validating and processing LLM input.
 */
interface ProcessedInput {
  /** The processed (possibly sanitized/truncated) prompt */
  prompt: string;
  /** Whether the input was modified */
  wasModified: boolean;
  /** Whether suspicious patterns were detected */
  hadSuspiciousPatterns: boolean;
  /** Validation details if rejection occurred */
  validationResult?: ValidationResult;
}

/**
 * LLM Service class providing AI completions
 */
class LLMService {
  private apiKey: string | undefined;
  private defaultModel: string = 'gpt-4o-mini';

  constructor() {
    this.apiKey = env.openaiApiKey;
  }

  /**
   * Check if the LLM service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Validate and process prompt input before sending to LLM.
   * Checks for injection patterns, enforces length limits, and logs warnings.
   *
   * @param input - The raw prompt input
   * @param options - Validation options
   * @returns Processed input with validation details
   */
  private validateInput(
    input: string,
    options: InputValidationOptions = {},
  ): ProcessedInput {
    const {
      validateInjection = true,
      maxPromptLength = DEFAULT_MAX_PROMPT_LENGTH,
      truncateLongPrompts = true,
      logWarnings = true,
      context = 'llm-completion',
    } = options;

    let processedPrompt = input;
    let wasModified = false;
    let hadSuspiciousPatterns = false;
    let validationResult: ValidationResult | undefined;

    // Step 1: Validate for injection patterns if enabled
    if (validateInjection) {
      validationResult = validatePromptInput(input);

      if (!validationResult.isValid) {
        hadSuspiciousPatterns = true;

        if (logWarnings) {
          logger.warn('Suspicious prompt injection pattern detected', {
            context,
            reason: validationResult.reason,
            pattern: validationResult.matchedPattern,
            inputLength: input.length,
            inputPreview: input.slice(0, 200),
          });
        }

        // Note: We log but don't reject by default - the escapePromptContent
        // will sanitize the input. Callers can check hadSuspiciousPatterns
        // if they want stricter behavior.
      }
    }

    // Step 2: Check and handle length limits
    if (processedPrompt.length > maxPromptLength) {
      if (truncateLongPrompts) {
        // Truncate at a word boundary if possible
        const truncated = processedPrompt.slice(0, maxPromptLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');

        if (lastSpaceIndex > maxPromptLength * 0.9) {
          processedPrompt = truncated.slice(0, lastSpaceIndex);
        } else {
          processedPrompt = truncated;
        }

        wasModified = true;

        if (logWarnings) {
          logger.info('Prompt truncated due to length limit', {
            context,
            originalLength: input.length,
            maxLength: maxPromptLength,
            finalLength: processedPrompt.length,
          });
        }
      } else {
        // If truncation is disabled, log error and throw
        logger.error('Prompt exceeds maximum length', undefined, {
          context,
          length: input.length,
          maxLength: maxPromptLength,
        });
        throw new Error(
          `Prompt length (${input.length}) exceeds maximum allowed (${maxPromptLength})`,
        );
      }
    }

    // Step 3: Sanitize the content (escape delimiters, remove control chars)
    const sanitized = escapePromptContent(processedPrompt, {
      escapeJson: false, // Don't escape JSON chars - the API handles this
      neutralizeDelimiters: true,
      removeControlChars: true,
    });

    if (sanitized !== processedPrompt) {
      wasModified = true;
    }

    return {
      prompt: sanitized,
      wasModified,
      hadSuspiciousPatterns,
      validationResult,
    };
  }

  /**
   * Complete a prompt using the LLM
   *
   * @param prompt - The user prompt to complete
   * @param options - Completion options (model, tokens, temperature, timeout)
   * @param validationOptions - Input validation options
   * @returns The LLM completion result
   */
  async complete(
    prompt: string,
    options?: LLMCompletionOptions,
    validationOptions?: InputValidationOptions,
  ): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Validate and sanitize input
    const processed = this.validateInput(prompt, {
      context: validationOptions?.context ?? 'complete',
      ...validationOptions,
    });

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || 1000;
    const temperature = options?.temperature ?? 0.7;
    const timeout = options?.timeout ?? DEFAULT_LLM_TIMEOUT;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: processed.prompt }],
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      return {
        content: choice.message.content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${timeout}ms`);
      }
      logger.error('LLM completion failed', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Complete with system and user messages.
   * Both prompts are validated for injection patterns and length limits.
   *
   * @param systemPrompt - The system prompt defining assistant behavior
   * @param userPrompt - The user prompt with the actual request
   * @param options - Completion options (model, tokens, temperature, timeout)
   * @param validationOptions - Input validation options
   * @returns The LLM completion result
   */
  async completeWithSystem(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCompletionOptions,
    validationOptions?: InputValidationOptions,
  ): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Validate system prompt (typically more trusted, but still validate)
    // System prompts usually come from code, so we're less strict but still check length
    const processedSystem = this.validateInput(systemPrompt, {
      context: validationOptions?.context
        ? `${validationOptions.context}-system`
        : 'completeWithSystem-system',
      maxPromptLength: DEFAULT_MAX_SYSTEM_PROMPT_LENGTH,
      validateInjection: false, // System prompts come from code, not user input
      ...validationOptions,
    });

    // Validate user prompt (may contain user-provided content)
    const processedUser = this.validateInput(userPrompt, {
      context: validationOptions?.context
        ? `${validationOptions.context}-user`
        : 'completeWithSystem-user',
      ...validationOptions,
    });

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || 1000;
    const temperature = options?.temperature ?? 0.7;
    const timeout = options?.timeout ?? DEFAULT_LLM_TIMEOUT;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: processedSystem.prompt },
              { role: 'user', content: processedUser.prompt },
            ],
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      return {
        content: choice.message.content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${timeout}ms`);
      }
      logger.error('LLM completion with system prompt failed', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Singleton instance
export const llmService = new LLMService();

// Export validation types for use by other modules
export type { InputValidationOptions };

// ============================================================================
// LEGACY MARKETING CONTENT GENERATION
// ============================================================================

function anonymizeContext(
  context: GenerateContentOptions['context'],
): GenerateContentOptions['context'] {
  return {
    ...context,
    clientName: context.clientName ? 'Client' : undefined,
    projectName: context.projectName ? 'Project' : undefined,
  };
}

function generatePlaceholderContent(
  type: ContentType,
  context: GenerateContentOptions['context'],
): GeneratedContent {
  const placeholders: Record<ContentType, GeneratedContent> = {
    CASE_STUDY: {
      title: `Success Story: ${context.projectName || 'Client Project'}`,
      body: `This case study showcases the successful implementation of ${context.projectDescription || 'a transformative solution'}. The project demonstrated significant improvements in efficiency and outcomes.`,
      summary: 'A comprehensive case study highlighting project success.',
    },
    BLOG_POST: {
      title: `Insights from ${context.projectName || 'Our Recent Project'}`,
      body: `Our team recently completed an exciting project that provided valuable insights into ${context.industry || 'industry'} best practices...`,
      summary: 'Key learnings and best practices from our project work.',
    },
    LINKEDIN_POST: {
      body: `🚀 Excited to share insights from our latest ${context.projectName || 'project'}! Key takeaways on delivering value in ${context.industry || 'consulting'}. #Consulting #Success`,
    },
    TWITTER_POST: {
      body: `Just wrapped up an amazing ${context.projectName || 'project'}! 🎉 Key lesson: focus on what matters most to your clients. #ConsultingLife`,
    },
    WHITEPAPER: {
      title: `Best Practices in ${context.industry || 'Consulting'}`,
      body: `This white paper explores key methodologies and frameworks for delivering successful consulting engagements...`,
      summary: 'A comprehensive guide to consulting best practices.',
    },
    NEWSLETTER: {
      title: 'Monthly Consulting Insights',
      body: `This month, we explore trends and insights from our consulting practice...`,
      summary: 'Monthly newsletter with consulting insights.',
    },
    EMAIL_TEMPLATE: {
      title: `Follow-up: ${context.meetingTitle || 'Our Discussion'}`,
      body: `Thank you for your time during our recent meeting. As discussed...`,
      summary: 'Follow-up email from meeting.',
    },
    SOCIAL_STORY: {
      body: `Latest updates from ${context.projectName || 'our project'}...`,
      summary: 'Social story content.',
    },
    VIDEO_SCRIPT: {
      title: `Video: ${context.projectName || 'Project Highlights'}`,
      body: `Welcome to our video highlighting the key aspects of ${context.projectName || 'our recent project'}...`,
      summary: 'Video script content.',
    },
    OTHER: {
      body: 'Content generation placeholder.',
    },
  };

  return placeholders[type] || { body: 'Content generation placeholder.' };
}

/**
 * Generate marketing content using OpenAI API
 */
export const generateMarketingContent = async (
  options: GenerateContentOptions,
): Promise<GeneratedContent> => {
  const {
    type,
    context,
    tone = 'professional',
    length = 'medium',
    anonymize = true,
  } = options;

  const anonymizedContext = anonymize
    ? anonymizeContext(context)
    : { ...context };

  if (!env.openaiApiKey) {
    return generatePlaceholderContent(type, anonymizedContext);
  }

  const lengthGuide = {
    short: '100-200 words',
    medium: '300-500 words',
    long: '800-1200 words',
  };

  const typePrompts: Record<ContentType, string> = {
    CASE_STUDY: 'a professional case study',
    BLOG_POST: 'an engaging blog post',
    LINKEDIN_POST: 'a LinkedIn post (under 300 characters)',
    TWITTER_POST: 'a Twitter/X post (under 280 characters)',
    WHITEPAPER: 'a formal white paper section',
    NEWSLETTER: 'a newsletter article',
    EMAIL_TEMPLATE: 'a professional follow-up email',
    SOCIAL_STORY: 'a social media story',
    VIDEO_SCRIPT: 'a video script',
    OTHER: 'professional content',
  };

  const prompt = `Write ${typePrompts[type]} with a ${tone} tone.

Context:
- Project: ${anonymizedContext.projectName || 'Recent consulting engagement'}
- Industry: ${anonymizedContext.industry || 'Professional services'}
- Description: ${anonymizedContext.projectDescription || 'A successful project implementation'}
${anonymizedContext.meetingTitle ? `- Meeting: ${anonymizedContext.meetingTitle}` : ''}
${anonymizedContext.meetingNotes ? `- Notes: ${anonymizedContext.meetingNotes}` : ''}
${anonymizedContext.decisions ? `- Decisions: ${anonymizedContext.decisions}` : ''}
${anonymizedContext.additionalContext ? `- Additional context: ${anonymizedContext.additionalContext}` : ''}

Requirements:
- Length: ${lengthGuide[length]}
- Focus on value delivered and key outcomes
- Include a compelling title if applicable
- Maintain professional standards

Return in JSON format:
{
  "title": "Title if applicable",
  "body": "Main content",
  "summary": "Brief summary"
}`;

  try {
    const result = await llmService.complete(prompt, {
      maxTokens: length === 'long' ? 2000 : length === 'medium' ? 1000 : 500,
      temperature: 0.7,
    });

    return JSON.parse(result.content);
  } catch {
    return generatePlaceholderContent(type, anonymizedContext);
  }
};
