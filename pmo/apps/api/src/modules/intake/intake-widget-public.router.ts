/**
 * Intake Widget Public Router
 *
 * Handles public widget page serving endpoints (no authentication required)
 */

import { Router, Request, Response } from 'express';
import * as channelService from './channels';

const router = Router();

/**
 * GET /api/public/intake/widget/:configId/chat
 * Serve the widget chat page (public)
 */
router.get('/widget/:configId/chat', async (req: Request, res: Response) => {
  const configId = Number(req.params.configId);
  if (Number.isNaN(configId)) {
    res.status(400).send('Invalid config ID');
    return;
  }

  try {
    const widgetConfig =
      await channelService.widgetService.getWidgetConfig(configId);
    if (!widgetConfig) {
      res.status(404).send('Config not found');
      return;
    }

    const apiBaseUrl =
      process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
    const html = channelService.widgetService.generateChatPageHtml(
      widgetConfig,
      apiBaseUrl,
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating chat page:', error);
    res.status(500).send('Error loading chat');
  }
});

/**
 * GET /api/public/intake/widget/:configId/form
 * Serve the widget form page (public)
 */
router.get('/widget/:configId/form', async (req: Request, res: Response) => {
  const configId = Number(req.params.configId);
  if (Number.isNaN(configId)) {
    res.status(400).send('Invalid config ID');
    return;
  }

  try {
    const widgetConfig =
      await channelService.widgetService.getWidgetConfig(configId);
    if (!widgetConfig) {
      res.status(404).send('Config not found');
      return;
    }

    const apiBaseUrl =
      process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
    const html = channelService.widgetService.generateFormPageHtml(
      widgetConfig,
      apiBaseUrl,
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating form page:', error);
    res.status(500).send('Error loading form');
  }
});

export default router;
