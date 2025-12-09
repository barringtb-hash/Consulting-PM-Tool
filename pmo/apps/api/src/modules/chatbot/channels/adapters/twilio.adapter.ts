/**
 * Twilio Channel Adapter
 *
 * Handles SMS and WhatsApp messaging through Twilio.
 */

import crypto from 'crypto';
import { ChatChannel } from '@prisma/client';
import { BaseChannelAdapter } from '../base-adapter';
import {
  ChannelCredentials,
  DeliveryResult,
  IncomingMessage,
  OutgoingMessage,
  TwilioCredentials,
} from '../channel.types';

interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export class TwilioAdapter extends BaseChannelAdapter {
  channel: ChatChannel = 'SMS';

  constructor(private isWhatsApp: boolean = false) {
    super();
    if (isWhatsApp) {
      this.channel = 'WHATSAPP';
    }
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    credentials: ChannelCredentials,
  ): boolean {
    const twilioCredentials = credentials as TwilioCredentials;

    // Twilio uses X-Twilio-Signature header with HMAC-SHA1
    const expectedSignature = crypto
      .createHmac('sha1', twilioCredentials.authToken)
      .update(payload)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  parseIncomingMessage(
    payload: unknown,
    _credentials: ChannelCredentials,
  ): IncomingMessage | null {
    const data = payload as TwilioWebhookPayload;

    if (!data.MessageSid || !data.From || !data.Body) {
      return null;
    }

    // Parse sender identifier (remove whatsapp: prefix if present)
    const senderIdentifier = data.From.replace('whatsapp:', '');

    const message: IncomingMessage = {
      channel: this.channel,
      channelMessageId: data.MessageSid,
      senderIdentifier,
      content: data.Body,
      timestamp: new Date(),
      metadata: {
        to: data.To,
        raw: data,
      },
    };

    // Handle media attachments
    if (data.NumMedia && parseInt(data.NumMedia, 10) > 0) {
      message.attachments = [];
      if (data.MediaUrl0 && data.MediaContentType0) {
        message.attachments.push({
          type: this.getAttachmentType(data.MediaContentType0),
          url: data.MediaUrl0,
          mimeType: data.MediaContentType0,
        });
      }
    }

    return message;
  }

  async sendMessage(
    message: OutgoingMessage,
    credentials: ChannelCredentials,
  ): Promise<DeliveryResult> {
    const twilioCredentials = credentials as TwilioCredentials;

    // Format recipient for WhatsApp if needed
    const to = this.isWhatsApp
      ? `whatsapp:${message.recipientIdentifier}`
      : message.recipientIdentifier;

    const from = this.isWhatsApp
      ? `whatsapp:${twilioCredentials.phoneNumber}`
      : twilioCredentials.phoneNumber || twilioCredentials.messagingServiceSid;

    if (!from) {
      return this.failureResult('No phone number or messaging service configured');
    }

    try {
      const authString = Buffer.from(
        `${twilioCredentials.accountSid}:${twilioCredentials.authToken}`,
      ).toString('base64');

      const body = new URLSearchParams({
        To: to,
        From: from,
        Body: this.truncateContent(message.content, 1600), // Twilio limit
      });

      // Add media URL if attachment provided
      if (message.attachments && message.attachments.length > 0) {
        body.append('MediaUrl', message.attachments[0].url);
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioCredentials.accountSid}/Messages.json`,
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
        const errorData = await response.json();
        return this.failureResult(errorData.message || 'Failed to send message');
      }

      const result = await response.json();
      return this.successResult(result.sid);
    } catch (error) {
      return this.failureResult(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async validateCredentials(credentials: ChannelCredentials): Promise<boolean> {
    const twilioCredentials = credentials as TwilioCredentials;

    try {
      const authString = Buffer.from(
        `${twilioCredentials.accountSid}:${twilioCredentials.authToken}`,
      ).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioCredentials.accountSid}.json`,
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

  private getAttachmentType(
    mimeType: string,
  ): 'image' | 'file' | 'audio' | 'video' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }
}

// Export specific instances
export const smsAdapter = new TwilioAdapter(false);
export const whatsAppAdapter = new TwilioAdapter(true);
