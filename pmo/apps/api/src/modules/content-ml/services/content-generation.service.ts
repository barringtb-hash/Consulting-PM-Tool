/**
 * Content Generation Service
 *
 * Generates AI-powered content with brand voice consistency.
 * Includes hashtag generation and image caption creation.
 *
 * @module content-ml/services
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import type {
  ContentType,
  SocialPlatform,
  BrandVoiceProfile,
  ContentLLMMetadata,
  HashtagSuggestion,
  HashtagCategory,
  HashtagPopularity,
  CaptionVariant,
  CaptionTone,
} from '../types';
import { formatVoiceProfile } from '../prompts/content-ml-prompts';

// ============================================================================
// Types
// ============================================================================

/**
 * Request for content generation
 */
export interface ContentGenerationRequest {
  /** Type of content to generate */
  contentType: ContentType;
  /** Topic or subject for the content */
  topic: string;
  /** Keywords to incorporate */
  keywords?: string[];
  /** Target platforms */
  platforms?: SocialPlatform[];
  /** Desired content length */
  length?: 'short' | 'medium' | 'long';
  /** Custom instructions */
  customInstructions?: string;
  /** Whether to include hashtags */
  includeHashtags?: boolean;
  /** Whether to include a call-to-action */
  includeCTA?: boolean;
  /** Specific tone override */
  toneOverride?: string;
}

/**
 * Generated content with metadata
 */
