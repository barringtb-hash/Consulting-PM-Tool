/**
 * Error Handling Middleware
 *
 * Provides centralized error handling for the Express application.
 *
 * Error Response Format:
 * ```json
 * {
 *   "error": "Human-readable error message"
 * }
 * ```
 *
 * HTTP Status Codes:
 * - 400: Bad Request (validation errors, Prisma known errors)
 * - 401: Unauthorized (authentication required)
 * - 403: Forbidden (insufficient permissions)
 * - 404: Not Found (resource doesn't exist)
 * - 429: Too Many Requests (rate limited)
 * - 500: Internal Server Error (unexpected errors)
 * - 503: Service Unavailable (database connection issues)
 *
 * Security:
 * - Internal error details are logged server-side but NOT exposed to clients
 * - Prisma error messages are sanitized before sending to clients
 *
 * @module middleware/error
 */

import { NextFunction, Request, Response } from 'express';
import { CorsError } from '../errors/cors.error';

/**
 * Custom application error class for operational errors.
 *
 * Use this for expected errors that should be communicated to clients
 * (e.g., validation failures, not found, unauthorized).
 *
 * @example
 * throw new AppError(404, 'Project not found');
 * throw new AppError(400, 'Invalid email format');
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Express error handling middleware.
 *
 * Catches all errors from route handlers and middleware, logs them,
 * and sends appropriate JSON responses to clients.
 *
 * Must be registered LAST in the middleware chain:
 * ```typescript
 * app.use(errorHandler);
 * ```
 *
 * @param err - The error object thrown or passed to next()
 * @param _req - Express request object (unused)
 * @param res - Express response object
 * @param _next - Express next function (unused, but required for error middleware signature)
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,

  _next: NextFunction,
): void => {
  // Defensive check: prevent "Cannot set headers after they are sent" errors
  if (res.headersSent) {
    return;
  }

  // ========== SILENT ERRORS (no logging) ==========
  // Handle CORS errors silently - these are security policy, not application errors.
  // CORS blocks from bot traffic and probing requests should not flood logs.
  if (err instanceof CorsError) {
    res.status(403).json({
      error: 'CORS policy: Origin not allowed',
    });
    return;
  }

  // ========== OPERATIONAL ERRORS (single log line) ==========
  // AppError: Application-level operational errors
  if (err instanceof AppError) {
    console.error(`[${err.statusCode}] ${err.message}`);
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Prisma known request errors (constraint violations, not found, etc.)
  if (err.name === 'PrismaClientKnownRequestError') {
    // Log concise message - full details available in Prisma logs
    const prismaMessage =
      typeof err.message === 'string' && err.message.trim() !== ''
        ? err.message.split('\n').slice(-1)[0].trim()
        : 'Unknown Prisma client error';
    console.error(`[Prisma] ${prismaMessage}`);
    res.status(400).json({
      error: 'Database operation failed',
    });
    return;
  }

  // Prisma connection/initialization errors
  if (
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError'
  ) {
    const firstLine =
      typeof err.message === 'string' ? err.message.split('\n')[0].trim() : '';
    console.error(
      `[Prisma] Database connection error${firstLine ? `: ${firstLine}` : ''}`,
    );
    res.status(503).json({
      error: 'Database connection unavailable',
    });
    return;
  }

  // Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    const validationMessage =
      typeof err.message === 'string' ? err.message.slice(0, 200) : '';
    console.error(
      `[Prisma] Validation error${validationMessage ? `: ${validationMessage}` : ''}`,
    );
    res.status(400).json({
      error: 'Invalid request',
    });
    return;
  }

  // ========== UNEXPECTED ERRORS (full logging for debugging) ==========
  // Only log full details for truly unexpected errors
  console.error('Unexpected error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  res.status(500).json({
    error: 'Internal server error',
  });
};

/**
 * Wraps async route handlers to catch promise rejections.
 *
 * Without this wrapper, unhandled promise rejections in async route handlers
 * would crash the server. This forwards them to the error handling middleware.
 *
 * @param fn - Async route handler function
 * @returns Wrapped handler that catches and forwards errors
 *
 * @example
 * router.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await userService.getById(req.params.id);
 *   res.json(user);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
