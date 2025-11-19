import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

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
} from '../api/tasks';

export const taskQueryKeys = {
  projectTasks: (projectId?: number) =>
    ['projects', projectId, 'tasks'] as const,
  task: (taskId?: number) => ['task', taskId] as const,
  myTasks: ['my-tasks'] as const,
};

export function useProjectTasks(
  projectId?: number,
): UseQueryResult<Task[], Error> {
  return useQuery({
    queryKey: taskQueryKeys.projectTasks(projectId),
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectTasks(projectId as number),
  });
}

export function useMyTasks(
  ownerId?: number,
): UseQueryResult<TaskWithProject[], Error> {
  return useQuery({
    queryKey: [...taskQueryKeys.myTasks, ownerId],
    enabled: Boolean(ownerId),
    queryFn: () => fetchMyTasks(ownerId),
  });
}

export function useCreateTask(): UseMutationResult<Task, Error, TaskPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createTask(payload),
    onSuccess: (task) => {
      queryClient.invalidateQueries({
        queryKey: taskQueryKeys.projectTasks(task.projectId),
      });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.myTasks });
      queryClient.setQueryData<Task[]>(
        taskQueryKeys.projectTasks(task.projectId),
        (current) => (current ? [task, ...current] : [task]),
      );
    },
  });
}

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
        queryKey: taskQueryKeys.projectTasks(targetProjectId),
      });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.myTasks });
      queryClient.setQueryData<Task[]>(
        taskQueryKeys.projectTasks(targetProjectId),
        (current) =>
          current?.map((existing) =>
            existing.id === task.id ? { ...existing, ...task } : existing,
          ) ?? current,
      );
    },
  });
}

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
        queryKey: taskQueryKeys.projectTasks(targetProjectId),
      });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.myTasks });
      queryClient.setQueryData<Task[]>(
        taskQueryKeys.projectTasks(targetProjectId),
        (current) =>
          current?.map((existing) =>
            existing.id === task.id ? { ...existing, ...task } : existing,
          ) ?? current,
      );
    },
  });
}

export function useDeleteTask(
  projectId?: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({
        queryKey: taskQueryKeys.projectTasks(projectId),
      });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.myTasks });
      queryClient.setQueryData<Task[]>(
        taskQueryKeys.projectTasks(projectId),
        (current) =>
          current?.filter((existing) => existing.id !== taskId) ?? current,
      );
    },
  });
}

export { TASK_PRIORITIES, TASK_STATUSES };
