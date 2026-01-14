/**
 * Content Repurposing Service
 *
 * Converts content between different formats and optimizes for specific platforms.
 * Supports repurposing blog posts to social media, emails to newsletters, etc.
 *
 * @module content-ml/services
 */

import { llmService } from '../../../services/llm.service';
import type {
  ContentType,
  SocialPlatform,
  RepurposeFormat,
  PlatformConstraints,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'gpt-4o-mini';
const REPURPOSE_MAX_TOKENS = 2500;
const PLATFORM_OPTIMIZE_MAX_TOKENS = 1500;
const DEFAULT_TEMPERATURE = 0.5;

/**
 * Platform-specific content constraints and best practices
 */
export const PLATFORM_CONSTRAINTS: Record<SocialPlatform, PlatformConstraints> =
  {
    twitter: {
      characterLimit: 280,
      hashtagLimit: 3,
      supportsImages: true,
      supportsVideos: true,
      supportsLinks: true,
      optimalPostingHours: [9, 12, 17, 20],
      bestPractices: [
        'Keep tweets concise and punchy',
        'Use 1-2 hashtags maximum for engagement',
        'Include a call-to-action when appropriate',
        'Use threads for longer content',
      ],
    },
    linkedin: {
      characterLimit: 3000,
      hashtagLimit: 5,
      supportsImages: true,
      supportsVideos: true,
      supportsLinks: true,
      optimalPostingHours: [8, 10, 12, 17],
      bestPractices: [
        'Start with a hook in the first line',
        'Use line breaks for readability',
        'Include professional insights',
        'End with a question to drive engagement',
      ],
    },
    facebook: {
      characterLimit: 63206,
      hashtagLimit: 3,
      supportsImages: true,
      supportsVideos: true,
      supportsLinks: true,
      optimalPostingHours: [9, 13, 16, 19],
      bestPractices: [
        'Keep posts conversational',
        'Use emojis sparingly',
        'Include visuals when possible',
        'Ask questions to boost engagement',
      ],
    },
    instagram: {
      characterLimit: 2200,
      hashtagLimit: 30,
      supportsImages: true,
      supportsVideos: true,
      supportsLinks: false,
      optimalPostingHours: [6, 11, 14, 19],
      bestPractices: [
        'Lead with an engaging caption',
        'Use relevant hashtags (15-20 optimal)',
        'Include call-to-action in bio',
        'Use line breaks and emojis for visual appeal',
      ],
    },
    tiktok: {
      characterLimit: 2200,
      hashtagLimit: 5,
      supportsImages: false,
      supportsVideos: true,
      supportsLinks: false,
      optimalPostingHours: [7, 12, 15, 19, 21],
      bestPractices: [
        'Hook viewers in the first 3 seconds',
        'Use trending sounds and hashtags',
        'Keep content authentic and relatable',
        'End with a clear CTA',
      ],
    },
    youtube: {
      characterLimit: 5000,
      hashtagLimit: 15,
      supportsImages: true,
      supportsVideos: true,
      supportsLinks: true,
      optimalPostingHours: [12, 15, 18],
      bestPractices: [
        'Front-load keywords in title and description',
        'Include timestamps for longer videos',
        'Use compelling thumbnails',
        'End screens and cards for engagement',
      ],
    },
    pinterest: {
      characterLimit: 500,
      hashtagLimit: 20,
      supportsImages: true,
      supportsVideos: true,
      supportsLinks: true,
      optimalPostingHours: [14, 20, 21],
      bestPractices: [
        'Use vertical images (2:3 ratio)',
        'Include keywords in descriptions',
        'Create actionable, helpful content',
        'Link to relevant landing pages',
      ],
    },
    threads: {
      characterLimit: 500,
      hashtagLimit: 5,
      supportsImages: true,
      supportsVideos: true,
      supportsLinks: true,
      optimalPostingHours: [9, 12, 18],
      bestPractices: [
        'Keep content conversational',
        'Engage with replies',
        'Share personal insights',
        'Use minimal hashtags',
      ],
    },
  };

/**
 * Content type to format mappings
 */
const CONTENT_TYPE_TO_FORMATS: Record<ContentType, RepurposeFormat[]> = {
  blog_post: [
    'twitter_thread',
    'linkedin_post',
    'instagram_carousel',
    'email_newsletter',
    'podcast_episode',
  ],
  social_post: ['blog_summary', 'email_newsletter'],
  email: ['linkedin_post', 'blog_summary'],
  newsletter: [
    'blog_post',
    'twitter_thread',
    'linkedin_post',
  ] as unknown as RepurposeFormat[],
  video_script: ['blog_summary', 'twitter_thread', 'podcast_episode'],
  podcast_outline: ['blog_summary', 'twitter_thread', 'youtube_short'],
  infographic: ['twitter_thread', 'instagram_carousel', 'linkedin_post'],
  whitepaper: ['blog_summary', 'linkedin_post', 'email_newsletter'],
  case_study: [
    'linkedin_post',
    'twitter_thread',
    'email_newsletter',
    'press_release',
  ],
  landing_page: ['ad_variations', 'email_newsletter'],
  ad_copy: ['twitter_thread', 'linkedin_post'],
  press_release: ['linkedin_post', 'twitter_thread', 'blog_summary'],
};

// ============================================================================
// System Prompts
// ============================================================================

const REPURPOSE_SYSTEM_PROMPT = `You are an expert content strategist specializing in content repurposing. You transform content from one format to multiple platform-optimized versions while preserving key messages.

Your repurposing should:
- Preserve core messages and value propositions
- Adapt tone and style for each platform
- Optimize length and format for platform requirements
- Maintain brand voice consistency
- Include platform-specific elements (hashtags, CTAs, etc.)

Always respond with valid JSON matching the requested schema.`;

const PLATFORM_OPTIMIZE_SYSTEM_PROMPT = `You are a social media optimization expert. You adapt content for specific platforms while maximizing engagement potential.

Your optimizations should:
- Respect platform character limits
- Use platform-specific best practices
- Include appropriate calls-to-action
- Optimize for the platform's algorithm
- Maintain the original message's intent

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Content Repurposing
// ============================================================================

/**
 * Repurpose content from one type to multiple target types.
 *
 * @param sourceContent - The original content to repurpose
 * @param sourceType - The type of the source content
 * @param targetTypes - Array of target content types to generate
 * @returns Array of repurposed content for each target type
 *
 * @example
 * ```typescript
 * const results = await repurposeContent(
 *   'This is my detailed blog post about AI...',
 *   'blog_post',
 *   ['twitter_thread', 'linkedin_post', 'email_newsletter']
 * );
 * results.forEach(r => console.log(`${r.format}: ${r.content.substring(0, 50)}...`));
 * ```
 */
export async function repurposeContent(
  sourceContent: string,
  sourceType: ContentType,
  targetTypes: ContentType[],
): Promise<RepurposeResult[]> {
  // Validate inputs
  if (!sourceContent || sourceContent.trim().length === 0) {
    throw new Error('Source content is required for repurposing');
  }

  if (!targetTypes || targetTypes.length === 0) {
    throw new Error('At least one target type is required');
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return generateRuleBasedRepurpose(sourceContent, sourceType, targetTypes);
  }

  const prompt = buildRepurposePrompt(sourceContent, sourceType, targetTypes);

  try {
    const result = await llmService.completeWithSystem(
      REPURPOSE_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: REPURPOSE_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    return parseRepurposeResult(result.content);
  } catch (error) {
    console.error(
      'Content repurposing failed, using rule-based fallback:',
      error,
    );
    return generateRuleBasedRepurpose(sourceContent, sourceType, targetTypes);
  }
}

/**
 * Result of content repurposing
 */
export interface RepurposeResult {
  /** Target content type */
  targetType: ContentType;
  /** The repurposed content */
  content: string;
  /** Suggested title (if applicable) */
  title: string | null;
  /** Key messages preserved from original */
  preservedMessages: string[];
  /** Suggested hashtags */
  hashtags: string[];
  /** Metadata about the repurposed content */
  metadata: {
    wordCount: number;
    characterCount: number;
    estimatedReadTime: number;
  };
}

/**
 * Build prompt for content repurposing
 */
function buildRepurposePrompt(
  sourceContent: string,
  sourceType: ContentType,
  targetTypes: ContentType[],
): string {
  return `Repurpose the following content into multiple formats.

## SOURCE CONTENT TYPE
${sourceType}

## TARGET FORMATS
${targetTypes.map((t) => `- ${t}`).join('\n')}

## SOURCE CONTENT
${sourceContent}

## TASK
Create repurposed versions of this content for each target format. For each version:
1. Adapt the tone and style appropriately
2. Preserve the key messages and value
3. Optimize length for the format
4. Add relevant hashtags where appropriate
5. Include a compelling title if the format calls for one

Respond with a JSON object matching this exact schema:
{
  "repurposedContent": [
    {
      "targetType": "<the target content type>",
      "content": "<the repurposed content>",
      "title": "<suggested title or null>",
      "preservedMessages": ["<key message 1>", "<key message 2>"],
      "hashtags": ["<hashtag1>", "<hashtag2>"]
    }
  ]
}

## FORMAT GUIDELINES
- blog_post: 500-1500 words, structured with headings
- social_post: Platform-dependent length, engaging hook
- email: Professional, clear CTA, 200-400 words
- newsletter: Curated, value-focused, 300-600 words
- video_script: Conversational, with timing notes
- podcast_outline: Bullet points with talking points
- infographic: Key facts and statistics, bullet format
- whitepaper: Formal, data-driven, comprehensive
- case_study: Problem-solution-result structure
- landing_page: Benefit-focused, strong CTAs
- ad_copy: Concise, compelling, action-oriented
- press_release: News format, quotes, factual`;
}

/**
 * Parse repurpose result from LLM response
 */
function parseRepurposeResult(response: string): RepurposeResult[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return (parsed.repurposedContent || []).map(
      (r: Record<string, unknown>) => {
        const content = String(r.content || '');
        return {
          targetType: String(r.targetType || 'social_post') as ContentType,
          content,
          title: r.title ? String(r.title) : null,
          preservedMessages: Array.isArray(r.preservedMessages)
            ? r.preservedMessages.map((m: unknown) => String(m))
            : [],
          hashtags: Array.isArray(r.hashtags)
            ? r.hashtags.map((h: unknown) => String(h))
            : [],
          metadata: {
            wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
            characterCount: content.length,
            estimatedReadTime: Math.ceil(
              content.split(/\s+/).filter((w) => w.length > 0).length / 200,
            ),
          },
        };
      },
    );
  } catch (error) {
    throw new Error(
      `Failed to parse repurpose result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Platform Optimization
// ============================================================================

/**
 * Optimize content for a specific social media platform.
 *
 * @param content - The content to optimize
 * @param platform - Target platform to optimize for
 * @returns Platform-optimized content with metadata
 *
 * @example
 * ```typescript
 * const optimized = await optimizeForPlatform(
 *   'This is my content about machine learning and AI development...',
 *   'twitter'
 * );
 * console.log('Optimized tweet:', optimized.content);
 * console.log('Hashtags:', optimized.hashtags);
 * ```
 */
export async function optimizeForPlatform(
  content: string,
  platform: SocialPlatform,
): Promise<PlatformOptimizedContent> {
  // Validate inputs
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for platform optimization');
  }

  const constraints = PLATFORM_CONSTRAINTS[platform];
  if (!constraints) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return generateRuleBasedPlatformOptimization(
      content,
      platform,
      constraints,
    );
  }

  const prompt = buildPlatformOptimizePrompt(content, platform, constraints);

  try {
    const result = await llmService.completeWithSystem(
      PLATFORM_OPTIMIZE_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: PLATFORM_OPTIMIZE_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    return parsePlatformOptimizeResult(result.content, platform);
  } catch (error) {
    console.error(
      'Platform optimization failed, using rule-based fallback:',
      error,
    );
    return generateRuleBasedPlatformOptimization(
      content,
      platform,
      constraints,
    );
  }
}

