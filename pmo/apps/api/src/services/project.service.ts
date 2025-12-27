import { ProjectStatus, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  ProjectCreateInput,
  ProjectUpdateInput,
} from '../validation/project.schema';

// Default and maximum pagination limits
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export interface ListProjectsParams {
  ownerId: number;
  accountId?: number;
  clientId?: number; // @deprecated - use accountId
  status?: ProjectStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * List projects for a specific owner with optional filtering and pagination.
 * Includes projects based on visibility:
 * - PRIVATE: Only owner can see
 * - TEAM: Owner and assigned team members can see
 * - TENANT: All users in tenant can see (also honors legacy isSharedWithTenant)
 *
 * @param params - Query parameters
 * @param params.ownerId - Owner user ID (required)
 * @param params.accountId - Filter by account ID (preferred)
 * @param params.clientId - Filter by client ID (deprecated - use accountId)
 * @param params.status - Filter by project status
 * @param params.page - Page number (1-indexed, default: 1)
 * @param params.limit - Page size (max: 100, default: 50)
 * @returns Paginated result with projects and metadata
 */
export const listProjects = async ({
  ownerId,
  accountId,
  clientId,
  status,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
}: ListProjectsParams): Promise<
  PaginatedResult<Awaited<ReturnType<typeof prisma.project.findMany>>[0]>
> => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Support both accountId (preferred) and clientId (deprecated)
  const filterAccountId = accountId || clientId;

  // Show projects that are:
  // 1. Owned by the current user, OR
  // 2. User is a team member (for TEAM visibility), OR
  // 3. Shared with the tenant (visibility = TENANT or legacy isSharedWithTenant = true)
  const where: Prisma.ProjectWhereInput = {
    tenantId,
    OR: [
      { ownerId }, // User is owner
      { members: { some: { userId: ownerId } } }, // User is a team member
      { visibility: 'TENANT' }, // Visible to all tenant users
      { isSharedWithTenant: true }, // Legacy: shared with tenant
    ],
    ...(filterAccountId && { accountId: filterAccountId }),
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
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

/**
 * Get a project by ID within the current tenant context.
 * Includes members for access control checks.
 *
 * @param id - Project ID
 * @returns The project if found, null otherwise
 */
export const getProjectById = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.project.findFirst({
    where: { id, tenantId },
    include: {
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

/**
 * Create a new project within the current tenant context.
 *
 * @param ownerId - User ID of the project owner
 * @param data - Project creation data (clientId, name, status, dates)
 * @returns The created project record
 */
export const createProject = async (
  ownerId: number,
  data: ProjectCreateInput,
) => {
  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.project.create({
    data: {
      ...data,
      ownerId,
      tenantId,
    },
  });
};

/**
 * Update a project by ID using atomic operation.
 * Returns null if project not found.
 */
export const updateProject = async (id: number, data: ProjectUpdateInput) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    // First verify the project belongs to this tenant
    const existing = await prisma.project.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return null;
    }

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
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    // First verify the project belongs to this tenant
    const existing = await prisma.project.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return null;
    }

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
