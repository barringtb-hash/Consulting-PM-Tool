/**
 * Project Document Service
 * Business logic for project document template operations
 */

import {
  Prisma,
  ProjectDocumentType,
  ProjectDocumentStatus,
  ProjectDocumentCategory,
} from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  getTemplate,
  getDefaultContent,
  getCategoryForType,
  getAllTemplateInfo,
  type TemplateInfo,
} from './documentTemplates';

// ============================================================================
// Types
// ============================================================================

export interface CreateProjectDocumentInput {
  projectId: number;
  templateType: ProjectDocumentType;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
}

export interface UpdateProjectDocumentInput {
  name?: string;
  description?: string;
  content?: Record<string, unknown>;
  status?: ProjectDocumentStatus;
}

export interface ListProjectDocumentsParams {
  projectId: number;
  templateType?: ProjectDocumentType;
  category?: ProjectDocumentCategory;
  status?: ProjectDocumentStatus;
  search?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate project access for the current user
 */
const validateProjectAccess = async (projectId: number, userId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    include: { members: true },
  });

  if (!project) {
    return 'not_found' as const;
  }

  // Allow access if:
  // 1. User is the owner
  // 2. Project has TENANT visibility
  // 3. User is a project member
  const isOwner = project.ownerId === userId;
  const isTenantVisible = project.visibility === 'TENANT';
  const isMember = project.members.some((m) => m.userId === userId);

  if (!isOwner && !isTenantVisible && !isMember) {
    return 'forbidden' as const;
  }

  return project;
};

// ============================================================================
// Template Operations
// ============================================================================

/**
 * Get all available document templates
 */
export const getAvailableTemplates = (): TemplateInfo[] => {
  return getAllTemplateInfo();
};

/**
 * Get template info by type
 */
export const getTemplateInfo = (
  type: ProjectDocumentType,
): TemplateInfo | null => {
  const template = getTemplate(type);
  if (!template) return null;

  const categoryLabels: Record<ProjectDocumentCategory, string> = {
    CORE: 'Core Project Documents',
    LIFECYCLE: 'Project Lifecycle',
    AI_SPECIFIC: 'AI Project-Specific',
  };

  return {
    type: template.type,
    name: template.name,
    description: template.description,
    category: template.category,
    categoryLabel: categoryLabels[template.category],
  };
};

// ============================================================================
// Document CRUD Operations
// ============================================================================

/**
 * List documents for a project
 */
export const listProjectDocuments = async ({
  projectId,
  templateType,
  category,
  status,
  search,
}: ListProjectDocumentsParams) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const where: Prisma.ProjectDocumentWhereInput = {
    projectId,
    tenantId,
    templateType,
    category,
    status,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.projectDocument.findMany({
    where,
    include: {
      editor: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ category: 'asc' }, { updatedAt: 'desc' }],
  });
};

/**
 * Get a single document by ID
 */
