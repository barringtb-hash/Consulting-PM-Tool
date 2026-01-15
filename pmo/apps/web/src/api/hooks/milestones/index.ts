/**
 * Milestones Module - React Query Hooks
 *
 * This module provides all React Query hooks for milestone management.
 * Milestones belong to projects and can have tasks associated with them.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { QUERY_CONFIG } from '../queryConfig';
import { isProjectDeleting } from '../deletionTracker';
import {
  MILESTONE_STATUSES,
  createMilestone,
  deleteMilestone,
  fetchMilestone,
  fetchProjectMilestones,
  updateMilestone,
  type Milestone,
  type MilestonePayload,
  type MilestoneUpdatePayload,
} from '../../milestones';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all milestones for a project
 */
export function useProjectMilestones(
  projectId?: number,
): UseQueryResult<Milestone[], Error> {
  return useQuery({
    queryKey: queryKeys.milestones.byProject(projectId),
    // Disable query if project is being deleted to prevent 404 refetch race conditions
    enabled: Boolean(projectId) && !isProjectDeleting(projectId),
    queryFn: () => fetchProjectMilestones(projectId as number),
    ...QUERY_CONFIG,
  });
}

/**
 * Fetch a single milestone by ID
 */
export function useMilestone(
  milestoneId?: number,
): UseQueryResult<Milestone, Error> {
  return useQuery({
    queryKey: milestoneId
      ? queryKeys.milestones.detail(milestoneId)
      : queryKeys.milestones.all,
    enabled: Boolean(milestoneId),
    queryFn: () => fetchMilestone(milestoneId as number),
    ...QUERY_CONFIG,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new milestone
 */
export function useCreateMilestone(): UseMutationResult<
  Milestone,
  Error,
  MilestonePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createMilestone(payload),
    onSuccess: (milestone) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.milestones.byProject(milestone.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(milestone.projectId),
      });
    },
  });
}

/**
 * Update an existing milestone
 */
export function useUpdateMilestone(
  projectId?: number,
): UseMutationResult<
  Milestone,
  Error,
  { milestoneId: number; payload: MilestoneUpdatePayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ milestoneId, payload }) =>
      updateMilestone(milestoneId, payload),
    onSuccess: (milestone) => {
      const targetProjectId = projectId ?? milestone.projectId;
      queryClient.invalidateQueries({
        queryKey: queryKeys.milestones.byProject(targetProjectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(targetProjectId),
      });
      queryClient.setQueryData<Milestone[]>(
        queryKeys.milestones.byProject(targetProjectId),
        (current) =>
          current?.map((entry) =>
            entry.id === milestone.id ? { ...entry, ...milestone } : entry,
          ) ?? current,
      );
    },
  });
}

/**
 * Delete a milestone
 */
export function useDeleteMilestone(
  projectId?: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestoneId: number) => deleteMilestone(milestoneId),
    onSuccess: (_, milestoneId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.milestones.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(projectId),
      });
      queryClient.setQueryData<Milestone[]>(
        queryKeys.milestones.byProject(projectId),
        (current) =>
          current?.filter((entry) => entry.id !== milestoneId) ?? current,
      );
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export { MILESTONE_STATUSES };
export type {
  Milestone,
  MilestonePayload,
  MilestoneUpdatePayload,
} from '../../milestones';
