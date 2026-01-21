/**
 * Intake Channels Router
 *
 * Handles multi-channel intake (SMS, WhatsApp) and widget configuration endpoints
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import { prisma } from '../../prisma/client';
import * as channelService from './channels';
import {
  channelConfigUpdateSchema,
  widgetConfigUpdateSchema,
} from './intake-schemas';

const router = Router();

// ============================================================================
// CHANNEL CONFIGURATION ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/channels
 * Get all channel configurations for an intake config
 */
router.get(
  '/:configId/channels',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    try {
      const config = await prisma.intakeConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        res.status(404).json({ error: 'Config not found' });
        return;
      }

      const storedSettings = (config.storageCredentials || {}) as Record<
        string,
        unknown
      >;
      const channelSettings = storedSettings.channelSettings || {};

      res.json({
        data: {
          sms: (channelSettings as Record<string, unknown>).sms || {
            isEnabled: false,
          },
          whatsapp: (channelSettings as Record<string, unknown>).whatsapp || {
            isEnabled: false,
          },
          widget: (channelSettings as Record<string, unknown>).widget || {
            isEnabled: false,
          },
        },
      });
    } catch (error) {
      console.error('Error getting channel configs:', error);
      res.status(500).json({ error: 'Failed to get channel configurations' });
    }
  },
);

/**
 * PUT /api/intake/:configId/channels/:channel
 * Update a specific channel configuration
 */
router.put(
  '/:configId/channels/:channel',
  async (
    req: AuthenticatedRequest<{ configId: string; channel: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const channel = req.params.channel.toUpperCase();
    if (!['SMS', 'WHATSAPP', 'WIDGET'].includes(channel)) {
      res
        .status(400)
        .json({ error: 'Invalid channel. Must be SMS, WHATSAPP, or WIDGET' });
      return;
    }

    const bodyData = (req.body || {}) as Record<string, unknown>;
    const parsed = channelConfigUpdateSchema.safeParse({
      ...bodyData,
      channel,
    });
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const config = await prisma.intakeConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        res.status(404).json({ error: 'Config not found' });
        return;
      }

      const storedSettings = (config.storageCredentials || {}) as Record<
        string,
        unknown
      >;
      const channelSettings = (storedSettings.channelSettings || {}) as Record<
        string,
        unknown
      >;

      const existingChannelConfig = (channelSettings[channel.toLowerCase()] ||
        {}) as Record<string, unknown>;
      channelSettings[channel.toLowerCase()] = {
        ...existingChannelConfig,
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      };

      await prisma.intakeConfig.update({
        where: { id: configId },
        data: {
          storageCredentials: {
            ...storedSettings,
            channelSettings,
          },
        },
      });

      res.json({ data: channelSettings[channel.toLowerCase()] });
    } catch (error) {
      console.error('Error updating channel config:', error);
      res.status(500).json({ error: 'Failed to update channel configuration' });
    }
  },
);

// ============================================================================
// WIDGET CONFIGURATION ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/widget/config
 * Get widget configuration
 */
router.get(
  '/:configId/widget/config',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    try {
      const widgetConfig =
        await channelService.widgetService.getWidgetConfig(configId);
      if (!widgetConfig) {
        res.status(404).json({ error: 'Config not found' });
        return;
      }

      res.json({ data: widgetConfig });
    } catch (error) {
      console.error('Error getting widget config:', error);
      res.status(500).json({ error: 'Failed to get widget configuration' });
    }
  },
);

/**
 * PUT /api/intake/:configId/widget/config
 * Update widget configuration
 */
router.put(
  '/:configId/widget/config',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = widgetConfigUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const widgetConfig =
        await channelService.widgetService.updateWidgetConfig(
          configId,
          parsed.data,
        );
      res.json({ data: widgetConfig });
    } catch (error) {
      console.error('Error updating widget config:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update widget configuration';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/intake/:configId/widget/embed
 * Get widget embed code
 */
router.get(
  '/:configId/widget/embed',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    try {
      const apiBaseUrl =
        process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
      const formSlug = req.query.formSlug as string | undefined;

      const embed = channelService.widgetService.generateEmbedCode(
        configId,
        apiBaseUrl,
        { formSlug },
      );

      res.json({ data: embed });
    } catch (error) {
      console.error('Error generating embed code:', error);
      res.status(500).json({ error: 'Failed to generate embed code' });
    }
  },
);

// ============================================================================
// PUBLIC WIDGET ROUTES (no auth required)
// ============================================================================

/**
 * GET /api/intake/widget/:configId/widget.js
 * Serve the widget JavaScript bundle (public)
 */
router.get(
  '/widget/:configId/widget.js',
  async (req: Request, res: Response) => {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).send('// Invalid config ID');
      return;
    }

    try {
      const widgetConfig =
        await channelService.widgetService.getWidgetConfig(configId);
      if (!widgetConfig) {
        res.status(404).send('// Config not found');
        return;
      }

      const apiBaseUrl =
        process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
      const script = channelService.widgetService.generateWidgetScript(
        widgetConfig,
        apiBaseUrl,
      );

      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
      res.send(script);
    } catch (error) {
      console.error('Error generating widget script:', error);
      res.status(500).send('// Error generating widget');
    }
  },
);

/**
 * POST /api/intake/widget/:configId/analytics
 * Track widget analytics events (public)
 */
router.post(
  '/widget/:configId/analytics',
  async (req: Request, res: Response) => {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const { event, data } = req.body as {
      event?: string;
      data?: Record<string, unknown>;
    };
    if (!event) {
      res.status(400).json({ error: 'Event is required' });
      return;
    }

    try {
      await channelService.widgetService.trackWidgetEvent(
        configId,
        event,
        data,
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking widget event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  },
);

export default router;
