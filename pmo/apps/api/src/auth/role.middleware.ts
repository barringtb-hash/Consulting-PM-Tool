/**
 * Role-based Authorization Middleware
 *
 * Provides middleware for checking user roles.
 * Must be used after requireAuth middleware.
 *
 * Two types of role checks:
 * 1. Global roles (User.role): USER, ADMIN, SUPER_ADMIN - for platform-level access
 * 2. Tenant roles (TenantUser.role): OWNER, ADMIN, MEMBER, VIEWER - for tenant-level access
 */

import { NextFunction, Response } from 'express';
import { UserRole, TenantRole } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../prisma/client';
import { getTenantContext, hasTenantContext } from '../tenant/tenant.context';

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

/**
 * Middleware factory that requires a specific tenant-scoped role.
 * Checks the user's role within the current tenant (TenantUser.role).
 * Must be used after requireAuth middleware and tenant context must be set.
 *
 * @param roles - Array of acceptable tenant roles (OWNER, ADMIN, MEMBER, VIEWER)
 * @returns Express middleware function
 *
 * @example
 * // Only tenant owners and admins can manage users
 * router.post('/users', requireAuth, requireTenantRole(['OWNER', 'ADMIN']), handler);
 */
export function requireTenantRole(roles: TenantRole[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    // Verify tenant context exists
    if (!hasTenantContext()) {
      res.status(400).json({ error: 'Bad Request: Tenant context not set' });
      return;
    }

    try {
      const { tenantId } = getTenantContext();

      // First check if user has global ADMIN or SUPER_ADMIN role
      // These roles have full access across all tenants
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      });

      if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      // Check tenant-scoped role
      const tenantUser = await prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: req.userId,
          },
        },
        select: { role: true },
      });

      if (!tenantUser) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this tenant',
        });
        return;
      }

      // Check if user has any of the required tenant roles
      if (!roles.includes(tenantUser.role)) {
        res.status(403).json({
          error: 'Forbidden',
          message: `This action requires one of: ${roles.join(', ')}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Tenant role check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
