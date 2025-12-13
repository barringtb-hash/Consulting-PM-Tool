/**
 * API Response Types
 *
 * Standardized types for API responses used across frontend and backend.
 */

/**
 * Pagination metadata for list responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API error object.
 */
export interface ApiErrorObject {
  code: string;
  message: string;
  field?: string;
}

/**
 * Standard paginated response format.
 *
 * @example
 * {
 *   data: [...],
 *   meta: { page: 1, limit: 50, total: 100, totalPages: 2 }
 * }
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Standard single item response format.
 *
 * @example
 * {
 *   data: { id: 1, name: "..." }
 * }
 */
export interface SingleResponse<T> {
  data: T;
}

/**
 * Standard error response format.
 *
 * @example
 * {
 *   errors: [{ code: 'NOT_FOUND', message: 'Resource not found' }],
 *   error: 'Resource not found' // Legacy field
 * }
 */
export interface ErrorResponse {
  errors: ApiErrorObject[];
  /** @deprecated Use errors[0].message instead */
  error?: string;
}

/**
 * Pagination query parameters.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Common filter options for list endpoints.
 */
export interface CommonFilters extends PaginationParams {
  search?: string;
  archived?: boolean;
}
