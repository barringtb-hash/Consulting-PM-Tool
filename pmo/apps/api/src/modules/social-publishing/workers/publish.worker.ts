/**
 * Social Publishing Worker
 *
 * BullMQ worker that processes social media publishing jobs.
 * Handles both immediate and scheduled post publishing across platforms.
 *
 * Responsibilities:
 * - Process publish jobs from the social-publishing queue
 * - Execute cross-platform publishing via Ayrshare adapter
 * - Update post status and platform results in database
 * - Create publishing history records
 * - Handle retries with exponential backoff
 *
 * @module social-publishing/workers/publish
 */

import { Worker, Job } from 'bullmq';
import { redis } from '../../../cache/redis.client';
import { prisma } from '../../../prisma/client';
import { AyrshareAdapter } from '../adapters/unified/ayrshare.adapter';
import {
  SocialPublishingJobData,
  addMetricsSyncJob,
  scheduleMetricsSyncJob,
} from '../../../queue/queue.config';
import {
  PublishStatus,
  PublishingPlatform,
  PlatformPublishResult,
  MediaType,
} from '../types';
import { Prisma } from '@prisma/client';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of retry attempts before marking as permanently failed */
const _MAX_RETRIES = 3;

/** Base delay for exponential backoff in milliseconds */
const _BASE_RETRY_DELAY_MS = 60000; // 1 minute

// ============================================================================
// TYPES
// ============================================================================

/**
 * Logger interface for worker operations
 */
interface WorkerLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console logger implementation
 */
const defaultLogger: WorkerLogger = {
  debug: (msg, ctx) => console.debug(`[PublishWorker] ${msg}`, ctx || ''),
  info: (msg, ctx) => console.info(`[PublishWorker] ${msg}`, ctx || ''),
  warn: (msg, ctx) => console.warn(`[PublishWorker] ${msg}`, ctx || ''),
  error: (msg, ctx) => console.error(`[PublishWorker] ${msg}`, ctx || ''),
};

// ============================================================================
// WORKER FACTORY
// ============================================================================

/**
 * Creates and configures the social publishing worker.
 *
 * The worker processes jobs from the 'social-publishing' queue and
 * handles the complete publishing workflow including:
 * - Fetching post and configuration data
 * - Publishing to target platforms via adapter
 * - Updating database records with results
 * - Creating publishing history entries
 * - Scheduling metrics sync for published posts
 *
 * @param logger - Optional custom logger implementation
 * @returns Configured Worker instance or null if Redis is not available
 *
 * @example
 * ```typescript
 * // Create and start the worker
 * const worker = createPublishWorker();
 *
 * if (worker) {
 *   worker.on('completed', (job) => {
 *     console.log(`Job ${job.id} completed successfully`);
 *   });
 *
 *   worker.on('failed', (job, err) => {
 *     console.error(`Job ${job?.id} failed:`, err.message);
 *   });
 * }
 * ```
 */
