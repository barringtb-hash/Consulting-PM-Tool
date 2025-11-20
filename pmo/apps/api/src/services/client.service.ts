import { AiMaturity, CompanySize, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import {
  ClientCreateInput,
  ClientUpdateInput,
} from '../validation/client.schema';

export interface ListClientsParams {
  search?: string;
  companySize?: CompanySize;
  aiMaturity?: AiMaturity;
  includeArchived?: boolean;
}

export const listClients = async ({
  search,
  companySize,
  aiMaturity,
  includeArchived = false,
}: ListClientsParams) => {
  const provider = (process.env.DATABASE_PROVIDER ?? '').toLowerCase();
  const isPostgres = provider.startsWith('postgres');
  const where: Prisma.ClientWhereInput = {
    companySize,
    aiMaturity,
    archived: includeArchived ? undefined : false,
  };

  type ClientList = Awaited<ReturnType<typeof prisma.client.findMany>>;
  let clientFilter: ((clients: ClientList) => ClientList) | undefined;

  if (search && isPostgres) {
    const searchFilter: Prisma.StringFilter = {
      contains: search,
      mode: 'insensitive',
    };
    where.OR = [
      { name: searchFilter },
      { industry: searchFilter },
      { notes: searchFilter },
    ];
  } else if (search) {
    const normalizedSearch = search.toLowerCase();
    clientFilter = (clients) =>
      clients.filter((client) => {
        const fields = [client.name, client.industry, client.notes ?? null];
        return fields.some((field) => {
          if (!field) {
            return false;
          }
          return field.toLowerCase().includes(normalizedSearch);
        });
      });
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return clientFilter ? clientFilter(clients) : clients;
};

export const createClient = async (data: ClientCreateInput) =>
  prisma.client.create({ data });

export const updateClient = async (id: number, data: ClientUpdateInput) => {
  const existing = await prisma.client.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  return prisma.client.update({
    where: { id },
    data,
  });
};

export const archiveClient = async (id: number) => {
  const existing = await prisma.client.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  return prisma.client.update({
    where: { id },
    data: { archived: true },
  });
};

export const deleteClient = async (id: number) => {
  const existing = await prisma.client.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  return prisma.client.update({
    where: { id },
    data: { archived: true },
  });
};
