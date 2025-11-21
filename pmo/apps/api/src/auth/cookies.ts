// pmo/apps/api/src/auth/cookies.ts
import type { CookieOptions } from 'express';

export function buildAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // Use 'none' for cross-origin requests (production Vercel + Render, or dev without proxy).
    // Browsers allow sameSite='none' on localhost even without HTTPS.
    sameSite: 'none',
    // Always secure for cross-site cookies. Modern browsers allow this for localhost.
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
