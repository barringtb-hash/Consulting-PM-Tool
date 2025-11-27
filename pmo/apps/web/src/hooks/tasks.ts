/**
 * Legacy Tasks Hooks - Re-exports from Module-Aware Hooks
 *
 * This file maintains backwards compatibility for existing imports.
 * New code should import directly from '../api/hooks/tasks'.
 *
 * @deprecated Import from '../api/hooks/tasks' instead
 */

// Re-export everything from the new module structure
export {
  useProjectTasks,
  useMyTasks,
  useCreateTask,
  useUpdateTask,
  useMoveTask,
  useDeleteTask,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../api/hooks/tasks';

export type {
  Task,
  TaskMovePayload,
  TaskPayload,
  TaskUpdatePayload,
  TaskWithProject,
} from '../api/hooks/tasks';

// Legacy query keys for backwards compatibility
// New code should use queryKeys from '../api/hooks/queryKeys'
/**
 * @deprecated Use queryKeys from '../api/hooks/queryKeys' instead
 */
export const taskQueryKeys = {
  projectTasks: (projectId?: number) =>
    ['projects', projectId, 'tasks'] as const,
  task: (taskId?: number) => ['task', taskId] as const,
  myTasks: ['my-tasks'] as const,
};