/**
 * Platform-optimized content result
 */
export interface PlatformOptimizedContent {
  /** The optimized content */
  content: string;
  /** Target platform */
  platform: SocialPlatform;
  /** Suggested hashtags */
  hashtags: string[];
  /** Call-to-action (if included) */
  callToAction: string | null;
  /** Content metadata */
  metadata: {
    characterCount: number;
    characterLimit: number;
    isWithinLimit: boolean;
    hashtagCount: number;
    hashtagLimit: number;
  };
  /** Platform-specific tips */
  optimizationTips: string[];
  /** Alternative versions for A/B testing */
  alternatives?: string[];
}

/**
 * Build prompt for platform optimization
 */
function buildPlatformOptimizePrompt(
  content: string,
  platform: SocialPlatform,
  constraints: PlatformConstraints,
): string {
  return `Optimize the following content for ${platform}.

## PLATFORM CONSTRAINTS
- Character limit: ${constraints.characterLimit}
- Hashtag limit: ${constraints.hashtagLimit}
- Supports images: ${constraints.supportsImages}
- Supports videos: ${constraints.supportsVideos}
- Supports links: ${constraints.supportsLinks}

## BEST PRACTICES
${constraints.bestPractices.map((bp) => `- ${bp}`).join('\n')}

## CONTENT TO OPTIMIZE
${content}

## TASK
Create an optimized version of this content for ${platform}. The content should:
1. Be within the character limit
2. Follow platform best practices
3. Include appropriate hashtags (up to ${constraints.hashtagLimit})
4. Have an engaging hook
5. Include a clear call-to-action

Also provide 2 alternative versions for A/B testing.

Respond with a JSON object matching this exact schema:
{
  "content": "<the primary optimized content>",
  "hashtags": ["<hashtag1>", "<hashtag2>"],
  "callToAction": "<the CTA or null>",
  "optimizationTips": ["<tip1>", "<tip2>"],
  "alternatives": ["<alternative version 1>", "<alternative version 2>"]
}`;
}

