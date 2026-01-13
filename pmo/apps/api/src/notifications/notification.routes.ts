/**
 * Notification Routes
 *
 * REST API endpoints for notification management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as notificationService from './notification.service';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';
import { requireTenant } from '../tenant/tenant.middleware';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listNotificationsSchema = z.object({
  read: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  type: z.string().optional(), // Comma-separated types
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/notifications
 * List notifications for the current user
 */
router.get(
  '/',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = listNotificationsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const { page, limit, type, ...filters } = parsed.data;

    const result = await notificationService.listNotifications(
      req.userId!,
      {
        ...filters,
        type: type
          ? (type.split(',') as notificationService.NotificationType[])
          : undefined,
      },
      { page, limit },
    );

    res.json(result);
  },
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get(
  '/unread-count',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const count = await notificationService.getUnreadCount(req.userId!);
    res.json({ data: { count } });
  },
);

/**
 * GET /api/notifications/:id
 * Get notification by ID
 */
router.get(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const notification = await notificationService.getNotificationById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ data: notification });
  },
);

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post(
  '/:id/read',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const notification = await notificationService.markAsRead(id, req.userId!);
    res.json({ data: notification });
  },
);

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post(
  '/read-all',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await notificationService.markAllAsRead(req.userId!);
    res.json({ data: { count: result.count } });
  },
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await notificationService.deleteNotification(id, req.userId!);
    res.status(204).send();
  },
);

/**
 * DELETE /api/notifications/read
 * Delete all read notifications
 */
router.delete(
  '/read',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await notificationService.deleteReadNotifications(
      req.userId!,
    );
    res.json({ data: { count: result.count } });
  },
);

export default router;
