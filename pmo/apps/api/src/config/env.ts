import dotenv from 'dotenv';

dotenv.config();

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getRequiredNumberEnv = (key: string): number => {
  const value = getRequiredEnv(key);
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }

  return numberValue;
};

/**
 * Validate JWT secret has minimum required strength.
 * Weak secrets compromise token security and enable brute-force attacks.
 */
const getValidatedJwtSecret = (): string => {
  const secret = getRequiredEnv('JWT_SECRET');
  const MIN_SECRET_LENGTH = 32;

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters for security. ` +
        `Current length: ${secret.length}`,
    );
  }

  return secret;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? '4000',
  jwtSecret: getValidatedJwtSecret(),
  jwtExpiresIn: getRequiredEnv('JWT_EXPIRES_IN'),
  bcryptSaltRounds: getRequiredNumberEnv('BCRYPT_SALT_ROUNDS'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  // CORS_ORIGIN: Frontend URL for cross-origin cookie authentication
  // When set, enables cross-origin cookie settings (sameSite='none', secure=true)
  corsOrigin: process.env.CORS_ORIGIN,

  // Multi-tenancy configuration
  multiTenantEnabled: process.env.MULTI_TENANT_ENABLED !== 'false',
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG ?? 'default',
  tenantDomains: process.env.TENANT_DOMAINS ?? 'localhost',

  // Redis configuration
  redisUrl: process.env.REDIS_URL ?? '',

  // WebSocket configuration
  wsEnabled: process.env.WS_ENABLED === 'true',
};

export default env;
