import { Router } from 'express';

import prisma from '../prisma/client';
import { comparePassword } from './password';
import { signToken } from './jwt';
import { AuthenticatedRequest, optionalAuth } from './auth.middleware';
import { buildAuthCookieOptions } from './cookies';

const router = Router();

const cookieOptions = buildAuthCookieOptions();

router.post('/auth/login', async (req, res) => {
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

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
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
