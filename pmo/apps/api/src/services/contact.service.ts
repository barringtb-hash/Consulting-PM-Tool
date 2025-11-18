import { Prisma } from '@prisma/client';

import prisma from '../prisma/client';
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
  const where: Prisma.ContactWhereInput = {
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

export const createContact = async (data: ContactCreateInput) =>
  prisma.contact.create({ data });

export const updateContact = async (id: number, data: ContactUpdateInput) => {
  const existing = await prisma.contact.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  return prisma.contact.update({
    where: { id },
    data,
  });
};

export const archiveContact = async (id: number) => {
  const existing = await prisma.contact.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  return prisma.contact.update({
    where: { id },
    data: { archived: true },
  });
};

export const deleteContact = async (id: number) => {
  const existing = await prisma.contact.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  await prisma.contact.delete({ where: { id } });
  return existing;
};
