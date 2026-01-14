/**
 * Content ML Types
 *
 * Type definitions for AI-powered content generation module.
 * Includes brand voice analysis, SEO optimization, content ideation,
 * and multi-platform content repurposing.
 *
 * @module content-ml/types
 */

// ============================================================================
// Brand Voice Types (Legacy - for backward compatibility)
// ============================================================================

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
 * Brand voice profile for consistent content generation (Extended)
 */
export interface BrandVoiceProfile {
  /** Primary tone that dominates the brand voice */
  primaryTone: BrandTone;
  /** Secondary tones that complement the primary tone */
  secondaryTones: BrandTone[];
  /** Formality level of the brand voice */
  formality: FormalityLevel;
  /** Personality traits that define the brand */
  personality: string[];
  /** Preferred vocabulary (words/phrases to use) */
  vocabulary: {
    /** Words and phrases to use frequently */
    preferred: string[];
    /** Words and phrases to avoid */
    avoided: string[];
    /** Industry-specific terms */
    industryTerms: string[];
  };
  /** Sentence style preference */
  sentenceStyle: SentenceStyle;
  /** Rhetoric devices frequently used */
  rhetoricDevices: RhetoricDevice[];
  /** Tone dimensions (0-1 scale) */
  toneDimensions?: {
    formal: number;
    friendly: number;
    authoritative: number;
    playful: number;
    technical: number;
  };
  /** Vocabulary complexity level */
  vocabularyLevel?: 'simple' | 'moderate' | 'advanced';
  /** Key phrases to incorporate */
  keyPhrases?: string[];
  /** Phrases to avoid */
  avoidPhrases?: string[];
  /** Brand personality description */
  brandPersonality?: string;
  /** Target audience description */
  targetAudience?: string;
}

// ============================================================================
// Voice Training Types
// ============================================================================

/**
 * Input for voice training from samples
 */
export interface VoiceTrainingInput {
  /** Sample content pieces to analyze */
  samples: VoiceSample[];
  /** Brand description */
  brandDescription?: string;
  /** Target audience description */
  targetAudience?: string;
}

/**
 * Individual voice sample for training
 */
export interface VoiceSample {
  /** The sample text content */
  text: string;
  /** Type of content */
  type: 'social_post' | 'blog' | 'email' | 'website' | 'other';
  /** Source of the sample */
  source?: string;
  /** Whether this is a good example to emulate */
  isGoodExample: boolean;
}

/**
 * Result of voice consistency check
 */
export interface VoiceConsistencyResult {
  /** Overall consistency score (0-100) */
  consistencyScore: number;
  /** How well the tone matches the brand voice (0-100) */
  toneMatch: number;
  /** How well the vocabulary matches brand preferences (0-100) */
  vocabularyMatch: number;
  /** How well the style matches brand preferences (0-100) */
  styleMatch: number;
  /** List of deviations found */
  deviations: VoiceDeviation[];
  /** Overall feedback summary */
  overallFeedback: string;
}

/**
 * Legacy voice consistency result (deprecated, use VoiceConsistencyResult)
 * @deprecated Use VoiceConsistencyResult instead
 */
