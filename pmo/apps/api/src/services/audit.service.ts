/**
 * Audit Service
 *
 * Provides audit logging for all sensitive operations.
 * Tracks who did what, when, and what changed.
 */

import { prisma } from '../prisma/client';
import { AuditAction, Prisma } from '@prisma/client';
import { hasTenantContext, getTenantId } from '../tenant/tenant.context';

export interface AuditLogInput {
  userId?: number;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryOptions {
  action?: AuditAction;
  entityType?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Log an auditable action.
 * This function is designed to never throw - audit logging should not fail main operations.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    const tenantId = hasTenantContext() ? getTenantId() : null;

    // Build changes object only if we have before or after data
    let changes: Prisma.InputJsonValue | undefined;
    if (input.before || input.after) {
      changes = {
        before: (input.before ?? null) as Prisma.InputJsonValue | null,
        after: (input.after ?? null) as Prisma.InputJsonValue | null,
      } as Prisma.InputJsonValue;
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    // Log to console for monitoring/alerting purposes
    console.error('Audit logging failed:', error);
  }
}

/**
 * Log a batch of audit events.
 */
export async function logAuditBatch(inputs: AuditLogInput[]): Promise<void> {
  try {
    const tenantId = hasTenantContext() ? getTenantId() : null;

    await prisma.auditLog.createMany({
      data: inputs.map((input) => ({
        tenantId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes:
          input.before || input.after
            ? ({
                before: (input.before ?? null) as Prisma.InputJsonValue | null,
                after: (input.after ?? null) as Prisma.InputJsonValue | null,
              } as Prisma.InputJsonValue)
            : undefined,
        metadata: input.metadata as Prisma.InputJsonValue,
      })),
    });
  } catch (error) {
    console.error('Batch audit logging failed:', error);
  }
}

/**
 * Get audit logs for a specific entity.
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit = 50,
) {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.auditLog.findMany({
    where: {
      tenantId,
      entityType,
      entityId,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get audit logs for current tenant.
 */
export async function getTenantAuditLogs(options: AuditQueryOptions = {}) {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const where: Prisma.AuditLogWhereInput = {
    tenantId,
  };

  if (options.action) {
    where.action = options.action;
  }
  if (options.entityType) {
    where.entityType = options.entityType;
  }
  if (options.userId) {
    where.userId = options.userId;
  }
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get audit logs for a specific user.
 */
export async function getUserAuditLogs(userId: number, limit = 50) {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.auditLog.findMany({
    where: {
      tenantId,
      userId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get audit statistics for a time period.
 */
export async function getAuditStats(startDate: Date, endDate: Date) {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const stats = await prisma.auditLog.groupBy({
    by: ['action'],
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: { id: true },
  });

  const entityStats = await prisma.auditLog.groupBy({
    by: ['entityType'],
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: { id: true },
  });

  return {
    byAction: stats.reduce(
      (acc, s) => ({ ...acc, [s.action]: s._count.id }),
      {} as Record<string, number>,
    ),
    byEntityType: entityStats.reduce(
      (acc, s) => ({ ...acc, [s.entityType]: s._count.id }),
      {} as Record<string, number>,
    ),
  };
}

/**
 * Helper to create a diff between before and after states.
 * Only includes fields that actually changed.
 */
export function createChangeDiff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { before: Partial<T>; after: Partial<T> } {
  const changedBefore: Partial<T> = {};
  const changedAfter: Partial<T> = {};

  for (const key of Object.keys(after) as (keyof T)[]) {
    const beforeValue = before[key];
    const afterValue = after[key];

    // Skip if values are the same (including deep equality for objects)
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }

    changedBefore[key] = beforeValue;
    changedAfter[key] = afterValue;
  }

  return { before: changedBefore, after: changedAfter };
}

/**
 * Helper to sanitize sensitive fields from audit data.
 */
export function sanitizeForAudit(
  data: Record<string, unknown>,
  sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'apiKey',
    'credentials',
  ],
): Record<string, unknown> {
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Create audit metadata from Express request.
 */
export function createAuditMetadata(req: {
  ip?: string;
  headers?: { 'user-agent'?: string; 'x-forwarded-for'?: string };
  method?: string;
  path?: string;
  originalUrl?: string;
}): Record<string, unknown> {
  return {
    ip: req.headers?.['x-forwarded-for'] || req.ip,
    userAgent: req.headers?.['user-agent'],
    method: req.method,
    path: req.originalUrl || req.path,
    timestamp: new Date().toISOString(),
  };
}
