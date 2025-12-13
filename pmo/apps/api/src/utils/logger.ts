/**
 * Logger Utility
 *
 * Simple logging wrapper that provides structured logging with levels.
 * This can be replaced with a full logging library (pino, winston) in production.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('Operation completed', { userId: 123 });
 *   logger.error('Operation failed', error);
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Create a logger instance.
 * In production, consider replacing this with pino for better performance.
 */
function createLogger(): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', message, context));
      }
    },

    info(message: string, context?: LogContext): void {
      if (shouldLog('info')) {
        console.info(formatMessage('info', message, context));
      }
    },

    warn(message: string, context?: LogContext): void {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message, context));
      }
    },

    error(
      message: string,
      error?: Error | unknown,
      context?: LogContext,
    ): void {
      if (shouldLog('error')) {
        const errorContext =
          error instanceof Error
            ? {
                ...context,
                error: {
                  name: error.name,
                  message: error.message,
                  stack:
                    process.env.NODE_ENV !== 'production'
                      ? error.stack
                      : undefined,
                },
              }
            : { ...context, error };
        console.error(formatMessage('error', message, errorContext));
      }
    },
  };
}

/**
 * Default logger instance.
 * Use this throughout the application for consistent logging.
 */
export const logger = createLogger();

/**
 * Create a child logger with preset context.
 * Useful for adding module-specific context to all log messages.
 *
 * @example
 * const routeLogger = createChildLogger({ module: 'clients' });
 * routeLogger.info('Listing clients', { userId: 1 });
 */
export function createChildLogger(baseContext: LogContext): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      logger.debug(message, { ...baseContext, ...context });
    },
    info(message: string, context?: LogContext): void {
      logger.info(message, { ...baseContext, ...context });
    },
    warn(message: string, context?: LogContext): void {
      logger.warn(message, { ...baseContext, ...context });
    },
    error(
      message: string,
      error?: Error | unknown,
      context?: LogContext,
    ): void {
      logger.error(message, error, { ...baseContext, ...context });
    },
  };
}
