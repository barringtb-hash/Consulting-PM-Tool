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
// SOCIAL PUBLISHING QUEUES
// ============================================================================

/**
 * Social Publishing Queue
 * Handles executing scheduled and immediate social media posts.
 * Uses exponential backoff: 1min, 5min, 15min for retries.
 */
export const socialPublishingQueue = isQueueEnabled
  ? new Queue('social-publishing', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: {
          type: 'exponential' as const,
          delay: 60000, // 1 minute initial delay
        },
      },
    })
  : null;

/**
 * Token Refresh Queue
 * Handles refreshing OAuth tokens before they expire.
 * Higher retry count to ensure token refresh succeeds.
 */
export const tokenRefreshQueue = isQueueEnabled
  ? new Queue('token-refresh', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 5,
        backoff: {
          type: 'exponential' as const,
          delay: 30000, // 30 seconds initial delay
        },
      },
    })
  : null;

/**
 * Metrics Sync Queue
 * Handles syncing engagement metrics from social platforms.
 * Runs periodically (every 6 hours) to update post metrics.
 */
export const metricsSyncQueue = isQueueEnabled
  ? new Queue('metrics-sync', {
      connection: redis!,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: {
          type: 'exponential' as const,
          delay: 60000, // 1 minute initial delay
        },
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
export const socialPublishingQueueEvents = isQueueEnabled
  ? new QueueEvents('social-publishing', { connection: redisBullMQ! })
  : null;
export const tokenRefreshQueueEvents = isQueueEnabled
  ? new QueueEvents('token-refresh', { connection: redisBullMQ! })
  : null;
export const metricsSyncQueueEvents = isQueueEnabled
  ? new QueueEvents('metrics-sync', { connection: redisBullMQ! })
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
// SOCIAL PUBLISHING JOB DATA TYPES
// ============================================================================

/**
 * Job data for publishing social media posts.
 * Supports both scheduled and immediate publishing.
 */
export interface SocialPublishingJobData {
  /** Tenant identifier for multi-tenancy */
  tenantId: string;
  /** The social media post ID to publish */
  postId: number;
  /** Target platforms for this publish job */
  platforms: string[];
  /** Whether to publish immediately or as scheduled */
  immediate: boolean;
}

/**
 * Job data for refreshing OAuth tokens.
 * Tokens should be refreshed before they expire.
 */
export interface TokenRefreshJobData {
  /** Tenant identifier for multi-tenancy */
  tenantId: string;
  /** The platform connection ID to refresh */
  connectionId: number;
  /** The social platform (e.g., 'TWITTER', 'LINKEDIN') */
  platform: string;
}

/**
 * Job data for syncing engagement metrics from platforms.
 * Metrics include likes, comments, shares, impressions, etc.
 */
export interface MetricsSyncJobData {
  /** Tenant identifier for multi-tenancy */
  tenantId: string;
  /** The social media post ID to sync metrics for */
  postId: number;
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
// SOCIAL PUBLISHING HELPER FUNCTIONS
// ============================================================================

/**
 * Add a social publishing job for immediate or scheduled publishing.
 * Returns null if queues are not available.
 *
 * @param data - Job data including tenant, post, platforms, and timing
 * @param options - Optional job options like delay for scheduled posts
 */
export async function addSocialPublishingJob(
  data: SocialPublishingJobData,
  options?: { delay?: number; scheduledFor?: Date },
) {
  if (!socialPublishingQueue) return null;

  // Calculate delay if scheduledFor is provided
  let delay = options?.delay;
  if (options?.scheduledFor && !delay) {
    const now = new Date();
    delay = Math.max(0, options.scheduledFor.getTime() - now.getTime());
  }

  return socialPublishingQueue.add('publish-post', data, {
    delay,
    jobId: `social-publish-${data.postId}-${Date.now()}`,
  });
}

/**
 * Add a token refresh job for OAuth token renewal.
 * Returns null if queues are not available.
 *
 * @param data - Job data including tenant, connection, and platform
 * @param options - Optional job options like delay for scheduling refresh
 */
export async function addTokenRefreshJob(
  data: TokenRefreshJobData,
  options?: { delay?: number },
) {
  if (!tokenRefreshQueue) return null;

  return tokenRefreshQueue.add('refresh-token', data, {
    delay: options?.delay,
    jobId: `token-refresh-${data.connectionId}-${data.platform}`,
  });
}

/**
 * Add a metrics sync job for a published post.
 * Returns null if queues are not available.
 *
 * @param data - Job data including tenant and post ID
 */
export async function addMetricsSyncJob(data: MetricsSyncJobData) {
  if (!metricsSyncQueue) return null;

  return metricsSyncQueue.add('sync-metrics', data, {
    jobId: `metrics-sync-${data.postId}-${Date.now()}`,
  });
}

/**
 * Schedule recurring metrics sync for all published posts of a tenant.
 * Runs every 6 hours by default.
 * Returns null if queues are not available.
 *
 * @param tenantId - The tenant identifier
 * @param postId - The post to sync metrics for
 */
export async function scheduleMetricsSyncJob(tenantId: string, postId: number) {
  if (!metricsSyncQueue) return null;

  return metricsSyncQueue.add(
    'sync-metrics',
    { tenantId, postId },
    {
      repeat: {
        pattern: '0 */6 * * *', // Every 6 hours
      },
      jobId: `metrics-sync-recurring-${postId}`,
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
    socialPublishingQueue,
    tokenRefreshQueue,
    metricsSyncQueue,
  ].filter((q): q is Queue => q !== null);

  await Promise.all(queues.map((q) => q.close()));
}

process.on('SIGTERM', async () => {
  console.log('Queues: Shutting down...');
  await closeQueues();
});
