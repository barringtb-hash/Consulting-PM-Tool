/**
 * Module Guard Middleware
 *
 * Protects API endpoints based on enabled modules.
 * If a module is disabled, requests to its endpoints return 404.
 */

import { Request, Response, NextFunction } from 'express';
import { ModuleId } from '../../../../packages/modules';
import { isModuleEnabled } from '../modules/module-config';

/**
 * Creates middleware that guards routes for a specific module.
 * If the module is disabled, returns 404 Not Found.
 *
 * @param moduleId - The module ID to check
 * @returns Express middleware function
 *
 * @example
 * // Protect marketing routes
 * app.use('/api/marketing-contents', requireModule('marketing'), marketingRouter);
 */
export function requireModule(moduleId: ModuleId) {
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
