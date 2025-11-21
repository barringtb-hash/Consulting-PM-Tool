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
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  console.error('UNHANDLED REJECTION! Shutting down...', {
    message: reason.message,
    stack: reason.stack,
  });
  server.close(() => {
    process.exit(1);
  });
});
