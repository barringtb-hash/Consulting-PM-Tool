// pmo/apps/api/src/auth/cookies.ts
import { env } from '../config/env';
import type { CookieOptions } from 'express';

export function buildAuthCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';

  return {
    httpOnly: true,
    // Use 'none' to support cross-origin requests between frontend and backend.
    // Required for localhost:3000 -> localhost:4000 in dev and Vercel -> Render in prod.
    sameSite: 'none',
    // Production: secure=true required for HTTPS and sameSite='none'.
    // Development: secure=false required for HTTP - browsers silently drop secure cookies on HTTP.
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
