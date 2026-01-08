/**
 * LLM Service
 *
 * Provides a unified interface for AI/LLM operations across the platform.
 * Wraps the tracked AI client for cost monitoring and usage tracking.
 */

import { env } from '../config/env';
import { ContentType } from '../types/marketing';

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
}

interface LLMCompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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
   * Complete a prompt using the LLM
   */
  async complete(
    prompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || 1000;
    const temperature = options?.temperature ?? 0.7;

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
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature,
          }),
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
      console.error('LLM completion failed:', error);
      throw error;
    }
  }

  /**
   * Complete with system and user messages
   */
  async completeWithSystem(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || 1000;
    const temperature = options?.temperature ?? 0.7;

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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature,
          }),
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
      console.error('LLM completion failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const llmService = new LLMService();

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
