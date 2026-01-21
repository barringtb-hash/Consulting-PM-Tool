/**
 * Correlation ID Middleware
 *
 * Adds unique correlation IDs to each request for distributed tracing
 * and log correlation. This enables tracking requests across services
 * and correlating log entries for debugging.
 *
 * Behavior:
 * - Generates a UUID v4 for each request if not provided
 * - Accepts existing correlation IDs from X-Request-ID or X-Correlation-ID headers
 * - Sets the correlation ID as X-Request-ID response header
 * - Makes correlation ID available on req.correlationId for use in logging
 *
 * Usage:
 * ```typescript
 * // In app.ts (early in middleware chain)
 * import { correlationIdMiddleware } from './middleware/correlation-id.middleware';
 * app.use(correlationIdMiddleware);
 *
 * // In route handlers or services
 * import { getCorrelationId } from './middleware/correlation-id.middleware';
 * const correlationId = getCorrelationId(req);
 * logger.info('Processing request', { correlationId });
 * ```
 *
 * @module middleware/correlation-id
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Header names used for correlation ID propagation.
 * X-Request-ID is the primary header (most common convention).
 * X-Correlation-ID is accepted as fallback for compatibility.
 */
export const CORRELATION_ID_HEADER = 'X-Request-ID';
export const CORRELATION_ID_HEADER_ALT = 'X-Correlation-ID';

/**
 * Request type with correlation ID.
 * Use this type when accessing correlationId in route handlers.
 *
 * @example
 * ```typescript
 * import { CorrelatedRequest } from '../middleware/correlation-id.middleware';
 *
 * router.get('/example', (req: CorrelatedRequest, res) => {
 *   logger.info('Processing', { correlationId: req.correlationId });
 *   // ...
 * });
 * ```
 */
export interface CorrelatedRequest extends Request {
  /**
   * Unique identifier for this request, used for distributed tracing.
   * Always populated after correlationIdMiddleware runs.
   */
  correlationId: string;
}

/**
 * Type guard to check if a request has a correlation ID.
 *
 * @param req - Express request object
 * @returns True if the request has a correlationId property
 */
export function hasCorrelationId(req: Request): req is CorrelatedRequest {
  return 'correlationId' in req && typeof req.correlationId === 'string';
}

/**
 * Extract correlation ID from request headers.
 * Checks X-Request-ID first, then falls back to X-Correlation-ID.
 *
 * @param req - Express request object
 * @returns Correlation ID from headers or undefined if not present
 */
function extractCorrelationIdFromHeaders(req: Request): string | undefined {
  // Check X-Request-ID header (primary)
  const requestId = req.get(CORRELATION_ID_HEADER);
  if (requestId && isValidCorrelationId(requestId)) {
    return requestId;
  }

  // Check X-Correlation-ID header (fallback)
  const correlationId = req.get(CORRELATION_ID_HEADER_ALT);
  if (correlationId && isValidCorrelationId(correlationId)) {
    return correlationId;
  }

  return undefined;
}

/**
 * Validate correlation ID format.
 * Accepts UUIDs and other reasonable alphanumeric identifiers.
 * Rejects empty strings and overly long values to prevent abuse.
 *
 * @param id - Correlation ID to validate
 * @returns True if the ID is valid
 */
function isValidCorrelationId(id: string): boolean {
  // Must be non-empty and reasonable length (max 128 chars)
  if (!id || id.length > 128) {
    return false;
  }

  // Allow alphanumeric characters, hyphens, and underscores
  // This covers UUIDs, short IDs, and common tracing formats
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Generate a new correlation ID.
 * Uses crypto.randomUUID() for RFC 4122 compliant UUID v4.
 *
 * @returns New UUID v4 correlation ID
 */
function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Correlation ID middleware.
 * Must be added early in the middleware chain to ensure all
 * subsequent middleware and route handlers have access to it.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Extract existing correlation ID from headers or generate new one
  const correlationId =
    extractCorrelationIdFromHeaders(req) || generateCorrelationId();

  // Attach to request object for use in handlers and services
  (req as CorrelatedRequest).correlationId = correlationId;

  // Set response header so clients can track their requests
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

/**
 * Utility function to safely get correlation ID from request.
 * Returns 'unknown' if correlation ID is not set (defensive fallback).
 *
 * @param req - Express request object
 * @returns Correlation ID or 'unknown' if not available
 *
 * @example
 * ```typescript
 * import { getCorrelationId } from '../middleware/correlation-id.middleware';
 *
 * function someService(req: Request) {
 *   const correlationId = getCorrelationId(req);
 *   logger.info('Processing data', { correlationId });
 * }
 * ```
 */
export function getCorrelationId(req: Request): string {
  if (hasCorrelationId(req)) {
    return req.correlationId;
  }
  return 'unknown';
}

/**
 * Create a logger context object with correlation ID.
 * Convenience function for consistent log formatting.
 *
 * @param req - Express request object
 * @param additionalContext - Additional context to merge
 * @returns Log context object with correlationId
 *
 * @example
 * ```typescript
 * import { createLogContext } from '../middleware/correlation-id.middleware';
 *
 * router.post('/users', (req, res) => {
 *   logger.info('Creating user', createLogContext(req, { email: body.email }));
 * });
 * ```
 */
export function createLogContext(
  req: Request,
  additionalContext?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    correlationId: getCorrelationId(req),
    ...additionalContext,
  };
}