export interface GeneratedContentResult {
  /** The generated content text */
  content: string;
  /** HTML version if applicable */
  contentHtml?: string;
  /** Suggested title */
  title: string | null;
  /** SEO meta description */
  metaDescription: string | null;
  /** Generated hashtags */
  hashtags: HashtagSuggestion[];
  /** Call-to-action if included */
  callToAction: string | null;
  /** Content metadata */
  metadata: {
    wordCount: number;
    characterCount: number;
    readingTimeMinutes: number;
    contentType: ContentType;
    platforms: SocialPlatform[];
  };
  /** LLM usage metadata */
  llmMetadata: ContentLLMMetadata;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'gpt-4o-mini';
const CONTENT_GENERATION_MAX_TOKENS = 3000;
const HASHTAG_GENERATION_MAX_TOKENS = 500;
const CAPTION_GENERATION_MAX_TOKENS = 1000;
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Length guidelines for different content types
 */
const LENGTH_GUIDELINES: Record<
  ContentType,
  { short: string; medium: string; long: string }
> = {
  blog_post: {
    short: '300-500 words',
    medium: '800-1200 words',
    long: '1500-2500 words',
  },
  social_post: {
    short: '50-100 characters',
    medium: '100-200 characters',
    long: '200-300 characters',
  },
  email: {
    short: '100-200 words',
    medium: '200-400 words',
    long: '400-600 words',
  },
  newsletter: {
    short: '200-400 words',
    medium: '400-800 words',
    long: '800-1200 words',
  },
  video_script: {
    short: '1-2 minutes (150-300 words)',
    medium: '3-5 minutes (450-750 words)',
    long: '8-10 minutes (1200-1500 words)',
  },
  podcast_outline: {
    short: '10-15 minute episode',
    medium: '20-30 minute episode',
    long: '45-60 minute episode',
  },
  infographic: {
    short: '5-7 data points',
    medium: '8-12 data points',
    long: '15-20 data points',
  },
  whitepaper: {
    short: '1500-2500 words',
    medium: '3000-5000 words',
    long: '6000-10000 words',
  },
  case_study: {
    short: '500-800 words',
    medium: '1000-1500 words',
    long: '2000-3000 words',
  },
  landing_page: {
    short: '200-400 words',
    medium: '500-800 words',
    long: '1000-1500 words',
  },
  ad_copy: {
    short: '25-50 words',
    medium: '50-100 words',
    long: '100-150 words',
  },
  press_release: {
    short: '300-400 words',
    medium: '400-600 words',
    long: '600-800 words',
  },
};

// ============================================================================
// System Prompts
// ============================================================================

const CONTENT_GENERATION_SYSTEM_PROMPT = `You are an expert content creator who generates high-quality, engaging content that matches specific brand voices. You create content optimized for different platforms and audiences.

Your content should:
- Match the brand voice profile precisely
- Be engaging and valuable to the target audience
- Follow platform best practices
- Include appropriate calls-to-action
- Be original and compelling

Always respond with valid JSON matching the requested schema.`;

const HASHTAG_GENERATION_SYSTEM_PROMPT = `You are a social media expert specializing in hashtag strategy. You generate relevant, high-performing hashtags that increase content visibility and engagement.

Your hashtag suggestions should:
- Be relevant to the content
- Mix popular and niche hashtags
- Consider platform-specific best practices
- Avoid banned or spammy hashtags
- Include a mix of categories

Always respond with valid JSON matching the requested schema.`;

const CAPTION_GENERATION_SYSTEM_PROMPT = `You are a social media copywriter who creates compelling image captions. You write captions that complement visuals and drive engagement.

Your captions should:
- Complement the image description
- Be platform-optimized
- Include relevant hashtags
- Have an appropriate tone
- Include calls-to-action when appropriate

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Content Generation
// ============================================================================

/**
 * Generate content with brand voice consistency.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @param request - Content generation request parameters
 * @returns Generated content with metadata
 *
 * @example
 * ```typescript
 * const result = await generateContent(123, {
 *   contentType: 'blog_post',
 *   topic: 'AI in Healthcare',
 *   keywords: ['AI', 'healthcare', 'technology'],
 *   platforms: ['linkedin', 'twitter'],
 *   length: 'medium',
 *   includeHashtags: true
 * });
 * console.log('Generated:', result.content);
 * ```
 */
export async function generateContent(
  configId: number,
  request: ContentGenerationRequest,
): Promise<GeneratedContentResult> {
  const startTime = Date.now();

  // Get config with brand voice
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: {
      id: true,
      tenantId: true,
      brandVoiceProfile: true,
      brandVoiceDescription: true,
      toneKeywords: true,
      targetKeywords: true,
      defaultTone: true,
      defaultLength: true,
      client: {
        select: {
          name: true,
          industry: true,
        },
      },
    },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  // Build generation context
  const voiceProfile =
    config.brandVoiceProfile as unknown as BrandVoiceProfile | null;
  const length =
    request.length ||
    (config.defaultLength as 'short' | 'medium' | 'long') ||
    'medium';
  const platforms = request.platforms || ['linkedin'];
  const keywords = request.keywords || config.targetKeywords || [];

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return generateRuleBasedContent(request, config, length, platforms);
  }

  const prompt = buildContentGenerationPrompt(
    request,
    voiceProfile,
    config.client?.industry || 'general',
    length,
    keywords,
  );

  try {
    const result = await llmService.completeWithSystem(
      CONTENT_GENERATION_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: CONTENT_GENERATION_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    const latencyMs = Date.now() - startTime;
    const parsedResult = parseContentGenerationResult(
      result.content,
      request,
      platforms,
    );

    // Add hashtags if requested
    if (request.includeHashtags && parsedResult.hashtags.length === 0) {
      const hashtags = await generateHashtags(
        parsedResult.content,
        platforms[0],
        10,
      );
      parsedResult.hashtags = hashtags;
    }

    // Add LLM metadata
    parsedResult.llmMetadata = {
      model: DEFAULT_MODEL,
      tokensUsed: result.usage?.totalTokens || 0,
      latencyMs,
      estimatedCost: calculateCost(result.usage?.totalTokens || 0),
    };

    return parsedResult;
  } catch (error) {
    console.error(
      'Content generation failed, using rule-based fallback:',
      error,
    );
    return generateRuleBasedContent(request, config, length, platforms);
  }
}

/**
 * Build prompt for content generation
 */
function buildContentGenerationPrompt(
  request: ContentGenerationRequest,
  voiceProfile: BrandVoiceProfile | null,
  industry: string,
  length: 'short' | 'medium' | 'long',
  keywords: string[],
): string {
  const lengthGuideline =
    LENGTH_GUIDELINES[request.contentType]?.[length] || 'medium length';

  let voiceSection = '';
  if (voiceProfile) {
    voiceSection = `## BRAND VOICE PROFILE
${formatVoiceProfile(voiceProfile)}

`;
  }

  return `Generate ${request.contentType} content about the following topic.

## CONTENT TYPE
${request.contentType}

## TOPIC
${request.topic}

## INDUSTRY
${industry}

## TARGET LENGTH
${lengthGuideline}

## KEYWORDS TO INCORPORATE
${keywords.length > 0 ? keywords.map((k) => `- ${k}`).join('\n') : 'No specific keywords'}

${voiceSection}${request.toneOverride ? `## TONE OVERRIDE\n${request.toneOverride}\n\n` : ''}${request.customInstructions ? `## CUSTOM INSTRUCTIONS\n${request.customInstructions}\n\n` : ''}## TASK
Create high-quality ${request.contentType} content that:
1. Thoroughly covers the topic
2. Incorporates the keywords naturally
3. ${voiceProfile ? 'Matches the brand voice profile' : 'Maintains a professional tone'}
4. Is optimized for the target length
5. ${request.includeCTA ? 'Includes a compelling call-to-action' : 'Provides value without hard selling'}
${request.includeHashtags ? '6. Suggests relevant hashtags' : ''}

Respond with a JSON object matching this exact schema:
{
  "content": "<the main content>",
  "title": "<suggested title or null>",
  "metaDescription": "<SEO meta description, max 160 chars, or null>",
  "hashtags": ["<hashtag1>", "<hashtag2>"],
  "callToAction": "<CTA text or null>"
}

## CONTENT GUIDELINES
- Write engaging, valuable content
- Use clear, accessible language
- Structure content appropriately for the type
- Include relevant examples or data points
- End with a strong conclusion or CTA`;
}

/**
 * Parse content generation result
 */
function parseContentGenerationResult(
  response: string,
  request: ContentGenerationRequest,
  platforms: SocialPlatform[],
): GeneratedContentResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const content = String(parsed.content || '');
    const words = content.split(/\s+/).filter((w) => w.length > 0);

    const hashtags: HashtagSuggestion[] = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.map((h: unknown, i: number) => ({
          hashtag: String(h).startsWith('#') ? String(h) : `#${String(h)}`,
          popularity: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
          relevance: 90 - i * 5,
          category: 'industry' as HashtagCategory,
        }))
      : [];

    return {
      content,
      contentHtml: undefined, // Could add HTML conversion here
      title: parsed.title ? String(parsed.title) : null,
      metaDescription: parsed.metaDescription
        ? String(parsed.metaDescription).substring(0, 160)
        : null,
      hashtags,
      callToAction: parsed.callToAction ? String(parsed.callToAction) : null,
      metadata: {
        wordCount: words.length,
        characterCount: content.length,
        readingTimeMinutes: Math.ceil(words.length / 200),
        contentType: request.contentType,
        platforms,
      },
      llmMetadata: {
        model: DEFAULT_MODEL,
        tokensUsed: 0,
        latencyMs: 0,
        estimatedCost: 0,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to parse content generation result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Hashtag Generation
// ============================================================================

/**
 * Generate relevant hashtags for content.
 *
 * @param content - The content to generate hashtags for
 * @param platform - Target platform
 * @param count - Number of hashtags to generate (default: 10)
 * @returns Array of hashtag suggestions with metadata
 *
 * @example
 * ```typescript
 * const hashtags = await generateHashtags(
 *   'This is my post about AI and machine learning...',
 *   'instagram',
 *   15
 * );
 * hashtags.forEach(h => console.log(`${h.hashtag} (${h.popularity})`));
 * ```
 */
export async function generateHashtags(
  content: string,
  platform: SocialPlatform,
  count: number = 10,
): Promise<HashtagSuggestion[]> {
  // Validate inputs
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for hashtag generation');
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return generateRuleBasedHashtags(content, count);
  }

  const prompt = buildHashtagGenerationPrompt(content, platform, count);

  try {
    const result = await llmService.completeWithSystem(
      HASHTAG_GENERATION_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: HASHTAG_GENERATION_MAX_TOKENS,
        temperature: 0.5,
      },
    );

    return parseHashtagResult(result.content);
  } catch (error) {
    console.error(
      'Hashtag generation failed, using rule-based fallback:',
      error,
    );
    return generateRuleBasedHashtags(content, count);
  }
}

