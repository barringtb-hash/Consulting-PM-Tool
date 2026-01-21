/**
 * Intake Config Router
 *
 * Handles intake configuration management endpoints for clients
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import {
  hasClientAccess,
  getAccessibleClientIds,
} from '../../auth/client-auth.helper';
import * as intakeService from './intake.service';
import { configSchema } from './intake-schemas';

const router = Router();

/**
 * GET /api/intake/configs
 * List all intake configurations (with optional filtering)
 */
router.get('/configs', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
  if (req.query.clientId && Number.isNaN(clientId)) {
    res.status(400).json({ error: 'Invalid client ID' });
    return;
  }

  // Authorization: If filtering by clientId, check access to that client
  if (clientId) {
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }
    const configs = await intakeService.listIntakeConfigs({ clientId });
    res.json({ configs });
  } else {
    // No clientId filter - only show configs for clients the user can access
    const accessibleClientIds = await getAccessibleClientIds(req.userId);
    if (accessibleClientIds === null) {
      // Admin - show all
      const configs = await intakeService.listIntakeConfigs({});
      res.json({ configs });
    } else if (accessibleClientIds.length === 0) {
      // No access to any clients
      res.json({ configs: [] });
    } else {
      // Filter to accessible clients
      const configs = await intakeService.listIntakeConfigs({
        clientIds: accessibleClientIds,
      });
      res.json({ configs });
    }
  }
});

/**
 * GET /api/clients/:clientId/intake
 * Get intake config for a client
 */
router.get(
  '/clients/:clientId/intake',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Authorization: Check user has access to this client
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const config = await intakeService.getIntakeConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/intake
 * Create intake config
 */
router.post(
  '/clients/:clientId/intake',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Authorization: Check user has access to this client
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await intakeService.createIntakeConfig(
        clientId,
        parsed.data,
      );
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res
          .status(409)
          .json({ error: 'Config already exists for this client' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/clients/:clientId/intake
 * Update intake config
 */
router.patch(
  '/clients/:clientId/intake',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Authorization: Check user has access to this client
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const parsed = configSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await intakeService.updateIntakeConfig(
      clientId,
      parsed.data,
    );
    res.json({ config });
  },
);

export default router;
