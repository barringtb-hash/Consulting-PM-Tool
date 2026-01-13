import express, { Response } from 'express';

import { AuthenticatedRequest, requireAdmin } from '../auth/auth.middleware';
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from '../services/user.service';
import { adminResetPassword } from '../auth/password-reset.service';
import { createUserSchema, updateUserSchema } from '../validation/user.schema';
import { adminResetPasswordSchema } from '../validation/password-reset.schema';
import { prisma } from '../prisma/client';
import {
  logAudit,
  createChangeDiff,
  sanitizeForAudit,
  createAuditMetadata,
} from '../services/audit.service';
import { AuditAction } from '@prisma/client';
import { createRateLimiter } from '../middleware/rate-limit.middleware';

const router = express.Router();

// Rate limit admin user operations: 30 requests per minute per IP
// This prevents abuse while allowing legitimate admin workflow
const isTestEnv = process.env.NODE_ENV === 'test';
const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: isTestEnv ? 1000 : 30,
  message: 'Too many admin requests. Please slow down and try again.',
});

// Apply rate limiting to all routes in this router
router.use(adminRateLimiter);

/**
 * POST /api/users
 * Create a new user (Admin only)
 * Note: Only Super Admins can create other Super Admin users
 */
router.post(
  '/',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request body
      const validation = createUserSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.format(),
        });
        return;
      }

      const { name, email, password, timezone, role } = validation.data;

      // Only Super Admins can create Super Admin users
      if (role === 'SUPER_ADMIN') {
        const currentUser = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { role: true },
        });

        if (currentUser?.role !== 'SUPER_ADMIN') {
          res.status(403).json({
            error: 'Only Super Admins can create Super Admin users',
          });
          return;
        }
      }

      const user = await createUser({ name, email, password, timezone, role });

      // Audit log: user creation
      await logAudit({
        userId: req.userId,
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: String(user.id),
        after: sanitizeForAudit({
          id: user.id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
          role: user.role,
        }),
        metadata: {
          ...createAuditMetadata(req),
          adminAction: 'create-user',
        },
      });

      res.status(201).json(user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Email already in use') {
          res.status(409).json({ error: err.message });
          return;
        }
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      console.error('Unknown error creating user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/users
 * Get all users (Admin only)
 */
router.get(
  '/',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/users/:id
 * Get a user by ID (Admin only)
 */
router.get(
  '/:id',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const user = await getUserById(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (err: unknown) {
      console.error('Error fetching user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * PUT /api/users/:id
 * Update a user (Admin only)
 * Note: Only Super Admins can promote users to Super Admin
 */
router.put(
  '/:id',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Validate request body
      const validation = updateUserSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.format(),
        });
        return;
      }

      // Fetch the user before update for audit logging
      const userBeforeUpdate = await getUserById(id);
      if (!userBeforeUpdate) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check permissions for Super Admin role changes
      if (validation.data.role) {
        const currentUser = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { role: true },
        });

        const isCallerSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
        const isTargetSuperAdmin = userBeforeUpdate.role === 'SUPER_ADMIN';

        // Only Super Admins can promote users to Super Admin
        if (validation.data.role === 'SUPER_ADMIN' && !isCallerSuperAdmin) {
          res.status(403).json({
            error: 'Only Super Admins can promote users to Super Admin',
          });
          return;
        }

        // Only Super Admins can demote other Super Admins
        if (isTargetSuperAdmin && !isCallerSuperAdmin) {
          res.status(403).json({
            error: 'Only Super Admins can modify Super Admin accounts',
          });
          return;
        }
      }

      const user = await updateUser(id, validation.data);

      // Audit log: user update with before/after diff
      const beforeState = sanitizeForAudit({
        name: userBeforeUpdate.name,
        email: userBeforeUpdate.email,
        timezone: userBeforeUpdate.timezone,
        role: userBeforeUpdate.role,
      });
      const afterState = sanitizeForAudit({
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        role: user.role,
      });
      const { before: changedBefore, after: changedAfter } = createChangeDiff(
        beforeState,
        afterState,
      );

      await logAudit({
        userId: req.userId,
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: String(user.id),
        before: changedBefore,
        after: changedAfter,
        metadata: {
          ...createAuditMetadata(req),
          adminAction: 'update-user',
          targetUserId: user.id,
        },
      });

      res.json(user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'User not found') {
          res.status(404).json({ error: err.message });
          return;
        }
        if (err.message === 'Email already in use') {
          res.status(409).json({ error: err.message });
          return;
        }
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      console.error('Unknown error updating user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * DELETE /api/users/:id
 * Delete a user (Admin only)
 */
router.delete(
  '/:id',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Prevent admin from deleting their own account
      if (id === req.userId) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      // Fetch user before deletion for audit logging
      const userToDelete = await getUserById(id);
      if (!userToDelete) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await deleteUser(id);

      // Audit log: user deletion
      await logAudit({
        userId: req.userId,
        action: AuditAction.DELETE,
        entityType: 'User',
        entityId: String(id),
        before: sanitizeForAudit({
          id: userToDelete.id,
          name: userToDelete.name,
          email: userToDelete.email,
          timezone: userToDelete.timezone,
          role: userToDelete.role,
        }),
        metadata: {
          ...createAuditMetadata(req),
          adminAction: 'delete-user',
          deletedUserEmail: userToDelete.email,
        },
      });

      res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'User not found') {
          res.status(404).json({ error: err.message });
          return;
        }
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      console.error('Unknown error deleting user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/users/:id/reset-password
 * Reset a user's password (Admin only)
 * Super Admins can reset any password, Admins cannot reset Super Admin passwords
 */
router.post(
  '/:id/reset-password',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Validate request body
      const body = req.body as { newPassword?: string };
      const validation = adminResetPasswordSchema.safeParse({
        userId: id,
        newPassword: body.newPassword,
      });

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.format(),
        });
        return;
      }

      // Fetch target user for audit logging
      const targetUser = await getUserById(id);
      if (!targetUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const result = await adminResetPassword(
        req.userId!,
        validation.data.userId,
        validation.data.newPassword,
      );

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      // Audit log: password reset
      await logAudit({
        userId: req.userId,
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: String(id),
        after: { passwordReset: true },
        metadata: {
          ...createAuditMetadata(req),
          adminAction: 'reset-password',
          targetUserId: id,
          targetUserEmail: targetUser.email,
        },
      });

      res.json({ message: result.message });
    } catch (err: unknown) {
      console.error('Error resetting user password:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