export function createPublishWorker(
  logger: WorkerLogger = defaultLogger,
): Worker<SocialPublishingJobData> | null {
  if (!redis) {
    logger.warn('Redis not configured, publish worker disabled');
    return null;
  }

  const worker = new Worker<SocialPublishingJobData>(
    'social-publishing',
    async (job: Job<SocialPublishingJobData>) => {
      const { tenantId, postId, platforms, immediate } = job.data;

      logger.info('Processing publish job', {
        jobId: job.id,
        tenantId,
        postId,
        platforms,
        immediate,
        attemptNumber: job.attemptsMade + 1,
      });

      // Step 1: Fetch post and validate state
      const post = await prisma.socialMediaPost.findFirst({
        where: {
          id: postId,
          tenantId,
        },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found for tenant ${tenantId}`);
      }

      // Validate post is in a publishable state
      const publishableStates: PublishStatus[] = [
        'DRAFT',
        'SCHEDULED',
        'FAILED',
      ];
      if (!publishableStates.includes(post.status as PublishStatus)) {
        logger.warn('Post not in publishable state, skipping', {
          postId,
          currentStatus: post.status,
        });
        return { success: false, reason: 'Post not in publishable state' };
      }

      // Step 2: Fetch tenant configuration
      const config = await prisma.socialPublishingConfig.findUnique({
        where: { tenantId },
      });

      if (!config) {
        throw new Error(
          `Social publishing not configured for tenant ${tenantId}`,
        );
      }

      // Step 3: Update post status to PUBLISHING
      await prisma.socialMediaPost.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHING',
          lastAttemptAt: new Date(),
        },
      });

      try {
        // Step 4: Create adapter and execute publish
        const adapter = new AyrshareAdapter(config.apiKey);

        // Determine which platforms to publish to
        // Use platforms from job data if provided, otherwise use post's target platforms
        const targetPlatforms =
          platforms.length > 0
            ? (platforms as PublishingPlatform[])
            : post.targetPlatforms;

        const result = await adapter.publish(
          {
            content: post.text,
            platforms: targetPlatforms,
            media: post.mediaUrls.map((url) => ({
              url,
              type: MediaType.IMAGE,
            })),
            hashtags: post.hashtags,
            linkUrl: post.linkUrl || undefined,
            shortenLinks: config.shortenUrls,
          },
          config.profileKey || undefined,
        );

        // Step 5: Determine overall status from platform results
        const allSucceeded = result.platformResults.every((r) => r.success);
        const someSucceeded = result.platformResults.some((r) => r.success);

        const newStatus: PublishStatus = allSucceeded
          ? 'PUBLISHED'
          : someSucceeded
            ? 'PARTIALLY_PUBLISHED'
            : 'FAILED';

        // Step 6: Update post with results
        const updatedPost = await prisma.socialMediaPost.update({
          where: { id: postId },
          data: {
            status: newStatus,
            publishedAt: allSucceeded || someSucceeded ? new Date() : null,
            platformResults:
              result.platformResults as unknown as Prisma.InputJsonValue,
            retryCount: allSucceeded ? post.retryCount : post.retryCount + 1,
            nextRetryAt: calculateNextRetryTime(
              post.retryCount + 1,
              post.maxRetries,
            ),
          },
        });

        // Step 7: Create publishing history entries
        await createPublishingHistoryEntries(
          tenantId,
          postId,
          result.platformResults,
        );

        // Step 8: Schedule metrics sync for successfully published posts
        if (allSucceeded || someSucceeded) {
          await scheduleMetricsSyncForPost(tenantId, postId);
        }

        logger.info('Publish job completed', {
          jobId: job.id,
          postId,
          status: newStatus,
          successfulPlatforms: result.platformResults.filter((r) => r.success)
            .length,
          failedPlatforms: result.platformResults.filter((r) => !r.success)
            .length,
        });

        return {
          success: result.success,
          postId: updatedPost.id,
          status: newStatus,
          platformResults: result.platformResults,
        };
      } catch (error) {
        // Handle publish failure
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        logger.error('Publish job failed', {
          jobId: job.id,
          postId,
          error: errorMessage,
          attemptsMade: job.attemptsMade + 1,
        });

        // Update post with failure status
        const nextRetryTime = calculateNextRetryTime(
          post.retryCount + 1,
          post.maxRetries,
        );

        await prisma.socialMediaPost.update({
          where: { id: postId },
          data: {
            status: 'FAILED',
            retryCount: post.retryCount + 1,
            nextRetryAt: nextRetryTime,
          },
        });

        // Create failure history entries for all target platforms
        await createPublishingHistoryEntries(
          tenantId,
          postId,
          post.targetPlatforms.map((platform) => ({
            platform,
            success: false,
            error: errorMessage,
          })),
        );

        // Re-throw to trigger BullMQ retry mechanism
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10, // Maximum 10 jobs
        duration: 1000, // Per second (rate limiting)
      },
    },
  );

  // Register worker event handlers
  worker.on('completed', (job) => {
    logger.info('Job completed successfully', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      jobId: job?.id,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  logger.info('Publish worker created and listening');

  return worker;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create publishing history entries for each platform result.
 *
 * @param tenantId - The tenant identifier
 * @param postId - The post identifier
 * @param platformResults - Results from the publishing operation
 */
async function createPublishingHistoryEntries(
  tenantId: string,
  postId: number,
  platformResults: PlatformPublishResult[],
): Promise<void> {
  const entries = platformResults.map((result) => ({
    tenantId,
    postId,
    platform: result.platform,
    externalPostId: result.postId || null,
    postUrl: result.postUrl || null,
    status: result.success
      ? ('PUBLISHED' as PublishStatus)
      : ('FAILED' as PublishStatus),
    error: result.error || null,
    publishedAt: result.publishedAt || null,
  }));

  await prisma.publishingHistory.createMany({
    data: entries,
  });
}

/**
 * Calculate the next retry time using exponential backoff.
 *
 * @param retryCount - Current retry count
 * @param maxRetries - Maximum number of retries allowed
 * @returns Next retry timestamp or null if max retries exceeded
 */
function calculateNextRetryTime(
  retryCount: number,
  maxRetries: number,
): Date | null {
  if (retryCount >= maxRetries) {
    return null;
  }

  // Exponential backoff: 1min, 5min, 15min, etc.
  const delayMinutes = Math.pow(5, retryCount);
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);

  return nextRetry;
}

/**
 * Schedule metrics sync for a successfully published post.
 *
 * @param tenantId - The tenant identifier
 * @param postId - The post identifier
 */
async function scheduleMetricsSyncForPost(
  tenantId: string,
  postId: number,
): Promise<void> {
  try {
    // Add an immediate metrics sync (after 5 minutes to allow platforms to update)
    await addMetricsSyncJob({ tenantId, postId });

    // Schedule recurring metrics sync (every 6 hours)
    await scheduleMetricsSyncJob(tenantId, postId);
  } catch (error) {
    // Log but don't fail the publish job if metrics scheduling fails
    console.warn('Failed to schedule metrics sync:', error);
  }
}

export default createPublishWorker;
