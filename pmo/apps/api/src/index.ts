/**
 * API Server Entry Point
 *
 * This is the main entry point for the Express API server.
 * It bootstraps the application and starts listening for HTTP requests.
 *
 * Startup Sequence:
 * 1. Register global error handlers (uncaughtException, unhandledRejection)
 * 2. Create Express app with all middleware and routes
 * 3. Start HTTP server on configured port
 * 4. Log CORS configuration for debugging
 *
 * Environment Requirements:
 * - PORT: Server port (default: 3001)
 * - DATABASE_URL: PostgreSQL connection string
 * - JWT_SECRET: Secret for JWT signing (min 32 chars)
 * - CORS_ORIGIN: Allowed origins (comma-separated)
 *
 * Graceful Shutdown:
 * - uncaughtException: Immediate exit (code 1)
 * - unhandledRejection: Close server then exit (code 1)
 *
 * @module index
 */

// IMPORTANT: env must be imported FIRST to load dotenv before any database clients
import { env } from './config/env';
import { createApp } from './app';

// Handle uncaught exceptions - exit immediately as state may be corrupted
process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

const app = createApp();
const port = env.port;

const server = app.listen(Number(port), () => {
  console.log(`API server listening on port ${port}`);

  // Log CORS configuration for debugging
  const corsOrigin = env.corsOrigin;
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map((o) => o.trim());
    const hasVercel = origins.some((o) => o.includes('.vercel.app'));
    console.log('CORS configuration:', {
      allowedOrigins: origins,
      vercelPreviewsEnabled: hasVercel,
    });
  } else {
    console.log('CORS configuration: All origins allowed (development mode)');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));

  console.error('UNHANDLED REJECTION! Shutting down...', {
    message: error.message,
    stack: error.stack,
  });

  server.close(() => {
    process.exit(1);
  });
});
