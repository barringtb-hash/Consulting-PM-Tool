import { createApp } from './app';
import { env } from './config/env';

// Handle uncaught exceptions
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
