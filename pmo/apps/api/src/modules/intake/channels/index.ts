/**
 * Intake Channels Module
 *
 * Multi-channel intake support including SMS, WhatsApp, and embeddable widget.
 */

// Types
export * from './channel.types';

// Services
export * as channelAdapter from './channel-adapter.service';
export * as smsService from './sms.service';
export * as whatsappService from './whatsapp.service';
export * as widgetService from './widget.service';

// Router
export { default as webhooksRouter } from './webhooks.router';
