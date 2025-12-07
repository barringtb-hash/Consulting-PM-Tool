/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';

import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/jwt';
import prisma from '../src/prisma/client';
import { requireAuth } from '../src/auth/auth.middleware';
import { requireRole, requireAnyRole } from '../src/auth/role.middleware';

describe('role middleware', () => {
  const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    return app;
  };

  const createUser = async (role: 'USER' | 'ADMIN') => {
    const password = 'password123';
    const passwordHash = await hashPassword(password);

    return prisma.user.create({
      data: {
        name: `Test ${role}`,
        email: `test-${role.toLowerCase()}-${Date.now()}@example.com`,
        passwordHash,
        timezone: 'UTC',
        role,
      },
    });
  };

  describe('requireRole', () => {
    it('allows access when user has required role', async () => {
      const app = createTestApp();
      const user = await createUser('ADMIN');
      const token = signToken({ userId: user.id });

      app.get('/admin-only', requireAuth, requireRole('ADMIN'), (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/admin-only')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('denies access when user lacks required role', async () => {
      const app = createTestApp();
      const user = await createUser('USER');
      const token = signToken({ userId: user.id });

      app.get('/admin-only', requireAuth, requireRole('ADMIN'), (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/admin-only')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('ADMIN role bypasses all role checks', async () => {
      const app = createTestApp();
      const admin = await createUser('ADMIN');
      const token = signToken({ userId: admin.id });

      app.get('/user-only', requireAuth, requireRole('USER'), (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/user-only')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('returns 401 when not authenticated', async () => {
      const app = createTestApp();

      app.get('/admin-only', requireAuth, requireRole('ADMIN'), (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/admin-only');

      expect(response.status).toBe(401);
    });

    it('returns 401 when user no longer exists', async () => {
      const app = createTestApp();
      const user = await createUser('ADMIN');
      const token = signToken({ userId: user.id });

      // Delete the user
      await prisma.user.delete({ where: { id: user.id } });

      app.get('/admin-only', requireAuth, requireRole('ADMIN'), (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/admin-only')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized: User not found');
    });
  });

  describe('requireAnyRole', () => {
    it('allows access when user has one of the required roles', async () => {
      const app = createTestApp();
      const user = await createUser('USER');
      const token = signToken({ userId: user.id });

      app.get(
        '/multi-role',
        requireAuth,
        requireAnyRole(['USER', 'ADMIN']),
        (_req, res) => {
          res.json({ success: true });
        },
      );

      const response = await request(app)
        .get('/multi-role')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('denies access when user has none of the required roles', async () => {
      const app = createTestApp();
      const user = await createUser('USER');
      const token = signToken({ userId: user.id });

      // Cast to test with a hypothetical role that doesn't match
      app.get(
        '/special-only',
        requireAuth,
        requireAnyRole(['ADMIN']),
        (_req, res) => {
          res.json({ success: true });
        },
      );

      const response = await request(app)
        .get('/special-only')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('returns 401 when not authenticated', async () => {
      const app = createTestApp();

      app.get(
        '/multi-role',
        requireAuth,
        requireAnyRole(['USER', 'ADMIN']),
        (_req, res) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/multi-role');

      expect(response.status).toBe(401);
    });
  });
});
