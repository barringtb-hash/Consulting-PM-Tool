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
  const where: Prisma.ClientWhereInput = {
    companySize,
    aiMaturity,
    archived: includeArchived ? undefined : false,
  };

  if (search) {
    const buildSearchFilter = (): Prisma.StringFilter => {
      const base: Prisma.StringFilter = { contains: search };
      if (!process.env.DATABASE_URL?.startsWith('file:')) {
        base.mode = 'insensitive';
      }
      return base;
    };
    where.OR = [
      { name: buildSearchFilter() },
      { industry: buildSearchFilter() },
      { notes: buildSearchFilter() },
    ];
  }

  return prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
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
