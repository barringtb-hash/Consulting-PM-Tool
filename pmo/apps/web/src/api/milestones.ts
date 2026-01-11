import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export const MILESTONE_STATUSES: MilestoneStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'DONE',
];

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MilestonePayload {
  projectId: number;
  name: string;
  description?: string;
  dueDate?: string;
  status?: MilestoneStatus;
}

export interface MilestoneUpdatePayload {
  name?: string;
  description?: string;
  dueDate?: string | null;
  status?: MilestoneStatus;
}

const MILESTONES_BASE_PATH = buildApiUrl('/milestones');

export async function fetchProjectMilestones(
  projectId: number,
): Promise<Milestone[]> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/milestones`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ milestones: Milestone[] }>(response);
  return data.milestones;
}

export async function fetchMilestone(milestoneId: number): Promise<Milestone> {
  const response = await fetch(
    `${MILESTONES_BASE_PATH}/${milestoneId}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ milestone: Milestone }>(response);
  return data.milestone;
}

export async function createMilestone(
  payload: MilestonePayload,
): Promise<Milestone> {
  const response = await fetch(
    MILESTONES_BASE_PATH,
    buildOptions({ method: 'POST', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{ milestone: Milestone }>(response);
  return data.milestone;
}

export async function updateMilestone(
  milestoneId: number,
  payload: MilestoneUpdatePayload,
): Promise<Milestone> {
  const response = await fetch(
    `${MILESTONES_BASE_PATH}/${milestoneId}`,
    buildOptions({ method: 'PATCH', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{ milestone: Milestone }>(response);
  return data.milestone;
}

export async function deleteMilestone(milestoneId: number): Promise<void> {
  await fetch(
    `${MILESTONES_BASE_PATH}/${milestoneId}`,
    buildOptions({ method: 'DELETE' }),
  );
}
