/**
 * Pagination Configuration
 *
 * Shared pagination constants and utilities for consistent pagination across the API.
 */

/**
 * Default page size for paginated queries.
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum allowed page size to prevent excessive data fetching.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Default page number.
 */
export const DEFAULT_PAGE = 1;

/**
 * Pagination input with defaults applied.
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Standard pagination meta returned in API responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Parse and validate pagination parameters with defaults.
 *
 * @param page - Requested page number (1-indexed)
 * @param limit - Requested page size
 * @returns Normalized pagination parameters
 *
 * @example
 * const { page, limit, skip } = getPaginationParams(req.query.page, req.query.limit);
 * const results = await prisma.model.findMany({ skip, take: limit });
 */
export function getPaginationParams(
  page?: number | string,
  limit?: number | string,
): PaginationParams {
  const parsedPage = Math.max(1, Number(page) || DEFAULT_PAGE);
  const parsedLimit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE),
  );
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  };
}

/**
 * Build pagination meta for API responses.
 *
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Page size
 * @returns Pagination meta object
 *
 * @example
 * const meta = buildPaginationMeta(totalCount, page, limit);
 * res.json({ data: results, meta });
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
