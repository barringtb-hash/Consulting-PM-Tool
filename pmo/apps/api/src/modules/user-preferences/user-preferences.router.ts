/**
 * User Preferences Router
 *
 * API endpoints for managing user preferences including dashboard panel settings.
 *
 * Endpoints:
 * - GET /api/user/preferences - Get all user preferences
 * - PATCH /api/user/preferences - Update user preferences (merge)
 * - PUT /api/user/preferences - Replace user preferences entirely
 * - DELETE /api/user/preferences - Reset preferences to defaults
 * - GET /api/user/preferences/dashboard - Get dashboard panel preferences
 * - PATCH /api/user/preferences/dashboard - Update dashboard panel preferences
 * - POST /api/user/preferences/dashboard/toggle/:panelId - Toggle a specific panel
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  getUserPreferences,
  updateUserPreferences,
  setUserPreferences,
  deleteUserPreferences,
  getDashboardPanelPreferences,
  updateDashboardPanelPreferences,
  toggleDashboardPanel,
  setEnabledDashboardPanels,
  setDashboardPanelOrder,
  UserPreferences,
  DashboardPanelPreferences,
} from './user-preferences.service';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================================================
// Validation Schemas
// ============================================================================

const dashboardPanelPreferencesSchema = z.object({
  enabledPanels: z.array(z.string()).optional(),
  panelOrder: z.record(z.string(), z.number()).optional(),
  collapsedPanels: z.array(z.string()).optional(),
});

const userPreferencesSchema = z.object({
  dashboardPanels: dashboardPanelPreferencesSchema.optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      taskReminders: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
    })
    .optional(),
});

// ============================================================================
// General Preferences Endpoints
// ============================================================================

/**
 * GET /api/user/preferences
 * Get all user preferences
 */
router.get('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const preferences = await getUserPreferences(req.userId);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PATCH /api/user/preferences
 * Update user preferences (merge with existing)
 */
router.patch(
  '/preferences',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = userPreferencesSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const preferences = await updateUserPreferences(
        req.userId,
        parsed.data as Partial<UserPreferences>,
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  },
);

/**
 * PUT /api/user/preferences
 * Replace user preferences entirely
 */
router.put('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = userPreferencesSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.format(),
    });
    return;
  }

  try {
    const preferences = await setUserPreferences(
      req.userId,
      parsed.data as UserPreferences,
    );
    res.json(preferences);
  } catch (error) {
    console.error('Error setting user preferences:', error);
    res.status(500).json({ error: 'Failed to set preferences' });
  }
});

/**
 * DELETE /api/user/preferences
 * Reset preferences to defaults
 */
router.delete(
  '/preferences',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      await deleteUserPreferences(req.userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      res.status(500).json({ error: 'Failed to reset preferences' });
    }
  },
);

// ============================================================================
// Dashboard Panel Preferences Endpoints
// ============================================================================

/**
 * GET /api/user/preferences/dashboard
 * Get dashboard panel preferences
 */
router.get(
  '/preferences/dashboard',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const preferences = await getDashboardPanelPreferences(req.userId);
      res.json(preferences || { enabledPanels: [] });
    } catch (error) {
      console.error('Error fetching dashboard preferences:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard preferences' });
    }
  },
);

/**
 * PATCH /api/user/preferences/dashboard
 * Update dashboard panel preferences
 */
router.patch(
  '/preferences/dashboard',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = dashboardPanelPreferencesSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const preferences = await updateDashboardPanelPreferences(
        req.userId,
        parsed.data as Partial<DashboardPanelPreferences>,
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error updating dashboard preferences:', error);
      res.status(500).json({ error: 'Failed to update dashboard preferences' });
    }
  },
);

/**
 * PUT /api/user/preferences/dashboard/panels
 * Set enabled dashboard panels (replace list)
 */
router.put(
  '/preferences/dashboard/panels',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = z
      .object({ enabledPanels: z.array(z.string()) })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const preferences = await setEnabledDashboardPanels(
        req.userId,
        parsed.data.enabledPanels,
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error setting dashboard panels:', error);
      res.status(500).json({ error: 'Failed to set dashboard panels' });
    }
  },
);

/**
 * POST /api/user/preferences/dashboard/toggle/:panelId
 * Toggle a specific dashboard panel
 */
router.post(
  '/preferences/dashboard/toggle/:panelId',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { panelId } = req.params;

    if (!panelId) {
      res.status(400).json({ error: 'Panel ID is required' });
      return;
    }

    try {
      const preferences = await toggleDashboardPanel(req.userId, panelId);
      res.json(preferences);
    } catch (error) {
      console.error('Error toggling dashboard panel:', error);
      res.status(500).json({ error: 'Failed to toggle dashboard panel' });
    }
  },
);

/**
 * PUT /api/user/preferences/dashboard/order
 * Set dashboard panel order
 */
router.put(
  '/preferences/dashboard/order',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = z
      .object({ panelOrder: z.record(z.string(), z.number()) })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const preferences = await setDashboardPanelOrder(
        req.userId,
        parsed.data.panelOrder as Record<string, number>,
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error setting panel order:', error);
      res.status(500).json({ error: 'Failed to set panel order' });
    }
  },
);

export default router;
