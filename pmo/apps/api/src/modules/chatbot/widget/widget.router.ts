/**
 * Chatbot Widget Router
 *
 * Serves the embeddable widget script and handles widget-related endpoints.
 * These endpoints are public (no auth required) for external website integration.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateWidgetScript, WidgetConfig } from './widget.template';
import { env } from '../../../config/env';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/chatbot/widget/:configId.js
 * Serves the embeddable widget JavaScript for a specific chatbot configuration.
 *
 * This is a public endpoint - no authentication required.
 * The widget itself handles conversation creation via public API endpoints.
 */
router.get(
  '/chatbot/widget/:configId.js',
  async (req: Request<{ configId: string }>, res: Response) => {
    const configId = parseInt(req.params.configId, 10);

    if (isNaN(configId)) {
      res.status(400).send('// Invalid config ID');
      return;
    }

    try {
      // Fetch the chatbot configuration
      const config = await prisma.chatbotConfig.findUnique({
        where: { id: configId },
        select: {
          id: true,
          name: true,
          welcomeMessage: true,
          isActive: true,
          widgetPosition: true,
          widgetPrimaryColor: true,
          widgetTextColor: true,
          widgetBubbleIcon: true,
          widgetTitle: true,
          widgetSubtitle: true,
          widgetAvatarUrl: true,
          widgetAllowedDomains: true,
          widgetCustomCss: true,
        },
      });

      if (!config) {
        res.status(404).send('// Chatbot configuration not found');
        return;
      }

      if (!config.isActive) {
        res.status(403).send('// Chatbot is currently inactive');
        return;
      }

      // Check domain restrictions if configured
      const origin = req.get('origin') || req.get('referer');
      if (config.widgetAllowedDomains && origin) {
        const allowedDomains = config.widgetAllowedDomains
          .split(',')
          .map((d) => d.trim().toLowerCase());

        const requestDomain = extractDomain(origin);
        const isAllowed = allowedDomains.some(
          (allowed) =>
            requestDomain === allowed ||
            requestDomain.endsWith('.' + allowed) ||
            allowed === '*',
        );

        if (!isAllowed) {
          res
            .status(403)
            .send(
              '// This widget is not authorized for use on this domain: ' +
                requestDomain,
            );
          return;
        }
      }

      // Determine API base URL
      // In production, use the configured CORS origin or request origin
      // In development, use localhost
      let apiBaseUrl = env.corsOrigin || 'http://localhost:3001';
      if (apiBaseUrl.includes(',')) {
        // If multiple origins, use the first one
        apiBaseUrl = apiBaseUrl.split(',')[0].trim();
      }
      // Ensure we're pointing to the API, not the frontend
      if (
        !apiBaseUrl.includes(':3001') &&
        !apiBaseUrl.includes('/api') &&
        env.nodeEnv === 'development'
      ) {
        apiBaseUrl = 'http://localhost:3001';
      }
      apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';

      // Generate widget configuration
      const widgetConfig: WidgetConfig = {
        configId: config.id,
        apiBaseUrl,
        name: config.name,
        welcomeMessage:
          config.welcomeMessage || `Hi! I'm ${config.name}. How can I help you today?`,
        position: config.widgetPosition || 'bottom-right',
        primaryColor: config.widgetPrimaryColor || '#3B82F6',
        textColor: config.widgetTextColor || '#FFFFFF',
        bubbleIcon: config.widgetBubbleIcon || 'chat',
        title: config.widgetTitle,
        subtitle: config.widgetSubtitle,
        avatarUrl: config.widgetAvatarUrl,
        customCss: config.widgetCustomCss,
      };

      // Generate the widget script
      const script = generateWidgetScript(widgetConfig);

      // Set appropriate headers for JavaScript
      res.set({
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Content-Type-Options': 'nosniff',
      });

      res.send(script);
    } catch (error) {
      console.error('Widget generation error:', error);
      res.status(500).send('// Error generating widget');
    }
  },
);

/**
 * GET /api/chatbot/widget/:configId/config
 * Returns the widget configuration as JSON.
 * Useful for custom integrations that don't want the full widget script.
 */
router.get(
  '/chatbot/widget/:configId/config',
  async (req: Request<{ configId: string }>, res: Response) => {
    const configId = parseInt(req.params.configId, 10);

    if (isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    try {
      const config = await prisma.chatbotConfig.findUnique({
        where: { id: configId },
        select: {
          id: true,
          name: true,
          welcomeMessage: true,
          fallbackMessage: true,
          isActive: true,
          enableOrderTracking: true,
          enableReturns: true,
          enableFAQ: true,
          enableHumanHandoff: true,
          widgetPosition: true,
          widgetPrimaryColor: true,
          widgetTextColor: true,
          widgetBubbleIcon: true,
          widgetTitle: true,
          widgetSubtitle: true,
          widgetAvatarUrl: true,
        },
      });

      if (!config) {
        res.status(404).json({ error: 'Chatbot configuration not found' });
        return;
      }

      if (!config.isActive) {
        res.status(403).json({ error: 'Chatbot is currently inactive' });
        return;
      }

      res.json({ config });
    } catch (error) {
      console.error('Widget config fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch widget configuration' });
    }
  },
);

/**
 * Extract domain from URL for domain restriction checking
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/(?:https?:\/\/)?([^\/\:]+)/i);
    return match ? match[1].toLowerCase() : '';
  }
}

export default router;
