/**
 * Channel Router
 *
 * API endpoints for managing multi-channel configurations and
 * handling incoming webhooks from different channel providers.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../auth/auth.middleware';
import { ChatChannel } from '@prisma/client';
import * as channelService from './channel.service';
import { channelManager } from './channel-manager';
import { slackAdapter } from './adapters/slack.adapter';

const router = Router();

// ============================================================================
// CHANNEL CONFIGURATION ENDPOINTS (Authenticated)
// ============================================================================

/**
 * Get all channels for a chatbot
 */
router.get(
  '/chatbot/:configId/channels',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      const channels = await channelService.getChannels(configId);
      res.json({ data: channels });
    } catch (error) {
      console.error('Error fetching channels:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch channels',
      });
    }
  },
);

/**
 * Get channel status overview for a chatbot
 */
router.get(
  '/chatbot/:configId/channels/status',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      const status = await channelService.getChannelStatus(configId);
      res.json({ data: status });
    } catch (error) {
      console.error('Error fetching channel status:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      });
    }
  },
);

/**
 * Create a new channel configuration
 */
router.post(
  '/chatbot/:configId/channels',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      const { channel, name, credentials, settings, identifier } = req.body;

      if (!channel || !name || !credentials) {
        return res.status(400).json({
          error: 'channel, name, and credentials are required',
        });
      }

      const channelConfig = await channelService.createChannel(configId, {
        channel: channel as ChatChannel,
        name,
        credentials,
        settings,
        identifier,
      });

      res.status(201).json({ data: channelConfig });
    } catch (error) {
      console.error('Error creating channel:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create channel',
      });
    }
  },
);

/**
 * Update a channel configuration
 */
router.patch(
  '/chatbot/channels/:channelId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId, 10);
      const { name, credentials, settings, identifier, isActive } = req.body;

      const channelConfig = await channelService.updateChannel(channelId, {
        name,
        credentials,
        settings,
        identifier,
        isActive,
      });

      res.json({ data: channelConfig });
    } catch (error) {
      console.error('Error updating channel:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update channel',
      });
    }
  },
);

/**
 * Delete a channel configuration
 */
router.delete(
  '/chatbot/channels/:channelId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId, 10);
      await channelService.deleteChannel(channelId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting channel:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete channel',
      });
    }
  },
);

/**
 * Test channel by sending a test message
 */
router.post(
  '/chatbot/channels/:channelId/test',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId, 10);
      const { recipient } = req.body;

      if (!recipient) {
        return res.status(400).json({ error: 'recipient is required' });
      }

      const result = await channelService.testChannel(channelId, recipient);
      res.json({ data: result });
    } catch (error) {
      console.error('Error testing channel:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to test channel',
      });
    }
  },
);

/**
 * Verify credentials without saving
 */
router.post(
  '/chatbot/channels/verify',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { channel, credentials } = req.body;

      if (!channel || !credentials) {
        return res.status(400).json({
          error: 'channel and credentials are required',
        });
      }

      const result = await channelService.verifyChannelCredentials(
        channel as ChatChannel,
        credentials,
      );

      res.json({ data: result });
    } catch (error) {
      console.error('Error verifying credentials:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to verify',
      });
    }
  },
);

// ============================================================================
// WEBHOOK ENDPOINTS (Public - for channel providers)
// ============================================================================

/**
 * Twilio SMS webhook
 */
router.post(
  '/chatbot/:configId/webhooks/twilio/sms',
  async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      const signature = req.headers['x-twilio-signature'] as string;

      const result = await channelManager.processIncomingMessage(
        configId,
        'SMS',
        req.body,
        signature,
      );

      if (!result.success) {
        console.error('SMS webhook error:', result.error);
      }

      // Twilio expects TwiML response
      res.type('text/xml').send('<Response></Response>');
    } catch (error) {
      console.error('SMS webhook error:', error);
      res.type('text/xml').send('<Response></Response>');
    }
  },
);

/**
 * Twilio WhatsApp webhook
 */
router.post(
  '/chatbot/:configId/webhooks/twilio/whatsapp',
  async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      const signature = req.headers['x-twilio-signature'] as string;

      const result = await channelManager.processIncomingMessage(
        configId,
        'WHATSAPP',
        req.body,
        signature,
      );

      if (!result.success) {
        console.error('WhatsApp webhook error:', result.error);
      }

      // Twilio expects TwiML response
      res.type('text/xml').send('<Response></Response>');
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      res.type('text/xml').send('<Response></Response>');
    }
  },
);

/**
 * Slack Events API webhook
 */
router.post(
  '/chatbot/:configId/webhooks/slack',
  async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId, 10);

      // Handle URL verification challenge
      const challenge = slackAdapter.handleChallenge(req.body);
      if (challenge) {
        return res.json({ challenge });
      }

      const signature = req.headers['x-slack-signature'] as string;
      const timestamp = req.headers['x-slack-request-timestamp'] as string;

      // Verify request isn't too old (prevent replay attacks)
      const requestTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - requestTime) > 300) {
        return res.status(400).json({ error: 'Request too old' });
      }

      // Build signature base string
      const sigBaseString = `v0:${timestamp}:${JSON.stringify(req.body)}`;

      const result = await channelManager.processIncomingMessage(
        configId,
        'SLACK',
        req.body,
        signature ? `v0=${sigBaseString}` : undefined,
      );

      if (!result.success) {
        console.error('Slack webhook error:', result.error);
      }

      // Slack expects 200 OK quickly
      res.status(200).send();
    } catch (error) {
      console.error('Slack webhook error:', error);
      res.status(200).send();
    }
  },
);

/**
 * Generic webhook endpoint for custom integrations
 */
router.post(
  '/chatbot/:configId/webhooks/:channel',
  async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      const channel = req.params.channel.toUpperCase() as ChatChannel;

      if (!channelManager.isSupported(channel)) {
        return res.status(400).json({ error: `Unsupported channel: ${channel}` });
      }

      const signature =
        (req.headers['x-webhook-signature'] as string) ||
        (req.headers['x-signature'] as string);

      const result = await channelManager.processIncomingMessage(
        configId,
        channel,
        req.body,
        signature,
      );

      res.json({
        success: result.success,
        error: result.error,
      });
    } catch (error) {
      console.error('Generic webhook error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      });
    }
  },
);

export default router;
