/**
 * Module Licensing Middleware
 *
 * Express middleware for enforcing module access and usage limits
 * at the route level.
 */

import { Request, Response, NextFunction } from 'express';
import {
  checkModuleAccess,
  checkUsageLimit,
  incrementUsage,
} from './licensing.service';
import { getTenantContext } from '../../tenant/tenant.context';

/**
 * Middleware that requires a specific module to be enabled and accessible.
 * Returns 403 with upgrade information if module is not accessible.
 */
export function requireLicensedModule(moduleId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const accessResult = await checkModuleAccess(tenantId, moduleId);

      if (!accessResult.allowed) {
        return res.status(403).json({
          error: 'Module not accessible',
          message: accessResult.reason,
          upgradeUrl: accessResult.upgradeUrl,
          trialDaysRemaining: accessResult.trialDaysRemaining,
        });
      }

      // Add trial warning header if applicable
      if (accessResult.trialDaysRemaining !== undefined) {
        res.setHeader(
          'X-Trial-Days-Remaining',
          accessResult.trialDaysRemaining.toString(),
        );
      }

      next();
    } catch (error) {
      // If no tenant context, allow through (handled by other middleware)
      if (error instanceof Error && error.message.includes('Tenant context')) {
        return next();
      }
      next(error);
    }
  };
}

/**
 * Middleware that checks and enforces a specific usage limit.
 * Returns 429 if limit is exceeded.
 */
export function enforceUsageLimit(
  moduleId: string,
  limitKey: string,
  quantityExtractor?: (req: Request) => number,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      // Determine quantity from request or default to 1
      const quantity = quantityExtractor ? quantityExtractor(req) : 1;

      const limitResult = await checkUsageLimit(
        tenantId,
        moduleId,
        limitKey,
        quantity,
      );

      if (!limitResult.allowed) {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          message: limitResult.message,
          currentUsage: limitResult.currentUsage,
          limit: limitResult.limit,
          upgradeUrl: '/settings/billing',
        });
      }

      // Store info for post-processing
      req.usageTracking = {
        moduleId,
        limitKey,
        quantity,
      };

      next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Tenant context')) {
        return next();
      }
      next(error);
    }
  };
}

/**
 * Middleware that increments usage after successful request.
 * Should be used as a response interceptor.
 */
export function trackUsage() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end.bind(res);

    // Override end to track usage on successful responses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res.end as any) = function (
      chunk?: unknown,
      encodingOrCb?: BufferEncoding | (() => void),
      cb?: () => void,
    ) {
      // Only track on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && req.usageTracking) {
        const { moduleId, limitKey, quantity } = req.usageTracking;

        // Get tenant context
        try {
          const { tenantId } = getTenantContext();
          // Fire and forget - don't wait for this
          incrementUsage(tenantId, moduleId, limitKey, quantity).catch(
            (err) => {
              console.error('Failed to track usage:', err);
            },
          );
        } catch {
          // No tenant context, skip tracking
        }
      }

      // Call original end with proper arguments
      if (typeof encodingOrCb === 'function') {
        return originalEnd(chunk, encodingOrCb);
      }
      if (encodingOrCb !== undefined) {
        return originalEnd(chunk, encodingOrCb, cb);
      }
      return originalEnd(chunk, cb);
    };

    next();
  };
}

/**
 * Combined middleware that checks access, enforces limits, and tracks usage.
 */
export function withModuleLicensing(
  moduleId: string,
  options?: {
    limitKey?: string;
    quantityExtractor?: (req: Request) => number;
  },
) {
  const middlewares = [requireLicensedModule(moduleId)];

  if (options?.limitKey) {
    middlewares.push(
      enforceUsageLimit(moduleId, options.limitKey, options.quantityExtractor),
    );
    middlewares.push(trackUsage());
  }

  return middlewares;
}

// Extend Express Request type to include usage tracking
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usageTracking?: {
        moduleId: string;
        limitKey: string;
        quantity: number;
      };
    }
  }
}
