import { ProjectStatus, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import {
  ProjectCreateInput,
  ProjectUpdateInput,
} from '../validation/project.schema';

// Default and maximum pagination limits
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export interface ListProjectsParams {
  ownerId: number;
  clientId?: number;
  status?: ProjectStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const listProjects = async ({
  ownerId,
  clientId,
  status,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
}: ListProjectsParams): Promise<
  PaginatedResult<Awaited<ReturnType<typeof prisma.project.findMany>>[0]>
> => {
  const where: Prisma.ProjectWhereInput = {
    ownerId,
    clientId,
    status,
  };

  // Enforce pagination limits
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const skip = (safePage - 1) * safeLimit;

  // Get total count and paginated data in parallel
  const [total, data] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      skip,
    }),
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getProjectById = async (id: number) =>
  prisma.project.findUnique({ where: { id } });

export const createProject = async (
  ownerId: number,
  data: ProjectCreateInput,
) =>
  prisma.project.create({
    data: {
      ...data,
      ownerId,
    },
  });

/**
 * Update a project by ID using atomic operation.
 * Returns null if project not found.
 */
export const updateProject = async (id: number, data: ProjectUpdateInput) => {
  try {
    return await prisma.project.update({
      where: { id },
      data,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * Delete a project by ID.
 * Returns null if project not found.
 */
export const deleteProject = async (id: number) => {
  try {
    return await prisma.project.delete({
      where: { id },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
};