export const getProjectDocumentById = async (id: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.projectDocument.findFirst({
    where: { id, tenantId },
    include: {
      editor: {
        select: { id: true, name: true, email: true },
      },
      project: {
        select: { id: true, name: true },
      },
      versions: {
        orderBy: { version: 'desc' },
        take: 10,
        include: {
          editor: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
};

/**
 * Create a new document from a template
 */
export const createProjectDocument = async (
  userId: number,
  input: CreateProjectDocumentInput,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  if (!tenantId) {
    throw new Error('Tenant context required');
  }

  // Validate project access
  const projectAccess = await validateProjectAccess(input.projectId, userId);
  if (projectAccess === 'not_found') {
    throw new Error('Project not found');
  }
  if (projectAccess === 'forbidden') {
    throw new Error('Access denied');
  }

  // Get template info
  const template = getTemplate(input.templateType);
  if (!template) {
    throw new Error(`Unknown document type: ${input.templateType}`);
  }

  // Use provided content or default template content
  const content = input.content || getDefaultContent(input.templateType);
  const category = getCategoryForType(input.templateType);

  return prisma.projectDocument.create({
    data: {
      tenantId,
      projectId: input.projectId,
      templateType: input.templateType,
      category,
      name: input.name,
      description: input.description,
      content: content as Prisma.InputJsonValue,
      status: ProjectDocumentStatus.DRAFT,
      lastEditedBy: userId,
      lastEditedAt: new Date(),
    },
    include: {
      editor: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Update a document
 */
export const updateProjectDocument = async (
  id: number,
  userId: number,
  input: UpdateProjectDocumentInput,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Get current document
  const existing = await prisma.projectDocument.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Document not found');
  }

  // Validate project access
  const projectAccess = await validateProjectAccess(existing.projectId, userId);
  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    throw new Error('Access denied');
  }

  // Create version snapshot if content is changing
  if (input.content) {
    await prisma.projectDocumentVersion.create({
      data: {
        documentId: id,
        version: existing.version,
        content: existing.content as Prisma.InputJsonValue,
        status: existing.status,
        editedBy: existing.lastEditedBy,
        editedAt: existing.lastEditedAt,
      },
    });
  }

  // Update document
  return prisma.projectDocument.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      content: input.content as Prisma.InputJsonValue | undefined,
      status: input.status,
      version: input.content ? { increment: 1 } : undefined,
      lastEditedBy: userId,
      lastEditedAt: new Date(),
    },
    include: {
      editor: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Update document status only
 */
export const updateDocumentStatus = async (
  id: number,
  userId: number,
  status: ProjectDocumentStatus,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.projectDocument.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Document not found');
  }

  const projectAccess = await validateProjectAccess(existing.projectId, userId);
  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    throw new Error('Access denied');
  }

  return prisma.projectDocument.update({
    where: { id },
    data: {
      status,
      lastEditedBy: userId,
      lastEditedAt: new Date(),
    },
    include: {
      editor: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Delete a document
 */
export const deleteProjectDocument = async (id: number, userId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.projectDocument.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Document not found');
  }

  const projectAccess = await validateProjectAccess(existing.projectId, userId);
  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    throw new Error('Access denied');
  }

  // Versions are deleted via cascade
  return prisma.projectDocument.delete({
    where: { id },
  });
};

// ============================================================================
// Version Operations
// ============================================================================

/**
 * Get version history for a document
 */
export const getDocumentVersionHistory = async (documentId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Verify document exists and belongs to tenant
  const document = await prisma.projectDocument.findFirst({
    where: { id: documentId, tenantId },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  return prisma.projectDocumentVersion.findMany({
    where: { documentId },
    orderBy: { version: 'desc' },
    include: {
      editor: {
        select: { id: true, name: true },
      },
    },
  });
};

/**
 * Get a specific version
 */
export const getDocumentVersion = async (
  documentId: number,
  version: number,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const document = await prisma.projectDocument.findFirst({
    where: { id: documentId, tenantId },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  return prisma.projectDocumentVersion.findFirst({
    where: { documentId, version },
    include: {
      editor: {
        select: { id: true, name: true },
      },
    },
  });
};

/**
 * Restore a document to a previous version
 */
export const restoreDocumentVersion = async (
  documentId: number,
  version: number,
  userId: number,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const document = await prisma.projectDocument.findFirst({
    where: { id: documentId, tenantId },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const projectAccess = await validateProjectAccess(document.projectId, userId);
  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    throw new Error('Access denied');
  }

  const versionRecord = await prisma.projectDocumentVersion.findFirst({
    where: { documentId, version },
  });

  if (!versionRecord) {
    throw new Error('Version not found');
  }

  // Save current state as a new version before restoring
  await prisma.projectDocumentVersion.create({
    data: {
      documentId,
      version: document.version,
      content: document.content as Prisma.InputJsonValue,
      status: document.status,
      editedBy: document.lastEditedBy,
      editedAt: document.lastEditedAt,
      changeLog: `Before restore to version ${version}`,
    },
  });

  // Restore the document to the old version
  return prisma.projectDocument.update({
    where: { id: documentId },
    data: {
      content: versionRecord.content as Prisma.InputJsonValue,
      status: versionRecord.status,
      version: { increment: 1 },
      lastEditedBy: userId,
      lastEditedAt: new Date(),
    },
    include: {
      editor: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

// ============================================================================
// Utility Operations
// ============================================================================

/**
 * Get document statistics for a project
 */
export const getProjectDocumentStats = async (projectId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const documents = await prisma.projectDocument.groupBy({
    by: ['status', 'category'],
    where: { projectId, tenantId },
    _count: true,
  });

  const total = documents.reduce((sum, d) => sum + d._count, 0);
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const doc of documents) {
    byStatus[doc.status] = (byStatus[doc.status] || 0) + doc._count;
    byCategory[doc.category] = (byCategory[doc.category] || 0) + doc._count;
  }

  return {
    total,
    byStatus,
    byCategory,
  };
};

/**
 * Clone a document (create a copy)
 */
export const cloneProjectDocument = async (
  id: number,
  userId: number,
  newName: string,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  if (!tenantId) {
    throw new Error('Tenant context required');
  }

  const existing = await prisma.projectDocument.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Document not found');
  }

  const projectAccess = await validateProjectAccess(existing.projectId, userId);
  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    throw new Error('Access denied');
  }

  return prisma.projectDocument.create({
    data: {
      tenantId,
      projectId: existing.projectId,
      templateType: existing.templateType,
      category: existing.category,
      name: newName,
      description: existing.description,
      content: existing.content as Prisma.InputJsonValue,
      status: ProjectDocumentStatus.DRAFT,
      lastEditedBy: userId,
      lastEditedAt: new Date(),
    },
    include: {
      editor: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};
