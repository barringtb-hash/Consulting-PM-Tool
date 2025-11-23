import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

export type LeadSource =
  | 'WEBSITE_CONTACT'
  | 'WEBSITE_DOWNLOAD'
  | 'REFERRAL'
  | 'LINKEDIN'
  | 'OUTBOUND'
  | 'EVENT'
  | 'OTHER';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'DISQUALIFIED'
  | 'CONVERTED';

export type ServiceInterest =
  | 'STRATEGY'
  | 'POC'
  | 'IMPLEMENTATION'
  | 'TRAINING'
  | 'PMO_ADVISORY'
  | 'NOT_SURE';

export interface InboundLead {
  id: number;
  name?: string | null;
  email: string;
  company?: string | null;
  website?: string | null;
  source: LeadSource;
  serviceInterest: ServiceInterest;
  message?: string | null;
  status: LeadStatus;
  ownerUserId?: number | null;
  clientId?: number | null;
  primaryContactId?: number | null;
  firstResponseAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: number;
    name: string;
    email: string;
  } | null;
  client?: {
    id: number;
    name: string;
  } | null;
  primaryContact?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface LeadFilters {
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
  ownerUserId?: number;
}

export interface LeadPayload {
  name?: string;
  email: string;
  company?: string;
  website?: string;
  source?: LeadSource;
  serviceInterest?: ServiceInterest;
  message?: string;
  ownerUserId?: number;
}

export interface LeadUpdatePayload {
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  source?: LeadSource;
  serviceInterest?: ServiceInterest;
  message?: string;
  status?: LeadStatus;
  ownerUserId?: number | null;
  clientId?: number | null;
  primaryContactId?: number | null;
  firstResponseAt?: string | null;
}

export interface LeadConversionPayload {
  createClient?: boolean;
  clientId?: number;
  createContact?: boolean;
  contactRole?: string;
  createProject?: boolean;
  projectName?: string;
  pipelineStage?: string;
  pipelineValue?: number;
}

export interface LeadConversionResult {
  lead: InboundLead;
  clientId?: number;
  contactId?: number;
  projectId?: number;
}

const LEADS_BASE_PATH = buildApiUrl('/leads');

export async function fetchLeads(
  filters?: LeadFilters,
): Promise<InboundLead[]> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.append('search', filters.search);
  }

  if (filters?.source) {
    params.append('source', filters.source);
  }

  if (filters?.status) {
    params.append('status', filters.status);
  }

  if (filters?.ownerUserId) {
    params.append('ownerUserId', filters.ownerUserId.toString());
  }

  const query = params.toString();
  const url = query ? `${LEADS_BASE_PATH}?${query}` : LEADS_BASE_PATH;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ leads: InboundLead[] }>(response);
  return data.leads;
}

export async function fetchLeadById(leadId: number): Promise<InboundLead> {
  const response = await fetch(
    `${LEADS_BASE_PATH}/${leadId}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ lead: InboundLead }>(response);
  return data.lead;
}

export async function createLead(payload: LeadPayload): Promise<InboundLead> {
  const response = await fetch(
    LEADS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ lead: InboundLead }>(response);
  return data.lead;
}

export async function updateLead(
  leadId: number,
  payload: LeadUpdatePayload,
): Promise<InboundLead> {
  const response = await fetch(
    `${LEADS_BASE_PATH}/${leadId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ lead: InboundLead }>(response);
  return data.lead;
}

export async function convertLead(
  leadId: number,
  payload: LeadConversionPayload,
): Promise<LeadConversionResult> {
  const response = await fetch(
    `${LEADS_BASE_PATH}/${leadId}/convert`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  return handleResponse<LeadConversionResult>(response);
}

export async function deleteLead(leadId: number): Promise<void> {
  const response = await fetch(
    `${LEADS_BASE_PATH}/${leadId}`,
    buildOptions({
      method: 'DELETE',
    }),
  );

  if (!response.ok) {
    throw new Error('Failed to delete lead');
  }
}
