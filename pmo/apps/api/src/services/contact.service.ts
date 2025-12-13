import { Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  ContactCreateInput,
  ContactUpdateInput,
} from '../validation/contact.schema';

export interface ListContactsParams {
  search?: string;
  clientId?: number;
  includeArchived?: boolean;
}

/**
 * List contacts with optional filtering.
 *
 * @deprecated For CRM use cases, use CRMContact model and related services instead.
 * @param params - Query parameters for filtering
 * @param params.search - Search term to filter by name, email, role, or phone
 * @param params.clientId - Filter by client ID
 * @param params.includeArchived - Include archived contacts (default: false)
 * @returns Array of contacts matching the criteria
 */
export const listContacts = async ({
  search,
  clientId,
  includeArchived = false,
}: ListContactsParams) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const where: Prisma.ContactWhereInput = {
    tenantId,
    clientId,
    archived: includeArchived ? undefined : false,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { role: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  return prisma.contact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Create a new contact within the current tenant context.
 *
 * @deprecated For CRM use cases, use CRMContact model instead.
 * @param data - Contact creation data (clientId, name, email, etc.)
 * @returns The created contact record
 * @throws Prisma.PrismaClientKnownRequestError - P2002 if email already exists for client
 */
export const createContact = async (data: ContactCreateInput) => {
  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.contact.create({
    data: {
      ...data,
      tenantId,
    },
  });
};

/**
 * Update a contact by ID.
 *
 * @param id - Contact ID to update
 * @param data - Partial contact data to update
 * @returns The updated contact, or null if not found
 * @throws Prisma.PrismaClientKnownRequestError - P2002 if email conflicts
 */
export const updateContact = async (id: number, data: ContactUpdateInput) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.contact.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  return prisma.contact.update({
    where: { id },
    data,
  });
};

/**
 * Archive (soft delete) a contact by ID.
 *
 * @param id - Contact ID to archive
 * @returns The archived contact, or null if not found
 */
export const archiveContact = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.contact.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  return prisma.contact.update({
    where: { id },
    data: { archived: true },
  });
};

/**
 * Hard delete a contact by ID.
 *
 * @param id - Contact ID to delete
 * @returns The deleted contact, or null if not found
 */
export const deleteContact = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.contact.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  await prisma.contact.delete({ where: { id } });
  return existing;
};
