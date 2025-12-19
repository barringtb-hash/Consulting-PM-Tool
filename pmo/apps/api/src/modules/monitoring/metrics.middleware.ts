/**
 * API Metrics Middleware
 *
 * Automatically collects metrics for all API requests including:
 * - Response time
 * - Status codes
 * - Request/response sizes
 */

import { Request, Response, NextFunction } from 'express';
import { recordAPIMetrics } from './metrics.service';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

/**
 * Normalize path by removing IDs to group similar endpoints
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/\d+/g, '/:id') // Replace numeric IDs
    .replace(/\/[a-f0-9-]{36}/gi, '/:id') // Replace UUIDs
    .replace(/\/[a-z0-9]{25}/gi, '/:id'); // Replace CUIDs
}

/**
 * API metrics middleware
 */
export function apiMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // Skip health checks and static assets
  if (req.path === '/api/healthz' || req.path.startsWith('/static')) {
    return next();
  }

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const normalizedPath = normalizePath(req.path);
    // Safely get tenant ID - may not exist for unauthenticated requests
    const tenantId = hasTenantContext() ? getTenantId() : 'anonymous';

    recordAPIMetrics(
      req.method,
      normalizedPath,
      res.statusCode,
      duration,
      tenantId,
    );
  });

  next();
}
