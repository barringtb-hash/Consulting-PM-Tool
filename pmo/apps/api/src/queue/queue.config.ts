/**
 * Bull Queue Configuration
 *
 * Job queues for async processing:
 * - Document processing
 * - Email sending
 * - Webhook delivery
 * - Integration sync
 * - Notifications
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redis } from '../cache/redis.client';
import { env } from '../config/env';

// Queue connection options
const connection = {
  connection: redis,
};

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
// QUEUE DEFINITIONS
// ============================================================================

/**
 * Document Processing Queue
 * Handles OCR, extraction, and analysis
 */
export const documentQueue = new Queue('document-processing', {
  ...connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2, // Documents shouldn't retry too much
  },
});

/**
 * Email Sending Queue
 * Handles transactional and notification emails
 */
export const emailQueue = new Queue('email-sending', {
  ...connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5, // More retries for emails
  },
});

/**
 * Webhook Delivery Queue
 * Handles outgoing webhook deliveries
 */
export const webhookQueue = new Queue('webhook-delivery', {
  ...connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
  },
});

/**
 * Integration Sync Queue
 * Handles sync with external systems
 */
export const syncQueue = new Queue('integration-sync', {
  ...connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
  },
});

/**
 * Notification Queue
 * Handles multi-channel notification delivery
 */
export const notificationQueue = new Queue('notifications', {
  ...connection,
  defaultJobOptions,
});

/**
 * Analytics Aggregation Queue
 * Handles periodic analytics calculations
 */
export const analyticsQueue = new Queue('analytics', {
  ...connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
  },
});

// ============================================================================
// QUEUE EVENTS
// ============================================================================

export const documentQueueEvents = new QueueEvents('document-processing', connection);
export const emailQueueEvents = new QueueEvents('email-sending', connection);
export const webhookQueueEvents = new QueueEvents('webhook-delivery', connection);
export const syncQueueEvents = new QueueEvents('integration-sync', connection);
export const notificationQueueEvents = new QueueEvents('notifications', connection);

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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add a document processing job.
 */
export async function addDocumentJob(data: DocumentJobData, options?: { priority?: number }) {
  return documentQueue.add('process-document', data, {
    priority: options?.priority,
    jobId: `doc-${data.documentId}-${data.operation}`,
  });
}

/**
 * Add an email sending job.
 */
export async function addEmailJob(data: EmailJobData) {
  return emailQueue.add('send-email', data);
}

/**
 * Add a webhook delivery job.
 */
export async function addWebhookJob(data: WebhookJobData) {
  return webhookQueue.add('deliver-webhook', data, {
    jobId: `webhook-${data.webhookId}-${Date.now()}`,
  });
}

/**
 * Add an integration sync job.
 */
export async function addSyncJob(data: SyncJobData, options?: { delay?: number }) {
  return syncQueue.add('sync', data, {
    delay: options?.delay,
    jobId: data.fullSync
      ? `sync-full-${data.integrationId}`
      : `sync-${data.integrationId}-${data.entityType}-${data.entityId}`,
  });
}

/**
 * Add a notification delivery job.
 */
export async function addNotificationJob(data: NotificationJobData) {
  return notificationQueue.add('deliver-notification', data, {
    jobId: `notif-${data.notificationId}-${data.channel}`,
  });
}

/**
 * Schedule recurring analytics job.
 */
export async function scheduleAnalyticsJob(
  tenantId: string,
  metric: string,
  period: 'daily' | 'weekly' | 'monthly',
) {
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
  await Promise.all([
    documentQueue.close(),
    emailQueue.close(),
    webhookQueue.close(),
    syncQueue.close(),
    notificationQueue.close(),
    analyticsQueue.close(),
  ]);
}

process.on('SIGTERM', async () => {
  console.log('Queues: Shutting down...');
  await closeQueues();
});
