import { api } from '../lib/apiClient';

export type DocumentType =
  | 'REQUIREMENTS'
  | 'PROPOSAL'
  | 'CONTRACT'
  | 'REPORT'
  | 'OTHER';

export interface Document {
  id: number;
  clientId: number;
  projectId?: number | null;
  ownerId: number;
  type: DocumentType;
  filename: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilters {
  clientId?: number;
  projectId?: number;
}

export interface DocumentPayload {
  clientId: number;
  projectId?: number;
  type?: DocumentType;
  filename: string;
  url?: string;
}

const DOCUMENTS_BASE_PATH = '/documents';

export async function fetchDocuments(
  filters?: DocumentFilters,
): Promise<Document[]> {
  const params = new URLSearchParams();

  if (filters?.clientId) {
    params.append('clientId', String(filters.clientId));
  }

  if (filters?.projectId) {
    params.append('projectId', String(filters.projectId));
  }

  const query = params.toString();
  const url = query ? `${DOCUMENTS_BASE_PATH}?${query}` : DOCUMENTS_BASE_PATH;
  const data = await api.get<{ documents: Document[] }>(url);
  return data.documents;
}

export async function generateDocument(
  payload: DocumentPayload,
): Promise<Document> {
  const data = await api.post<{ document: Document }>(
    `${DOCUMENTS_BASE_PATH}/generate`,
    payload,
  );
  return data.document;
}
