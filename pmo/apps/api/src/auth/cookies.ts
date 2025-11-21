// pmo/apps/api/src/auth/cookies.ts
import { env } from '../config/env';
import type { CookieOptions } from 'express';

export function buildAuthCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';

  return {
    httpOnly: true,
    // Production: Use 'none' for cross-origin (Vercel frontend + Render API) with HTTPS.
    // Development: Use 'lax' for same-origin requests via Vite proxy over HTTP.
    sameSite: isProd ? 'none' : 'lax',
    // Production: Requires secure=true for HTTPS and sameSite='none'.
    // Development: Must be false for HTTP; browsers reject Secure cookies over HTTP.
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
