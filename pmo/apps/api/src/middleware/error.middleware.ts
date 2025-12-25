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
  // Handle CORS errors silently - these are security policy, not application errors.
  // CORS blocks from bot traffic and probing requests should not flood logs.
  if (err instanceof CorsError) {
    // Return 403 without logging - CORS middleware already handled headers
    res.status(403).json({
      error: 'CORS policy: Origin not allowed',
    });
    return;
  }

  // Also catch generic CORS errors from the cors library
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: 'CORS policy: Origin not allowed',
    });
    return;
  }

  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Handle Prisma errors - log details server-side only, don't expose to clients
  if (err.name === 'PrismaClientKnownRequestError') {
    console.error('Prisma known request error:', err.message);
    res.status(400).json({
      error: 'Database operation failed',
    });
    return;
  }

  // Handle Prisma connection/initialization errors
  if (
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError'
  ) {
    console.error('Database connection error:', err.message);
    res.status(503).json({
      error: 'Database connection unavailable',
    });
    return;
  }

  // Handle Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    console.error('Prisma validation error:', err.message);
    res.status(400).json({
      error: 'Invalid request',
    });
    return;
  }

  // Default to 500 server error
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
