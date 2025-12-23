import { Router } from 'express';

import prisma from '../prisma/client';
import { comparePassword } from './password';
import { signToken } from './jwt';
import { AuthenticatedRequest, optionalAuth } from './auth.middleware';
import { buildAuthCookieOptions } from './cookies';
import { createRateLimiter } from '../middleware/rate-limit.middleware';
import {
  requestPasswordReset,
  validateResetToken,
  resetPasswordWithToken,
} from './password-reset.service';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validation/password-reset.schema';
import {
  findDefaultTenantForUser,
  formatTenantResponse,
} from '../tenant/tenant.service';

const router = Router();

const cookieOptions = buildAuthCookieOptions();

// Rate limit login attempts: 5 attempts per 15 minutes per IP
// This prevents brute-force attacks while allowing legitimate retry attempts
// In test environment, use a higher limit to avoid blocking test suites
const isTestEnv = process.env.NODE_ENV === 'test';
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: isTestEnv ? 1000 : 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

// Rate limit password reset requests: 3 per hour per IP
// More restrictive to prevent abuse while still allowing legitimate use
const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: isTestEnv ? 1000 : 3,
  message: 'Too many password reset attempts. Please try again later.',
});

// Pre-computed dummy hash for timing attack prevention
// This hash is used when user doesn't exist to ensure consistent response time
const DUMMY_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

router.post('/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always perform password comparison to prevent timing attacks
    // If user doesn't exist, compare against dummy hash to maintain consistent timing
    const hashToCompare = user?.passwordHash || DUMMY_PASSWORD_HASH;
    const isValidPassword = await comparePassword(password, hashToCompare);

    // Check both conditions: user must exist AND password must be valid
    if (!user || !isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Get user's default tenant for multi-tenant context
    const tenant = await findDefaultTenantForUser(user.id);

    const token = signToken({ userId: user.id });

    res.cookie('token', token, cookieOptions);
    // Include token in response body for Safari ITP fallback
    // Safari may block cross-origin cookies even with partitioned attribute,
    // so the frontend can store this in localStorage and send via Authorization header
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        role: user.role,
      },
      token, // For Safari localStorage fallback
      // Include tenant info for multi-tenant context
      tenant: formatTenantResponse(tenant),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out' });
});

// Use optionalAuth instead of requireAuth to return 200 with { user: null }
// for unauthenticated requests. This prevents browser "Failed to load resource"
// console errors that appear when the server returns 401 on initial page load.
router.get('/auth/me', optionalAuth, async (req: AuthenticatedRequest, res) => {
  // Prevent caching of auth responses to ensure fresh auth state on each request.
  // This helps avoid issues where stale cached responses cause problems after login.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    // If no userId, user is not authenticated - return null user with 200 status
    if (!req.userId) {
      res.json({ user: null, tenant: null });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user) {
      // User ID was in token but user no longer exists in database
      res.json({ user: null, tenant: null });
      return;
    }

    // Get user's default tenant for multi-tenant context
    const tenant = await findDefaultTenantForUser(user.id);

    // Generate a fresh token for Safari ITP fallback.
    // This ensures users who logged in before the Safari localStorage fallback
    // was implemented will get their tokens stored on subsequent page loads.
    // Safari's ITP may block cross-origin cookies even with partitioned attribute,
    // so the frontend stores this token and sends via Authorization header.
    const token = signToken({ userId: req.userId });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        role: user.role,
      },
      token, // For Safari localStorage fallback
      // Include tenant info for multi-tenant context
      tenant: formatTenantResponse(tenant),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset link
 * Rate limited to prevent abuse
 */
router.post(
  '/auth/forgot-password',
  passwordResetRateLimiter,
  async (req, res) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const result = await requestPasswordReset(parsed.data.email);

      // Always return success to prevent email enumeration
      // In development, include resetUrl for testing
      if (process.env.NODE_ENV !== 'production' && result.resetUrl) {
        res.json({
          message: result.message,
          resetUrl: result.resetUrl, // Only in development
        });
      } else {
        res.json({ message: result.message });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res
        .status(500)
        .json({ error: 'Failed to process password reset request' });
    }
  },
);

/**
 * GET /api/auth/verify-reset-token
 * Verify if a password reset token is valid
 */
router.get('/auth/verify-reset-token', async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({ valid: false, message: 'Token is required' });
      return;
    }

    const result = await validateResetToken(token);
    res.json(result);
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ valid: false, message: 'Failed to verify token' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token
 */
router.post('/auth/reset-password', async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    const result = await resetPasswordWithToken(
      parsed.data.token,
      parsed.data.password,
    );

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
