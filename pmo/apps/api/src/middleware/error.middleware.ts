import { NextFunction, Request, Response } from 'express';

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

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,

  _next: NextFunction,
): void => {
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

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      error: 'Database operation failed',
      details: err.message,
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
      details: 'Please try again later',
    });
    return;
  }

  // Handle Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    res.status(400).json({
      error: 'Invalid database query',
      details: err.message,
    });
    return;
  }

  // Default to 500 server error
  res.status(500).json({
    error: 'Internal server error',
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