/**
 * Build prompt for hashtag generation
 */
function buildHashtagGenerationPrompt(
  content: string,
  platform: SocialPlatform,
  count: number,
): string {
  return `Generate ${count} relevant hashtags for the following content on ${platform}.

## CONTENT
${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

## PLATFORM
${platform}

## TASK
Generate ${count} hashtags that are:
1. Highly relevant to the content
2. A mix of popular and niche hashtags
3. Appropriate for ${platform}
4. Not banned or spammy

Respond with a JSON object matching this exact schema:
{
  "hashtags": [
    {
      "hashtag": "<hashtag with # prefix>",
      "popularity": "<high | medium | low | niche>",
      "relevance": <number 0-100>,
      "category": "<branded | industry | trending | niche | community | location>"
    }
  ]
}

## GUIDELINES
- Include 2-3 high-popularity hashtags
- Include 3-4 medium-popularity hashtags
- Include 3-4 niche/specific hashtags
- Ensure all hashtags are one word (no spaces)`;
}

/**
 * Parse hashtag generation result
 */
function parseHashtagResult(response: string): HashtagSuggestion[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return (parsed.hashtags || []).map((h: Record<string, unknown>) => ({
      hashtag: String(h.hashtag || '').startsWith('#')
        ? String(h.hashtag)
        : `#${String(h.hashtag || '')}`,
      popularity: validatePopularity(String(h.popularity || 'medium')),
      relevance: clampScore(Number(h.relevance) || 70),
      category: validateCategory(String(h.category || 'industry')),
    }));
  } catch (error) {
    throw new Error(
      `Failed to parse hashtag result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Caption Generation
// ============================================================================

/**
 * Generate image captions for social media.
 *
 * @param imageDescription - Description of the image
 * @param platform - Target platform
 * @param count - Number of caption variants (default: 3)
 * @returns Array of caption variants for A/B testing
 *
 * @example
 * ```typescript
 * const captions = await generateCaptions(
 *   'A team of engineers working on a robot in a modern lab',
 *   'instagram',
 *   3
 * );
 * captions.forEach(c => console.log(`[${c.tone}]: ${c.caption}`));
 * ```
 */
export async function generateCaptions(
  imageDescription: string,
  platform: SocialPlatform,
  count: number = 3,
): Promise<CaptionVariant[]> {
  // Validate inputs
  if (!imageDescription || imageDescription.trim().length === 0) {
    throw new Error('Image description is required for caption generation');
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return generateRuleBasedCaptions(imageDescription, platform, count);
  }

  const prompt = buildCaptionGenerationPrompt(
    imageDescription,
    platform,
    count,
  );

  try {
    const result = await llmService.completeWithSystem(
      CAPTION_GENERATION_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: CAPTION_GENERATION_MAX_TOKENS,
        temperature: 0.7,
      },
    );

    return parseCaptionResult(result.content);
  } catch (error) {
    console.error(
      'Caption generation failed, using rule-based fallback:',
      error,
    );
    return generateRuleBasedCaptions(imageDescription, platform, count);
  }
}

/**
 * Build prompt for caption generation
 */
function buildCaptionGenerationPrompt(
  imageDescription: string,
  platform: SocialPlatform,
  count: number,
): string {
  return `Generate ${count} caption variants for an image on ${platform}.

## IMAGE DESCRIPTION
${imageDescription}

## PLATFORM
${platform}

## TASK
Generate ${count} different caption variants with different tones:
1. Professional/Educational
2. Casual/Engaging
3. Inspiring/Motivational

Each caption should:
- Complement the image
- Be optimized for ${platform}
- Include relevant hashtags
- Have an appropriate call-to-action

Respond with a JSON object matching this exact schema:
{
  "captions": [
    {
      "caption": "<the caption text>",
      "tone": "<professional | casual | humorous | inspiring | educational | promotional | storytelling>",
      "hashtags": ["<hashtag1>", "<hashtag2>"],
      "callToAction": "<CTA or null>",
      "emojiUsage": "<none | minimal | moderate | heavy>"
    }
  ]
}`;
}

/**
 * Parse caption generation result
 */
function parseCaptionResult(response: string): CaptionVariant[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return (parsed.captions || []).map((c: Record<string, unknown>) => {
      const caption = String(c.caption || '');
      return {
        caption,
        tone: validateTone(String(c.tone || 'professional')),
        characterCount: caption.length,
        hashtags: Array.isArray(c.hashtags)
          ? c.hashtags.map((h: unknown) => String(h))
          : [],
        callToAction: c.callToAction ? String(c.callToAction) : null,
        emojiUsage: validateEmojiUsage(String(c.emojiUsage || 'minimal')),
      };
    });
  } catch (error) {
    throw new Error(
      `Failed to parse caption result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate rule-based content when LLM is unavailable
 */
function generateRuleBasedContent(
  request: ContentGenerationRequest,
  config: {
    brandVoiceDescription: string | null;
    defaultTone: string | null;
    client: { name: string; industry: string | null } | null;
  },
  length: 'short' | 'medium' | 'long',
  platforms: SocialPlatform[],
): GeneratedContentResult {
  const topic = request.topic;
  const industry = config.client?.industry || 'business';

  let content: string;
  let title: string | null = null;

  switch (request.contentType) {
    case 'blog_post':
      title = `Understanding ${topic}: A Comprehensive Guide`;
      content = `${topic} is becoming increasingly important in the ${industry} industry. In this article, we explore the key aspects of ${topic} and how it can benefit your organization.\n\n## Why ${topic} Matters\n\nThe importance of ${topic} cannot be overstated. Organizations that embrace ${topic} are seeing significant improvements in their operations and outcomes.\n\n## Getting Started\n\nTo begin implementing ${topic}, consider the following steps:\n\n1. Assess your current situation\n2. Define clear objectives\n3. Develop a strategic plan\n4. Execute and measure results\n\n## Conclusion\n\n${topic} represents a significant opportunity for ${industry} organizations. By taking a strategic approach, you can unlock its full potential.`;
      break;

    case 'social_post':
      content = `Excited to share insights about ${topic}! The ${industry} landscape is evolving, and staying ahead means embracing new approaches. What are your thoughts?`;
      break;

    case 'email':
      title = `Quick Update on ${topic}`;
      content = `Hi there,\n\nI wanted to share some quick thoughts on ${topic}.\n\nAs you know, ${topic} is becoming increasingly relevant in our industry. I believe there are some opportunities we should explore.\n\nWould love to discuss this further.\n\nBest regards`;
      break;

    default:
      content = `${topic} is an important topic in the ${industry} industry. Here's what you need to know about it and why it matters for your organization.`;
  }

  const words = content.split(/\s+/).filter((w) => w.length > 0);

  return {
    content,
    title,
    metaDescription: `Learn about ${topic} and its impact on the ${industry} industry.`,
    hashtags: generateRuleBasedHashtags(content, 5),
    callToAction: request.includeCTA ? 'Learn more on our website.' : null,
    metadata: {
      wordCount: words.length,
      characterCount: content.length,
      readingTimeMinutes: Math.ceil(words.length / 200),
      contentType: request.contentType,
      platforms,
    },
    llmMetadata: {
      model: 'rule-based',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Generate rule-based hashtags
 */
function generateRuleBasedHashtags(
  content: string,
  count: number,
): HashtagSuggestion[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4);

  const wordFreq = new Map<string, number>();
  words.forEach((word) => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);

  return sortedWords.map(([word], index) => ({
    hashtag: `#${word}`,
    popularity: (index < 2
      ? 'high'
      : index < 4
        ? 'medium'
        : 'low') as HashtagPopularity,
    relevance: 90 - index * 5,
    category: 'industry' as HashtagCategory,
  }));
}

/**
 * Generate rule-based captions
 */
function generateRuleBasedCaptions(
  imageDescription: string,
  platform: SocialPlatform,
  count: number,
): CaptionVariant[] {
  const tones: CaptionTone[] = ['professional', 'casual', 'inspiring'];

  return tones.slice(0, count).map((tone) => {
    let caption: string;
    let emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';

    switch (tone) {
      case 'professional':
        caption = `${imageDescription}. A glimpse into our work and commitment to excellence.`;
        emojiUsage = 'none';
        break;
      case 'casual':
        caption = `Check this out! ${imageDescription}. What do you think?`;
        emojiUsage = 'minimal';
        break;
      case 'inspiring':
        caption = `Every great achievement starts with a single step. ${imageDescription}. Keep pushing forward!`;
        emojiUsage = 'moderate';
        break;
      default:
        caption = imageDescription;
        emojiUsage = 'minimal';
    }

    return {
      caption,
      tone,
      characterCount: caption.length,
      hashtags: ['#innovation', '#growth'],
      callToAction: 'Learn more in our bio.',
      emojiUsage,
    };
  });
}

/**
 * Calculate estimated cost based on tokens
 */
function calculateCost(tokens: number): number {
  // GPT-4o-mini pricing (approximate)
  const costPer1000Tokens = 0.00015;
  return (tokens / 1000) * costPer1000Tokens;
}

/**
 * Clamp a score to 0-100 range
 */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Validate hashtag popularity
 */
function validatePopularity(popularity: string): HashtagPopularity {
  const valid: HashtagPopularity[] = ['high', 'medium', 'low', 'niche'];
  return valid.includes(popularity as HashtagPopularity)
    ? (popularity as HashtagPopularity)
    : 'medium';
}

/**
 * Validate hashtag category
 */
function validateCategory(category: string): HashtagCategory {
  const valid: HashtagCategory[] = [
    'branded',
    'industry',
    'trending',
    'niche',
    'community',
    'location',
  ];
  return valid.includes(category as HashtagCategory)
    ? (category as HashtagCategory)
    : 'industry';
}

/**
 * Validate caption tone
 */
function validateTone(tone: string): CaptionTone {
  const valid: CaptionTone[] = [
    'professional',
    'casual',
    'humorous',
    'inspiring',
    'educational',
    'promotional',
    'storytelling',
  ];
  return valid.includes(tone as CaptionTone)
    ? (tone as CaptionTone)
    : 'professional';
}

/**
 * Validate emoji usage level
 */
function validateEmojiUsage(
  usage: string,
): 'none' | 'minimal' | 'moderate' | 'heavy' {
  const valid = ['none', 'minimal', 'moderate', 'heavy'] as const;
  return valid.includes(usage as (typeof valid)[number])
    ? (usage as (typeof valid)[number])
    : 'minimal';
}
