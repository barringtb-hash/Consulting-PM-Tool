import { fetchProjects, type Project } from './projects';
import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

export type TaskStatus = 'BACKLOG' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type TaskPriority = 'P0' | 'P1' | 'P2';

export const TASK_STATUSES: TaskStatus[] = [
  'BACKLOG',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
];

export const TASK_PRIORITIES: TaskPriority[] = ['P0', 'P1', 'P2'];

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
}

export interface TaskWithProject extends Task {
  projectName?: string;
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
  priority?: TaskPriority;
  dueDate?: string;
  milestoneId?: number;
}

export interface TaskPayload {
  projectId: number;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  milestoneId?: number;
}

export interface TaskUpdatePayload {
  projectId?: number;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  milestoneId?: number | null;
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

export async function fetchMyTasks(
  ownerId?: number,
): Promise<TaskWithProject[]> {
  if (!ownerId) {
    return [];
  }

  const projects = await fetchProjects();
  const projectLookup = new Map<number, Project>();
  projects.forEach((project) => projectLookup.set(project.id, project));

  const tasksByProject = await Promise.all(
    projects.map((project) => fetchProjectTasks(project.id)),
  );

  return tasksByProject
    .flat()
    .filter((task) => task.ownerId === ownerId)
    .map((task) => ({
      ...task,
      projectName: projectLookup.get(task.projectId)?.name,
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
