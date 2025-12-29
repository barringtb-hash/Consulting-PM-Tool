/**
 * API Error Capture Middleware
 *
 * Automatically captures API errors and reports them to the bug tracking system.
 * This middleware intercepts error responses (4xx, 5xx) and creates issues
 * for patterns that indicate problems.
 *
 * Captured errors:
 * - All 5xx errors (server errors)
 * - 404 errors on config/module endpoints (indicates misconfiguration)
 * - Repeated 4xx patterns (may indicate bugs or UX issues)
 *
 * Not captured:
 * - 401 Unauthorized (expected for unauthenticated requests)
 * - 403 Forbidden (expected for unauthorized access attempts)
 * - Individual 404s for resources (expected during normal operation)
 *
 * @module middleware/api-error-capture
 */

import { Request, Response, NextFunction } from 'express';
import { isModuleEnabled } from '../modules/module-config';

/**
 * Patterns of 404 URLs that indicate misconfiguration rather than
 * normal "resource not found" scenarios. These should be captured.
 */
const CONFIG_ENDPOINT_PATTERNS = [
  /\/configs?$/i,
  /\/settings$/i,
  /\/configuration$/i,
];

/**
 * Rate limiting for error capture to prevent flooding
 */
const errorCaptureRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_CAPTURES_PER_WINDOW = 10;

/**
 * Clear old rate limit entries periodically
 * Use unref() so this interval doesn't prevent graceful shutdown
 */
const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of errorCaptureRateLimit.entries()) {
    if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
      errorCaptureRateLimit.delete(key);
    }
  }
}, 60000);

// Allow Node.js to exit even if this interval is still active
rateLimitCleanupInterval.unref();

/**
 * Check if an error should be captured based on rate limiting
 */
function shouldCapture(errorKey: string): boolean {
  const now = Date.now();
  const captures = Array.from(errorCaptureRateLimit.entries()).filter(
    ([key, timestamp]) =>
      key.startsWith(errorKey) && now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (captures.length >= MAX_CAPTURES_PER_WINDOW) {
    return false;
  }

  errorCaptureRateLimit.set(`${errorKey}:${now}`, now);
  return true;
}

/**
 * Check if a 404 should be captured (config endpoints, not resource lookups)
 */
function shouldCapture404(url: string): boolean {
  return CONFIG_ENDPOINT_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Capture an API error and report it to the bug tracking system
 */
async function captureApiError(
  req: Request,
  statusCode: number,
  errorMessage: string,
): Promise<void> {
  // Dynamically import to avoid circular dependencies and ensure
  // the module is only loaded when bug tracking is enabled
  try {
    const { ingestServerError } =
      await import('../modules/bug-tracking/error-collector.service');

    await ingestServerError({
      message: `API Error ${statusCode}: ${errorMessage}`,
      source: 'API_ERROR',
      level: statusCode >= 500 ? 'error' : 'warn',
      url: req.originalUrl,
      method: req.method,
      statusCode,
      environment: process.env.NODE_ENV || 'development',
      serverInfo: {
        route: req.route?.path,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    console.debug(
      `[API Error Capture] Captured ${statusCode} error for ${req.method} ${req.originalUrl}`,
    );
  } catch (error) {
    // Don't let error capture failures affect the request
    console.debug('[API Error Capture] Failed to capture error:', error);
  }
}

/**
 * API Error Capture Middleware
 *
 * Must be registered BEFORE the error handler to intercept responses.
 * Uses response patching to capture errors after they're sent.
 */
export function apiErrorCaptureMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Skip if bug tracking module is not enabled
  if (!isModuleEnabled('bugTracking')) {
    next();
    return;
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture error responses
  res.json = function (body: unknown): Response {
    const statusCode = res.statusCode;

    // Determine if this error should be captured
    let shouldCaptureError = false;
    let errorMessage = '';

    if (statusCode >= 500) {
      // Always capture 5xx errors
      shouldCaptureError = true;
      errorMessage =
        (body as { error?: string })?.error ||
        (body as { message?: string })?.message ||
        'Internal server error';
    } else if (statusCode === 404 && shouldCapture404(req.originalUrl)) {
      // Capture 404s on config endpoints
      shouldCaptureError = true;
      errorMessage = `Resource not found: ${req.originalUrl}`;
    }

    if (shouldCaptureError) {
      const errorKey = `${statusCode}:${req.method}:${req.originalUrl}`;

      if (shouldCapture(errorKey)) {
        // Fire and forget - don't await to avoid slowing down responses
        captureApiError(req, statusCode, errorMessage).catch(() => {
          // Silently ignore capture failures
        });
      }
    }

    // Call original json method
    return originalJson(body);
  };

  next();
}

export default apiErrorCaptureMiddleware;
