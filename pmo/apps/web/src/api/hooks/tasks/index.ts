/**
 * Tasks Module - React Query Hooks
 *
 * This module provides all React Query hooks for task management.
 * Tasks belong to projects and can be assigned to users.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  createTask,
  deleteTask,
  fetchMyTasks,
  fetchProjectTasks,
  moveTask,
  updateTask,
  type Task,
  type TaskMovePayload,
  type TaskPayload,
  type TaskUpdatePayload,
  type TaskWithProject,
} from '../../tasks';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all tasks for a project
 */
export function useProjectTasks(
  projectId?: number,
): UseQueryResult<Task[], Error> {
  return useQuery({
    queryKey: queryKeys.tasks.byProject(projectId),
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectTasks(projectId as number),
  });
}

/**
 * Fetch tasks assigned to the current user
 */
export function useMyTasks(
  ownerId?: number,
): UseQueryResult<TaskWithProject[], Error> {
  return useQuery({
    queryKey: [...queryKeys.tasks.myTasks(), ownerId],
    enabled: Boolean(ownerId),
    queryFn: () => fetchMyTasks(ownerId),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new task
 */
export function useCreateTask(): UseMutationResult<Task, Error, TaskPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createTask(payload),
    onSuccess: (task) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(task.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.myTasks() });
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.byProject(task.projectId),
        (current) => (current ? [task, ...current] : [task]),
      );
    },
  });
}

/**
 * Update an existing task
 */
export function useUpdateTask(
  projectId?: number,
): UseMutationResult<
  Task,
  Error,
  { taskId: number; payload: TaskUpdatePayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }) => updateTask(taskId, payload),
    onSuccess: (task) => {
      const targetProjectId = projectId ?? task.projectId;
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(targetProjectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.myTasks() });
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.byProject(targetProjectId),
        (current) =>
          current?.map((existing) =>
            existing.id === task.id ? { ...existing, ...task } : existing,
          ) ?? current,
      );
    },
  });
}

/**
 * Move a task (change status/order)
 */
export function useMoveTask(
  projectId?: number,
): UseMutationResult<
  Task,
  Error,
  { taskId: number; payload: TaskMovePayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }) => moveTask(taskId, payload),
    onSuccess: (task) => {
      const targetProjectId = projectId ?? task.projectId;
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(targetProjectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.myTasks() });
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.byProject(targetProjectId),
        (current) =>
          current?.map((existing) =>
            existing.id === task.id ? { ...existing, ...task } : existing,
          ) ?? current,
      );
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask(
  projectId?: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.myTasks() });
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.byProject(projectId),
        (current) =>
          current?.filter((existing) => existing.id !== taskId) ?? current,
      );
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export { TASK_PRIORITIES, TASK_STATUSES };
export type {
  Task,
  TaskMovePayload,
  TaskPayload,
  TaskUpdatePayload,
  TaskWithProject,
} from '../../tasks';
