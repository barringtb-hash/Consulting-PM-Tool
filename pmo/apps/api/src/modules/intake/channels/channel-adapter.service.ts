/**
 * Intake Channel Adapter Service
 *
 * Unified adapter for handling multi-channel intake communications.
 * Leverages existing Twilio infrastructure from chatbot module.
 */

import crypto from 'crypto';
import {
  ChannelCredentials,
  IncomingIntakeMessage,
  OutgoingIntakeMessage,
  ChannelDeliveryResult,
  ParsedWebhookResult,
} from './channel.types';

// Twilio webhook payload structure
interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
}

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): boolean {
  // Build validation string: URL + sorted params
  const sortedKeys = Object.keys(params).sort();
  let validationString = url;
  for (const key of sortedKeys) {
    validationString += key + params[key];
  }

  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(validationString)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

/**
 * Parse incoming Twilio SMS webhook
 */
export function parseTwilioSmsWebhook(
  payload: TwilioWebhookPayload,
  configId?: number,
): ParsedWebhookResult {
  if (!payload.MessageSid || !payload.From || !payload.Body) {
    return {
      success: false,
      error: 'Invalid SMS webhook payload: missing required fields',
    };
  }

  const message: IncomingIntakeMessage = {
    channel: 'SMS',
    channelMessageId: payload.MessageSid,
    senderIdentifier: payload.From.replace(/[^+\d]/g, ''),
    senderName: payload.ProfileName,
    content: payload.Body.trim(),
    timestamp: new Date(),
    configId,
    metadata: {
      to: payload.To,
      raw: payload,
    },
  };

  // Handle MMS attachments
  if (payload.NumMedia && parseInt(payload.NumMedia, 10) > 0) {
    message.attachments = [];
    if (payload.MediaUrl0 && payload.MediaContentType0) {
      message.attachments.push({
        type: getAttachmentType(payload.MediaContentType0),
        url: payload.MediaUrl0,
        mimeType: payload.MediaContentType0,
      });
    }
  }

  return { success: true, message };
}

/**
 * Parse incoming Twilio WhatsApp webhook
 */
export function parseTwilioWhatsAppWebhook(
  payload: TwilioWebhookPayload,
  configId?: number,
): ParsedWebhookResult {
  if (!payload.MessageSid || !payload.From || !payload.Body) {
    return {
      success: false,
      error: 'Invalid WhatsApp webhook payload: missing required fields',
    };
  }

  // Remove whatsapp: prefix from phone number
  const senderIdentifier = payload.From.replace('whatsapp:', '').replace(
    /[^+\d]/g,
    '',
  );

  const message: IncomingIntakeMessage = {
    channel: 'WHATSAPP',
    channelMessageId: payload.MessageSid,
    senderIdentifier,
    senderName: payload.ProfileName,
    content: payload.Body.trim(),
    timestamp: new Date(),
    configId,
    metadata: {
      to: payload.To,
      raw: payload,
    },
  };

  // Handle media attachments
  if (payload.NumMedia && parseInt(payload.NumMedia, 10) > 0) {
    message.attachments = [];
    if (payload.MediaUrl0 && payload.MediaContentType0) {
      message.attachments.push({
        type: getAttachmentType(payload.MediaContentType0),
        url: payload.MediaUrl0,
        mimeType: payload.MediaContentType0,
      });
    }
  }

  return { success: true, message };
}

/**
 * Send SMS via Twilio
 */
export async function sendSms(
  message: OutgoingIntakeMessage,
  credentials: ChannelCredentials,
): Promise<ChannelDeliveryResult> {
  if (!credentials.accountSid || !credentials.authToken) {
    return {
      success: false,
      error: 'Missing Twilio credentials',
      timestamp: new Date(),
    };
  }

  const from = credentials.phoneNumber || credentials.messagingServiceSid;
  if (!from) {
    return {
      success: false,
      error: 'No phone number or messaging service configured',
      timestamp: new Date(),
    };
  }

  try {
    const authString = Buffer.from(
      `${credentials.accountSid}:${credentials.authToken}`,
    ).toString('base64');

    const body = new URLSearchParams({
      To: message.recipientIdentifier,
      From: from,
      Body: truncateContent(message.content, 1600), // SMS limit
    });

    // Add media URL if attachment provided
    if (message.attachments && message.attachments.length > 0) {
      body.append('MediaUrl', message.attachments[0].url);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      return {
        success: false,
        error: errorData.message || 'Failed to send SMS',
        timestamp: new Date(),
      };
    }

    const result = (await response.json()) as { sid: string };
    return {
      success: true,
      channelMessageId: result.sid,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsApp(
  message: OutgoingIntakeMessage,
  credentials: ChannelCredentials,
): Promise<ChannelDeliveryResult> {
  if (!credentials.accountSid || !credentials.authToken) {
    return {
      success: false,
      error: 'Missing Twilio credentials',
      timestamp: new Date(),
    };
  }

  if (!credentials.phoneNumber) {
    return {
      success: false,
      error: 'No WhatsApp phone number configured',
      timestamp: new Date(),
    };
  }

  try {
    const authString = Buffer.from(
      `${credentials.accountSid}:${credentials.authToken}`,
    ).toString('base64');

    // Format for WhatsApp
    const to = `whatsapp:${message.recipientIdentifier}`;
    const from = `whatsapp:${credentials.phoneNumber}`;

    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: truncateContent(message.content, 4096), // WhatsApp has higher limit
    });

    // Add media URL if attachment provided
    if (message.attachments && message.attachments.length > 0) {
      body.append('MediaUrl', message.attachments[0].url);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      return {
        success: false,
        error: errorData.message || 'Failed to send WhatsApp message',
        timestamp: new Date(),
      };
    }

    const result = (await response.json()) as { sid: string };
    return {
      success: true,
      channelMessageId: result.sid,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Send message to any channel
 */
export async function sendMessage(
  message: OutgoingIntakeMessage,
  credentials: ChannelCredentials,
): Promise<ChannelDeliveryResult> {
  switch (message.channel) {
    case 'SMS':
      return sendSms(message, credentials);
    case 'WHATSAPP':
      return sendWhatsApp(message, credentials);
    case 'WEB':
    case 'WIDGET':
      // Web and Widget channels don't send outbound messages via this adapter
      return {
        success: true,
        channelMessageId: `web-${Date.now()}`,
        timestamp: new Date(),
      };
    default:
      return {
        success: false,
        error: `Unsupported channel: ${message.channel}`,
        timestamp: new Date(),
      };
  }
}

/**
 * Validate Twilio credentials
 */
export async function validateTwilioCredentials(
  credentials: ChannelCredentials,
): Promise<boolean> {
  if (!credentials.accountSid || !credentials.authToken) {
    return false;
  }

  try {
    const authString = Buffer.from(
      `${credentials.accountSid}:${credentials.authToken}`,
    ).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${authString}`,
        },
      },
    );

    return response.ok;
  } catch {
    return false;
  }
}

// Helper functions

function getAttachmentType(
  mimeType: string,
): 'image' | 'file' | 'audio' | 'video' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('msword')
  ) {
    return 'document';
  }
  return 'file';
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength - 3) + '...';
}
