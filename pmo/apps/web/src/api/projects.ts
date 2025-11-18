import { ApiError, api } from '../lib/apiClient';

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
  const url = query ? `/projects?${query}` : '/projects';
  const data = await api.get<{ projects: Project[] }>(url);
  return data.projects;
}

export async function fetchProjectById(projectId: number): Promise<Project> {
  const data = await api.get<{ project: Project }>(`/projects/${projectId}`);
  return data.project;
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const data = await api.post<{ project: Project }>('/projects', payload);
  return data.project;
}

export async function updateProject(
  projectId: number,
  payload: Partial<ProjectPayload>,
): Promise<Project> {
  const data = await api.put<{ project: Project }>(
    `/projects/${projectId}`,
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
