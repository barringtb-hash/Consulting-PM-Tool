import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment Variable Validation
 *
 * This module validates all required and optional environment variables at startup.
 * If validation fails, the application will throw a clear error explaining what's missing
 * and how to fix it.
 *
 * Required Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - JWT_SECRET: Secret for JWT signing (min 32 characters)
 * - JWT_EXPIRES_IN: JWT token expiration time
 * - BCRYPT_SALT_ROUNDS: Number of salt rounds for bcrypt
 * - PORT: Server port (defaults to 4000)
 *
 * Optional Variables (validated format if provided):
 * - OPENAI_API_KEY: Required for ML features
 * - REDIS_URL: Redis connection URL (must be valid URL format)
 * - CORS_ORIGIN: Allowed CORS origins (URL or comma-separated URLs)
 */

// Collect all validation errors to report them together
const validationErrors: string[] = [];

/**
 * Get a required environment variable or collect an error.
 */
const getRequiredEnv = (key: string, hint?: string): string => {
  const value = process.env[key];

  if (!value) {
    let errorMsg = `Missing required environment variable: ${key}`;
    if (hint) {
      errorMsg += `\n  ${hint}`;
    }
    validationErrors.push(errorMsg);
    return ''; // Return empty string to allow collecting all errors
  }

  return value;
};

/**
 * Get a required numeric environment variable or collect an error.
 */
const getRequiredNumberEnv = (key: string, hint?: string): number => {
  const value = getRequiredEnv(key, hint);
  if (!value) return 0; // Already recorded error

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    validationErrors.push(
      `Environment variable ${key} must be a number, got: "${value}"`,
    );
    return 0;
  }

  return numberValue;
};

/**
 * Validate URL format for optional URL environment variables.
 */
const validateUrlFormat = (key: string, value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    validationErrors.push(
      `Environment variable ${key} must be a valid URL.\n` +
        `  Current value: "${value}"\n` +
        `  Expected format: protocol://host:port (e.g., redis://localhost:6379)`,
    );
    return false;
  }
};

/**
 * Validate CORS_ORIGIN format (single URL or comma-separated URLs).
 */
const validateCorsOrigin = (value: string): void => {
  const origins = value.split(',').map((o) => o.trim());
  const invalidOrigins: string[] = [];

  for (const origin of origins) {
    // Allow wildcard patterns like *.vercel.app
    if (origin.includes('*')) continue;

    try {
      new URL(origin);
    } catch {
      invalidOrigins.push(origin);
    }
  }

  if (invalidOrigins.length > 0) {
    validationErrors.push(
      `Environment variable CORS_ORIGIN contains invalid URLs:\n` +
        `  Invalid: ${invalidOrigins.join(', ')}\n` +
        `  Expected format: https://example.com or comma-separated URLs`,
    );
  }
};

/**
 * Validate JWT secret has minimum required strength.
 * Weak secrets compromise token security and enable brute-force attacks.
 */
const getValidatedJwtSecret = (): string => {
  const secret = getRequiredEnv(
    'JWT_SECRET',
    'Generate a secure secret with: openssl rand -base64 48',
  );
  if (!secret) return ''; // Already recorded error

  const MIN_SECRET_LENGTH = 32;

  if (secret.length < MIN_SECRET_LENGTH) {
    validationErrors.push(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters for security.\n` +
        `  Current length: ${secret.length}\n` +
        `  Generate a secure secret with: openssl rand -base64 48`,
    );
    return secret;
  }

  return secret;
};

/**
 * Validate DATABASE_URL is set and has a valid format.
 */
const getValidatedDatabaseUrl = (): string => {
  const dbUrl = getRequiredEnv(
    'DATABASE_URL',
    'Set to a PostgreSQL connection string (e.g., postgres://user:pass@localhost:5432/dbname)\n' +
      '  Or for SQLite: file:./dev.db',
  );
  if (!dbUrl) return ''; // Already recorded error

  // Allow SQLite file URLs for local development
  if (dbUrl.startsWith('file:')) {
    return dbUrl;
  }

  // Validate PostgreSQL URL format
  try {
    const url = new URL(dbUrl);
    const validProtocols = ['postgres:', 'postgresql:'];
    if (!validProtocols.includes(url.protocol)) {
      validationErrors.push(
        `DATABASE_URL must use postgres:// or postgresql:// protocol.\n` +
          `  Current protocol: ${url.protocol}\n` +
          `  Expected format: postgres://user:password@host:port/database`,
      );
    }
  } catch {
    validationErrors.push(
      `DATABASE_URL is not a valid URL.\n` +
        `  Current value: "${dbUrl.substring(0, 50)}..."\n` +
        `  Expected format: postgres://user:password@host:port/database`,
    );
  }

  return dbUrl;
};

