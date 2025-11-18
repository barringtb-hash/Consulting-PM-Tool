import { buildApiUrl } from './config';
import { ApiError, buildOptions, handleResponse } from './http';

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

const CLIENTS_BASE_PATH = buildApiUrl('/clients');

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
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ clients: Client[] }>(response);
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
  const response = await fetch(
    CLIENTS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ client: Client }>(response);
  return data.client;
}

export async function updateClient(
  clientId: number,
  payload: Partial<ClientPayload>,
): Promise<Client> {
  const response = await fetch(
    `${CLIENTS_BASE_PATH}/${clientId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ client: Client }>(response);
  return data.client;
}

export async function archiveClient(clientId: number): Promise<Client> {
  const response = await fetch(
    `${CLIENTS_BASE_PATH}/${clientId}/archive`,
    buildOptions({
      method: 'PATCH',
    }),
  );

  const data = await handleResponse<{ client: Client }>(response);
  return data.client;
}
