/**
 * API Response Utilities
 *
 * Provides standardized response formats with backward compatibility.
 * During transition, responses include both legacy and new formats.
 *
 * Standard response format:
 *   Success: { data: T, meta?: PaginationMeta }
 *   Error: { errors: Array<{ code: string, message: string, field?: string }> }
 *
 * Legacy format (deprecated):
 *   Success: { [entityName]: T, pagination?: object }
 *   Error: { error: string, details?: object }
 */

import { Response } from 'express';

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
 * Standard success response with optional backward compatibility.
 *
 * @param res - Express response object
 * @param data - Response data (single item or array)
 * @param options - Optional configuration
 * @param options.legacyKey - Include legacy key for backward compatibility (e.g., 'clients')
 * @param options.meta - Pagination metadata
 *
 * @example
 * // Single item response
 * apiSuccess(res, client, { legacyKey: 'client' });
 * // Returns: { data: client, client: client }
 *
 * @example
 * // List response with pagination
 * apiSuccess(res, clients, { legacyKey: 'clients', meta: { page: 1, ... } });
 * // Returns: { data: clients, clients: clients, meta: {...} }
 */
export function apiSuccess<T>(
  res: Response,
  data: T,
  options?: {
    legacyKey?: string;
    meta?: PaginationMeta;
    statusCode?: number;
  },
): void {
  const response: Record<string, unknown> = {
    data,
  };

  // Add legacy key for backward compatibility
  if (options?.legacyKey) {
    response[options.legacyKey] = data;
  }

  // Add pagination metadata
  if (options?.meta) {
    response.meta = options.meta;
  }

  res.status(options?.statusCode || 200).json(response);
}

/**
 * Standard error response.
 *
 * @param res - Express response object
 * @param errors - Array of error objects or single error message
 * @param statusCode - HTTP status code (default: 400)
 *
 * @example
 * // Single error
 * apiError(res, 'Invalid input', 400);
 * // Returns: { errors: [{ code: 'ERROR', message: 'Invalid input' }], error: 'Invalid input' }
 *
 * @example
 * // Validation errors
 * apiError(res, [
 *   { code: 'VALIDATION_ERROR', message: 'Email is required', field: 'email' },
 *   { code: 'VALIDATION_ERROR', message: 'Name is too short', field: 'name' }
 * ], 400);
 */
export function apiError(
  res: Response,
  errors: string | ApiErrorObject | ApiErrorObject[],
  statusCode: number = 400,
): void {
  let errorArray: ApiErrorObject[];

  if (typeof errors === 'string') {
    errorArray = [{ code: 'ERROR', message: errors }];
  } else if (Array.isArray(errors)) {
    errorArray = errors;
  } else {
    errorArray = [errors];
  }

  // Include legacy format for backward compatibility
  const response = {
    errors: errorArray,
    error: errorArray[0]?.message || 'An error occurred',
  };

  res.status(statusCode).json(response);
}

/**
 * Standard validation error response from Zod.
 *
 * @param res - Express response object
 * @param zodError - Zod error object with flatten() or format() method
 *
 * @example
 * const parsed = schema.safeParse(req.body);
 * if (!parsed.success) {
 *   apiValidationError(res, parsed.error);
 *   return;
 * }
 */
export function apiValidationError(
  res: Response,
  zodError: { flatten: () => { fieldErrors: Record<string, string[]> } },
): void {
  const flattened = zodError.flatten();
  const errors: ApiErrorObject[] = [];

  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    for (const message of messages || []) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message,
        field,
      });
    }
  }

  // Include legacy format for backward compatibility
  res.status(400).json({
    errors,
    error: 'Validation failed',
    details: flattened.fieldErrors,
  });
}

/**
 * Not found error response.
 *
 * @param res - Express response object
 * @param resource - Name of the resource (e.g., 'Client', 'Project')
 */
export function apiNotFound(
  res: Response,
  resource: string = 'Resource',
): void {
  res.status(404).json({
    errors: [{ code: 'NOT_FOUND', message: `${resource} not found` }],
    error: `${resource} not found`,
  });
}

/**
 * Unauthorized error response.
 *
 * @param res - Express response object
 * @param message - Optional custom message
 */
export function apiUnauthorized(
  res: Response,
  message: string = 'Unauthorized',
): void {
  res.status(401).json({
    errors: [{ code: 'UNAUTHORIZED', message }],
    error: message,
  });
}

/**
 * Forbidden error response.
 *
 * @param res - Express response object
 * @param message - Optional custom message
 */
export function apiForbidden(
  res: Response,
  message: string = 'Forbidden',
): void {
  res.status(403).json({
    errors: [{ code: 'FORBIDDEN', message }],
    error: message,
  });
}

/**
 * Internal server error response.
 *
 * @param res - Express response object
 * @param message - Optional custom message (defaults to generic message)
 */
export function apiInternalError(
  res: Response,
  message: string = 'Internal server error',
): void {
  res.status(500).json({
    errors: [{ code: 'INTERNAL_ERROR', message }],
    error: message,
  });
}

/**
 * No content response (for DELETE operations).
 *
 * @param res - Express response object
 */
export function apiNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Created response (for POST operations).
 *
 * @param res - Express response object
 * @param data - Created resource
 * @param legacyKey - Optional legacy key for backward compatibility
 */
export function apiCreated<T>(
  res: Response,
  data: T,
  legacyKey?: string,
): void {
  apiSuccess(res, data, { legacyKey, statusCode: 201 });
}
