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
 * Parse a feature flag environment variable.
 * Returns true by default (feature enabled) unless explicitly set to 'false'.
 */
const getFeatureFlag = (key: string): boolean => {
  const value = process.env[key];
  // Feature is enabled by default, only disabled if explicitly set to 'false'
  return value?.toLowerCase() !== 'false';
};

/**
 * Feature flags for modular feature activation.
 * All features are enabled by default. Set to 'false' to disable.
 *
 * Usage in .env:
 *   FEATURE_MARKETING=false    # Disables marketing module
 *   FEATURE_SALES=false        # Disables sales/leads module
 */
export const features = {
  /** Marketing content generation, campaigns, brand profiles, publishing */
  marketing: getFeatureFlag('FEATURE_MARKETING'),
  /** Sales pipeline, leads management, lead conversion */
  sales: getFeatureFlag('FEATURE_SALES'),
  /** AI assets library (prompts, workflows, datasets, evaluations, guardrails) */
  aiAssets: getFeatureFlag('FEATURE_AI_ASSETS'),
  /** Meeting notes, decisions tracking, task creation from meetings */
  meetings: getFeatureFlag('FEATURE_MEETINGS'),
  /** Admin features (user management) */
  admin: getFeatureFlag('FEATURE_ADMIN'),
} as const;

export type FeatureName = keyof typeof features;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? '4000',
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  jwtExpiresIn: getRequiredEnv('JWT_EXPIRES_IN'),
  bcryptSaltRounds: getRequiredNumberEnv('BCRYPT_SALT_ROUNDS'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  // CORS_ORIGIN: Frontend URL for cross-origin cookie authentication
  // When set, enables cross-origin cookie settings (sameSite='none', secure=true)
  corsOrigin: process.env.CORS_ORIGIN,
  // Feature flags for modular feature activation
  features,
};

export default env;
