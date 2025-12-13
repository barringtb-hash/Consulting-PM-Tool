import { AiMaturity, CompanySize, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  ClientCreateInput,
  ClientUpdateInput,
} from '../validation/client.schema';

// Maximum search string length to prevent resource exhaustion
const MAX_SEARCH_LENGTH = 200;
// Default and maximum pagination limits
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export interface ListClientsParams {
  search?: string;
  companySize?: CompanySize;
  aiMaturity?: AiMaturity;
  includeArchived?: boolean;
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
 * List clients with optional filtering and pagination.
 *
 * @param params - Query parameters for filtering and pagination
 * @param params.search - Search term to filter by name, industry, or notes
 * @param params.companySize - Filter by company size (MICRO, SMALL, MEDIUM)
 * @param params.aiMaturity - Filter by AI maturity level
 * @param params.includeArchived - Include archived clients (default: false)
 * @param params.page - Page number (1-indexed, default: 1)
 * @param params.limit - Page size (max: 100, default: 50)
 * @returns Paginated result with clients and metadata
 */
export const listClients = async ({
  search,
  companySize,
  aiMaturity,
  includeArchived = false,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
}: ListClientsParams): Promise<
  PaginatedResult<Awaited<ReturnType<typeof prisma.client.findMany>>[0]>
> => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const where: Prisma.ClientWhereInput = {
    tenantId,
    companySize,
    aiMaturity,
    archived: includeArchived ? undefined : false,
  };

  if (search) {
    // Limit search string length to prevent resource exhaustion attacks
    const sanitizedSearch = search.slice(0, MAX_SEARCH_LENGTH);
    const searchFilter: Prisma.StringFilter = {
      contains: sanitizedSearch,
      mode: 'insensitive',
    };
    where.OR = [
      { name: searchFilter },
      { industry: searchFilter },
      { notes: searchFilter },
    ];
  }

  // Enforce pagination limits
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const skip = (safePage - 1) * safeLimit;

  // Get total count and paginated data in parallel
  const [total, data] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      skip,
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
 * Create a new client within the current tenant context.
 *
 * @param data - Client creation data (name, industry, companySize, etc.)
 * @returns The created client record
 */
export const createClient = async (data: ClientCreateInput) => {
  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.client.create({
    data: {
      ...data,
      tenantId,
    },
  });
};

/**
 * Update a client by ID using atomic operation.
 * Returns null if client not found (Prisma P2025 error).
 */
export const updateClient = async (id: number, data: ClientUpdateInput) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    // First verify the client belongs to this tenant
    const existing = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return null;
    }

    return await prisma.client.update({
      where: { id },
      data,
    });
  } catch (error) {
    // P2025: Record not found
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
 * Archive (soft delete) a client by ID using atomic operation.
 * Returns null if client not found.
 */
export const archiveClient = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    // First verify the client belongs to this tenant
    const existing = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return null;
    }

    return await prisma.client.update({
      where: { id },
      data: { archived: true },
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
 * Hard delete a client by ID.
 * Returns null if client not found.
 * Note: This will cascade delete related contacts due to schema relations.
 */
export const deleteClient = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    // First verify the client belongs to this tenant
    const existing = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return null;
    }

    return await prisma.client.delete({
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
