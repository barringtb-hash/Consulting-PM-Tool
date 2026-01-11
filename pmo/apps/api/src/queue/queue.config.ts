/**
 * Bull Queue Configuration
 *
 * Job queues for async processing:
 * - Document processing
 * - Email sending
 * - Webhook delivery
 * - Integration sync
 * - Notifications
 *
 * NOTE: Queues are only available when Redis is configured (REDIS_URL env var).
 * When Redis is not available, queue operations are no-ops.
 */

import { Queue, QueueEvents } from 'bullmq';
import { redis, redisBullMQ } from '../cache/redis.client';

// Check if Redis is configured (queues require Redis)
const isQueueEnabled = redis !== null && redisBullMQ !== null;

if (!isQueueEnabled) {
  console.log('Queues: Redis not configured, job queues disabled');
}

// Default job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 100, // Keep last 100 completed jobs
  },
  removeOnFail: {
    count: 500, // Keep last 500 failed jobs
  },
};

// ============================================================================
// QUEUE DEFINITIONS (null when Redis not configured)
// ============================================================================

/**
 * Document Processing Queue
 * Handles OCR, extraction, and analysis
 */
export const documentQueue = isQueueEnabled
  ? new Queue('document-processing', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 2, // Documents shouldn't retry too much
      },
    })
  : null;

/**
 * Email Sending Queue
 * Handles transactional and notification emails
 */
export const emailQueue = isQueueEnabled
  ? new Queue('email-sending', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 5, // More retries for emails
      },
    })
  : null;

/**
 * Webhook Delivery Queue
 * Handles outgoing webhook deliveries
 */
export const webhookQueue = isQueueEnabled
  ? new Queue('webhook-delivery', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 5,
      },
    })
  : null;

/**
 * Integration Sync Queue
 * Handles sync with external systems
 */
export const syncQueue = isQueueEnabled
  ? new Queue('integration-sync', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
      },
    })
  : null;

/**
 * Notification Queue
 * Handles multi-channel notification delivery
 */
export const notificationQueue = isQueueEnabled
  ? new Queue('notifications', {
      connection: redis!,
      defaultJobOptions,
    })
  : null;

/**
 * Analytics Aggregation Queue
 * Handles periodic analytics calculations
 */
export const analyticsQueue = isQueueEnabled
  ? new Queue('analytics', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 2,
      },
    })
  : null;

// ============================================================================
// QUEUE EVENTS (null when Redis not configured)
// ============================================================================

export const documentQueueEvents = isQueueEnabled
  ? new QueueEvents('document-processing', { connection: redisBullMQ! })
  : null;
export const emailQueueEvents = isQueueEnabled
  ? new QueueEvents('email-sending', { connection: redisBullMQ! })
  : null;
export const webhookQueueEvents = isQueueEnabled
  ? new QueueEvents('webhook-delivery', { connection: redisBullMQ! })
  : null;
export const syncQueueEvents = isQueueEnabled
  ? new QueueEvents('integration-sync', { connection: redisBullMQ! })
  : null;
export const notificationQueueEvents = isQueueEnabled
  ? new QueueEvents('notifications', { connection: redisBullMQ! })
  : null;

// ============================================================================
// JOB TYPE DEFINITIONS
// ============================================================================

export interface DocumentJobData {
  tenantId: string;
  documentId: number;
  operation: 'analyze' | 'extract' | 'classify' | 'compliance';
  templateId?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface EmailJobData {
  tenantId: string;
  to: string;
  template: string;
  subject: string;
  data: Record<string, unknown>;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface WebhookJobData {
  tenantId: string;
  webhookId: number;
  event: string;
  payload: Record<string, unknown>;
  attempt?: number;
}

export interface SyncJobData {
  tenantId: string;
  integrationId: number;
  direction: 'inbound' | 'outbound';
  entityType: string;
  entityId?: number;
  fullSync?: boolean;
}

export interface NotificationJobData {
  tenantId: string;
  notificationId: number;
  channel: 'email' | 'slack' | 'sms' | 'push';
}

export interface AnalyticsJobData {
  tenantId: string;
  metric: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
}

// ============================================================================
// HELPER FUNCTIONS (return null when queues disabled)
// ============================================================================

/**
 * Add a document processing job.
 * Returns null if queues are not available.
 */
export async function addDocumentJob(
  data: DocumentJobData,
  options?: { priority?: number },
) {
  if (!documentQueue) return null;
  return documentQueue.add('process-document', data, {
    priority: options?.priority,
    jobId: `doc-${data.documentId}-${data.operation}`,
  });
}

/**
 * Add an email sending job.
 * Returns null if queues are not available.
 */
export async function addEmailJob(data: EmailJobData) {
  if (!emailQueue) return null;
  return emailQueue.add('send-email', data);
}

/**
 * Add a webhook delivery job.
 * Returns null if queues are not available.
 */
export async function addWebhookJob(data: WebhookJobData) {
  if (!webhookQueue) return null;
  return webhookQueue.add('deliver-webhook', data, {
    jobId: `webhook-${data.webhookId}-${Date.now()}`,
  });
}

/**
 * Add an integration sync job.
 * Returns null if queues are not available.
 */
export async function addSyncJob(
  data: SyncJobData,
  options?: { delay?: number },
) {
  if (!syncQueue) return null;
  return syncQueue.add('sync', data, {
    delay: options?.delay,
    jobId: data.fullSync
      ? `sync-full-${data.integrationId}`
      : `sync-${data.integrationId}-${data.entityType}-${data.entityId}`,
  });
}

/**
 * Add a notification delivery job.
 * Returns null if queues are not available.
 */
export async function addNotificationJob(data: NotificationJobData) {
  if (!notificationQueue) return null;
  return notificationQueue.add('deliver-notification', data, {
    jobId: `notif-${data.notificationId}-${data.channel}`,
  });
}

/**
 * Schedule recurring analytics job.
 * Returns null if queues are not available.
 */
export async function scheduleAnalyticsJob(
  tenantId: string,
  metric: string,
  period: 'daily' | 'weekly' | 'monthly',
) {
  if (!analyticsQueue) return null;

  const cronPattern =
    period === 'daily'
      ? '0 1 * * *' // 1 AM daily
      : period === 'weekly'
        ? '0 2 * * 0' // 2 AM Sunday
        : '0 3 1 * *'; // 3 AM first of month

  return analyticsQueue.add(
    'aggregate-analytics',
    { tenantId, metric, period, date: new Date().toISOString() },
    {
      repeat: { pattern: cronPattern },
      jobId: `analytics-${tenantId}-${metric}-${period}`,
    },
  );
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

export async function closeQueues() {
  const queues = [
    documentQueue,
    emailQueue,
    webhookQueue,
    syncQueue,
    notificationQueue,
    analyticsQueue,
  ].filter((q): q is Queue => q !== null);

  await Promise.all(queues.map((q) => q.close()));
}

process.on('SIGTERM', async () => {
  console.log('Queues: Shutting down...');
  await closeQueues();
});
