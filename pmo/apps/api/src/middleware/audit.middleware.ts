/**
 * Audit Middleware
 *
 * Express middleware for capturing request metadata and
 * enabling automatic audit logging on route handlers.
 */

import { Response, NextFunction } from 'express';
import { logAudit, createAuditMetadata } from '../services/audit.service';
import { AuditAction } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth.middleware';

export interface AuditableRequest extends AuthenticatedRequest {
  auditMetadata?: Record<string, unknown>;
  auditContext?: {
    entityType: string;
    entityId?: string;
    action: AuditAction;
    before?: Record<string, unknown>;
  };
}

/**
 * Middleware to capture request metadata for audit logging.
 * Adds `auditMetadata` to the request object.
 */
export function captureAuditMetadata(
  req: AuditableRequest,
  _res: Response,
  next: NextFunction,
): void {
  req.auditMetadata = createAuditMetadata(req);
  next();
}

/**
 * Creates middleware that logs audit events after successful responses.
 *
 * @param entityType - The type of entity being operated on (e.g., "Account", "Opportunity")
 * @param getEntityId - Function to extract entity ID from request (params, body, or response)
 * @param action - The type of action being performed
 */
export function auditOnSuccess(
  entityType: string,
  getEntityId: (req: AuditableRequest, resBody?: unknown) => string | undefined,
  action: AuditAction,
) {
  return async (
    req: AuditableRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (data: unknown) {
      // Only audit successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const responseData = data as { data?: { id?: string | number } };
        const entityId =
          getEntityId(req, data) ||
          responseData?.data?.id?.toString() ||
          'unknown';

        // Fire and forget - don't block response
        logAudit({
          userId: req.userId,
          action,
          entityType,
          entityId,
          after:
            action === AuditAction.CREATE
              ? (responseData?.data as Record<string, unknown>)
              : undefined,
          metadata: req.auditMetadata,
        }).catch(console.error);
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Creates middleware for auditing delete operations.
 * Captures the entity data before deletion.
 */
export function auditDelete(
  entityType: string,
  getEntityId: (req: AuditableRequest) => string,
) {
  return async (
    req: AuditableRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const originalJson = res.json.bind(res);
    const entityId = getEntityId(req);

    // Store context for the delete operation
    req.auditContext = {
      entityType,
      entityId,
      action: AuditAction.DELETE,
    };

    res.json = function (data: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAudit({
          userId: req.userId,
          action: AuditAction.DELETE,
          entityType,
          entityId,
          before: req.auditContext?.before,
          metadata: req.auditMetadata,
        }).catch(console.error);
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Creates middleware for auditing update operations.
 * Should be used in conjunction with a service that sets req.auditContext.before
 */
export function auditUpdate(
  entityType: string,
  getEntityId: (req: AuditableRequest) => string,
) {
  return async (
    req: AuditableRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const originalJson = res.json.bind(res);
    const entityId = getEntityId(req);

    req.auditContext = {
      entityType,
      entityId,
      action: AuditAction.UPDATE,
    };

    res.json = function (data: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const responseData = data as { data?: Record<string, unknown> };

        logAudit({
          userId: req.userId,
          action: AuditAction.UPDATE,
          entityType,
          entityId,
          before: req.auditContext?.before,
          after: responseData?.data,
          metadata: req.auditMetadata,
        }).catch(console.error);
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware to log authentication events.
 */
export function auditAuth(action: 'LOGIN' | 'LOGOUT') {
  return async (
    req: AuditableRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (data: unknown) {
      const responseData = data as {
        data?: { user?: { id?: number; email?: string } };
      };

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId =
          action === 'LOGIN' ? responseData?.data?.user?.id : req.userId;

        logAudit({
          userId,
          action: action === 'LOGIN' ? AuditAction.LOGIN : AuditAction.LOGOUT,
          entityType: 'User',
          entityId: userId?.toString() || 'unknown',
          metadata: {
            ...req.auditMetadata,
            email: responseData?.data?.user?.email,
          },
        }).catch(console.error);
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Log tenant switch events.
 */
export function auditTenantSwitch(
  previousTenantId: string | undefined,
  newTenantId: string,
  userId: number,
  metadata?: Record<string, unknown>,
): void {
  logAudit({
    userId,
    action: AuditAction.TENANT_SWITCH,
    entityType: 'Tenant',
    entityId: newTenantId,
    metadata: {
      ...metadata,
      previousTenantId,
    },
  }).catch(console.error);
}

/**
 * Log bulk operations.
 */
export function auditBulkOperation(
  action: 'BULK_UPDATE' | 'BULK_DELETE',
  entityType: string,
  entityIds: string[],
  userId?: number,
  metadata?: Record<string, unknown>,
): void {
  logAudit({
    userId,
    action:
      action === 'BULK_UPDATE'
        ? AuditAction.BULK_UPDATE
        : AuditAction.BULK_DELETE,
    entityType,
    entityId: entityIds.join(','),
    metadata: {
      ...metadata,
      count: entityIds.length,
      entityIds,
    },
  }).catch(console.error);
}

/**
 * Log permission changes.
 */
export function auditPermissionChange(
  entityType: string,
  entityId: string,
  userId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): void {
  logAudit({
    userId,
    action: AuditAction.PERMISSION_CHANGE,
    entityType,
    entityId,
    before,
    after,
    metadata,
  }).catch(console.error);
}

/**
 * Log data exports.
 */
export function auditExport(
  entityType: string,
  userId: number,
  metadata?: Record<string, unknown>,
): void {
  logAudit({
    userId,
    action: AuditAction.EXPORT,
    entityType,
    entityId: 'export',
    metadata,
  }).catch(console.error);
}
