/**
 * CRM Opportunities API Client
 *
 * CRUD operations for CRM Opportunity entities.
 * Opportunities represent deals/potential revenue in the sales pipeline.
 */

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

// ============================================================================
// Types
// ============================================================================

export type StageType = 'OPEN' | 'WON' | 'LOST';

export interface PipelineStage {
  id: number;
  pipelineId: number;
  name: string;
  order: number;
  probability: number;
  stageType: StageType;
  color?: string | null;
  rottenDays?: number | null;
}

export interface Opportunity {
  id: number;
  tenantId: string;
  name: string;
  accountId: number;
  stageId: number;
  amount?: number | null;
  currency: string;
  probability: number;
  weightedAmount?: number | null;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  lostReason?: string | null;
  description?: string | null;
  nextStep?: string | null;
  leadSource?: string | null;
  ownerId?: number | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: number;
    name: string;
    type: string;
  };
  stage?: PipelineStage;
  _count?: {
    contacts: number;
    activities: number;
    stageHistory: number;
  };
}

export interface OpportunityFilters {
  accountId?: number;
  stageId?: number;
  pipelineId?: number;
  ownerId?: number;
  archived?: boolean;
  minAmount?: number;
  maxAmount?: number;
  expectedCloseBefore?: string;
  expectedCloseAfter?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OpportunityPayload {
  name: string;
  accountId: number;
  stageId: number;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  description?: string;
  nextStep?: string;
  leadSource?: string;
}

export interface OpportunityUpdatePayload extends Partial<OpportunityPayload> {
  actualCloseDate?: string;
  lostReason?: string;
  archived?: boolean;
}

export interface PaginatedOpportunities {
  data: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PipelineStats {
  totalValue: number;
  weightedValue: number;
  byStage: Array<{
    stageId: number;
    stageName: string;
    stageType: StageType;
    count: number;
    value: number;
    weightedValue: number;
  }>;
  winRate: number;
  averageDealSize: number;
  averageCycleTime: number;
}

export interface OpportunityClosingSoon {
  id: number;
  name: string;
  amount: number;
  expectedCloseDate: string;
  daysUntilClose: number;
  account: {
    id: number;
    name: string;
  };
  stage: {
    id: number;
    name: string;
  };
}

// ============================================================================
// API Functions
// ============================================================================

const OPPORTUNITIES_BASE_PATH = buildApiUrl('/crm/opportunities');

/**
 * Fetch opportunities with optional filtering and pagination
 */
export async function fetchOpportunities(
  filters?: OpportunityFilters,
): Promise<PaginatedOpportunities> {
  const params = new URLSearchParams();

  if (filters?.accountId) params.append('accountId', String(filters.accountId));
  if (filters?.stageId) params.append('stageId', String(filters.stageId));
  if (filters?.pipelineId)
    params.append('pipelineId', String(filters.pipelineId));
  if (filters?.ownerId) params.append('ownerId', String(filters.ownerId));
  if (filters?.archived !== undefined)
    params.append('archived', String(filters.archived));
  if (filters?.minAmount !== undefined)
    params.append('minAmount', String(filters.minAmount));
  if (filters?.maxAmount !== undefined)
    params.append('maxAmount', String(filters.maxAmount));
  if (filters?.expectedCloseBefore)
    params.append('expectedCloseBefore', filters.expectedCloseBefore);
  if (filters?.expectedCloseAfter)
    params.append('expectedCloseAfter', filters.expectedCloseAfter);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

  const query = params.toString();
  const url = query
    ? `${OPPORTUNITIES_BASE_PATH}?${query}`
    : OPPORTUNITIES_BASE_PATH;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  return handleResponse<PaginatedOpportunities>(response);
}

/**
 * Fetch a single opportunity by ID
 */
export async function fetchOpportunityById(id: number): Promise<Opportunity> {
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/${id}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: Opportunity }>(response);
  return data.data;
}

/**
 * Fetch pipeline statistics
 */
export async function fetchPipelineStats(
  pipelineId?: number,
): Promise<PipelineStats> {
  const params = pipelineId ? `?pipelineId=${pipelineId}` : '';
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/pipeline-stats${params}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: PipelineStats }>(response);
  return data.data;
}

/**
 * Fetch opportunities closing soon
 */
export async function fetchClosingSoon(
  days?: number,
): Promise<OpportunityClosingSoon[]> {
  const params = days ? `?days=${days}` : '';
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/closing-soon${params}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: OpportunityClosingSoon[] }>(
    response,
  );
  return data.data;
}

/**
 * Create a new opportunity
 */
export async function createOpportunity(
  payload: OpportunityPayload,
): Promise<Opportunity> {
  const response = await fetch(
    OPPORTUNITIES_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Opportunity }>(response);
  return data.data;
}

/**
 * Update an existing opportunity
 */
export async function updateOpportunity(
  id: number,
  payload: OpportunityUpdatePayload,
): Promise<Opportunity> {
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/${id}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Opportunity }>(response);
  return data.data;
}

/**
 * Move opportunity to a different stage
 */
export async function moveOpportunityToStage(
  id: number,
  stageId: number,
): Promise<Opportunity> {
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/${id}/stage`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ stageId }),
    }),
  );
  const data = await handleResponse<{ data: Opportunity }>(response);
  return data.data;
}

/**
 * Mark opportunity as won
 */
export async function markOpportunityWon(
  id: number,
  actualCloseDate?: string,
): Promise<Opportunity> {
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/${id}/won`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ actualCloseDate }),
    }),
  );
  const data = await handleResponse<{ data: Opportunity }>(response);
  return data.data;
}

/**
 * Mark opportunity as lost
 */
export async function markOpportunityLost(
  id: number,
  lostReason?: string,
): Promise<Opportunity> {
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/${id}/lost`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ lostReason }),
    }),
  );
  const data = await handleResponse<{ data: Opportunity }>(response);
  return data.data;
}

/**
 * Delete an opportunity permanently
 */
export async function deleteOpportunity(id: number): Promise<void> {
  const response = await fetch(
    `${OPPORTUNITIES_BASE_PATH}/${id}`,
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse(response);
}
