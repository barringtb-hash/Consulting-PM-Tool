/**
 * Channel Manager
 *
 * Central hub for managing channel adapters and routing messages.
 */

import { ChatChannel } from '@prisma/client';
import {
  ChannelAdapter,
  ChannelCredentials,
  DeliveryResult,
  OutgoingMessage,
} from './channel.types';
import { smsAdapter, whatsAppAdapter } from './adapters/twilio.adapter';
import { slackAdapter } from './adapters/slack.adapter';
import * as chatbotService from '../chatbot.service';
import { prisma } from '../../../prisma/client';

class ChannelManager {
  private adapters: Map<ChatChannel, ChannelAdapter> = new Map();

  constructor() {
    // Register built-in adapters
    this.registerAdapter(smsAdapter);
    this.registerAdapter(whatsAppAdapter);
    this.registerAdapter(slackAdapter);
  }

  /**
   * Register a channel adapter
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channel, adapter);
  }

  /**
   * Get adapter for a channel
   */
  getAdapter(channel: ChatChannel): ChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  /**
   * Check if channel is supported
   */
  isSupported(channel: ChatChannel): boolean {
    return this.adapters.has(channel);
  }

  /**
   * Get all supported channels
   */
  getSupportedChannels(): ChatChannel[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Process an incoming message from any channel
   */
  async processIncomingMessage(
    chatbotConfigId: number,
    channel: ChatChannel,
    payload: unknown,
    signature?: string,
  ): Promise<{
    success: boolean;
    response?: DeliveryResult;
    error?: string;
  }> {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      return { success: false, error: `Unsupported channel: ${channel}` };
    }

    // Get channel configuration
    const channelConfig = await prisma.channelConfig.findUnique({
      where: {
        chatbotConfigId_channel: {
          chatbotConfigId,
          channel,
        },
      },
    });

    if (!channelConfig || !channelConfig.isActive) {
      return { success: false, error: 'Channel not configured or inactive' };
    }

    const credentials =
      channelConfig.credentials as unknown as ChannelCredentials;

    // Verify webhook signature if provided
    if (signature) {
      const payloadStr =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      const isValid = adapter.verifyWebhookSignature(
        payloadStr,
        signature,
        credentials,
      );
      if (!isValid) {
        return { success: false, error: 'Invalid webhook signature' };
      }
    }

    // Parse incoming message
    const incomingMessage = adapter.parseIncomingMessage(payload, credentials);
    if (!incomingMessage) {
      return { success: false, error: 'Could not parse incoming message' };
    }

    // Find or create conversation based on sender identifier
    const conversation = await this.findOrCreateConversation(
      chatbotConfigId,
      channel,
      incomingMessage.senderIdentifier,
    );

    // Process the message through the chatbot service
    const result = await chatbotService.processCustomerMessage(
      conversation.sessionId,
      {
        content: incomingMessage.content,
        channel,
      },
    );

    // Send bot response back through the channel
    const outgoingMessage: OutgoingMessage = {
      recipientIdentifier: incomingMessage.senderIdentifier,
      content: result.response.content,
      suggestedActions: result.response.suggestedActions,
    };

    const deliveryResult = await adapter.sendMessage(
      outgoingMessage,
      credentials,
    );

    return {
      success: deliveryResult.success,
      response: deliveryResult,
      error: deliveryResult.error,
    };
  }

  /**
   * Send a message through a specific channel
   */
  async sendMessage(
    chatbotConfigId: number,
    channel: ChatChannel,
    message: OutgoingMessage,
  ): Promise<DeliveryResult> {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      return {
        success: false,
        error: `Unsupported channel: ${channel}`,
        timestamp: new Date(),
      };
    }

    // Get channel configuration
    const channelConfig = await prisma.channelConfig.findUnique({
      where: {
        chatbotConfigId_channel: {
          chatbotConfigId,
          channel,
        },
      },
    });

    if (!channelConfig || !channelConfig.isActive) {
      return {
        success: false,
        error: 'Channel not configured or inactive',
        timestamp: new Date(),
      };
    }

    const credentials =
      channelConfig.credentials as unknown as ChannelCredentials;
    return adapter.sendMessage(message, credentials);
  }

  /**
   * Broadcast a message to all active channels for a chatbot
   */
  async broadcastMessage(
    chatbotConfigId: number,
    recipientMap: Map<ChatChannel, string>, // channel -> recipient identifier
    content: string,
  ): Promise<Map<ChatChannel, DeliveryResult>> {
    const results = new Map<ChatChannel, DeliveryResult>();

    // Get all active channels for this chatbot
    const activeChannels = await prisma.channelConfig.findMany({
      where: {
        chatbotConfigId,
        isActive: true,
        isVerified: true,
      },
    });

    // Send to each channel in parallel
    const promises = activeChannels
      .filter((config) => recipientMap.has(config.channel as ChatChannel))
      .map(async (config) => {
        const channel = config.channel as ChatChannel;
        const recipient = recipientMap.get(channel)!;

        const result = await this.sendMessage(chatbotConfigId, channel, {
          recipientIdentifier: recipient,
          content,
        });

        results.set(channel, result);
      });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Find or create a conversation for a channel user
   */
  private async findOrCreateConversation(
    chatbotConfigId: number,
    channel: ChatChannel,
    senderIdentifier: string,
  ) {
    // Look for an existing active conversation
    const existingConversation = await prisma.chatConversation.findFirst({
      where: {
        chatbotConfigId,
        channel,
        customerPhone: senderIdentifier,
        status: { in: ['ACTIVE', 'ESCALATED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    return chatbotService.createConversation(chatbotConfigId, {
      channel,
      customerPhone: senderIdentifier,
    });
  }
}

// Export singleton instance
export const channelManager = new ChannelManager();
