/**
 * Slack Channel Adapter
 *
 * Handles messaging through Slack Bot API.
 */

import crypto from 'crypto';
import { ChatChannel } from '@prisma/client';
import { BaseChannelAdapter } from '../base-adapter';
import {
  ChannelCredentials,
  DeliveryResult,
  IncomingMessage,
  OutgoingMessage,
  SlackCredentials,
  SuggestedAction,
} from '../channel.types';

interface SlackEventPayload {
  type: string;
  event?: {
    type: string;
    user: string;
    channel: string;
    text: string;
    ts: string;
    files?: Array<{
      id: string;
      mimetype: string;
      url_private: string;
      name: string;
      size: number;
    }>;
  };
  challenge?: string;
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    action_id?: string;
    value?: string;
  }>;
}

export class SlackAdapter extends BaseChannelAdapter {
  channel: ChatChannel = 'SLACK';

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    credentials: ChannelCredentials,
  ): boolean {
    const slackCredentials = credentials as SlackCredentials;

    // Slack signature format: v0:timestamp:body
    // Header format: v0=hash
    const [version, hash] = signature.split('=');

    if (version !== 'v0' || !hash) {
      return false;
    }

    // The payload should include the timestamp in the format v0:timestamp:body
    const expectedSignature = crypto
      .createHmac('sha256', slackCredentials.signingSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedSignature),
    );
  }

  parseIncomingMessage(
    payload: unknown,
    _credentials: ChannelCredentials,
  ): IncomingMessage | null {
    const data = payload as SlackEventPayload;

    // Handle URL verification challenge
    if (data.type === 'url_verification' && data.challenge) {
      return null; // This should be handled separately
    }

    // Handle message events
    if (
      data.type === 'event_callback' &&
      data.event?.type === 'message' &&
      data.event.text
    ) {
      const event = data.event;

      const message: IncomingMessage = {
        channel: 'SLACK',
        channelMessageId: event.ts,
        senderIdentifier: event.user,
        content: event.text,
        timestamp: new Date(parseFloat(event.ts) * 1000),
        metadata: {
          slackChannel: event.channel,
          raw: data,
        },
      };

      // Handle file attachments
      if (event.files && event.files.length > 0) {
        message.attachments = event.files.map((file) => ({
          type: this.getAttachmentType(file.mimetype),
          url: file.url_private,
          mimeType: file.mimetype,
          filename: file.name,
          size: file.size,
        }));
      }

      return message;
    }

    return null;
  }

  async sendMessage(
    message: OutgoingMessage,
    credentials: ChannelCredentials,
  ): Promise<DeliveryResult> {
    const slackCredentials = credentials as SlackCredentials;

    try {
      const blocks: SlackBlock[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message.content,
          },
        },
      ];

      // Add action buttons if suggested actions provided
      if (message.suggestedActions && message.suggestedActions.length > 0) {
        blocks.push({
          type: 'actions',
          elements: message.suggestedActions.slice(0, 5).map((action, index) => ({
            type: 'button',
            text: {
              type: 'plain_text',
              text: action.label,
              emoji: true,
            },
            action_id: `action_${index}_${action.action}`,
            value: JSON.stringify(action.payload || {}),
          })),
        });
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${slackCredentials.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: message.recipientIdentifier,
          blocks,
          text: message.content, // Fallback for notifications
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        return this.failureResult(result.error || 'Failed to send message');
      }

      return this.successResult(result.ts);
    } catch (error) {
      return this.failureResult(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async validateCredentials(credentials: ChannelCredentials): Promise<boolean> {
    const slackCredentials = credentials as SlackCredentials;

    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          Authorization: `Bearer ${slackCredentials.botToken}`,
        },
      });

      const result = await response.json();
      return result.ok === true;
    } catch {
      return false;
    }
  }

  /**
   * Handle Slack URL verification challenge
   */
  handleChallenge(payload: SlackEventPayload): string | null {
    if (payload.type === 'url_verification' && payload.challenge) {
      return payload.challenge;
    }
    return null;
  }

  /**
   * Build interactive message with blocks
   */
  buildInteractiveMessage(
    text: string,
    actions: SuggestedAction[],
  ): { blocks: SlackBlock[]; text: string } {
    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ];

    if (actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: actions.slice(0, 5).map((action, index) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.label,
            emoji: true,
          },
          action_id: `action_${index}_${action.action}`,
          value: JSON.stringify(action.payload || {}),
        })),
      });
    }

    return { blocks, text };
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

export const slackAdapter = new SlackAdapter();
