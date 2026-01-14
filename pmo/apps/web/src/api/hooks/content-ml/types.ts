/**
 * Content ML Types
 *
 * TypeScript type definitions for AI-powered content generation hooks.
 * These types mirror the API types and provide type safety for the frontend.
 *
 * @module content-ml/types
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Content types supported by the ML module
 */
export type ContentType =
  | 'blog_post'
  | 'social_post'
  | 'email'
  | 'newsletter'
  | 'video_script'
  | 'podcast_outline'
  | 'infographic'
  | 'whitepaper'
  | 'case_study'
  | 'landing_page'
  | 'ad_copy'
  | 'press_release';

/**
 * Social platforms supported
 */
export type SocialPlatform =
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'threads';

/**
 * Voice sample types for training
 */
export type VoiceSampleType =
  | 'social_post'
  | 'blog'
  | 'email'
  | 'website'
  | 'other';

/**
 * Tone types for brand voice
 */
export type BrandTone =
  | 'professional'
  | 'friendly'
  | 'authoritative'
  | 'conversational'
  | 'inspiring'
  | 'educational'
  | 'playful'
  | 'empathetic'
  | 'bold'
  | 'minimalist'
  | 'luxurious'
  | 'technical';

/**
 * Caption tone types
 */
export type CaptionTone =
  | 'professional'
  | 'casual'
  | 'humorous'
  | 'inspiring'
  | 'educational'
  | 'promotional'
  | 'storytelling';

/**
 * Content idea status
 */
export type IdeaStatus =
  | 'new'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed';

/**
 * Repurpose format types
 */
export type RepurposeFormat =
  | 'twitter_thread'
  | 'linkedin_post'
  | 'instagram_carousel'
  | 'tiktok_script'
  | 'youtube_short'
  | 'email_newsletter'
  | 'blog_summary'
  | 'infographic_outline'
  | 'podcast_episode'
  | 'press_release'
  | 'ad_variations';

/**
 * Formality level for brand voice
 */
export type FormalityLevel =
  | 'very_formal'
  | 'formal'
  | 'neutral'
  | 'casual'
  | 'very_casual';

/**
 * Sentence style preferences
 */
export type SentenceStyle =
  | 'short_punchy'
  | 'medium_balanced'
  | 'long_flowing'
  | 'varied_dynamic';

/**
 * Rhetoric devices used in content
 */
export type RhetoricDevice =
  | 'metaphor'
  | 'analogy'
  | 'storytelling'
  | 'statistics'
  | 'questions'
  | 'repetition'
  | 'contrast'
  | 'call_to_action'
  | 'social_proof'
  | 'urgency';

/**
 * Hashtag category
 */
export type HashtagCategory =
  | 'branded'
  | 'industry'
  | 'trending'
  | 'niche'
  | 'community'
  | 'location';

/**
 * Popularity level for hashtags
 */
export type HashtagPopularity = 'high' | 'medium' | 'low' | 'niche';

/**
 * SEO suggestion types
 */
export type SEOSuggestionType =
  | 'keyword_usage'
  | 'meta_optimization'
  | 'heading_structure'
  | 'readability'
  | 'internal_linking'
  | 'image_optimization'
  | 'content_length'
  | 'keyword_placement'
  | 'semantic_keywords';

/**
 * Priority level for SEO suggestions
 */
export type SEOPriority = 'critical' | 'high' | 'medium' | 'low';

// ============================================================================
// Brand Voice Types
// ============================================================================

/**
 * Voice sample for training
 */
export interface VoiceSample {
  id?: number;
  text: string;
  type: VoiceSampleType;
  source?: string;
  isGoodExample: boolean;
  createdAt?: string;
}

/**
 * Brand voice profile
 */
