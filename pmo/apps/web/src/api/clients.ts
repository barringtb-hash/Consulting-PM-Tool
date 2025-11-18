import { api } from '../lib/apiClient';
import { ApiError } from './http';

export type CompanySize = 'MICRO' | 'SMALL' | 'MEDIUM';
export type AiMaturity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface Client {
  id: number;
  name: string;
  industry?: string | null;
  companySize?: CompanySize | null;
  timezone?: string | null;
  aiMaturity?: AiMaturity | null;
  notes?: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFilters {
  search?: string;
  companySize?: CompanySize;
  aiMaturity?: AiMaturity;
  includeArchived?: boolean;
}

export interface ClientPayload {
  name: string;
  industry?: string;
  companySize?: CompanySize;
  timezone?: string;
  aiMaturity?: AiMaturity;
  notes?: string;
}

const CLIENTS_BASE_PATH = '/clients';

export async function fetchClients(filters?: ClientFilters): Promise<Client[]> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.append('search', filters.search);
  }

  if (filters?.companySize) {
    params.append('companySize', filters.companySize);
  }

  if (filters?.aiMaturity) {
    params.append('aiMaturity', filters.aiMaturity);
  }

  if (filters?.includeArchived) {
    params.append('archived', 'true');
  }

  const query = params.toString();
  const url = query ? `${CLIENTS_BASE_PATH}?${query}` : CLIENTS_BASE_PATH;
  const data = await api.get<{ clients: Client[] }>(url);
  return data.clients;
}

export async function fetchClientById(
  clientId: number,
  includeArchived?: boolean,
): Promise<Client> {
  const clients = await fetchClients({ includeArchived });
  const client = clients.find((entry) => entry.id === clientId);

  if (!client) {
    const error = new Error('Client not found') as ApiError;
    error.status = 404;
    throw error;
  }

  return client;
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const data = await api.post<{ client: Client }>(CLIENTS_BASE_PATH, payload);
  return data.client;
}

export async function updateClient(
  clientId: number,
  payload: Partial<ClientPayload>,
): Promise<Client> {
  const data = await api.put<{ client: Client }>(
    `${CLIENTS_BASE_PATH}/${clientId}`,
    payload,
  );
  return data.client;
}

export async function archiveClient(clientId: number): Promise<Client> {
  const data = await api.patch<{ client: Client }>(
    `${CLIENTS_BASE_PATH}/${clientId}/archive`,
  );
  return data.client;
}
