/**
 * Content ML Validation Schemas
 *
 * Zod schemas for validating AI-powered content generation API requests.
 * These schemas ensure type safety and data validation at the API boundary.
 *
 * @module content-ml/validation
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Content types supported by the ML module
 */
export const ContentTypeEnum = z.enum([
  'blog_post',
  'social_post',
  'email',
  'newsletter',
  'video_script',
  'podcast_outline',
  'infographic',
  'whitepaper',
  'case_study',
  'landing_page',
  'ad_copy',
  'press_release',
]);

export type ContentTypeValue = z.infer<typeof ContentTypeEnum>;

/**
 * Social platforms supported
 */
export const SocialPlatformEnum = z.enum([
  'twitter',
  'linkedin',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'pinterest',
  'threads',
]);

export type SocialPlatformValue = z.infer<typeof SocialPlatformEnum>;

/**
 * Voice sample types for training
 */
export const VoiceSampleTypeEnum = z.enum([
  'social_post',
  'blog',
  'email',
  'website',
  'other',
]);

export type VoiceSampleTypeValue = z.infer<typeof VoiceSampleTypeEnum>;

/**
 * Tone types for brand voice
 */
export const BrandToneEnum = z.enum([
  'professional',
  'friendly',
  'authoritative',
  'conversational',
  'inspiring',
  'educational',
  'playful',
  'empathetic',
  'bold',
  'minimalist',
  'luxurious',
  'technical',
]);

export type BrandToneValue = z.infer<typeof BrandToneEnum>;

/**
 * Caption tone types
 */
export const CaptionToneEnum = z.enum([
  'professional',
  'casual',
  'humorous',
  'inspiring',
  'educational',
  'promotional',
  'storytelling',
]);

export type CaptionToneValue = z.infer<typeof CaptionToneEnum>;

/**
 * Content idea status
 */
export const IdeaStatusEnum = z.enum([
  'new',
  'reviewed',
  'approved',
  'rejected',
  'in_progress',
  'completed',
]);

export type IdeaStatusValue = z.infer<typeof IdeaStatusEnum>;

/**
 * Repurpose format types
 */
export const RepurposeFormatEnum = z.enum([
  'twitter_thread',
  'linkedin_post',
  'instagram_carousel',
  'tiktok_script',
  'youtube_short',
  'email_newsletter',
  'blog_summary',
  'infographic_outline',
  'podcast_episode',
  'press_release',
  'ad_variations',
]);

export type RepurposeFormatValue = z.infer<typeof RepurposeFormatEnum>;

// ============================================================================
// Brand Voice Schemas
// ============================================================================

/**
 * Schema for individual voice sample
 */
export const voiceSampleSchema = z.object({
  text: z.string().min(10, 'Sample text must be at least 10 characters'),
  type: VoiceSampleTypeEnum,
  source: z.string().optional(),
  isGoodExample: z.boolean().default(true),
});

export type VoiceSampleInput = z.infer<typeof voiceSampleSchema>;

/**
 * Schema for training brand voice from samples
 */
export const trainVoiceSchema = z.object({
  samples: z
    .array(voiceSampleSchema)
    .min(1, 'At least one sample is required')
    .max(50, 'Maximum 50 samples allowed'),
  brandDescription: z.string().optional(),
  targetAudience: z.string().optional(),
  tonePreferences: z.array(BrandToneEnum).optional(),
  industry: z.string().optional(),
});

export type TrainVoiceInput = z.infer<typeof trainVoiceSchema>;

/**
 * Schema for checking voice consistency
 */
export const checkVoiceSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000),
  strictMode: z.boolean().optional().default(false),
});

export type CheckVoiceInput = z.infer<typeof checkVoiceSchema>;

/**
 * Schema for adding a voice sample
 */
export const addVoiceSampleSchema = voiceSampleSchema;

export type AddVoiceSampleInput = z.infer<typeof addVoiceSampleSchema>;

// ============================================================================
// Content Generation Schemas
// ============================================================================

/**
 * Schema for content generation request
 */
export const generateContentSchema = z.object({
  type: ContentTypeEnum,
  topic: z.string().min(1, 'Topic is required').max(500),
  platforms: z.array(SocialPlatformEnum).optional(),
  keywords: z.array(z.string()).max(20).optional(),
  tone: BrandToneEnum.optional(),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
  includeHashtags: z.boolean().optional().default(true),
  includeCTA: z.boolean().optional().default(true),
  context: z.string().max(2000).optional(),
  customInstructions: z.string().max(1000).optional(),
  targetLength: z.number().int().positive().max(10000).optional(),
});

export type GenerateContentInput = z.infer<typeof generateContentSchema>;

/**
 * Schema for hashtag generation request
 */
export const generateHashtagsSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
  platform: SocialPlatformEnum.optional(),
  count: z.number().int().min(1).max(30).optional().default(10),
  includeNiche: z.boolean().optional().default(true),
  includeTrending: z.boolean().optional().default(true),
  industry: z.string().optional(),
});

export type GenerateHashtagsInput = z.infer<typeof generateHashtagsSchema>;

