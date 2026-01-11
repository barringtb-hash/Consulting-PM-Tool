import { createHash } from 'crypto';
import { prisma } from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import { IssueSource, IssuePriority, Prisma } from '@prisma/client';
import { createIssue } from './bug-tracking.service';
import {
  ClientErrorInput,
  ServerErrorInput,
  VercelLogMessage,
  RenderLogEvent,
} from './types';

// ============================================================================
// ERROR HASHING & DEDUPLICATION
// ============================================================================

/**
 * Generate a hash for error deduplication
 * Uses message, stack trace (first few lines), and source
 */
export function generateErrorHash(
  message: string,
  stackTrace?: string,
  source?: string,
): string {
  // Normalize the stack trace - take first 3 lines and remove line numbers/columns
  const normalizedStack = stackTrace
    ? stackTrace
        .split('\n')
        .slice(0, 3)
        .map((line) => line.replace(/:\d+:\d+/g, ''))
        .join('\n')
    : '';

  const content = `${message}|${normalizedStack}|${source || ''}`;
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * Find or create an issue for a given error
 * If an issue with the same error hash exists, increment its count
 * Otherwise, create a new issue
 */
async function findOrCreateIssueForError(
  errorHash: string,
  createData: {
    title: string;
    description?: string;
    source: IssueSource;
    stackTrace?: string;
    browserInfo?: Record<string, unknown>;
    requestInfo?: Record<string, unknown>;
    environment?: string;
    appVersion?: string;
    url?: string;
    module?: string;
  },
  reportedById?: number,
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  // Try to find existing issue with same error hash
  const existingIssue = await prisma.issue.findFirst({
    where: {
      errorHash,
      tenantId: tenantId || null,
      status: { notIn: ['CLOSED', 'WONT_FIX'] }, // Only match open/active issues
    },
  });

  if (existingIssue) {
    // Increment error count and update timestamp
    return prisma.issue.update({
      where: { id: existingIssue.id },
      data: {
        errorCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  // Create new issue - pass reportedById if provided
  return createIssue(
    {
      ...createData,
      errorHash,
      type: 'BUG',
      priority: determinePriority(createData.source),
    },
    reportedById,
  );
}

/**
 * Determine priority based on error source
 */
function determinePriority(source: IssueSource): IssuePriority {
  switch (source) {
    case 'API_ERROR':
    case 'RENDER_LOG':
      return 'HIGH';
    case 'VERCEL_LOG':
      return 'MEDIUM';
    case 'BROWSER_ERROR':
      return 'MEDIUM';
    default:
      return 'MEDIUM';
  }
}

// ============================================================================
// CLIENT ERROR INGESTION
// ============================================================================

/**
 * Ingest errors from browser clients
 */
export async function ingestClientError(error: ClientErrorInput) {
  // Use provided tenantId or fall back to context
  const tenantId =
    error.tenantId || (hasTenantContext() ? getTenantId() : null);
  const errorHash = generateErrorHash(
    error.message,
    error.stack,
    'BROWSER_ERROR',
  );

  // Create error log entry
  const errorLog = await prisma.errorLog.create({
    data: {
      tenantId,
      message: error.message,
      stackTrace: error.stack,
      source: 'BROWSER_ERROR',
      level: 'error',
      url: error.url,
      userId: error.userId,
      sessionId: error.sessionId,
      module: error.module,
      environment: error.environment || process.env.NODE_ENV,
      appVersion: error.appVersion,
      browserInfo: error.browserInfo as Record<string, unknown>,
    },
  });

  // Find or create issue - pass userId as reportedById if available
  const issue = await findOrCreateIssueForError(
    errorHash,
    {
      title: truncateTitle(error.message),
      description: formatClientErrorDescription(error),
      source: 'BROWSER_ERROR',
      stackTrace: error.stack,
      browserInfo: error.browserInfo as Record<string, unknown>,
      environment: error.environment,
      appVersion: error.appVersion,
      url: error.url,
      module: error.module,
    },
    error.userId, // Set reportedById to the user who encountered the error
  );

  // Link error log to issue
  await prisma.errorLog.update({
    where: { id: errorLog.id },
    data: { issueId: issue.id },
  });

  return issue;
}

/**
 * Batch ingest multiple client errors
 */
export async function ingestClientErrors(errors: ClientErrorInput[]) {
  const results = await Promise.all(
    errors.map((error) =>
      ingestClientError(error).catch((e) => ({ error: e })),
    ),
  );
  return results;
}

// ============================================================================
// SERVER ERROR INGESTION
// ============================================================================

/**
 * Ingest errors from server/API
 */
export async function ingestServerError(error: ServerErrorInput) {
  // Use provided tenantId or fall back to context
  const tenantId =
    error.tenantId || (hasTenantContext() ? getTenantId() : null);
  const errorHash = generateErrorHash(
    error.message,
    error.stackTrace,
    error.source,
  );

  // Create error log entry
  const errorLog = await prisma.errorLog.create({
    data: {
      tenantId,
      message: error.message,
      stackTrace: error.stackTrace,
      source: error.source,
      level: error.level || 'error',
      url: error.url,
      method: error.method,
      statusCode: error.statusCode,
      requestId: error.requestId,
      module: error.module,
      environment: error.environment || process.env.NODE_ENV,
      appVersion: error.appVersion,
      serverInfo: error.serverInfo as Record<string, unknown>,
      rawPayload: error.rawPayload,
    },
  });

  // Find or create issue
  const issue = await findOrCreateIssueForError(errorHash, {
    title: truncateTitle(error.message),
    description: formatServerErrorDescription(error),
    source: error.source,
    stackTrace: error.stackTrace,
    requestInfo: {
      url: error.url,
      method: error.method,
      statusCode: error.statusCode,
    },
    environment: error.environment,
    appVersion: error.appVersion,
    url: error.url,
    module: error.module,
  });

  // Link error log to issue
  await prisma.errorLog.update({
    where: { id: errorLog.id },
    data: { issueId: issue.id },
  });

  return issue;
}

// ============================================================================
// VERCEL LOG DRAIN PROCESSING
// ============================================================================

/**
 * Process Vercel log drain webhook payload
 */
export async function processVercelLogs(logs: VercelLogMessage[]) {
  // Filter for error logs
  const errorLogs = logs.filter(
    (log) =>
      (log.statusCode && log.statusCode >= 500) ||
      log.message.toLowerCase().includes('error') ||
      log.message.toLowerCase().includes('exception') ||
      log.message.toLowerCase().includes('fatal'),
  );

  const results = [];

  for (const log of errorLogs) {
    try {
      const issue = await ingestServerError({
        message: log.message,
        source: 'VERCEL_LOG',
        level: log.statusCode && log.statusCode >= 500 ? 'error' : 'warn',
        url: log.proxy
          ? `${log.proxy.scheme}://${log.host}${log.path}`
          : `https://${log.host}${log.path}`,
        method: log.proxy?.method,
        statusCode: log.statusCode || log.proxy?.statusCode,
        environment: 'production',
        serverInfo: {
          deploymentId: log.deploymentId,
          region: log.proxy?.region,
        },
        rawPayload: log as unknown as Record<string, unknown>,
      });
      results.push({ success: true, issueId: issue.id });
    } catch (error) {
      results.push({ success: false, error: (error as Error).message });
    }
  }

  return {
    processed: errorLogs.length,
    results,
  };
}

// ============================================================================
// RENDER LOG STREAM PROCESSING
// ============================================================================

/**
 * Process Render log stream webhook payload
 */
export async function processRenderLogs(logs: RenderLogEvent[]) {
  // Filter for error-level logs
  const errorLogs = logs.filter(
    (log) =>
      log.level === 'error' ||
      log.message.includes('Error:') ||
      log.message.includes('FATAL') ||
      log.message.includes('Uncaught') ||
      log.message.includes('UnhandledPromiseRejection'),
  );

  const results = [];

  for (const log of errorLogs) {
    try {
      const issue = await ingestServerError({
        message: log.message,
        source: 'RENDER_LOG',
        level: log.level,
        environment: 'production',
        serverInfo: {
          serviceId: log.serviceId,
          serviceName: log.serviceName,
          deploymentId: log.deployId,
          instanceId: log.instanceId,
        },
        rawPayload: log as unknown as Record<string, unknown>,
      });
      results.push({ success: true, issueId: issue.id });
    } catch (error) {
      results.push({ success: false, error: (error as Error).message });
    }
  }

  return {
    processed: errorLogs.length,
    results,
  };
}

// ============================================================================
// ERROR LOG QUERIES
// ============================================================================

/**
 * Get error logs for an issue
 */
export async function getErrorLogsForIssue(
  issueId: number,
  limit: number = 50,
) {
  return prisma.errorLog.findMany({
    where: { issueId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get recent error logs
 */
export async function getRecentErrorLogs(
  options: {
    source?: IssueSource;
    level?: string;
    limit?: number;
    since?: Date;
  } = {},
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;
  const { source, level, limit = 100, since } = options;

  return prisma.errorLog.findMany({
    where: {
      tenantId: tenantId || undefined,
      source: source || undefined,
      level: level || undefined,
      createdAt: since ? { gte: since } : undefined,
    },
    include: {
      issue: {
        select: { id: true, title: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get error statistics
 */
export async function getErrorStats(since?: Date) {
  const tenantId = hasTenantContext() ? getTenantId() : null;
  const where = {
    tenantId: tenantId || undefined,
    createdAt: since ? { gte: since } : undefined,
  };

  const [total, bySource, byLevel, hourlyTrend] = await Promise.all([
    prisma.errorLog.count({ where }),
    prisma.errorLog.groupBy({
      by: ['source'],
      where,
      _count: true,
    }),
    prisma.errorLog.groupBy({
      by: ['level'],
      where,
      _count: true,
    }),
    // Get hourly counts for last 24 hours
    (async () => {
      const tenantFilter = tenantId
        ? Prisma.sql`AND "tenantId" = ${tenantId}`
        : Prisma.empty;
      return prisma.$queryRaw`
        SELECT
          DATE_TRUNC('hour', "createdAt") as hour,
          COUNT(*) as count
        FROM "ErrorLog"
        WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
        ${tenantFilter}
        GROUP BY DATE_TRUNC('hour', "createdAt")
        ORDER BY hour DESC
      `;
    })().catch(() => []), // Fallback if raw query fails
  ]);

  return {
    total,
    bySource: bySource.reduce(
      (acc, s) => ({ ...acc, [s.source]: s._count }),
      {} as Record<string, number>,
    ),
    byLevel: byLevel.reduce(
      (acc, l) => ({ ...acc, [l.level]: l._count }),
      {} as Record<string, number>,
    ),
    hourlyTrend,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Truncate error message for use as issue title
 */
function truncateTitle(message: string, maxLength: number = 200): string {
  // Remove stack trace if accidentally included
  const cleanMessage = message.split('\n')[0];
  if (cleanMessage.length <= maxLength) {
    return cleanMessage;
  }
  return cleanMessage.substring(0, maxLength - 3) + '...';
}

/**
 * Format client error description with details
 */
function formatClientErrorDescription(error: ClientErrorInput): string {
  const parts = [
    `**Error Message:** ${error.message}`,
    '',
    `**Source:** ${error.source}`,
    `**URL:** ${error.url}`,
  ];

  if (error.module) {
    parts.push(`**Module:** ${error.module}`);
  }

  if (error.tenantId) {
    parts.push(`**Tenant ID:** ${error.tenantId}`);
  }

  if (error.line || error.column) {
    parts.push(`**Location:** Line ${error.line}, Column ${error.column}`);
  }

  if (error.browserInfo) {
    parts.push('', '**Browser Info:**');
    if (error.browserInfo.browser) {
      parts.push(
        `- Browser: ${error.browserInfo.browser} ${error.browserInfo.version || ''}`,
      );
    }
    if (error.browserInfo.os) {
      parts.push(`- OS: ${error.browserInfo.os}`);
    }
    if (error.browserInfo.device) {
      parts.push(`- Device: ${error.browserInfo.device}`);
    }
    if (error.browserInfo.screenSize) {
      parts.push(`- Screen: ${error.browserInfo.screenSize}`);
    }
  }

  if (error.stack) {
    parts.push('', '**Stack Trace:**', '```', error.stack, '```');
  }

  if (error.componentStack) {
    parts.push('', '**Component Stack:**', '```', error.componentStack, '```');
  }

  return parts.join('\n');
}

/**
 * Format server error description with details
 */
function formatServerErrorDescription(error: ServerErrorInput): string {
  const parts = [
    `**Error Message:** ${error.message}`,
    '',
    `**Source:** ${error.source}`,
  ];

  if (error.module) {
    parts.push(`**Module:** ${error.module}`);
  }

  if (error.tenantId) {
    parts.push(`**Tenant ID:** ${error.tenantId}`);
  }

  if (error.url) {
    parts.push(`**URL:** ${error.method || 'GET'} ${error.url}`);
  }

  if (error.statusCode) {
    parts.push(`**Status Code:** ${error.statusCode}`);
  }

  if (error.requestId) {
    parts.push(`**Request ID:** ${error.requestId}`);
  }

  if (error.serverInfo) {
    parts.push('', '**Server Info:**');
    Object.entries(error.serverInfo).forEach(([key, value]) => {
      if (value) {
        parts.push(`- ${key}: ${value}`);
      }
    });
  }

  if (error.stackTrace) {
    parts.push('', '**Stack Trace:**', '```', error.stackTrace, '```');
  }

  return parts.join('\n');
}
