/**
 * Channel Module Exports
 *
 * Multi-channel messaging support for the chatbot.
 */

export * from './channel.types';
export * from './channel.service';
export { channelManager } from './channel-manager';
export { default as channelRouter } from './channel.router';

// Adapters
export {
  smsAdapter,
  whatsAppAdapter,
  TwilioAdapter,
} from './adapters/twilio.adapter';
export { slackAdapter, SlackAdapter } from './adapters/slack.adapter';
