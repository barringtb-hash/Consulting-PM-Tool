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
import { invalidateRelatedModules } from '../moduleRegistry';
import {
  createProject,
  deleteProject,
  fetchProjectById,
  fetchProjects,
  fetchProjectStatus,
  generateStatusSummary,
  updateProject,
  updateProjectHealthStatus,
  type Project,
  type ProjectFilters,
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
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectById(projectId as number),
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
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectStatus(projectId as number, rangeDays),
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
 * This mutation cancels and removes all project-related queries from the cache
 * to prevent 404 errors, then invalidates list queries to refresh the UI.
 */
export function useDeleteProject(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      // Cancel all queries for this project BEFORE making the delete request
      // This prevents any in-flight or pending refetches from completing
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

      // Now perform the actual delete
      return deleteProject(projectId);
    },
    onSuccess: (_, projectId) => {
      // Remove all queries specific to this project to prevent 404 refetch errors.
      // These removals must happen before navigation away from the project page.
      // Components on the project screen may still trigger refetches during the
      // transition; clearing project-scoped queries here prevents 404 refetch
      // errors against a project that has just been deleted.
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      // Remove project status queries (nested under detail)
      queryClient.removeQueries({
        queryKey: queryKeys.projects.status(projectId),
      });

      // Remove project assets queries
      queryClient.removeQueries({
        queryKey: queryKeys.assets.byProject(projectId),
      });

      // Cross-module removal using module registry rules
      // This removes tasks, milestones, meetings, documents, marketing queries
      invalidateRelatedModules(queryClient, {
        sourceModule: 'projects',
        trigger: 'delete',
        entityId: projectId,
      });

      // Invalidate project lists to refresh UI (this won't cause 404s
      // because list endpoints return arrays, not single resources)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
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
  ProjectPayload,
  ProjectStatusSnapshot,
  StatusSummaryRequest,
  StatusSummaryResponse,
  UpdateHealthStatusPayload,
} from '../../projects';
