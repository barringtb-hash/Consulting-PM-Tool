/**
 * Projects Module - React Query Hooks
 *
 * This module provides all React Query hooks for project management.
 * Includes queries for fetching projects and mutations for CRUD operations,
 * as well as project status and health management.
 *
 * @module projects
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
import { QUERY_CONFIG } from '../queryConfig';
import { invalidateRelatedModules } from '../moduleRegistry';
import {
  isProjectDeleting,
  markProjectDeleting,
  unmarkProjectDeleting,
} from '../deletionTracker';
import {
  createProject,
  deleteProject,
  fetchProjectById,
  fetchProjectMembers,
  fetchProjects,
  fetchProjectStatus,
  generateStatusSummary,
  updateProject,
  updateProjectHealthStatus,
  type Project,
  type ProjectFilters,
  type ProjectMember,
  type ProjectPayload,
  type ProjectStatusSnapshot,
  type StatusSummaryRequest,
  type StatusSummaryResponse,
  type UpdateHealthStatusPayload,
} from '../../projects';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all projects with optional filters
 */
export function useProjects(
  filters?: ProjectFilters,
): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => fetchProjects(filters),
    ...QUERY_CONFIG,
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(projectId?: number): UseQueryResult<Project, Error> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: projectId
      ? queryKeys.projects.detail(projectId)
      : queryKeys.projects.all,
    // Disable query if project is being deleted to prevent 404 refetch race conditions
    enabled: Boolean(projectId) && !isProjectDeleting(projectId),
    queryFn: () => fetchProjectById(projectId as number),
    ...QUERY_CONFIG,
    initialData: () => {
      if (!projectId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Project[]>({
        queryKey: queryKeys.projects.lists(),
        type: 'active',
      });

      for (const [, projects] of cachedLists) {
        const match = projects?.find((entry) => entry.id === projectId);
        if (match) {
          return match;
        }
      }

      return undefined;
    },
  });
}

/**
 * Fetch project status with metrics
 */
export function useProjectStatus(
  projectId?: number,
  rangeDays = 7,
): UseQueryResult<ProjectStatusSnapshot, Error> {
  return useQuery({
    queryKey: projectId
      ? queryKeys.projects.status(projectId, rangeDays)
      : queryKeys.projects.all,
    // Disable query if project is being deleted to prevent 404 refetch race conditions
    enabled: Boolean(projectId) && !isProjectDeleting(projectId),
    queryFn: () => fetchProjectStatus(projectId as number, rangeDays),
    ...QUERY_CONFIG,
  });
}

/**
 * Fetch project members (for task assignment dropdowns)
 */
export function useProjectMembers(
  projectId?: number,
): UseQueryResult<ProjectMember[], Error> {
  return useQuery({
    queryKey: projectId
      ? queryKeys.projects.members(projectId)
      : queryKeys.projects.all,
    enabled: Boolean(projectId) && !isProjectDeleting(projectId),
    queryFn: () => fetchProjectMembers(projectId as number),
    ...QUERY_CONFIG,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new project
 */
export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  ProjectPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectPayload) => createProject(payload),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.setQueryData(queryKeys.projects.detail(project.id), project);
    },
  });
}

/**
 * Update an existing project
 */
export function useUpdateProject(
  projectId: number,
): UseMutationResult<Project, Error, Partial<ProjectPayload>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ProjectPayload>) =>
      updateProject(projectId, payload),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.setQueryData(queryKeys.projects.detail(projectId), project);
    },
  });
}

/**
 * Delete a project
 *
 * This mutation:
 * 1. Marks the project as "deleting" to disable all related queries
 * 2. Cancels and removes all project-related queries from cache
 * 3. Makes the delete request
 * 4. Cleans up related queries and unmarks when settled (success or error)
 */
export function useDeleteProject(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      // Mark project as deleting FIRST - this disables all queries for this project
      // and prevents any refetches while the delete is in progress
      markProjectDeleting(projectId);

      // Cancel any in-flight queries
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: queryKeys.projects.detail(projectId),
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.milestones.byProject(projectId),
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.tasks.byProject(projectId),
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.meetings.byProject(projectId),
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.marketing.byProject(projectId),
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.assets.byProject(projectId),
        }),
      ]);

      // Remove project-specific queries from cache
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      // Now perform the actual delete
      return deleteProject(projectId);
    },
    onSuccess: (_, projectId) => {
      // Cross-module removal using module registry rules
      invalidateRelatedModules(queryClient, {
        sourceModule: 'projects',
        trigger: 'delete',
        entityId: projectId,
      });

      // Invalidate project lists to refresh UI
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
    onSettled: (_, __, projectId) => {
      // Always unmark the project when mutation settles (success or error)
      // On success: user has navigated away, cleanup is complete
      // On error: re-enables queries so user can retry or continue viewing
      unmarkProjectDeleting(projectId);
    },
  });
}

/**
 * Update project health status
 */
export function useUpdateProjectHealthStatus(
  projectId: number,
): UseMutationResult<Project, Error, UpdateHealthStatusPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateHealthStatusPayload) =>
      updateProjectHealthStatus(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.status(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/**
 * Generate AI-powered status summary
 */
export function useGenerateStatusSummary(
  projectId: number,
): UseMutationResult<StatusSummaryResponse, Error, StatusSummaryRequest> {
  return useMutation({
    mutationFn: (request: StatusSummaryRequest) =>
      generateStatusSummary(projectId, request),
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  Project,
  ProjectFilters,
  ProjectMember,
  ProjectPayload,
  ProjectStatusSnapshot,
  StatusSummaryRequest,
  StatusSummaryResponse,
  UpdateHealthStatusPayload,
} from '../../projects';