export interface LegacyVoiceConsistencyResult {
  /** Overall consistency score (0-1) */
  score: number;
  /** List of issues found */
  issues: VoiceIssue[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Individual voice issue found in content
 */
export interface VoiceIssue {
  /** Type of issue */
  type: 'tone' | 'vocabulary' | 'style' | 'phrase';
  /** Severity of the issue */
  severity: 'low' | 'medium' | 'high';
  /** Description of the issue */
  description: string;
  /** Location in content (character positions) */
  location?: { start: number; end: number };
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Voice deviation found during consistency check
 */
export interface VoiceDeviation {
  /** Location in the content (e.g., paragraph number, sentence) */
  location: string;
  /** Description of the issue */
  issue: string;
  /** Suggested fix */
  suggestion: string;
  /** Original text that deviates */
  originalText: string;
  /** Suggested replacement text */
  suggestedText: string;
}

/**
 * Result of voice consistency analysis (Extended version)
 */
export interface VoiceConsistencyAnalysis {
  /** Overall consistency score (0-100) */
  consistencyScore: number;
  /** How well the tone matches the brand voice (0-100) */
  toneMatch: number;
  /** How well the vocabulary matches brand preferences (0-100) */
  vocabularyMatch: number;
  /** How well the style matches brand preferences (0-100) */
  styleMatch: number;
  /** List of deviations found */
  deviations: VoiceDeviation[];
  /** Overall feedback summary */
  overallFeedback: string;
}

// ============================================================================
// Content Generation Request Types
// ============================================================================

/**
 * Request to generate content
 */
export interface ContentGenerationRequest {
  /** Type of content to generate */
  type: ContentType;
  /** Topic for the content */
  topic: string;
  /** Target platforms */
  platforms?: string[];
  /** Keywords to include */
  keywords?: string[];
  /** Desired tone */
  tone?: string;
  /** Content length preference */
  length?: 'short' | 'medium' | 'long';
  /** Whether to include hashtags */
  includeHashtags?: boolean;
  /** Whether to include a call-to-action */
  includeCTA?: boolean;
  /** Additional context for generation */
  context?: string;
}

/**
 * Generated content result
 */
export interface GeneratedContent {
  /** The generated content */
  content: string;
  /** HTML version of the content (if applicable) */
  contentHtml?: string;
  /** Content metadata */
  metadata: {
    /** Word count */
    wordCount: number;
    /** Estimated reading time in minutes */
    readingTime: number;
    /** Generated hashtags (if requested) */
    hashtags?: string[];
    /** Keywords found/used */
    keywords?: string[];
    /** SEO score (if analyzed) */
    seoScore?: number;
  };
  /** Platform-specific versions */
  platformVersions?: Record<string, string>;
}

// ============================================================================
// SEO Analysis Request Types
// ============================================================================

/**
 * Request for SEO analysis
 */
export interface SEOAnalysisRequest {
  /** Content to analyze */
  content: string;
  /** Target keywords to check */
  targetKeywords: string[];
  /** Type of content being analyzed */
  contentType: string;
}

/**
 * SEO analysis result (Simplified version)
 */
export interface SEOAnalysisResult {
  /** Overall SEO score (0-100) */
  score: number;
  /** Keyword density for each target keyword */
  keywordDensity: Record<string, number>;
  /** Readability score (0-100) */
  readabilityScore: number;
  /** Issues found */
  issues: SEOIssue[];
  /** Improvement suggestions */
  suggestions: string[];
}

/**
 * Individual SEO issue
 */
export interface SEOIssue {
  /** Type of issue */
  type: 'keyword' | 'readability' | 'structure' | 'meta';
  /** Severity of the issue */
  severity: 'low' | 'medium' | 'high';
  /** Description of the issue */
  description: string;
  /** How to fix the issue */
  suggestion: string;
}

// ============================================================================
// Content Ideas Types
// ============================================================================

/**
 * Request for content ideas
 */
export interface ContentIdeaRequest {
  /** Industry for content ideas */
  industry?: string;
  /** Topics to generate ideas for */
  topics?: string[];
  /** Types of content to suggest */
  contentTypes?: ContentType[];
  /** Number of ideas to generate */
  count?: number;
}

/**
 * Content idea suggestion
 */
export interface ContentIdeaSuggestion {
  /** Suggested title */
  title: string;
  /** Brief description of the idea */
  description: string;
  /** Type of content suggested */
  contentType: ContentType;
  /** Platforms where this would perform well */
  suggestedPlatforms: string[];
  /** Keywords to target */
  keywords: string[];
  /** Relevance score (0-100) */
  relevanceScore: number;
  /** Reasoning for the suggestion */
  reasoning: string;
}

// ============================================================================
// Content Repurposing Request Types
// ============================================================================

/**
 * Request to repurpose content
 */
export interface RepurposeRequest {
  /** Source content to repurpose */
  sourceContent: string;
  /** Type of the source content */
  sourceType: ContentType;
  /** Target content types to generate */
  targetTypes: ContentType[];
  /** Target platforms (optional) */
  targetPlatforms?: string[];
}

// ============================================================================
// SEO Types
// ============================================================================

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

/**
 * Individual SEO suggestion
 */
export interface SEOSuggestion {
  /** Type of SEO suggestion */
  type: SEOSuggestionType;
  /** Priority level */
  priority: SEOPriority;
  /** Description of the issue */
  issue: string;
  /** Suggested improvement */
  suggestion: string;
  /** Location in content (if applicable) */
  location: string | null;
}

/**
 * Complete SEO analysis result
 */
export interface SEOAnalysis {
  /** Overall SEO score (0-100) */
  seoScore: number;
  /** Keyword density analysis */
  keywordDensity: {
    /** Target keyword */
    keyword: string;
    /** Density percentage */
    density: number;
    /** Optimal range */
    optimalRange: {
      min: number;
      max: number;
    };
    /** Whether density is optimal */
    isOptimal: boolean;
  }[];
  /** Readability score (0-100, higher is easier to read) */
  readabilityScore: number;
  /** Readability metrics */
  readabilityMetrics: {
    /** Average sentence length */
    avgSentenceLength: number;
    /** Average word length */
    avgWordLength: number;
    /** Flesch reading ease score */
    fleschReadingEase: number;
    /** Grade level required */
    gradeLevel: string;
  };
  /** List of SEO suggestions */
  suggestions: SEOSuggestion[];
  /** Suggested meta title */
  metaTitle: string;
  /** Suggested meta description */
  metaDescription: string;
}

// ============================================================================
// Content Ideation Types
// ============================================================================

/**
 * Content types for ideation
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
 * Social media platforms
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
 * Content idea generated by AI
 */
export interface ContentIdea {
  /** Suggested title for the content */
  title: string;
  /** Brief description of the content idea */
  description: string;
  /** Type of content suggested */
  contentType: ContentType;
  /** Platforms where this content would perform well */
  suggestedPlatforms: SocialPlatform[];
  /** Keywords to target */
  keywords: string[];
  /** Relevance score (0-100) */
  relevanceScore: number;
  /** Reasoning for why this idea is relevant */
  reasoning: string;
}

// ============================================================================
// Content Repurposing Types
// ============================================================================

/**
 * Target format for repurposed content
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
 * Configuration for content repurposing
 */
export interface RepurposeConfig {
  /** ID of the source content */
  sourceContentId: string;
  /** Target formats to generate */
  targetFormats: RepurposeFormat[];
  /** Whether to preserve key messages from original */
  preserveKeyMessages: boolean;
  /** Whether to adapt tone for each platform */
  adaptTone: boolean;
  /** Optional: specific platforms to target */
  targetPlatforms?: SocialPlatform[];
  /** Optional: custom instructions for repurposing */
  customInstructions?: string;
}

/**
 * Result of content repurposing
 */
export interface RepurposedContent {
  /** Target format */
  format: RepurposeFormat;
  /** Generated content */
  content: string;
  /** Platform-specific metadata */
  metadata: {
    /** Character count */
    characterCount: number;
    /** Word count */
    wordCount: number;
    /** Estimated read time in seconds */
    estimatedReadTime: number;
    /** Platform character limit (if applicable) */
    platformLimit: number | null;
  };
  /** Key messages preserved from original */
  preservedMessages: string[];
  /** Suggested hashtags (if applicable) */
  suggestedHashtags?: string[];
}

// ============================================================================
// Hashtag Types
// ============================================================================

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
 * Suggested hashtag with metadata
 */
export interface HashtagSuggestion {
  /** The hashtag (with # prefix) */
  hashtag: string;
  /** Popularity level */
  popularity: HashtagPopularity;
  /** Relevance score (0-100) */
  relevance: number;
  /** Category of the hashtag */
  category: HashtagCategory;
  /** Optional: estimated reach */
  estimatedReach?: string;
  /** Optional: competition level */
  competition?: 'high' | 'medium' | 'low';
}

// ============================================================================
// Caption Types
// ============================================================================

/**
 * Caption tone for social media
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
 * Caption variant for A/B testing
 */
export interface CaptionVariant {
  /** The caption text */
  caption: string;
  /** Tone of this variant */
  tone: CaptionTone;
  /** Character count */
  characterCount: number;
  /** Suggested hashtags for this caption */
  hashtags: string[];
  /** Call to action (if included) */
  callToAction: string | null;
  /** Emoji usage level */
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
}

// ============================================================================
// Platform Configuration Types
// ============================================================================

/**
 * Platform-specific content constraints
 */
export interface PlatformConstraints {
  /** Maximum character count */
  characterLimit: number;
  /** Maximum hashtag count */
  hashtagLimit: number;
  /** Whether platform supports images */
  supportsImages: boolean;
  /** Whether platform supports videos */
  supportsVideos: boolean;
  /** Whether platform supports links */
  supportsLinks: boolean;
  /** Optimal posting times (in UTC hours) */
  optimalPostingHours: number[];
  /** Best practices for the platform */
  bestPractices: string[];
}

/**
 * Platform configuration map
 */
export type PlatformConfigMap = Record<SocialPlatform, PlatformConstraints>;

// ============================================================================
// Blog Generation Types
// ============================================================================

/**
 * Blog post structure
 */
export interface BlogPostStructure {
  /** Main title */
  title: string;
  /** Meta description for SEO */
  metaDescription: string;
  /** Introduction paragraph */
  introduction: string;
  /** Main sections of the blog */
  sections: {
    /** Section heading */
    heading: string;
    /** Section content */
    content: string;
    /** Subheadings within section */
    subheadings?: {
      heading: string;
      content: string;
    }[];
  }[];
  /** Conclusion paragraph */
  conclusion: string;
  /** Call to action */
  callToAction: string;
  /** SEO metadata */
  seo: {
    /** Primary keyword */
    primaryKeyword: string;
    /** Secondary keywords */
    secondaryKeywords: string[];
    /** Suggested URL slug */
    slug: string;
  };
}

// ============================================================================
// Content Generation Context Types
// ============================================================================

/**
 * Context for content generation
 */
export interface ContentGenerationContext {
  /** Brand voice profile to use */
  brandVoice: BrandVoiceProfile;
  /** Target audience description */
  targetAudience: string;
  /** Industry/niche */
  industry: string;
  /** Topic or theme */
  topic: string;
  /** Keywords to include */
  keywords: string[];
  /** Target platform(s) */
  platforms: SocialPlatform[];
  /** Content goal (awareness, engagement, conversion) */
  goal: 'awareness' | 'engagement' | 'conversion' | 'education';
  /** Optional: competitor content to differentiate from */
  competitorContent?: string;
  /** Optional: trending topics to incorporate */
  trendingTopics?: string[];
}

// ============================================================================
// Service Input/Output Types
// ============================================================================

/**
 * Input for brand voice training
 */
export interface BrandVoiceTrainingInput {
  /** Sample content pieces to analyze */
  sampleContent: string[];
  /** Brand name */
  brandName: string;
  /** Industry */
  industry: string;
  /** Target audience description */
  targetAudience: string;
  /** Any specific tone preferences */
  tonePreferences?: BrandTone[];
}

/**
 * Input for content generation
 */
export interface ContentGenerationInput {
  /** Type of content to generate */
  contentType: ContentType;
  /** Topic or subject */
  topic: string;
  /** Keywords to target */
  keywords: string[];
  /** Target platforms */
  platforms: SocialPlatform[];
  /** Brand voice profile ID or inline profile */
  brandVoice: string | BrandVoiceProfile;
  /** Optional: target length (words) */
  targetLength?: number;
  /** Optional: custom instructions */
  customInstructions?: string;
}

/**
 * LLM metadata for content generation
 */
export interface ContentLLMMetadata {
  /** Model used */
  model: string;
  /** Tokens consumed */
  tokensUsed: number;
  /** Latency in ms */
  latencyMs: number;
  /** Estimated cost in USD */
  estimatedCost: number;
}

/**
 * Content generation result
 */
export interface ContentGenerationResult {
  /** Generated content */
  content: string;
  /** Content type */
  contentType: ContentType;
  /** SEO analysis (if applicable) */
  seoAnalysis?: SEOAnalysis;
  /** Voice consistency check */
  voiceConsistency?: VoiceConsistencyResult;
  /** Suggested hashtags */
  hashtags?: HashtagSuggestion[];
  /** Platform variants */
  platformVariants?: Record<SocialPlatform, string>;
  /** LLM metadata */
  llmMetadata: ContentLLMMetadata;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Content ML configuration
 */
export interface ContentMLConfig {
  /** Enable ML content generation */
  enableContentGeneration: boolean;
  /** Enable SEO analysis */
  enableSEOAnalysis: boolean;
  /** Enable voice consistency checking */
  enableVoiceConsistency: boolean;
  /** LLM model to use */
  llmModel: string;
  /** Temperature for generation (0-1) */
  llmTemperature: number;
  /** Maximum tokens per generation */
  maxTokens: number;
  /** Enable content caching */
  enableCaching: boolean;
  /** Cache validity in hours */
  cacheValidityHours: number;
}

/**
 * Default content ML configuration
 */
export const DEFAULT_CONTENT_ML_CONFIG: ContentMLConfig = {
  enableContentGeneration: true,
  enableSEOAnalysis: true,
  enableVoiceConsistency: true,
  llmModel: 'gpt-4o-mini',
  llmTemperature: 0.7,
  maxTokens: 4096,
  enableCaching: true,
  cacheValidityHours: 24,
};
