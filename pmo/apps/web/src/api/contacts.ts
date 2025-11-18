import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

export interface Contact {
  id: number;
  clientId: number;
  name: string;
  email: string;
  role?: string | null;
  phone?: string | null;
  notes?: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFilters {
  search?: string;
  clientId?: number;
  includeArchived?: boolean;
}

export interface ContactPayload {
  clientId: number;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  notes?: string;
}

const CONTACTS_BASE_PATH = buildApiUrl('/contacts');

export async function fetchContacts(
  filters?: ContactFilters,
): Promise<Contact[]> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.append('search', filters.search);
  }

  if (filters?.clientId) {
    params.append('clientId', filters.clientId.toString());
  }

  if (filters?.includeArchived) {
    params.append('archived', 'true');
  }

  const query = params.toString();
  const url = query ? `${CONTACTS_BASE_PATH}?${query}` : CONTACTS_BASE_PATH;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ contacts: Contact[] }>(response);
  return data.contacts;
}

export async function createContact(payload: ContactPayload): Promise<Contact> {
  const response = await fetch(
    CONTACTS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ contact: Contact }>(response);
  return data.contact;
}

export async function updateContact(
  contactId: number,
  payload: Partial<Omit<ContactPayload, 'clientId'>> & { clientId?: number },
): Promise<Contact> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/${contactId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ contact: Contact }>(response);
  return data.contact;
}

export async function archiveContact(contactId: number): Promise<Contact> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/${contactId}/archive`,
    buildOptions({
      method: 'PATCH',
    }),
  );

  const data = await handleResponse<{ contact: Contact }>(response);
  return data.contact;
}

export async function deleteContact(contactId: number): Promise<void> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/${contactId}`,
    buildOptions({
      method: 'DELETE',
    }),
  );

  await handleResponse<void>(response);
}
