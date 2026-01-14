/**
 * Content ML React Query Hooks
 *
 * Provides React Query hooks for AI-powered content generation.
 * Includes hooks for brand voice training, content generation,
 * SEO analysis, content ideation, and content repurposing.
 *
 * @module hooks/content-ml
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as contentMLApi from '../../content-ml';
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
  BrandVoiceProfile,
  VoiceSample,
  VoiceConsistencyResult,
  GeneratedContent,
  HashtagSuggestion,
  CaptionVariant,
  SEOAnalysis,
  KeywordSuggestion,
  ContentIdea,
  RepurposedContent,
  OptimizedContent,
} from './types';

// =============================================================================
// BRAND VOICE HOOKS
// =============================================================================

/**
 * Get the brand voice profile for a configuration
 *
 * @param configId - Configuration ID for the voice profile
 * @returns Query result with the voice profile
 */
export function useVoiceProfile(configId: number) {
  return useQuery({
    queryKey: queryKeys.contentML.voice.profile(configId),
    queryFn: () => contentMLApi.getVoiceProfile(configId),
    enabled: !!configId,
    select: (data) => data.voiceProfile,
  });
}

/**
 * Train brand voice from sample content
 *
 * @returns Mutation for training brand voice
 */
export function useTrainBrandVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: TrainVoiceInput;
    }) => contentMLApi.trainBrandVoice(configId, input),
    onSuccess: (_, variables) => {
      // Invalidate voice profile and samples
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentML.voice.profile(variables.configId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentML.voice.samples(variables.configId),
      });
    },
  });
}

/**
 * Check content for voice consistency against brand profile
 *
 * @returns Mutation for checking voice consistency
 */
export function useCheckVoiceConsistency() {
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CheckVoiceInput;
    }) => contentMLApi.checkVoiceConsistency(configId, input),
  });
}

/**
 * Get all voice samples for a configuration
 *
 * @param configId - Configuration ID
 * @returns Query result with voice samples
 */
export function useVoiceSamples(configId: number) {
  return useQuery({
    queryKey: queryKeys.contentML.voice.samples(configId),
    queryFn: () => contentMLApi.getVoiceSamples(configId),
    enabled: !!configId,
    select: (data) => data.samples,
  });
}

/**
 * Add a voice sample for training
 *
 * @returns Mutation for adding voice samples
 */
export function useAddVoiceSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: AddVoiceSampleInput;
    }) => contentMLApi.addVoiceSample(configId, input),
    onSuccess: (_, variables) => {
      // Invalidate voice samples list
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentML.voice.samples(variables.configId),
      });
    },
  });
}

// =============================================================================
// CONTENT GENERATION HOOKS
// =============================================================================

/**
 * Generate content using AI
 *
 * @returns Mutation for generating content
 */
export function useGenerateContent() {
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: GenerateContentInput;
    }) => contentMLApi.generateContent(configId, input),
  });
}

/**
 * Generate hashtags for content
 *
 * @returns Mutation for generating hashtags
 */
export function useGenerateHashtags() {
  return useMutation({
    mutationFn: (input: GenerateHashtagsInput) =>
      contentMLApi.generateHashtags(input),
  });
}

/**
 * Generate image captions
 *
 * @returns Mutation for generating captions
 */
export function useGenerateCaptions() {
  return useMutation({
    mutationFn: (input: GenerateCaptionsInput) =>
      contentMLApi.generateCaptions(input),
  });
}

// =============================================================================
// SEO HOOKS
// =============================================================================

/**
 * Analyze content for SEO optimization
 *
 * @returns Mutation for SEO analysis
 */
export function useAnalyzeSEO() {
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: AnalyzeSEOInput;
    }) => contentMLApi.analyzeSEO(configId, input),
  });
}

/**
 * Suggest keywords for a topic
 *
 * @returns Mutation for keyword suggestions
 */
export function useSuggestKeywords() {
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: SuggestKeywordsInput;
    }) => contentMLApi.suggestKeywords(configId, input),
  });
}

// =============================================================================
// CONTENT IDEAS HOOKS
// =============================================================================

/**
 * Get saved content ideas with optional filtering
 *
 * @param configId - Configuration ID
 * @param filters - Optional filters for the list
 * @returns Query result with paginated content ideas
 */
export function useContentIdeas(
  configId: number,
  filters?: ContentIdeasFilters,
) {
  return useQuery({
    queryKey: queryKeys.contentML.ideas.list(
      configId,
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => contentMLApi.listContentIdeas(configId, filters),
    enabled: !!configId,
  });
}

/**
 * Generate content ideas
 *
 * @returns Mutation for generating content ideas
 */
export function useGenerateContentIdeas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: GenerateIdeasInput;
    }) => contentMLApi.generateContentIdeas(configId, input),
    onSuccess: (_, variables) => {
      // Invalidate ideas list to show new ideas
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentML.ideas.all(variables.configId),
      });
    },
  });
}

/**
 * Update content idea status
 *
 * @returns Mutation for updating idea status
 */
export function useUpdateIdeaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      ideaId,
      input,
    }: {
      configId: number;
      ideaId: number;
      input: UpdateIdeaInput;
    }) => contentMLApi.updateIdeaStatus(configId, ideaId, input),
    onSuccess: (_, variables) => {
      // Invalidate specific idea and ideas list
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentML.ideas.detail(
          variables.configId,
          variables.ideaId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentML.ideas.all(variables.configId),
      });
    },
  });
}

// =============================================================================
// REPURPOSING HOOKS
// =============================================================================

/**
 * Repurpose existing content for different formats/platforms
 *
 * @returns Mutation for repurposing content
 */
export function useRepurposeContent() {
  return useMutation({
    mutationFn: ({
      configId,
      contentId,
      input,
    }: {
      configId: number;
      contentId: number;
      input: RepurposeContentInput;
    }) => contentMLApi.repurposeContent(configId, contentId, input),
  });
}

/**
 * Optimize content for a specific platform
 *
 * @returns Mutation for platform optimization
 */
export function useOptimizeForPlatform() {
  return useMutation({
    mutationFn: (input: OptimizePlatformInput) =>
      contentMLApi.optimizeForPlatform(input),
  });
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
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
  // Entity types
  BrandVoiceProfile,
  VoiceSample,
  VoiceConsistencyResult,
  GeneratedContent,
  HashtagSuggestion,
  CaptionVariant,
  SEOAnalysis,
  KeywordSuggestion,
  ContentIdea,
  RepurposedContent,
  OptimizedContent,
};
