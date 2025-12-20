/**
 * Intake Channel Types
 *
 * Type definitions for multi-channel intake functionality
 */

export type IntakeChannel = 'WEB' | 'SMS' | 'WHATSAPP' | 'WIDGET';

export interface ChannelCredentials {
  type: 'twilio' | 'whatsapp_business';
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  messagingServiceSid?: string;
  whatsappBusinessId?: string;
  apiKey?: string;
}

export interface IncomingIntakeMessage {
  channel: IntakeChannel;
  channelMessageId: string;
  senderIdentifier: string;
  senderName?: string;
  content: string;
  timestamp: Date;
  configId?: number;
  formSlug?: string;
  attachments?: IntakeAttachment[];
  metadata?: Record<string, unknown>;
}

export interface OutgoingIntakeMessage {
  channel: IntakeChannel;
  recipientIdentifier: string;
  content: string;
  attachments?: IntakeAttachment[];
  buttons?: IntakeButton[];
  quickReplies?: string[];
  metadata?: Record<string, unknown>;
}

export interface IntakeAttachment {
  type: 'image' | 'file' | 'audio' | 'video' | 'document';
  url: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface IntakeButton {
  type: 'reply' | 'url';
  text: string;
  payload?: string;
  url?: string;
}

export interface ChannelDeliveryResult {
  success: boolean;
  channelMessageId?: string;
  error?: string;
  timestamp: Date;
}

export interface IntakeChannelConfig {
  configId: number;
  channel: IntakeChannel;
  isEnabled: boolean;
  credentials?: ChannelCredentials;
  settings: IntakeChannelSettings;
  welcomeMessage?: string;
  completionMessage?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntakeChannelSettings {
  // SMS settings
  maxMessageLength?: number;
  sendConfirmation?: boolean;

  // WhatsApp settings
  useButtons?: boolean;
  useQuickReplies?: boolean;
  templateName?: string;

  // Widget settings
  widgetPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  widgetColor?: string;
  widgetTitle?: string;
  showOnPages?: string[];
  triggers?: WidgetTrigger[];

  // Common
  autoStartConversation?: boolean;
  fallbackToForm?: boolean;
  collectEmailFirst?: boolean;
  collectPhoneFirst?: boolean;
}

export interface WidgetTrigger {
  type: 'time' | 'scroll' | 'exit_intent' | 'page_view';
  delay?: number; // milliseconds
  scrollPercent?: number;
  pagePattern?: string;
}

export interface ChannelSession {
  id: string;
  channel: IntakeChannel;
  senderIdentifier: string;
  configId: number;
  formId?: number;
  submissionId?: number;
  conversationToken?: string;
  state: ChannelSessionState;
  collectedData: Record<string, unknown>;
  currentFieldIndex: number;
  lastActivity: Date;
  createdAt: Date;
}

export type ChannelSessionState =
  | 'AWAITING_START'
  | 'COLLECTING_EMAIL'
  | 'COLLECTING_PHONE'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'ERROR';

export interface ChannelWebhookPayload {
  channel: IntakeChannel;
  raw: unknown;
  signature?: string;
  timestamp?: Date;
}

export interface ParsedWebhookResult {
  success: boolean;
  message?: IncomingIntakeMessage;
  error?: string;
}
