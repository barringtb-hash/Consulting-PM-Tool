// pmo/apps/api/src/auth/cookies.ts
import { env } from '../config/env';
import type { CookieOptions } from 'express';

// Extended cookie options to include 'partitioned' attribute for Safari CHIPS support
// The 'partitioned' attribute is supported by Express but not yet in @types/express
type ExtendedCookieOptions = CookieOptions & { partitioned?: boolean };

export function buildAuthCookieOptions(): ExtendedCookieOptions {
  const isProd = env.nodeEnv === 'production';
  // Cross-origin setup: When CORS_ORIGIN is set, frontend and API are on different domains
  // This requires sameSite='none' and secure=true for cookies to be sent cross-origin
  const isCrossOrigin = Boolean(env.corsOrigin);

  // Use cross-origin cookie settings when:
  // 1. Running in production (NODE_ENV=production), OR
  // 2. CORS_ORIGIN is explicitly set (indicates cross-origin deployment)
  const needsCrossOriginCookies = isProd || isCrossOrigin;

  return {
    httpOnly: true,
    // Cross-origin: Use 'none' to allow cookies in cross-origin requests (requires secure=true)
    // Same-origin: Use 'lax' for better security when using Vite proxy
    sameSite: needsCrossOriginCookies ? 'none' : 'lax',
    // Cross-origin with sameSite='none' requires secure=true (HTTPS)
    // Same-origin development can use secure=false for HTTP
    secure: needsCrossOriginCookies,
    // Partitioned (CHIPS): Required for Safari's ITP to allow third-party cookies
    // Safari blocks cross-origin cookies by default; partitioned cookies are stored
    // separately per top-level site, which Safari's privacy model allows
    partitioned: needsCrossOriginCookies,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