export interface BrandVoiceProfile {
  id?: number;
  configId: number;
  primaryTone: BrandTone;
  secondaryTones: BrandTone[];
  formality: FormalityLevel;
  personality: string[];
  vocabulary: {
    preferred: string[];
    avoided: string[];
    industryTerms: string[];
  };
  sentenceStyle: SentenceStyle;
  rhetoricDevices: RhetoricDevice[];
  toneDimensions?: {
    formal: number;
    friendly: number;
    authoritative: number;
    playful: number;
    technical: number;
  };
  vocabularyLevel?: 'simple' | 'moderate' | 'advanced';
  keyPhrases?: string[];
  avoidPhrases?: string[];
  brandPersonality?: string;
  targetAudience?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Voice deviation found during consistency check
 */
export interface VoiceDeviation {
  location: string;
  issue: string;
  suggestion: string;
  originalText: string;
  suggestedText: string;
}

/**
 * Result of voice consistency check
 */
export interface VoiceConsistencyResult {
  consistencyScore: number;
  toneMatch: number;
  vocabularyMatch: number;
  styleMatch: number;
  deviations: VoiceDeviation[];
  overallFeedback: string;
}

// ============================================================================
// Content Generation Types
// ============================================================================

/**
 * LLM metadata for content generation
 */
export interface ContentLLMMetadata {
  model: string;
  tokensUsed: number;
  latencyMs: number;
  estimatedCost: number;
}

/**
 * Generated content result
 */
export interface GeneratedContent {
  content: string;
  contentHtml?: string;
  metadata: {
    wordCount: number;
    readingTime: number;
    hashtags?: string[];
    keywords?: string[];
    seoScore?: number;
  };
  platformVersions?: Record<string, string>;
  llmMetadata?: ContentLLMMetadata;
}

/**
 * Hashtag suggestion
 */
export interface HashtagSuggestion {
  hashtag: string;
  popularity: HashtagPopularity;
  relevance: number;
  category: HashtagCategory;
  estimatedReach?: string;
  competition?: 'high' | 'medium' | 'low';
}

/**
 * Caption variant for A/B testing
 */
export interface CaptionVariant {
  caption: string;
  tone: CaptionTone;
  characterCount: number;
  hashtags: string[];
  callToAction: string | null;
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
}

// ============================================================================
// SEO Types
// ============================================================================

/**
 * Individual SEO suggestion
 */
export interface SEOSuggestion {
  type: SEOSuggestionType;
  priority: SEOPriority;
  issue: string;
  suggestion: string;
  location: string | null;
}

/**
 * Keyword density analysis
 */
export interface KeywordDensityAnalysis {
  keyword: string;
  density: number;
  optimalRange: {
    min: number;
    max: number;
  };
  isOptimal: boolean;
}

/**
 * Complete SEO analysis result
 */
export interface SEOAnalysis {
  seoScore: number;
  keywordDensity: KeywordDensityAnalysis[];
  readabilityScore: number;
  readabilityMetrics: {
    avgSentenceLength: number;
    avgWordLength: number;
    fleschReadingEase: number;
    gradeLevel: string;
  };
  suggestions: SEOSuggestion[];
  metaTitle: string;
  metaDescription: string;
}

/**
 * Keyword suggestion
 */
export interface KeywordSuggestion {
  keyword: string;
  searchVolume?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type: 'primary' | 'secondary' | 'long_tail' | 'related';
  relevance: number;
}

// ============================================================================
// Content Ideas Types
// ============================================================================

/**
 * Content idea suggestion
 */
export interface ContentIdea {
  id?: number;
  configId?: number;
  title: string;
  description: string;
  contentType: ContentType;
  suggestedPlatforms: SocialPlatform[];
  keywords: string[];
  relevanceScore: number;
  reasoning: string;
  status?: IdeaStatus;
  notes?: string;
  priority?: number;
  assignedTo?: number;
  scheduledFor?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Content ideas list response
 */
export interface ContentIdeasListResponse {
  ideas: ContentIdea[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Content Repurposing Types
// ============================================================================

/**
 * Repurposed content result
 */
export interface RepurposedContent {
  format: RepurposeFormat;
  content: string;
  metadata: {
    characterCount: number;
    wordCount: number;
    estimatedReadTime: number;
    platformLimit: number | null;
  };
  preservedMessages: string[];
  suggestedHashtags?: string[];
}

/**
 * Platform optimization result
 */
export interface OptimizedContent {
  content: string;
  platform: SocialPlatform;
  metadata: {
    characterCount: number;
    withinLimit: boolean;
    platformLimit: number;
  };
  hashtags?: string[];
  suggestions: string[];
}

// ============================================================================
// Input Types (Request Bodies)
// ============================================================================

/**
 * Input for training brand voice from samples
 */
export interface TrainVoiceInput {
  samples: Omit<VoiceSample, 'id' | 'createdAt'>[];
  brandDescription?: string;
  targetAudience?: string;
  tonePreferences?: BrandTone[];
  industry?: string;
}

/**
 * Input for checking voice consistency
 */
export interface CheckVoiceInput {
  content: string;
  strictMode?: boolean;
}

/**
 * Input for adding a voice sample
 */
export interface AddVoiceSampleInput {
  text: string;
  type: VoiceSampleType;
  source?: string;
  isGoodExample?: boolean;
}

/**
 * Input for content generation
 */
export interface GenerateContentInput {
  type: ContentType;
  topic: string;
  platforms?: SocialPlatform[];
  keywords?: string[];
  tone?: BrandTone;
  length?: 'short' | 'medium' | 'long';
  includeHashtags?: boolean;
  includeCTA?: boolean;
  context?: string;
  customInstructions?: string;
  targetLength?: number;
}

/**
 * Input for hashtag generation
 */
export interface GenerateHashtagsInput {
  content: string;
  platform?: SocialPlatform;
  count?: number;
  includeNiche?: boolean;
  includeTrending?: boolean;
  industry?: string;
}

/**
 * Input for caption generation
 */
export interface GenerateCaptionsInput {
  imageDescription: string;
  platform?: SocialPlatform;
  tone?: CaptionTone;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  variantCount?: number;
  maxLength?: number;
  callToAction?: string;
  brandContext?: string;
}

/**
 * Input for SEO analysis
 */
export interface AnalyzeSEOInput {
  content: string;
  targetKeywords: string[];
  contentType?: string;
  url?: string;
  checkReadability?: boolean;
  checkKeywordDensity?: boolean;
  generateMetaSuggestions?: boolean;
}

/**
 * Input for keyword suggestions
 */
export interface SuggestKeywordsInput {
  topic: string;
  industry?: string;
  count?: number;
  includeRelated?: boolean;
  includeLongTail?: boolean;
  targetAudience?: string;
  competitorKeywords?: string[];
}

/**
 * Input for generating content ideas
 */
export interface GenerateIdeasInput {
  industry?: string;
  topics?: string[];
  contentTypes?: ContentType[];
  count?: number;
  targetAudience?: string;
  competitorUrls?: string[];
  trendingTopics?: boolean;
  seasonalRelevance?: boolean;
}

/**
 * Filters for listing content ideas
 */
export interface ContentIdeasFilters {
  status?: IdeaStatus;
  contentType?: ContentType;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'relevanceScore' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Input for updating idea status
 */
export interface UpdateIdeaInput {
  status?: IdeaStatus;
  notes?: string;
  priority?: number;
  assignedTo?: number;
  scheduledFor?: string;
}

/**
 * Input for repurposing content
 */
export interface RepurposeContentInput {
  targetFormats: RepurposeFormat[];
  targetPlatforms?: SocialPlatform[];
  preserveKeyMessages?: boolean;
  adaptTone?: boolean;
  customInstructions?: string;
}

/**
 * Input for platform optimization
 */
export interface OptimizePlatformInput {
  content: string;
  sourcePlatform?: SocialPlatform;
  targetPlatform: SocialPlatform;
  optimizeHashtags?: boolean;
  optimizeLength?: boolean;
  optimizeTone?: boolean;
  includeEmojis?: boolean;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Voice profile response
 */
export interface VoiceProfileResponse {
  voiceProfile: BrandVoiceProfile;
}

/**
 * Voice samples response
 */
export interface VoiceSamplesResponse {
  samples: VoiceSample[];
}

/**
 * Voice sample response (single)
 */
export interface VoiceSampleResponse {
  sample: VoiceSample;
}

/**
 * Voice consistency response
 */
export interface VoiceConsistencyResponse {
  consistency: VoiceConsistencyResult;
}

/**
 * Generated content response
 */
export interface GeneratedContentResponse {
  content: GeneratedContent;
}

/**
 * Hashtags response
 */
export interface HashtagsResponse {
  hashtags: HashtagSuggestion[];
}

/**
 * Captions response
 */
export interface CaptionsResponse {
  captions: CaptionVariant[];
}

/**
 * SEO analysis response
 */
export interface SEOAnalysisResponse {
  analysis: SEOAnalysis;
}

/**
 * Keywords response
 */
export interface KeywordsResponse {
  keywords: KeywordSuggestion[];
}

/**
 * Content ideas response
 */
export interface ContentIdeasResponse {
  ideas: ContentIdea[];
}

/**
 * Single idea response
 */
export interface ContentIdeaResponse {
  idea: ContentIdea;
}

/**
 * Repurposed content response
 */
export interface RepurposedContentResponse {
  repurposed: RepurposedContent[];
}

/**
 * Optimized content response
 */
export interface OptimizedContentResponse {
  optimized: OptimizedContent;
}
