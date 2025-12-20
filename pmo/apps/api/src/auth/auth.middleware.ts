import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

import { verifyToken } from './jwt';
import { prisma } from '../prisma/client';

export type AuthenticatedRequest<
  Params = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Request<Params, ResBody, ReqBody, ReqQuery, Locals> & {
  userId?: number;
};

/**
 * Extract authentication token from request.
 * Supports two methods for Safari ITP compatibility:
 * 1. Cookie-based auth (primary, preferred)
 * 2. Authorization header (fallback for Safari when cookies are blocked)
 */
function extractToken(req: Request): string | undefined {
  // First try cookie (preferred method)
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback: Authorization header for Safari ITP compatibility
  // Safari's ITP may block cross-origin cookies even with partitioned attribute
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return undefined;
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Optional authentication middleware.
 * Extracts user ID from token if present and valid, but does NOT return 401
 * if unauthenticated. This allows endpoints to handle unauthenticated requests
 * with a 200 response (e.g., returning { user: null }) instead of 401,
 * which prevents browser "Failed to load resource" console errors.
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const token = extractToken(req);

  if (token) {
    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
    } catch {
      // Invalid token - treat as unauthenticated (req.userId stays undefined)
    }
  }

  next();
};

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;

    // Check if user is an admin or super admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to require Super Admin access.
 * Super Admins are internal platform operators with full access across all tenants.
 * They can perform destructive operations like permanent tenant deletion.
 */
export const requireSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;

    // Check if user is a super admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Super Admin access required' });
      return;
    }

    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
