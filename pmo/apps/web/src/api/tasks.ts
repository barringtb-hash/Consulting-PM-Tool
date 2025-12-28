import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

export type TaskStatus =
  | 'NOT_STARTED'
  | 'BACKLOG'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'DONE';
export type TaskPriority = 'P0' | 'P1' | 'P2';

export const TASK_STATUSES: TaskStatus[] = [
  'NOT_STARTED',
  'BACKLOG',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
];

export const TASK_PRIORITIES: TaskPriority[] = ['P0', 'P1', 'P2'];

// ============================================================================
// Formatting utilities
// ============================================================================

/**
 * Format a task status for display (e.g., "IN_PROGRESS" -> "In Progress")
 */
export function formatStatusLabel(status: TaskStatus): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Display labels for task priorities
 */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0: 'High',
  P1: 'Medium',
  P2: 'Low',
};

/**
 * Format a task priority for display (e.g., "P0" -> "High")
 */
export function formatPriorityLabel(
  priority: TaskPriority | null | undefined,
): string {
  if (!priority) return 'None';
  return PRIORITY_LABELS[priority] ?? priority;
}

/**
 * Get badge variant color for task status
 */
export const STATUS_BADGE_VARIANTS: Record<
  TaskStatus,
  'neutral' | 'primary' | 'danger' | 'success'
> = {
  NOT_STARTED: 'neutral',
  BACKLOG: 'neutral',
  IN_PROGRESS: 'primary',
  BLOCKED: 'danger',
  DONE: 'success',
};

/**
 * Get badge variant color for task priority
 */
export const PRIORITY_BADGE_VARIANTS: Record<
  TaskPriority,
  'danger' | 'warning' | 'neutral'
> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'neutral',
};

export interface TaskAssignee {
  id: number;
  userId: number;
  assignedAt: string;
  assignedById: number | null;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Task {
  id: number;
  projectId: number;
  ownerId: number;
  parentTaskId?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  milestoneId?: number | null;
  createdAt: string;
  updatedAt: string;
  // Subtask counts (included when listing parent tasks)
  subTaskCount?: number;
  subTaskCompletedCount?: number;
  // Assignees (included in responses)
  assignees?: TaskAssignee[];
}

export interface TaskWithProject extends Task {
  projectName?: string;
  parentTask?: {
    id: number;
    title: string;
  } | null;
}

export interface TaskWithSubtasks extends Task {
  subTasks: Task[];
  project?: {
    ownerId: number;
    name: string;
  };
  milestone?: {
    id: number;
    name: string;
  } | null;
}

export interface SubtaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
  milestoneId?: number;
  assigneeIds?: number[];
}

export interface SubtaskStatusPayload {
  status: TaskStatus;
}

export interface TaskPayload {
  projectId: number;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  milestoneId?: number;
  assigneeIds?: number[];
}

export interface TaskUpdatePayload {
  projectId?: number;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  milestoneId?: number | null;
  assigneeIds?: number[];
}

export interface TaskMovePayload {
  status?: TaskStatus;
  milestoneId?: number | null;
}

const TASKS_BASE_PATH = buildApiUrl('/tasks');

export async function fetchProjectTasks(projectId: number): Promise<Task[]> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/tasks`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ tasks: Task[] }>(response);
  return data.tasks;
}

export async function fetchTask(taskId: number): Promise<Task> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${taskId}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ task: Task }>(response);
  return data.task;
}

export async function createTask(payload: TaskPayload): Promise<Task> {
  const response = await fetch(
    TASKS_BASE_PATH,
    buildOptions({ method: 'POST', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{ task: Task }>(response);
  return data.task;
}

export async function updateTask(
  taskId: number,
  payload: TaskUpdatePayload,
): Promise<Task> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${taskId}`,
    buildOptions({ method: 'PATCH', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{ task: Task }>(response);
  return data.task;
}

export async function moveTask(
  taskId: number,
  payload: TaskMovePayload,
): Promise<Task> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${taskId}/move`,
    buildOptions({ method: 'PATCH', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{ task: Task }>(response);
  return data.task;
}

export async function deleteTask(taskId: number): Promise<void> {
  await fetch(
    `${TASKS_BASE_PATH}/${taskId}`,
    buildOptions({ method: 'DELETE' }),
  );
}

interface MyTasksApiResponse {
  id: number;
  projectId: number;
  ownerId: number;
  parentTaskId?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  milestoneId?: number | null;
  createdAt: string;
  updatedAt: string;
  subTaskCount?: number;
  subTaskCompletedCount?: number;
  assignees?: TaskAssignee[];
  project?: {
    id: number;
    name: string;
  };
  parentTask?: {
    id: number;
    title: string;
  } | null;
}

export async function fetchMyTasks(
  _userId?: number,
): Promise<TaskWithProject[]> {
  // Use the dedicated endpoint that returns all tasks assigned to the user
  const response = await fetch(
    `${TASKS_BASE_PATH}/my`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ tasks: MyTasksApiResponse[] }>(response);

  return data.tasks.map((task) => ({
    id: task.id,
    projectId: task.projectId,
    ownerId: task.ownerId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    milestoneId: task.milestoneId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    subTaskCount: task.subTaskCount,
    subTaskCompletedCount: task.subTaskCompletedCount,
    assignees: task.assignees,
    projectName: task.project?.name,
    parentTask: task.parentTask,
  }));
}

// ============================================================================
// Task detail with subtasks
// ============================================================================

export async function fetchTaskWithSubtasks(
  taskId: number,
): Promise<TaskWithSubtasks> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${taskId}/details`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ task: TaskWithSubtasks }>(response);
  return data.task;
}

// ============================================================================
// Subtask operations
// ============================================================================

export async function fetchSubtasks(parentTaskId: number): Promise<Task[]> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${parentTaskId}/subtasks`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ subtasks: Task[] }>(response);
  return data.subtasks;
}

export async function createSubtask(
  parentTaskId: number,
  payload: SubtaskPayload,
): Promise<Task> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${parentTaskId}/subtasks`,
    buildOptions({ method: 'POST', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{ subtask: Task }>(response);
  return data.subtask;
}

export async function toggleSubtask(
  parentTaskId: number,
  subtaskId: number,
): Promise<Task> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${parentTaskId}/subtasks/${subtaskId}/toggle`,
    buildOptions({ method: 'PATCH' }),
  );
  const data = await handleResponse<{ subtask: Task }>(response);
  return data.subtask;
}

export async function updateSubtaskStatus(
  parentTaskId: number,
  subtaskId: number,
  payload: SubtaskStatusPayload,
): Promise<Task> {
  const response = await fetch(
    `${TASKS_BASE_PATH}/${parentTaskId}/subtasks/${subtaskId}/status`,
    buildOptions({ method: 'PATCH', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{ subtask: Task }>(response);
  return data.subtask;
}
