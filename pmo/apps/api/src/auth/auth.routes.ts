import { Router } from 'express';

import prisma from '../prisma/client';
import { env } from '../config/env';
import { comparePassword } from './password';
import { signToken } from './jwt';
import { AuthenticatedRequest, requireAuth } from './auth.middleware';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: 'none' as const,
  secure: env.nodeEnv === 'production',
};

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

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
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
    },
  });
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out' });
});

router.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
    },
  });
});

export default router;
