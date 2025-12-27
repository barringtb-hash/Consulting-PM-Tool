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
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  milestoneId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithProject extends Task {
  projectName?: string;
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

  // Use Promise.allSettled to handle individual project fetch failures gracefully
  // This prevents one 403/404 from failing the entire request
  const taskResults = await Promise.allSettled(
    projects.map((project) => fetchProjectTasks(project.id)),
  );

  // Extract successful results, log failed fetches for debugging
  const tasksByProject: Task[][] = [];
  taskResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      tasksByProject.push(result.value);
    } else if (import.meta.env.DEV) {
      // Log failures in development to help diagnose permission issues
      const failedProject = projects[index];
      console.warn(
        `[fetchMyTasks] Failed to fetch tasks for project ${failedProject?.id}:`,
        result.reason,
      );
    }
  });

  return tasksByProject
    .flat()
    .filter((task) => task.ownerId === ownerId)
    .map((task) => ({
      ...task,
      projectName: projectLookup.get(task.projectId)?.name,
    }));
}
