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
};

export default env;
