import { Router } from 'express';

import prisma from '../prisma/client';
import { comparePassword } from './password';
import { signToken } from './jwt';
import { AuthenticatedRequest, optionalAuth } from './auth.middleware';
import { buildAuthCookieOptions } from './cookies';
import { createRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

const cookieOptions = buildAuthCookieOptions();

// Rate limit login attempts: 5 attempts per 15 minutes per IP
// This prevents brute-force attacks while allowing legitimate retry attempts
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
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
      },
      token, // For Safari localStorage fallback
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
      res.json({ user: null });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user) {
      // User ID was in token but user no longer exists in database
      res.json({ user: null });
      return;
    }

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
      },
      token, // For Safari localStorage fallback
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
