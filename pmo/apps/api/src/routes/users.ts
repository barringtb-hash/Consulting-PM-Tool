import express, { Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import { createUser, getAllUsers } from '../services/user.service';
import { createUserSchema } from '../validation/user.schema';

const router = express.Router();

/**
 * POST /api/users
 * Create a new user
 *
 * TODO: Add admin-only authorization when role system is implemented.
 * For now, any authenticated user can create users.
 */
router.post(
  '/',
  requireAuth,
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

      const { name, email, password, timezone } = validation.data;

      const user = await createUser({ name, email, password, timezone });

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
 * Get all users
 *
 * TODO: Add admin-only authorization when role system is implemented.
 */
router.get(
  '/',
  requireAuth,
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

export default router;
