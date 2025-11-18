import { api } from '../lib/apiClient';
import { ApiError } from './http';

export type ProjectStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Project {
  id: number;
  clientId: number;
  ownerId: number;
  name: string;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  clientId?: number;
  status?: ProjectStatus;
}

export interface ProjectPayload {
  clientId: number;
  name: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

const PROJECTS_BASE_PATH = '/projects';

export async function fetchProjects(
  filters?: ProjectFilters,
): Promise<Project[]> {
  const params = new URLSearchParams();

  if (filters?.clientId) {
    params.append('clientId', String(filters.clientId));
  }

  if (filters?.status) {
    params.append('status', filters.status);
  }

  const query = params.toString();
  const url = query ? `${PROJECTS_BASE_PATH}?${query}` : PROJECTS_BASE_PATH;
  const data = await api.get<{ projects: Project[] }>(url);
  return data.projects;
}

export async function fetchProjectById(projectId: number): Promise<Project> {
  const data = await api.get<{ project: Project }>(
    `${PROJECTS_BASE_PATH}/${projectId}`,
  );
  return data.project;
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const data = await api.post<{ project: Project }>(
    PROJECTS_BASE_PATH,
    payload,
  );
  return data.project;
}

export async function updateProject(
  projectId: number,
  payload: Partial<ProjectPayload>,
): Promise<Project> {
  const data = await api.put<{ project: Project }>(
    `${PROJECTS_BASE_PATH}/${projectId}`,
    payload,
  );
  return data.project;
}

export async function fetchProjectOrThrow(projectId: number): Promise<Project> {
  try {
    return await fetchProjectById(projectId);
  } catch (error) {
    if ((error as ApiError).status === 404) {
      const notFoundError = new Error('Project not found') as ApiError;
      notFoundError.status = 404;
      throw notFoundError;
    }

    throw error;
  }
}
