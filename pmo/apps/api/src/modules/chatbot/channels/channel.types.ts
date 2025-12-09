/**
 * Channel Types
 *
 * Type definitions for multi-channel messaging support.
 */

import { ChatChannel } from '@prisma/client';

/**
 * Channel identifiers supported by the system
 */
export const SUPPORTED_CHANNELS = {
  WEB: 'WEB',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  SLACK: 'SLACK',
  TEAMS: 'TEAMS',
  MESSENGER: 'MESSENGER',
  EMAIL: 'EMAIL',
} as const;

export type SupportedChannel = keyof typeof SUPPORTED_CHANNELS;

/**
 * Incoming message from any channel
 */
export interface IncomingMessage {
  channel: ChatChannel;
  channelMessageId: string;
  senderIdentifier: string;
  content: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Outgoing message to any channel
 */
export interface OutgoingMessage {
  recipientIdentifier: string;
  content: string;
  attachments?: MessageAttachment[];
  suggestedActions?: SuggestedAction[];
  metadata?: Record<string, unknown>;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  mimeType?: string;
  filename?: string;
  size?: number;
}

/**
 * Suggested action for quick replies
 */
export interface SuggestedAction {
  label: string;
  action: string;
  payload?: unknown;
}

/**
 * Channel delivery result
 */
export interface DeliveryResult {
  success: boolean;
  channelMessageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Channel configuration credentials
 */
export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
  messagingServiceSid?: string;
}

export interface SlackCredentials {
  botToken: string;
  signingSecret: string;
  appId?: string;
}

export interface TeamsCredentials {
  appId: string;
  appPassword: string;
  tenantId?: string;
}

export interface MessengerCredentials {
  pageAccessToken: string;
  appSecret: string;
  verifyToken: string;
}

export interface WhatsAppCredentials extends TwilioCredentials {
  businessId?: string;
}

export type ChannelCredentials =
  | TwilioCredentials
  | SlackCredentials
  | TeamsCredentials
  | MessengerCredentials
  | WhatsAppCredentials;

/**
 * Channel adapter interface
 */
export interface ChannelAdapter {
  /**
   * The channel type this adapter handles
   */
  channel: ChatChannel;

  /**
   * Verify webhook signature from the channel provider
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    credentials: ChannelCredentials,
  ): boolean;

  /**
   * Parse incoming webhook payload into IncomingMessage
   */
  parseIncomingMessage(
    payload: unknown,
    credentials: ChannelCredentials,
  ): IncomingMessage | null;

  /**
   * Send an outgoing message through the channel
   */
  sendMessage(
    message: OutgoingMessage,
    credentials: ChannelCredentials,
  ): Promise<DeliveryResult>;

  /**
   * Validate credentials for this channel
   */
  validateCredentials(credentials: ChannelCredentials): Promise<boolean>;
}

/**
 * Channel configuration settings
 */
export interface ChannelSettings {
  welcomeMessage?: string;
  autoReplyEnabled?: boolean;
  businessHoursOnly?: boolean;
  offlineMessage?: string;
  maxMessageLength?: number;
}
