import { buildApiUrl } from './config';
import { ApiError, buildOptions, handleResponse } from './http';

export type ProjectStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProjectHealthStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

export type ProjectVisibility = 'PRIVATE' | 'TEAM' | 'TENANT';

export type ProjectRole = 'VIEW_ONLY' | 'EDIT' | 'ADMIN' | 'OWNER';

export type PipelineStage =
  | 'NEW_LEAD'
  | 'DISCOVERY'
  | 'SHAPING_SOLUTION'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'VERBAL_YES'
  | 'WON'
  | 'LOST';

export interface ProjectOwner {
  id: number;
  name: string;
  email: string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectRole;
  addedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  addedBy?: {
    id: number;
    name: string;
  } | null;
}

export interface ProjectMemberBasic {
  userId: number;
  role: ProjectRole;
}

export interface TenantUser {
  id: number;
  name: string;
  email: string;
  tenantRole: string;
}

export interface Project {
  id: number;
  clientId?: number | null; // @deprecated - use accountId
  accountId?: number | null; // Preferred: link to CRM Account
  ownerId: number;
  name: string;
  status: ProjectStatus;
  visibility?: ProjectVisibility;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  // M7 - Status & Reporting
  healthStatus?: ProjectHealthStatus;
  statusSummary?: string | null;
  statusUpdatedAt?: string | null;
  // Owner and members info (included when fetched)
  owner?: ProjectOwner;
  members?: ProjectMemberBasic[];
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
  visibility?: ProjectVisibility;
  startDate?: string;
  endDate?: string;
}

export interface AddProjectMemberPayload {
  userId: number;
  role?: ProjectRole;
}

export interface AddProjectMembersBulkPayload {
  members: AddProjectMemberPayload[];
}

export interface UpdateProjectMemberPayload {
  role: ProjectRole;
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

// Project Member Management Functions

export async function fetchTenantUsers(search?: string): Promise<TenantUser[]> {
  const params = new URLSearchParams();
  if (search) {
    params.append('search', search);
  }
  const query = params.toString();
  const url = query
    ? `${PROJECTS_BASE_PATH}/tenant-users?${query}`
    : `${PROJECTS_BASE_PATH}/tenant-users`;

  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ users: TenantUser[] }>(response);
  return data.users;
}

export async function fetchProjectMembers(
  projectId: number,
): Promise<ProjectMember[]> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/members`,
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ members: ProjectMember[] }>(response);
  return data.members;
}

export async function addProjectMember(
  projectId: number,
  payload: AddProjectMemberPayload,
): Promise<ProjectMember> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/members`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ member: ProjectMember }>(response);
  return data.member;
}

export async function addProjectMembersBulk(
  projectId: number,
  payload: AddProjectMembersBulkPayload,
): Promise<ProjectMember[]> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/members`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ members: ProjectMember[] }>(response);
  return data.members;
}

export async function updateProjectMember(
  projectId: number,
  userId: number,
  payload: UpdateProjectMemberPayload,
): Promise<ProjectMember> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/members/${userId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ member: ProjectMember }>(response);
  return data.member;
}

export async function removeProjectMember(
  projectId: number,
  userId: number,
): Promise<void> {
  const response = await fetch(
    `${PROJECTS_BASE_PATH}/${projectId}/members/${userId}`,
    buildOptions({
      method: 'DELETE',
    }),
  );

  await handleResponse(response);
}
