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
  const provider = (
    process.env.DATABASE_PROVIDER ?? 'postgresql'
  ).toLowerCase();
  const isSqlite = provider === 'sqlite';
  const where: Prisma.ContactWhereInput = {
    clientId,
    archived: includeArchived ? undefined : false,
  };

  type ContactList = Awaited<ReturnType<typeof prisma.contact.findMany>>;
  let contactFilter: ((contacts: ContactList) => ContactList) | undefined;

  if (search && !isSqlite) {
    const searchFilter: Prisma.StringFilter = {
      contains: search,
      mode: 'insensitive',
    };
    where.OR = [
      { name: searchFilter },
      { email: searchFilter },
      { role: searchFilter },
      { phone: searchFilter },
    ];
  } else if (search) {
    const normalized = search.toLowerCase();
    contactFilter = (contacts) =>
      contacts.filter((contact) => {
        const fields = [
          contact.name,
          contact.email,
          contact.role,
          contact.phone,
        ].filter((value): value is string => Boolean(value));

        return fields.some((value) => value.toLowerCase().includes(normalized));
      });
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return contactFilter ? contactFilter(contacts) : contacts;
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
