/**
 * Document Service
 *
 * Provides document management operations for the PMO module.
 * Documents are file references that can be associated with clients, accounts, or projects.
 *
 * Access Control:
 * - Documents belong to owners (users)
 * - Multi-tenant isolation via tenantId filtering on related entities (Client, Account, Project)
 * - Only documents owned by users within the current tenant context are accessible
 *
 * @module services/document
 */

import { DocumentType, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  DocumentCreateInput,
  DocumentGenerateInput,
} from '../validation/document.schema';

export interface ListDocumentsParams {
  ownerId: number;
  clientId?: number;
  projectId?: number;
}

/**
 * Builds tenant-isolated where clause for document queries.
 * Since Document doesn't have a direct tenantId, we filter through relationships:
 * - Client association must belong to the current tenant
 * - Account association must belong to the current tenant
 * - Project association must belong to the current tenant
 *
 * @param baseWhere - Base query conditions
 * @returns Prisma where input with tenant isolation
 */
const buildTenantIsolatedWhere = (
  baseWhere: Prisma.DocumentWhereInput,
): Prisma.DocumentWhereInput => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  if (!tenantId) {
    return baseWhere;
  }

  // Add tenant filtering through relationships
  // Documents must have at least one of their relationships belong to the tenant
  // OR have no relationships (orphaned documents owned by users - filtered by ownerId)
  return {
    ...baseWhere,
    OR: [
      // Document with a client that belongs to this tenant
      { client: { tenantId } },
      // Document with an account that belongs to this tenant
      { account: { tenantId } },
      // Document with a project that belongs to this tenant
      { project: { tenantId } },
      // Document with no associations (client, account, project all null)
      // These are personal documents - we trust ownerId filter from params
      {
        AND: [{ clientId: null }, { accountId: null }, { projectId: null }],
      },
    ],
  };
};

/**
 * Lists documents with tenant isolation.
 *
 * @param params - Query parameters
 * @param params.ownerId - Owner user ID (required)
 * @param params.clientId - Optional client ID filter
 * @param params.projectId - Optional project ID filter
 * @returns Array of documents matching the criteria
 */
export const listDocuments = async ({
  ownerId,
  clientId,
  projectId,
}: ListDocumentsParams) => {
  const baseWhere: Prisma.DocumentWhereInput = {
    ownerId,
    clientId,
    projectId,
  };

  const where = buildTenantIsolatedWhere(baseWhere);

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Validates that a client belongs to the current tenant.
 *
 * @param clientId - Client ID to validate
 * @returns True if client belongs to tenant, false otherwise
 */
const validateClientTenant = async (clientId: number): Promise<boolean> => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  if (!tenantId) {
    return true; // No tenant context, allow operation
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
  });

  return client !== null;
};

/**
 * Validates that an account belongs to the current tenant.
 * Note: Prefixed with _ as it's not currently used but available for future accountId support.
 *
 * @param accountId - Account ID to validate
 * @returns True if account belongs to tenant, false otherwise
 */
const _validateAccountTenant = async (accountId: number): Promise<boolean> => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  if (!tenantId) {
    return true; // No tenant context, allow operation
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId },
  });

  return account !== null;
};

/**
 * Validates that a project belongs to the current tenant.
 *
 * @param projectId - Project ID to validate
 * @returns True if project belongs to tenant, false otherwise
 */
const validateProjectTenant = async (projectId: number): Promise<boolean> => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  if (!tenantId) {
    return true; // No tenant context, allow operation
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
  });

  return project !== null;
};

/**
 * Creates a new document with tenant isolation validation.
 * Validates that any associated client, account, or project belongs to the current tenant.
 *
 * @param ownerId - User ID who owns the document
 * @param data - Document creation data
 * @returns The created document or null if tenant validation fails
 */
export const createDocument = async (
  ownerId: number,
  data: DocumentCreateInput,
) => {
  // Validate tenant ownership of associated entities
  if (data.clientId) {
    const isValid = await validateClientTenant(data.clientId);
    if (!isValid) {
      return null; // Client doesn't belong to tenant
    }
  }

  if (data.projectId) {
    const isValid = await validateProjectTenant(data.projectId);
    if (!isValid) {
      return null; // Project doesn't belong to tenant
    }
  }

  return prisma.document.create({
    data: {
      ...data,
      ownerId,
      type: data.type ?? DocumentType.OTHER,
    },
  });
};

/**
 * Generates a document with tenant isolation validation.
 * Similar to createDocument but for generated documents with URL.
 *
 * @param ownerId - User ID who owns the document
 * @param data - Document generation data
 * @returns The created document or null if tenant validation fails
 */
export const generateDocument = async (
  ownerId: number,
  data: DocumentGenerateInput,
) => {
  // Validate tenant ownership of associated entities
  if (data.clientId) {
    const isValid = await validateClientTenant(data.clientId);
    if (!isValid) {
      return null; // Client doesn't belong to tenant
    }
  }

  if (data.projectId) {
    const isValid = await validateProjectTenant(data.projectId);
    if (!isValid) {
      return null; // Project doesn't belong to tenant
    }
  }

  const url =
    data.url ??
    `/generated-documents/${Date.now()}-${encodeURIComponent(data.filename)}`;

  return prisma.document.create({
    data: {
      clientId: data.clientId,
      projectId: data.projectId,
      ownerId,
      type: data.type ?? DocumentType.OTHER,
      filename: data.filename,
      url,
    },
  });
};

/**
 * Retrieves a document by ID with tenant isolation.
 * Verifies the document's associated entities belong to the current tenant.
 *
 * @param id - Document ID
 * @returns The document if found and accessible, null otherwise
 */
export const getDocumentById = async (id: number) => {
  const where = buildTenantIsolatedWhere({ id });

  return prisma.document.findFirst({ where });
};

/**
 * Deletes a document with tenant ownership verification.
 * First verifies the document belongs to the current tenant before deletion.
 *
 * @param id - Document ID to delete
 * @returns The deleted document if successful, null if not found or unauthorized
 */
export const deleteDocument = async (id: number) => {
  // First verify the document exists and belongs to the current tenant
  const where = buildTenantIsolatedWhere({ id });
  const existing = await prisma.document.findFirst({ where });

  if (!existing) {
    return null; // Document not found or doesn't belong to tenant
  }

  return prisma.document.delete({
    where: { id },
  });
};