/**
 * Schema for caption generation request
 */
export const generateCaptionsSchema = z.object({
  imageDescription: z
    .string()
    .min(1, 'Image description is required')
    .max(2000),
  platform: SocialPlatformEnum.optional(),
  tone: CaptionToneEnum.optional(),
  includeHashtags: z.boolean().optional().default(true),
  includeEmojis: z.boolean().optional().default(true),
  variantCount: z.number().int().min(1).max(5).optional().default(3),
  maxLength: z.number().int().positive().max(2200).optional(),
  callToAction: z.string().max(200).optional(),
  brandContext: z.string().max(500).optional(),
});

export type GenerateCaptionsInput = z.infer<typeof generateCaptionsSchema>;

// ============================================================================
// SEO Schemas
// ============================================================================

/**
 * Schema for SEO analysis request
 */
export const analyzeSEOSchema = z.object({
  content: z.string().min(1, 'Content is required').max(100000),
  targetKeywords: z
    .array(z.string())
    .min(1, 'At least one keyword is required')
    .max(20),
  contentType: z.string().optional().default('blog_post'),
  url: z.string().url().optional(),
  checkReadability: z.boolean().optional().default(true),
  checkKeywordDensity: z.boolean().optional().default(true),
  generateMetaSuggestions: z.boolean().optional().default(true),
});

export type AnalyzeSEOInput = z.infer<typeof analyzeSEOSchema>;

/**
 * Schema for keyword suggestion request
 */
export const suggestKeywordsSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  industry: z.string().optional(),
  count: z.number().int().min(1).max(50).optional().default(20),
  includeRelated: z.boolean().optional().default(true),
  includeLongTail: z.boolean().optional().default(true),
  targetAudience: z.string().optional(),
  competitorKeywords: z.array(z.string()).max(20).optional(),
});

export type SuggestKeywordsInput = z.infer<typeof suggestKeywordsSchema>;

// ============================================================================
// Content Ideas Schemas
// ============================================================================

/**
 * Schema for generating content ideas
 */
export const generateIdeasSchema = z.object({
  industry: z.string().optional(),
  topics: z.array(z.string()).max(10).optional(),
  contentTypes: z.array(ContentTypeEnum).optional(),
  count: z.number().int().min(1).max(20).optional().default(5),
  targetAudience: z.string().optional(),
  competitorUrls: z.array(z.string().url()).max(5).optional(),
  trendingTopics: z.boolean().optional().default(true),
  seasonalRelevance: z.boolean().optional().default(true),
});

export type GenerateIdeasInput = z.infer<typeof generateIdeasSchema>;

/**
 * Schema for listing saved ideas
 */
export const listIdeasQuerySchema = z.object({
  status: IdeaStatusEnum.optional(),
  contentType: ContentTypeEnum.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['createdAt', 'relevanceScore', 'title'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListIdeasQuery = z.infer<typeof listIdeasQuerySchema>;

/**
 * Schema for updating idea status
 */
export const updateIdeaSchema = z.object({
  status: IdeaStatusEnum.optional(),
  notes: z.string().max(2000).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assignedTo: z.number().int().positive().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

// ============================================================================
// Content Repurposing Schemas
// ============================================================================

/**
 * Schema for repurposing existing content
 */
export const repurposeContentSchema = z.object({
  targetFormats: z
    .array(RepurposeFormatEnum)
    .min(1, 'At least one target format is required')
    .max(5),
  targetPlatforms: z.array(SocialPlatformEnum).optional(),
  preserveKeyMessages: z.boolean().optional().default(true),
  adaptTone: z.boolean().optional().default(true),
  customInstructions: z.string().max(1000).optional(),
});

export type RepurposeContentInput = z.infer<typeof repurposeContentSchema>;

/**
 * Schema for optimizing content for a specific platform
 */
export const optimizePlatformSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000),
  sourcePlatform: SocialPlatformEnum.optional(),
  targetPlatform: SocialPlatformEnum,
  optimizeHashtags: z.boolean().optional().default(true),
  optimizeLength: z.boolean().optional().default(true),
  optimizeTone: z.boolean().optional().default(true),
  includeEmojis: z.boolean().optional().default(true),
});

export type OptimizePlatformInput = z.infer<typeof optimizePlatformSchema>;

// ============================================================================
// Common Path Parameter Schemas
// ============================================================================

/**
 * Schema for config ID path parameter
 */
export const configIdParamSchema = z.object({
  configId: z.coerce.number().int().positive(),
});

export type ConfigIdParam = z.infer<typeof configIdParamSchema>;

/**
 * Schema for content ID path parameter
 */
export const contentIdParamSchema = z.object({
  contentId: z.coerce.number().int().positive(),
});

export type ContentIdParam = z.infer<typeof contentIdParamSchema>;

/**
 * Schema for idea ID path parameter
 */
export const ideaIdParamSchema = z.object({
  ideaId: z.coerce.number().int().positive(),
});

export type IdeaIdParam = z.infer<typeof ideaIdParamSchema>;
