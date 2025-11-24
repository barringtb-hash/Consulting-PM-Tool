// pmo/apps/api/src/auth/cookies.ts
import { env } from '../config/env';
import type { CookieOptions } from 'express';

export function buildAuthCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';

  return {
    httpOnly: true,
    // Production: 'none' for cross-origin (Vercel -> Render), requires secure=true with HTTPS.
    // Development: 'lax' for Vite proxy same-origin requests, works with secure=false on HTTP.
    // Note: Browsers reject sameSite='none' with secure=false, so we must use 'lax' in dev.
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
