/**
 * Module Guard Middleware
 *
 * Protects API endpoints based on enabled modules.
 * If a module is disabled, requests to its endpoints return 404.
 *
 * Supports both static (environment-based) and dynamic (database-based) configuration:
 * - For startup route registration: uses static isModuleEnabled()
 * - For runtime request checking: uses async isModuleEnabledForTenant()
 *
 * Tenant identification:
 * - X-Tenant-ID header (for multi-tenant deployments)
 * - Falls back to 'default' tenant
 */

import { Request, Response, NextFunction } from 'express';
import { ModuleId } from '../../../../packages/modules/index';
import { isModuleEnabled } from '../modules/module-config';
import { isModuleEnabledForTenant } from '../modules/feature-flags/feature-flags.service';

/**
 * Extract tenant ID from request
 * Checks X-Tenant-ID header, falls back to 'default'
 */
function getTenantId(req: Request): string {
  return (req.headers['x-tenant-id'] as string) || 'default';
}

/**
 * Creates middleware that guards routes for a specific module.
 * If the module is disabled for the tenant, returns 404 Not Found.
 *
 * This middleware checks the database for tenant-specific configuration,
 * falling back to environment variables if no database config exists.
 *
 * @param moduleId - The module ID to check
 * @returns Express middleware function
 *
 * @example
 * // Protect marketing routes with database-backed tenant checking
 * app.use('/api/marketing-contents', requireModule('marketing'), marketingRouter);
 */
export function requireModule(moduleId: ModuleId) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const enabled = await isModuleEnabledForTenant(moduleId, tenantId);

      if (!enabled) {
        res.status(404).json({
          error: 'Not Found',
          message: 'This feature is not available in your deployment.',
        });
        return;
      }
      next();
    } catch (error) {
      // If database check fails, fall back to static config for resilience
      console.error(
        'Module guard database check failed, using static config:',
        error,
      );
      if (!isModuleEnabled(moduleId)) {
        res.status(404).json({
          error: 'Not Found',
          message: 'This feature is not available in your deployment.',
        });
        return;
      }
      next();
    }
  };
}

/**
 * Creates a synchronous middleware that only checks static configuration.
 * Use this for startup-time route registration decisions.
 *
 * @param moduleId - The module ID to check
 * @returns Express middleware function
 */
export function requireModuleSync(moduleId: ModuleId) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isModuleEnabled(moduleId)) {
      res.status(404).json({
        error: 'Not Found',
        message: 'This feature is not available in your deployment.',
      });
      return;
    }
    next();
  };
}

/**
 * Middleware that logs which modules are enabled at startup.
 * Useful for debugging configuration issues.
 */
export function logModulesMiddleware() {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
}

export default requireModule;
