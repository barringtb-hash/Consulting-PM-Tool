/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/app';
import prisma from '../src/prisma/client';

describe('auth routes', () => {
  const app = createApp();

  const createTestUser = async () => {
    const password = 'password123';
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        timezone: 'UTC',
      },
    });

    return { user, password };
  };

  it('logs in with valid credentials and sets a cookie', async () => {
    const { user, password } = await createTestUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    });
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('rejects login when credentials are invalid', async () => {
    await createTestUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 400 when email or password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email and password are required' });
  });

  it('returns current user data when authenticated', async () => {
    const { user, password } = await createTestUser();

    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({ email: user.email, password });

    expect(loginResponse.status).toBe(200);

    const meResponse = await agent.get('/api/auth/me');

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    });
  });

  it('logs out and clears the auth cookie', async () => {
    const { user, password } = await createTestUser();
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ email: user.email, password });

    const logoutResponse = await agent.post('/api/auth/logout');

    expect(logoutResponse.status).toBe(200);
    expect(
      logoutResponse.headers['set-cookie']?.some(
        (cookie) => cookie.includes('token=') && cookie.includes('Expires'),
      ),
    ).toBe(true);
  });

  it('blocks access to /auth/me without authentication', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });
});
