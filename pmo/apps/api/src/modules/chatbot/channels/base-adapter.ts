/**
 * Base Channel Adapter
 *
 * Abstract base class for channel adapters with common functionality.
 */

import { ChatChannel } from '@prisma/client';
import {
  ChannelAdapter,
  ChannelCredentials,
  DeliveryResult,
  IncomingMessage,
  OutgoingMessage,
} from './channel.types';

export abstract class BaseChannelAdapter implements ChannelAdapter {
  abstract channel: ChatChannel;

  abstract verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    credentials: ChannelCredentials,
  ): boolean;

  abstract parseIncomingMessage(
    payload: unknown,
    credentials: ChannelCredentials,
  ): IncomingMessage | null;

  abstract sendMessage(
    message: OutgoingMessage,
    credentials: ChannelCredentials,
  ): Promise<DeliveryResult>;

  abstract validateCredentials(
    credentials: ChannelCredentials,
  ): Promise<boolean>;

  /**
   * Helper to create a successful delivery result
   */
  protected successResult(channelMessageId: string): DeliveryResult {
    return {
      success: true,
      channelMessageId,
      timestamp: new Date(),
    };
  }

  /**
   * Helper to create a failed delivery result
   */
  protected failureResult(error: string): DeliveryResult {
    return {
      success: false,
      error,
      timestamp: new Date(),
    };
  }

  /**
   * Helper to safely parse JSON
   */
  protected safeJsonParse<T>(data: string | Buffer): T | null {
    try {
      const str = Buffer.isBuffer(data) ? data.toString('utf-8') : data;
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  }

  /**
   * Truncate content to max length with ellipsis
   */
  protected truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.slice(0, maxLength - 3) + '...';
  }
}