/**
 * Validate PORT is a valid port number.
 */
const getValidatedPort = (): string => {
  const port = process.env.PORT ?? '4000';
  const portNum = Number(port);

  if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
    validationErrors.push(
      `PORT must be a valid port number (1-65535).\n` +
        `  Current value: "${port}"`,
    );
    return '4000';
  }

  return port;
};

// =============================================================================
// Validate Required Environment Variables
// =============================================================================

// Validate DATABASE_URL (required)
const databaseUrl = getValidatedDatabaseUrl();

// Validate JWT_SECRET (required, min 32 characters)
const jwtSecret = getValidatedJwtSecret();

// Validate JWT_EXPIRES_IN (required)
const jwtExpiresIn = getRequiredEnv(
  'JWT_EXPIRES_IN',
  'Set to a valid duration (e.g., "1h", "7d", "30m")',
);

// Validate BCRYPT_SALT_ROUNDS (required, must be a number between 10-14)
const bcryptSaltRounds = getRequiredNumberEnv(
  'BCRYPT_SALT_ROUNDS',
  'Set to a number between 10-14 (e.g., 12)',
);
if (bcryptSaltRounds < 10 || bcryptSaltRounds > 14) {
  validationErrors.push(
    `BCRYPT_SALT_ROUNDS should be between 10-14 for security and performance.\n` +
      `  Current value: ${bcryptSaltRounds}\n` +
      `  Recommended: 12`,
  );
}

// Validate PORT (optional, defaults to 4000, must be valid port number)
const port = getValidatedPort();

// =============================================================================
// Validate Optional Environment Variables (format-check if provided)
// =============================================================================

// Validate REDIS_URL format if provided
const redisUrl = process.env.REDIS_URL ?? '';
if (redisUrl) {
  validateUrlFormat('REDIS_URL', redisUrl);
}

// Validate CORS_ORIGIN format if provided
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  validateCorsOrigin(corsOrigin);
}

// Document optional ML API keys
const openaiApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

// =============================================================================
// Throw All Validation Errors Together
// =============================================================================

if (validationErrors.length > 0) {
  const errorHeader = `
================================================================================
ENVIRONMENT VARIABLE VALIDATION FAILED
================================================================================

The following environment variables are missing or invalid:

`;

  const errorFooter = `

--------------------------------------------------------------------------------
Please check your .env file or environment configuration.
For local development, copy .env.example to .env and fill in the values.
================================================================================
`;

  throw new Error(
    errorHeader +
      validationErrors.map((err, i) => `${i + 1}. ${err}`).join('\n\n') +
      errorFooter,
  );
}

// =============================================================================
// Export Validated Environment Configuration
// =============================================================================

export const env = {
  // Core settings
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  databaseUrl,

  // Authentication
  jwtSecret,
  jwtExpiresIn,
  bcryptSaltRounds,

  // AI/ML API Keys (optional)
  anthropicApiKey,
  openaiApiKey,

  // CORS_ORIGIN: Frontend URL for cross-origin cookie authentication
  // When set, enables cross-origin cookie settings (sameSite='none', secure=true)
  corsOrigin,

  // Multi-tenancy configuration
  multiTenantEnabled: process.env.MULTI_TENANT_ENABLED !== 'false',
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG ?? 'default',
  tenantDomains: process.env.TENANT_DOMAINS ?? 'localhost',

  // Redis configuration
  redisUrl,

  // WebSocket configuration
  wsEnabled: process.env.WS_ENABLED === 'true',
};

export default env;
