import { api } from '../lib/apiClient';

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
  const url = query ? `/contacts?${query}` : '/contacts';
  const data = await api.get<{ contacts: Contact[] }>(url);
  return data.contacts;
}

export async function createContact(payload: ContactPayload): Promise<Contact> {
  const data = await api.post<{ contact: Contact }>('/contacts', payload);
  return data.contact;
}

export async function updateContact(
  contactId: number,
  payload: Partial<Omit<ContactPayload, 'clientId'>> & { clientId?: number },
): Promise<Contact> {
  const data = await api.put<{ contact: Contact }>(
    `/contacts/${contactId}`,
    payload,
  );
  return data.contact;
}

export async function archiveContact(contactId: number): Promise<Contact> {
  const data = await api.patch<{ contact: Contact }>(
    `/contacts/${contactId}/archive`,
  );
  return data.contact;
}

export async function deleteContact(contactId: number): Promise<void> {
  await api.delete(`/contacts/${contactId}`);
}
