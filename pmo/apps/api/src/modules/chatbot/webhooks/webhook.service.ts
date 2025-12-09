/**
 * Webhook Service
 *
 * Handles webhook management, dispatching, and delivery tracking.
 * Supports HMAC signature verification, retry logic, and delivery logs.
 */

import crypto from 'crypto';
import { PrismaClient, WebhookConfig } from '@prisma/client';

const prisma = new PrismaClient();

// Webhook event types
export const WEBHOOK_EVENTS = {
  CONVERSATION_STARTED: 'conversation.started',
  CONVERSATION_ENDED: 'conversation.ended',
  CONVERSATION_ESCALATED: 'conversation.escalated',
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_SENT: 'message.sent',
  CUSTOMER_RATING: 'customer.rating',
} as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  chatbotConfigId: number;
  data: Record<string, unknown>;
}

interface CreateWebhookInput {
  name: string;
  url: string;
  events: string[];
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Generate a secure random secret for HMAC signing
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate HMAC signature for a payload
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = generateSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Create a new webhook configuration
 */
export async function createWebhook(
  chatbotConfigId: number,
  input: CreateWebhookInput,
): Promise<WebhookConfig> {
  const secret = generateWebhookSecret();

  return prisma.webhookConfig.create({
    data: {
      chatbotConfigId,
      name: input.name,
      url: input.url,
      secret,
      events: input.events,
      maxRetries: input.maxRetries ?? 3,
      retryDelayMs: input.retryDelayMs ?? 1000,
      timeoutMs: input.timeoutMs ?? 30000,
    },
  });
}

/**
 * Update a webhook configuration
 */
export async function updateWebhook(
  webhookId: number,
  input: UpdateWebhookInput,
): Promise<WebhookConfig> {
  return prisma.webhookConfig.update({
    where: { id: webhookId },
    data: input,
  });
}

/**
 * Delete a webhook configuration
 */
export async function deleteWebhook(webhookId: number): Promise<void> {
  await prisma.webhookConfig.delete({
    where: { id: webhookId },
  });
}

/**
 * Get webhooks for a chatbot configuration
 */
export async function getWebhooks(
  chatbotConfigId: number,
): Promise<WebhookConfig[]> {
  return prisma.webhookConfig.findMany({
    where: { chatbotConfigId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single webhook by ID
 */
export async function getWebhookById(
  webhookId: number,
): Promise<WebhookConfig | null> {
  return prisma.webhookConfig.findUnique({
    where: { id: webhookId },
  });
}

/**
 * Regenerate the secret for a webhook
 */
export async function regenerateWebhookSecret(
  webhookId: number,
): Promise<WebhookConfig> {
  const newSecret = generateWebhookSecret();
  return prisma.webhookConfig.update({
    where: { id: webhookId },
    data: { secret: newSecret },
  });
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookLogs(
  webhookId: number,
  options: { limit?: number; offset?: number } = {},
) {
  const { limit = 50, offset = 0 } = options;

  return prisma.webhookDeliveryLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Dispatch a webhook event to all subscribed webhooks
 */
export async function dispatchWebhookEvent(
  chatbotConfigId: number,
  event: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  // Get all active webhooks subscribed to this event
  const webhooks = await prisma.webhookConfig.findMany({
    where: {
      chatbotConfigId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    chatbotConfigId,
    data,
  };

  // Dispatch to all webhooks in parallel
  await Promise.allSettled(
    webhooks.map((webhook) => deliverWebhook(webhook, payload)),
  );
}

/**
 * Deliver a webhook with retry logic
 */
async function deliverWebhook(
  webhook: WebhookConfig,
  payload: WebhookPayload,
  attempt: number = 1,
): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), webhook.timeoutMs);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'X-Webhook-Attempt': attempt.toString(),
        'User-Agent': 'PMO-Chatbot-Webhook/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    // Log the delivery
    await prisma.webhookDeliveryLog.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload: payload as unknown as Record<string, unknown>,
        statusCode: response.status,
        responseBody: responseBody.slice(0, 1000), // Truncate
        deliveredAt: new Date(),
        durationMs,
        attempt,
      },
    });

    // Update webhook metadata
    await prisma.webhookConfig.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        failureCount: response.ok ? 0 : webhook.failureCount + 1,
      },
    });

    // If not successful, retry
    if (!response.ok && attempt < webhook.maxRetries) {
      const delay = webhook.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      await sleep(delay);
      return deliverWebhook(webhook, payload, attempt + 1);
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Log the failed delivery
    await prisma.webhookDeliveryLog.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload: payload as unknown as Record<string, unknown>,
        errorMessage,
        durationMs,
        attempt,
      },
    });

    // Update failure count
    await prisma.webhookConfig.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        failureCount: webhook.failureCount + 1,
      },
    });

    // Retry if we haven't exceeded max retries
    if (attempt < webhook.maxRetries) {
      const delay = webhook.retryDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
      return deliverWebhook(webhook, payload, attempt + 1);
    }
  }
}

/**
 * Test a webhook by sending a test event
 */
export async function testWebhook(
  webhookId: number,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const webhook = await prisma.webhookConfig.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  const testPayload: WebhookPayload = {
    event: 'conversation.started' as WebhookEventType,
    timestamp: new Date().toISOString(),
    chatbotConfigId: webhook.chatbotConfigId,
    data: {
      test: true,
      message: 'This is a test webhook delivery',
    },
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = generateSignature(payloadString, webhook.secret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': 'test',
        'X-Webhook-Timestamp': testPayload.timestamp,
        'User-Agent': 'PMO-Chatbot-Webhook/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper function for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
