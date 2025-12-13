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
