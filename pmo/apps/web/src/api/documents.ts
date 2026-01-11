import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

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

const DOCUMENTS_BASE_PATH = buildApiUrl('/documents');

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
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ documents: Document[] }>(response);
  return data.documents;
}

export async function generateDocument(
  payload: DocumentPayload,
): Promise<Document> {
  const response = await fetch(
    `${DOCUMENTS_BASE_PATH}/generate`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ document: Document }>(response);
  return data.document;
}

export async function deleteDocument(documentId: number): Promise<void> {
  const response = await fetch(
    `${DOCUMENTS_BASE_PATH}/${documentId}`,
    buildOptions({
      method: 'DELETE',
    }),
  );

  await handleResponse(response);
}
