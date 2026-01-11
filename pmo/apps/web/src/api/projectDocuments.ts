/**
 * Project Documents API
 * API functions for project document templates
 */

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

// ============================================================================
// Types
// ============================================================================

export type ProjectDocumentType =
  // Core Project Documents
  | 'PROJECT_PLAN'
  | 'STATUS_REPORT'
  | 'RISK_REGISTER'
  | 'ISSUE_LOG'
  | 'MEETING_NOTES'
  | 'LESSONS_LEARNED'
  | 'COMMUNICATION_PLAN'
  // Lifecycle Documents
  | 'KICKOFF_AGENDA'
  | 'CHANGE_REQUEST'
  | 'PROJECT_CLOSURE'
  | 'KNOWLEDGE_TRANSFER'
  // AI Project-Specific Documents
  | 'AI_FEASIBILITY'
  | 'AI_LIMITATIONS'
  | 'MONITORING_MAINTENANCE'
  | 'DATA_REQUIREMENTS'
  | 'DELIVERABLE_CHECKLIST';

export type ProjectDocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'ARCHIVED';

export type ProjectDocumentCategory = 'CORE' | 'LIFECYCLE' | 'AI_SPECIFIC';

export interface TemplateInfo {
  type: ProjectDocumentType;
  name: string;
  description: string;
  category: ProjectDocumentCategory;
  categoryLabel: string;
}

export interface ProjectDocumentEditor {
  id: number;
  name: string;
  email?: string;
}

export interface ProjectDocument {
  id: number;
  tenantId: string;
  projectId: number;
  templateType: ProjectDocumentType;
  category: ProjectDocumentCategory;
  name: string;
  description: string | null;
  status: ProjectDocumentStatus;
  content: Record<string, unknown>;
  version: number;
  lastEditedBy: number | null;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
  editor: ProjectDocumentEditor | null;
  project?: { id: number; name: string };
  versions?: ProjectDocumentVersion[];
}

export interface ProjectDocumentVersion {
  id: number;
  documentId: number;
  version: number;
  content: Record<string, unknown>;
  status: ProjectDocumentStatus;
  editedBy: number | null;
  editedAt: string;
  changeLog: string | null;
  createdAt: string;
  editor: { id: number; name: string } | null;
}

export interface ProjectDocumentStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface ListProjectDocumentsParams {
  templateType?: ProjectDocumentType;
  category?: ProjectDocumentCategory;
  status?: ProjectDocumentStatus;
  search?: string;
}

export interface CreateProjectDocumentPayload {
  templateType: ProjectDocumentType;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
}

export interface UpdateProjectDocumentPayload {
  name?: string;
  description?: string | null;
  content?: Record<string, unknown>;
  status?: ProjectDocumentStatus;
}

// ============================================================================
// Template API Functions
// ============================================================================

const TEMPLATES_BASE_PATH = buildApiUrl('/project-documents/templates');

export async function fetchTemplates(): Promise<TemplateInfo[]> {
  const response = await fetch(
    TEMPLATES_BASE_PATH,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ templates: TemplateInfo[] }>(response);
  return data.templates;
}

export async function fetchTemplateByType(
  type: ProjectDocumentType,
): Promise<TemplateInfo> {
  const response = await fetch(
    `${TEMPLATES_BASE_PATH}/${type}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ template: TemplateInfo }>(response);
  return data.template;
}

// ============================================================================
// Project Document API Functions
// ============================================================================

export async function fetchProjectDocuments(
  projectId: number,
  params?: ListProjectDocumentsParams,
): Promise<ProjectDocument[]> {
  const searchParams = new URLSearchParams();

  if (params?.templateType) {
    searchParams.append('templateType', params.templateType);
  }
  if (params?.category) {
    searchParams.append('category', params.category);
  }
  if (params?.status) {
    searchParams.append('status', params.status);
  }
  if (params?.search) {
    searchParams.append('search', params.search);
  }

  const query = searchParams.toString();
  const url = query
    ? `${buildApiUrl(`/projects/${projectId}/documents`)}?${query}`
    : buildApiUrl(`/projects/${projectId}/documents`);

  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ documents: ProjectDocument[] }>(response);
  return data.documents;
}

export async function fetchProjectDocumentStats(
  projectId: number,
): Promise<ProjectDocumentStats> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/documents/stats`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ stats: ProjectDocumentStats }>(response);
  return data.stats;
}

export async function createProjectDocument(
  projectId: number,
  payload: CreateProjectDocumentPayload,
): Promise<ProjectDocument> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/documents`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ document: ProjectDocument }>(response);
  return data.document;
}

export async function fetchProjectDocumentById(
  id: number,
): Promise<ProjectDocument> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${id}`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ document: ProjectDocument }>(response);
  return data.document;
}

export async function updateProjectDocument(
  id: number,
  payload: UpdateProjectDocumentPayload,
): Promise<ProjectDocument> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${id}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ document: ProjectDocument }>(response);
  return data.document;
}

export async function updateProjectDocumentStatus(
  id: number,
  status: ProjectDocumentStatus,
): Promise<ProjectDocument> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${id}/status`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  );
  const data = await handleResponse<{ document: ProjectDocument }>(response);
  return data.document;
}

export async function cloneProjectDocument(
  id: number,
  newName: string,
): Promise<ProjectDocument> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${id}/clone`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ newName }),
    }),
  );
  const data = await handleResponse<{ document: ProjectDocument }>(response);
  return data.document;
}

export async function deleteProjectDocument(id: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${id}`),
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse<void>(response);
}

// ============================================================================
// Version API Functions
// ============================================================================

export async function fetchDocumentVersions(
  documentId: number,
): Promise<ProjectDocumentVersion[]> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${documentId}/versions`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ versions: ProjectDocumentVersion[] }>(
    response,
  );
  return data.versions;
}

export async function fetchDocumentVersion(
  documentId: number,
  version: number,
): Promise<ProjectDocumentVersion> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${documentId}/versions/${version}`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ version: ProjectDocumentVersion }>(
    response,
  );
  return data.version;
}

export async function restoreDocumentVersion(
  documentId: number,
  version: number,
): Promise<ProjectDocument> {
  const response = await fetch(
    buildApiUrl(`/project-documents/${documentId}/versions/restore`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ version }),
    }),
  );
  const data = await handleResponse<{ document: ProjectDocument }>(response);
  return data.document;
}
