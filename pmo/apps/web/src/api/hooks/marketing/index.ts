/**
 * Marketing Module - React Query Hooks
 *
 * This module provides all React Query hooks for marketing content management.
 * Includes AI-powered content generation and repurposing.
 *
 * @module marketing
 * @see moduleRegistry for module dependencies and invalidation rules
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { invalidateRelatedModules } from '../moduleRegistry';
import {
  archiveMarketingContent,
  createMarketingContent,
  fetchMarketingContent,
  fetchMarketingContents,
  fetchProjectMarketingContents,
  generateMarketingContent,
  generateMarketingContentFromMeeting,
  generateMarketingContentFromProject,
  lintMarketingContent,
  repurposeMarketingContent,
  updateMarketingContent,
} from '../../marketing';
import type {
  ContentLintResult,
  CreateMarketingContentInput,
  GenerateContentInput,
  GeneratedContent,
  LintContentInput,
  MarketingContent,
  MarketingContentListQuery,
  RepurposeContentInput,
  UpdateMarketingContentInput,
} from '../../../../../packages/types/marketing';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all marketing contents with optional filters
 */
export function useMarketingContents(
  query?: MarketingContentListQuery,
): UseQueryResult<MarketingContent[], Error> {
  return useQuery({
    queryKey: queryKeys.marketing.list(query || {}),
    queryFn: () => fetchMarketingContents(query),
  });
}

/**
 * Fetch a single marketing content by ID
 */
export function useMarketingContent(
  contentId?: number,
): UseQueryResult<MarketingContent, Error> {
  return useQuery({
    queryKey: queryKeys.marketing.detail(contentId),
    queryFn: () => fetchMarketingContent(contentId!),
    enabled: !!contentId,
  });
}

/**
 * Fetch marketing contents for a specific project
 */
export function useProjectMarketingContents(
  projectId?: number,
): UseQueryResult<MarketingContent[], Error> {
  return useQuery({
    queryKey: queryKeys.marketing.byProject(projectId),
    queryFn: () => fetchProjectMarketingContents(projectId!),
    enabled: !!projectId,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new marketing content
 *
 * This mutation uses module-aware invalidation to update campaign summaries
 */
export function useCreateMarketingContent(): UseMutationResult<
  MarketingContent,
  Error,
  CreateMarketingContentInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMarketingContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all });

      // Cross-module invalidation: marketing content changes may affect campaign metrics
      invalidateRelatedModules(queryClient, {
        sourceModule: 'marketing',
        trigger: 'create',
      });
    },
  });
}

/**
 * Update an existing marketing content
 *
 * This mutation uses module-aware invalidation to update campaign summaries
 */
export function useUpdateMarketingContent(): UseMutationResult<
  MarketingContent,
  Error,
  { contentId: number; payload: UpdateMarketingContentInput },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, payload }) =>
      updateMarketingContent(contentId, payload),
    onSuccess: () => {
      // Invalidate all marketing queries including project-scoped lists
      queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all });

      // Cross-module invalidation: marketing content changes may affect campaign metrics
      invalidateRelatedModules(queryClient, {
        sourceModule: 'marketing',
        trigger: 'update',
      });
    },
  });
}

/**
 * Archive a marketing content (soft delete)
 *
 * This mutation uses module-aware invalidation to update campaign summaries
 */
export function useArchiveMarketingContent(): UseMutationResult<
  void,
  Error,
  number,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveMarketingContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all });

      // Cross-module invalidation: marketing content changes may affect campaign metrics
      invalidateRelatedModules(queryClient, {
        sourceModule: 'marketing',
        trigger: 'archive',
      });
    },
  });
}

/**
 * Generate marketing content using AI
 */
export function useGenerateMarketingContent(): UseMutationResult<
  GeneratedContent,
  Error,
  GenerateContentInput,
  unknown
> {
  return useMutation({
    mutationFn: generateMarketingContent,
  });
}

/**
 * Generate marketing content from a project using AI
 */
export function useGenerateMarketingContentFromProject(): UseMutationResult<
  GeneratedContent,
  Error,
  {
    projectId: number;
    payload: Omit<GenerateContentInput, 'sourceType' | 'sourceId'>;
  },
  unknown
> {
  return useMutation({
    mutationFn: ({ projectId, payload }) =>
      generateMarketingContentFromProject(projectId, payload),
  });
}

/**
 * Generate marketing content from a meeting using AI
 */
export function useGenerateMarketingContentFromMeeting(): UseMutationResult<
  GeneratedContent,
  Error,
  {
    meetingId: number;
    payload: Omit<GenerateContentInput, 'sourceType' | 'sourceId'>;
  },
  unknown
> {
  return useMutation({
    mutationFn: ({ meetingId, payload }) =>
      generateMarketingContentFromMeeting(meetingId, payload),
  });
}

/**
 * Repurpose existing content to a different format
 */
export function useRepurposeMarketingContent(): UseMutationResult<
  GeneratedContent,
  Error,
  { contentId: number; payload: RepurposeContentInput },
  unknown
> {
  return useMutation({
    mutationFn: ({ contentId, payload }) =>
      repurposeMarketingContent(contentId, payload),
  });
}

/**
 * Lint marketing content for quality and safety issues
 */
export function useLintMarketingContent(): UseMutationResult<
  ContentLintResult,
  Error,
  LintContentInput,
  unknown
> {
  return useMutation({
    mutationFn: lintMarketingContent,
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  ContentLintResult,
  CreateMarketingContentInput,
  GenerateContentInput,
  GeneratedContent,
  LintContentInput,
  MarketingContent,
  MarketingContentListQuery,
  RepurposeContentInput,
  UpdateMarketingContentInput,
} from '../../../../../packages/types/marketing';
