/**
 * Role-based Authorization Middleware
 *
 * Provides middleware for checking user roles.
 * Must be used after requireAuth middleware.
 */

import { NextFunction, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../prisma/client';

/**
 * Middleware factory that requires a specific role
 * Must be used after requireAuth middleware
 *
 * @param role - The required role (USER or ADMIN)
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/users', requireAuth, requireRole('ADMIN'), handler);
 */
export function requireRole(role: UserRole) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Unauthorized: User not found' });
        return;
      }

      // ADMIN role has access to everything
      if (user.role === 'ADMIN') {
        next();
        return;
      }

      // Check if user has the required role
      if (user.role !== role) {
        res.status(403).json({
          error: 'Forbidden',
          message: `This action requires ${role} role`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware that requires any of the specified roles
 *
 * @param roles - Array of acceptable roles
 * @returns Express middleware function
 *
 * @example
 * router.get('/reports', requireAuth, requireAnyRole(['USER', 'ADMIN']), handler);
 */
export function requireAnyRole(roles: UserRole[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Unauthorized: User not found' });
        return;
      }

      // Check if user has any of the required roles
      if (!roles.includes(user.role)) {
        res.status(403).json({
          error: 'Forbidden',
          message: `This action requires one of: ${roles.join(', ')}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
