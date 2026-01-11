/**
 * Intake Channels Webhook Router
 *
 * Handles incoming webhooks from SMS (Twilio) and WhatsApp messaging services.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../../prisma/client';
import {
  parseTwilioSmsWebhook,
  parseTwilioWhatsAppWebhook,
  verifyTwilioSignature,
} from './channel-adapter.service';
import * as smsService from './sms.service';
import * as whatsappService from './whatsapp.service';
import { IntakeChannelConfig, IncomingIntakeMessage } from './channel.types';

const router = Router();

// Environment variables for Twilio
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';

/**
 * POST /api/intake/webhooks/twilio/sms
 * Handle incoming SMS messages via Twilio
 */
router.post('/twilio/sms', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if auth token is configured
    if (TWILIO_AUTH_TOKEN) {
      const signature = req.headers['x-twilio-signature'] as string;
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      if (
        !signature ||
        !verifyTwilioSignature(fullUrl, req.body, signature, TWILIO_AUTH_TOKEN)
      ) {
        console.warn('Invalid Twilio SMS webhook signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    // Parse the incoming message
    const parseResult = parseTwilioSmsWebhook(req.body);
    if (!parseResult.success || !parseResult.message) {
      console.error('Failed to parse SMS webhook:', parseResult.error);
      res.status(400).send(parseResult.error);
      return;
    }

    const incomingMessage = parseResult.message;

    // Find the channel config based on the destination phone number
    const channelConfig = await findChannelConfig(
      'SMS',
      req.body.To,
      incomingMessage,
    );

    if (!channelConfig) {
      console.warn('No SMS channel config found for:', req.body.To);
      // Return empty TwiML to avoid Twilio retries
      res
        .type('text/xml')
        .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Process the message
    const response = await smsService.processIncomingSms(
      incomingMessage,
      channelConfig,
    );

    // Send response via Twilio
    if (channelConfig.credentials) {
      await smsService.sendSmsResponse(response, channelConfig);
    }

    // Return TwiML response (empty - we handle responses ourselves)
    res
      .type('text/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * POST /api/intake/webhooks/twilio/whatsapp
 * Handle incoming WhatsApp messages via Twilio
 */
router.post('/twilio/whatsapp', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if auth token is configured
    if (TWILIO_AUTH_TOKEN) {
      const signature = req.headers['x-twilio-signature'] as string;
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      if (
        !signature ||
        !verifyTwilioSignature(fullUrl, req.body, signature, TWILIO_AUTH_TOKEN)
      ) {
        console.warn('Invalid Twilio WhatsApp webhook signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    // Parse the incoming message
    const parseResult = parseTwilioWhatsAppWebhook(req.body);
    if (!parseResult.success || !parseResult.message) {
      console.error('Failed to parse WhatsApp webhook:', parseResult.error);
      res.status(400).send(parseResult.error);
      return;
    }

    const incomingMessage = parseResult.message;

    // Find the channel config
    const channelConfig = await findChannelConfig(
      'WHATSAPP',
      req.body.To?.replace('whatsapp:', ''),
      incomingMessage,
    );

    if (!channelConfig) {
      console.warn('No WhatsApp channel config found');
      res
        .type('text/xml')
        .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Process the message
    const response = await whatsappService.processIncomingWhatsApp(
      incomingMessage,
      channelConfig,
    );

    // Send response via Twilio WhatsApp
    if (channelConfig.credentials) {
      await whatsappService.sendWhatsAppResponse(response, channelConfig);
    }

    // Return TwiML response
    res
      .type('text/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * POST /api/intake/webhooks/twilio/status
 * Handle Twilio message status callbacks
 */
router.post('/twilio/status', async (req: Request, res: Response) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    console.log('Twilio status callback:', {
      messageSid: MessageSid,
      status: MessageStatus,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage,
    });

    // Log status updates (could store in database for tracking)
    if (ErrorCode) {
      console.error(
        `Message ${MessageSid} failed: ${ErrorCode} - ${ErrorMessage}`,
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing status webhook:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /api/intake/webhooks/health
 * Health check for webhook endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    channels: ['sms', 'whatsapp'],
  });
});

// Channel config schema for validation
const _channelConfigSchema = z.object({
  configId: z.number().int().positive(),
  channel: z.enum(['SMS', 'WHATSAPP', 'WIDGET']),
  isEnabled: z.boolean(),
  credentials: z
    .object({
      type: z.enum(['twilio', 'whatsapp_business']),
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      phoneNumber: z.string().optional(),
      messagingServiceSid: z.string().optional(),
    })
    .optional(),
  settings: z
    .object({
      maxMessageLength: z.number().optional(),
      sendConfirmation: z.boolean().optional(),
      useButtons: z.boolean().optional(),
      useQuickReplies: z.boolean().optional(),
      collectEmailFirst: z.boolean().optional(),
    })
    .optional(),
  welcomeMessage: z.string().optional(),
  completionMessage: z.string().optional(),
  errorMessage: z.string().optional(),
});

/**
 * Find the channel configuration for a given phone number
 */
async function findChannelConfig(
  channel: 'SMS' | 'WHATSAPP',
  phoneNumber: string | undefined,
  _message: IncomingIntakeMessage,
): Promise<IntakeChannelConfig | null> {
  // In production, you would look up the config based on the phone number
  // For now, we'll use environment variables or the first available config

  // Try to find a config with matching channel settings
  const configs = await prisma.intakeConfig.findMany({
    where: {
      isActive: true,
    },
    include: {
      client: true,
    },
  });

  for (const config of configs) {
    // Use storageCredentials to store channel settings
    const storedSettings = config.storageCredentials as Record<
      string,
      unknown
    > | null;
    const channelSettings = storedSettings?.channelSettings as
      | Record<string, unknown>
      | undefined;

    if (channelSettings?.[channel.toLowerCase()]) {
      const channelConfig = channelSettings[channel.toLowerCase()] as Record<
        string,
        unknown
      >;

      // Check if this config matches the phone number
      if (channelConfig.phoneNumber === phoneNumber || !phoneNumber) {
        return {
          configId: config.id,
          channel,
          isEnabled: (channelConfig.isEnabled as boolean) ?? true,
          credentials: {
            type: 'twilio',
            accountSid:
              (channelConfig.accountSid as string) ||
              process.env.TWILIO_ACCOUNT_SID,
            authToken:
              (channelConfig.authToken as string) ||
              process.env.TWILIO_AUTH_TOKEN,
            phoneNumber:
              (channelConfig.phoneNumber as string) ||
              process.env.TWILIO_PHONE_NUMBER,
            messagingServiceSid: channelConfig.messagingServiceSid as string,
          },
          settings: {
            collectEmailFirst:
              (channelConfig.collectEmailFirst as boolean) ?? true,
            sendConfirmation:
              (channelConfig.sendConfirmation as boolean) ?? true,
            useButtons: (channelConfig.useButtons as boolean) ?? true,
            useQuickReplies: (channelConfig.useQuickReplies as boolean) ?? true,
          },
          welcomeMessage: channelConfig.welcomeMessage as string,
          completionMessage: channelConfig.completionMessage as string,
          errorMessage: channelConfig.errorMessage as string,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        };
      }
    }
  }

  // Fallback: use environment variables with first config
  if (configs.length > 0 && process.env.TWILIO_ACCOUNT_SID) {
    const config = configs[0];
    return {
      configId: config.id,
      channel,
      isEnabled: true,
      credentials: {
        type: 'twilio',
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      },
      settings: {
        collectEmailFirst: true,
        sendConfirmation: true,
        useButtons: channel === 'WHATSAPP',
        useQuickReplies: channel === 'WHATSAPP',
      },
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  return null;
}

export default router;
