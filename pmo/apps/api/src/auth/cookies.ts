// pmo/apps/api/src/auth/cookies.ts
import { env } from '../config/env';
import type { CookieOptions } from 'express';

export function buildAuthCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';

  return {
    httpOnly: true,
    // Use 'none' in both development and production to support cross-origin requests.
    // This is required when frontend (localhost:3000) makes requests to backend (localhost:4000)
    // without using the Vite proxy, or in production (Vercel frontend + Render API).
    sameSite: 'none',
    // Must be true for sameSite='none'. Modern browsers support this even on localhost.
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
