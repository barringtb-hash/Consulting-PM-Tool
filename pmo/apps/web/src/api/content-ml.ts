/**
 * Content ML API Client
 *
 * API client for AI-powered content generation endpoints.
 * Provides functions for brand voice training, content generation,
 * SEO analysis, content ideation, and content repurposing.
 *
 * @module api/content-ml
 */

import { http } from './http';
import type {
  // Input types
  TrainVoiceInput,
  CheckVoiceInput,
  AddVoiceSampleInput,
  GenerateContentInput,
  GenerateHashtagsInput,
  GenerateCaptionsInput,
  AnalyzeSEOInput,
  SuggestKeywordsInput,
  GenerateIdeasInput,
  ContentIdeasFilters,
  UpdateIdeaInput,
  RepurposeContentInput,
  OptimizePlatformInput,
  // Response types
  VoiceProfileResponse,
  VoiceSamplesResponse,
  VoiceSampleResponse,
  VoiceConsistencyResponse,
  GeneratedContentResponse,
  HashtagsResponse,
  CaptionsResponse,
  SEOAnalysisResponse,
  KeywordsResponse,
  ContentIdeasResponse,
  ContentIdeasListResponse,
  ContentIdeaResponse,
  RepurposedContentResponse,
  OptimizedContentResponse,
  BrandVoiceProfile,
} from './hooks/content-ml/types';

// ============================================================================
// Brand Voice API Functions
// ============================================================================

/**
 * Train brand voice from sample content
 *
 * @param configId - Configuration ID for the brand voice profile
 * @param input - Training input with samples and preferences
 * @returns Trained brand voice profile
 */
export async function trainBrandVoice(
  configId: number,
  input: TrainVoiceInput,
): Promise<VoiceProfileResponse> {
  return http.post(`/api/content-ml/${configId}/train-voice`, input);
}

/**
 * Get brand voice profile for a configuration
 *
 * @param configId - Configuration ID
 * @returns Brand voice profile
 */
export async function getVoiceProfile(
  configId: number,
): Promise<VoiceProfileResponse> {
  return http.get(`/api/content-ml/${configId}/voice-profile`);
}

/**
 * Check content for voice consistency against brand profile
 *
 * @param configId - Configuration ID
 * @param input - Content to check and options
 * @returns Voice consistency analysis result
 */
export async function checkVoiceConsistency(
  configId: number,
  input: CheckVoiceInput,
): Promise<VoiceConsistencyResponse> {
  return http.post(`/api/content-ml/${configId}/check-voice`, input);
}

/**
 * Get all voice samples for a configuration
 *
 * @param configId - Configuration ID
 * @returns List of voice samples
 */
export async function getVoiceSamples(
  configId: number,
): Promise<VoiceSamplesResponse> {
  return http.get(`/api/content-ml/${configId}/voice-samples`);
}

/**
 * Add a voice sample for training
 *
 * @param configId - Configuration ID
 * @param input - Voice sample data
 * @returns Created voice sample
 */
export async function addVoiceSample(
  configId: number,
  input: AddVoiceSampleInput,
): Promise<VoiceSampleResponse> {
  return http.post(`/api/content-ml/${configId}/voice-samples`, input);
}

// ============================================================================
// Content Generation API Functions
// ============================================================================

/**
 * Generate content using AI
 *
 * @param configId - Configuration ID for brand voice context
 * @param input - Content generation parameters
 * @returns Generated content with metadata
 */
export async function generateContent(
  configId: number,
  input: GenerateContentInput,
): Promise<GeneratedContentResponse> {
  return http.post(`/api/content-ml/${configId}/generate`, input);
}

/**
 * Generate hashtags for content
 *
 * @param input - Hashtag generation parameters
 * @returns List of suggested hashtags
 */
export async function generateHashtags(
  input: GenerateHashtagsInput,
): Promise<HashtagsResponse> {
  return http.post('/api/content-ml/hashtags', input);
}

/**
 * Generate image captions
 *
 * @param input - Caption generation parameters
 * @returns List of caption variants
 */
export async function generateCaptions(
  input: GenerateCaptionsInput,
): Promise<CaptionsResponse> {
  return http.post('/api/content-ml/captions', input);
}

// ============================================================================
// SEO API Functions
// ============================================================================

/**
 * Analyze content for SEO optimization
 *
 * @param configId - Configuration ID
 * @param input - SEO analysis parameters
 * @returns SEO analysis result with suggestions
 */
export async function analyzeSEO(
  configId: number,
  input: AnalyzeSEOInput,
): Promise<SEOAnalysisResponse> {
  return http.post(`/api/content-ml/${configId}/analyze-seo`, input);
}

/**
 * Suggest keywords for a topic
 *
 * @param configId - Configuration ID
 * @param input - Keyword suggestion parameters
 * @returns List of keyword suggestions
 */
export async function suggestKeywords(
  configId: number,
  input: SuggestKeywordsInput,
): Promise<KeywordsResponse> {
  return http.post(`/api/content-ml/${configId}/suggest-keywords`, input);
}

// ============================================================================
// Content Ideas API Functions
// ============================================================================

/**
 * Generate content ideas
 *
 * @param configId - Configuration ID
 * @param input - Idea generation parameters
 * @returns List of content ideas
 */
export async function generateContentIdeas(
  configId: number,
  input: GenerateIdeasInput,
): Promise<ContentIdeasResponse> {
  return http.post(`/api/content-ml/${configId}/ideas/generate`, input);
}

/**
 * List saved content ideas with filtering
 *
 * @param configId - Configuration ID
 * @param filters - Optional filters for the list
 * @returns Paginated list of content ideas
 */
export async function listContentIdeas(
  configId: number,
  filters?: ContentIdeasFilters,
): Promise<ContentIdeasListResponse> {
  const params = new URLSearchParams();

  if (filters?.status) params.set('status', filters.status);
  if (filters?.contentType) params.set('contentType', filters.contentType);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters?.offset !== undefined)
    params.set('offset', String(filters.offset));
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

  const query = params.toString();
  return http.get(
    `/api/content-ml/${configId}/ideas${query ? `?${query}` : ''}`,
  );
}

/**
 * Update content idea status
 *
 * @param configId - Configuration ID
 * @param ideaId - Idea ID to update
 * @param input - Update data
 * @returns Updated content idea
 */
export async function updateIdeaStatus(
  configId: number,
  ideaId: number,
  input: UpdateIdeaInput,
): Promise<ContentIdeaResponse> {
  return http.patch(`/api/content-ml/${configId}/ideas/${ideaId}`, input);
}

// ============================================================================
// Content Repurposing API Functions
// ============================================================================

/**
 * Repurpose existing content for different formats/platforms
 *
 * @param configId - Configuration ID
 * @param contentId - Source content ID
 * @param input - Repurposing parameters
 * @returns List of repurposed content variants
 */
export async function repurposeContent(
  configId: number,
  contentId: number,
  input: RepurposeContentInput,
): Promise<RepurposedContentResponse> {
  return http.post(`/api/content-ml/${configId}/repurpose/${contentId}`, input);
}

/**
 * Optimize content for a specific platform
 *
 * @param input - Platform optimization parameters
 * @returns Optimized content for the target platform
 */
export async function optimizeForPlatform(
  input: OptimizePlatformInput,
): Promise<OptimizedContentResponse> {
  return http.post('/api/content-ml/optimize-platform', input);
}

// ============================================================================
// Type Exports
// ============================================================================

export type { BrandVoiceProfile };
