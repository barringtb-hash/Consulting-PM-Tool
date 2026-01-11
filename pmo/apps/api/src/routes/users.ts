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

const router = express.Router();

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
      const id = parseInt(req.params.id, 10);

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
      const id = parseInt(req.params.id, 10);

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

      // Check permissions for Super Admin role changes
      if (validation.data.role) {
        const [currentUser, targetUser] = await Promise.all([
          prisma.user.findUnique({
            where: { id: req.userId },
            select: { role: true },
          }),
          prisma.user.findUnique({
            where: { id },
            select: { role: true },
          }),
        ]);

        const isCallerSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
        const isTargetSuperAdmin = targetUser?.role === 'SUPER_ADMIN';

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
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      await deleteUser(id);

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
      const id = parseInt(req.params.id, 10);

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

      const result = await adminResetPassword(
        req.userId!,
        validation.data.userId,
        validation.data.newPassword,
      );

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      res.json({ message: result.message });
    } catch (err: unknown) {
      console.error('Error resetting user password:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
