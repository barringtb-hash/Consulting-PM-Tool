/// <reference types="vitest" />
import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import { requireAuth } from '../src/auth/auth.middleware';
import { signToken } from '../src/auth/jwt';

describe('requireAuth middleware', () => {
  const createMockResponse = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    return res;
  };

  it('rejects requests without a token', () => {
    const req = { cookies: {} } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid token', () => {
    const req = { cookies: { token: 'invalid-token' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('adds the userId to the request when the token is valid', () => {
    const token = signToken({ userId: 123 });
    const req = { cookies: { token } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect((req as Request & { userId?: number }).userId).toBe(123);
    expect(next).toHaveBeenCalled();
  });
});
