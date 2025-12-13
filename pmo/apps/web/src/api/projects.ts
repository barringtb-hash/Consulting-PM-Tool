import { buildApiUrl } from './config';
import { ApiError, buildOptions, handleResponse } from './http';

export type ProjectStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProjectHealthStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

export type PipelineStage =
  | 'NEW_LEAD'
  | 'DISCOVERY'
  | 'SHAPING_SOLUTION'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'VERBAL_YES'
  | 'WON'
  | 'LOST';

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
  // M7 - Status & Reporting
  healthStatus?: ProjectHealthStatus;
  statusSummary?: string | null;
  statusUpdatedAt?: string | null;
  // Note: Pipeline fields removed - use CRM Opportunity for sales tracking
  // See /crm/opportunities for sales pipeline management
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

const PROJECTS_BASE_PATH = buildApiUrl('/projects');

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
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ projects: Project[] }>(response);
  return data.projects;
}

export async function fetchProjectById(projectId: number): Promise<Project> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}`,
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ project: Project }>(response);
  return data.project;
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const response = await fetch(
    PROJECTS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ project: Project }>(response);
  return data.project;
}

export async function updateProject(
  projectId: number,
  payload: Partial<ProjectPayload>,
): Promise<Project> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ project: Project }>(response);
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

// M7 - Status & Reporting API Functions

export interface ProjectStatusSnapshot {
  projectId: number;
  healthStatus: ProjectHealthStatus;
  statusSummary: string | null;
  statusUpdatedAt: string | null;
  taskCounts: Record<string, number>;
  overdueTasks: Array<{
    id: number;
    title: string;
    dueDate: string;
    status: string;
  }>;
  upcomingTasks: Array<{
    id: number;
    title: string;
    dueDate: string;
    status: string;
  }>;
  upcomingMilestones: Array<{
    id: number;
    name: string;
    dueDate: string;
    status: string;
  }>;
  currentMilestone: {
    id: number;
    name: string;
    dueDate: string;
    status: string;
  } | null;
  recentRisks: Array<{ meetingId: number; snippet: string; date: string }>;
  recentDecisions: Array<{ meetingId: number; snippet: string; date: string }>;
}

export interface UpdateHealthStatusPayload {
  healthStatus: ProjectHealthStatus;
  statusSummary?: string;
}

export interface StatusSummaryRequest {
  from?: string;
  to?: string;
  rangeDays?: number;
}

export interface StatusSummaryResponse {
  range: { from: string; to: string };
  completedTasks: Array<{ id: number; title: string; completedAt: string }>;
  upcomingTasks: Array<{ id: number; title: string; dueDate: string }>;
  upcomingMilestones: Array<{ id: number; name: string; dueDate: string }>;
  markdown: string;
}

export async function fetchProjectStatus(
  projectId: number,
  rangeDays = 7,
): Promise<ProjectStatusSnapshot> {
  const params = new URLSearchParams({ rangeDays: String(rangeDays) });
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/status?${params.toString()}`,
    buildOptions({ method: 'GET' }),
  );

  return handleResponse<ProjectStatusSnapshot>(response);
}

export async function updateProjectHealthStatus(
  projectId: number,
  payload: UpdateHealthStatusPayload,
): Promise<{
  healthStatus: ProjectHealthStatus;
  statusSummary: string | null;
  statusUpdatedAt: string | null;
}> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/status`,
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  );

  return handleResponse(response);
}

export async function generateStatusSummary(
  projectId: number,
  request: StatusSummaryRequest = {},
): Promise<StatusSummaryResponse> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/status-summary`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(request),
    }),
  );

  return handleResponse<StatusSummaryResponse>(response);
}

export async function deleteProject(projectId: number): Promise<void> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}`,
    buildOptions({
      method: 'DELETE',
    }),
  );

  await handleResponse(response);
}