/**
 * Parse platform optimization result
 */
function parsePlatformOptimizeResult(
  response: string,
  platform: SocialPlatform,
): PlatformOptimizedContent {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const content = String(parsed.content || '');
    const constraints = PLATFORM_CONSTRAINTS[platform];
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.map((h: unknown) => String(h))
      : [];

    return {
      content,
      platform,
      hashtags,
      callToAction: parsed.callToAction ? String(parsed.callToAction) : null,
      metadata: {
        characterCount: content.length,
        characterLimit: constraints.characterLimit,
        isWithinLimit: content.length <= constraints.characterLimit,
        hashtagCount: hashtags.length,
        hashtagLimit: constraints.hashtagLimit,
      },
      optimizationTips: Array.isArray(parsed.optimizationTips)
        ? parsed.optimizationTips.map((t: unknown) => String(t))
        : [],
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives.map((a: unknown) => String(a))
        : undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse platform optimization result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get suggested repurpose formats for a content type
 */
export function getSuggestedFormats(
  contentType: ContentType,
): RepurposeFormat[] {
  return CONTENT_TYPE_TO_FORMATS[contentType] || [];
}

/**
 * Get platform constraints
 */
export function getPlatformConstraints(
  platform: SocialPlatform,
): PlatformConstraints | null {
  return PLATFORM_CONSTRAINTS[platform] || null;
}

/**
 * Generate rule-based content repurposing
 */
function generateRuleBasedRepurpose(
  sourceContent: string,
  _sourceType: ContentType,
  targetTypes: ContentType[],
): RepurposeResult[] {
  const sentences = sourceContent
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);

  // Extract key message (first 2-3 sentences)
  const keyMessage = sentences.slice(0, 3).join('. ').trim();

  return targetTypes.map((targetType) => {
    let content: string;
    let title: string | null = null;

    switch (targetType) {
      case 'social_post':
        content =
          keyMessage.length > 250
            ? keyMessage.substring(0, 247) + '...'
            : keyMessage;
        break;

      case 'blog_post':
        title = `Insights: ${sentences[0]?.trim().substring(0, 50) || 'Untitled'}`;
        content = sourceContent;
        break;

      case 'email':
        title = 'Quick Update';
        content = `Hi,\n\n${keyMessage}\n\nBest regards`;
        break;

      case 'newsletter':
        title = "This Week's Highlights";
        content = `**Key Takeaway**\n\n${keyMessage}\n\n**Read More**\nCheck out the full article for more details.`;
        break;

      default:
        content =
          keyMessage.length > 500
            ? keyMessage.substring(0, 497) + '...'
            : keyMessage;
    }

    const finalContent = content;

    return {
      targetType,
      content: finalContent,
      title,
      preservedMessages: [keyMessage.substring(0, 100)],
      hashtags: extractHashtags(sourceContent),
      metadata: {
        wordCount: finalContent.split(/\s+/).filter((w) => w.length > 0).length,
        characterCount: finalContent.length,
        estimatedReadTime: Math.ceil(
          finalContent.split(/\s+/).filter((w) => w.length > 0).length / 200,
        ),
      },
    };
  });
}

/**
 * Generate rule-based platform optimization
 */
function generateRuleBasedPlatformOptimization(
  content: string,
  platform: SocialPlatform,
  constraints: PlatformConstraints,
): PlatformOptimizedContent {
  let optimizedContent = content;

  // Truncate to fit character limit
  if (optimizedContent.length > constraints.characterLimit) {
    optimizedContent =
      optimizedContent.substring(0, constraints.characterLimit - 3) + '...';
  }

  // Extract or generate hashtags
  const hashtags = extractHashtags(content).slice(0, constraints.hashtagLimit);

  return {
    content: optimizedContent,
    platform,
    hashtags,
    callToAction: 'Learn more in the link below.',
    metadata: {
      characterCount: optimizedContent.length,
      characterLimit: constraints.characterLimit,
      isWithinLimit: optimizedContent.length <= constraints.characterLimit,
      hashtagCount: hashtags.length,
      hashtagLimit: constraints.hashtagLimit,
    },
    optimizationTips: constraints.bestPractices.slice(0, 3),
    alternatives: [
      optimizedContent.split('.')[0] + '.',
      'Check this out: ' + optimizedContent.substring(0, 100) + '...',
    ],
  };
}

/**
 * Extract potential hashtags from content
 */
function extractHashtags(content: string): string[] {
  // Find words that could be hashtags (longer words, likely topics)
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4);

  // Get unique words by frequency
  const wordFreq = new Map<string, number>();
  words.forEach((word) => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // Sort by frequency and take top 5
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => `#${word}`);

  return sortedWords;
}
