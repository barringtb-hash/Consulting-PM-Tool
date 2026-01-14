/**
 * Scheduled Post Worker
 *
 * BullMQ worker that runs on a schedule to check for posts that need to be published.
 * Scans for SCHEDULED posts whose scheduledFor time has passed and queues them for publishing.
 *
 * Responsibilities:
 * - Run on a cron schedule (every minute by default)
 * - Find posts ready for publishing
 * - Queue publish jobs for ready posts
 * - Handle timezone considerations
 * - Prevent duplicate processing
 *
 * @module social-publishing/workers/scheduled-post
 */

import { Worker, Job, Queue } from 'bullmq';
import { redis } from '../../../cache/redis.client';
import { prisma } from '../../../prisma/client';
import {
  SocialPublishingJobData,
  socialPublishingQueue,
} from '../../../queue/queue.config';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default batch size for processing scheduled posts */
const DEFAULT_BATCH_SIZE = 50;

/** Lock duration in milliseconds to prevent duplicate processing */
const LOCK_DURATION_MS = 60000; // 1 minute

/** Lock key prefix for Redis distributed locking */
const LOCK_KEY_PREFIX = 'social-publish:scheduled-scan:';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Job data for scheduled post scanning
 */
export interface ScheduledPostScanJobData {
  /** Optional tenant ID to limit scan to specific tenant */
  tenantId?: string;
  /** Batch size for processing */
  batchSize?: number;
  /** Whether this is a manual trigger (bypasses time check) */
  manual?: boolean;
}

/**
 * Result of scheduled post scan
 */
export interface ScheduledPostScanResult {
  /** Number of posts found ready for publishing */
  postsFound: number;
  /** Number of posts successfully queued */
  postsQueued: number;
  /** Number of posts that failed to queue */
  postsFailed: number;
  /** IDs of queued posts */
  queuedPostIds: number[];
  /** Error details if any */
  errors?: string[];
}

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
  debug: (msg, ctx) => console.debug(`[ScheduledPostWorker] ${msg}`, ctx || ''),
  info: (msg, ctx) => console.info(`[ScheduledPostWorker] ${msg}`, ctx || ''),
  warn: (msg, ctx) => console.warn(`[ScheduledPostWorker] ${msg}`, ctx || ''),
  error: (msg, ctx) => console.error(`[ScheduledPostWorker] ${msg}`, ctx || ''),
};

// ============================================================================
// SCHEDULED POST SCANNER QUEUE
// ============================================================================

/**
 * Queue for scheduled post scanning jobs.
 * This queue runs on a cron schedule to find and process scheduled posts.
 */
export const scheduledPostScanQueue = redis
  ? new Queue<ScheduledPostScanJobData>('scheduled-post-scan', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10 seconds
        },
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 500,
        },
      },
    })
  : null;

// ============================================================================
// WORKER FACTORY
// ============================================================================

/**
 * Creates and configures the scheduled post scanning worker.
 *
 * This worker runs on a schedule to find posts whose scheduledFor time
 * has passed and queues them for publishing via the main publish worker.
 *
 * @param logger - Optional custom logger implementation
 * @returns Configured Worker instance or null if Redis is not available
 *
 * @example
 * ```typescript
 * // Create and start the worker
 * const worker = createScheduledPostWorker();
 *
 * if (worker) {
 *   // Set up the recurring scan job
 *   await setupScheduledPostScanning();
 * }
 * ```
 */
export function createScheduledPostWorker(
  logger: WorkerLogger = defaultLogger,
): Worker<ScheduledPostScanJobData> | null {
  if (!redis) {
    logger.warn('Redis not configured, scheduled post worker disabled');
    return null;
  }

  const worker = new Worker<ScheduledPostScanJobData>(
    'scheduled-post-scan',
    async (
      job: Job<ScheduledPostScanJobData>,
    ): Promise<ScheduledPostScanResult> => {
      const {
        tenantId,
        batchSize = DEFAULT_BATCH_SIZE,
        manual = false,
      } = job.data;

      logger.info('Starting scheduled post scan', {
        jobId: job.id,
        tenantId: tenantId || 'all',
        batchSize,
        manual,
      });

      // Acquire distributed lock to prevent duplicate scans
      const lockKey = `${LOCK_KEY_PREFIX}${tenantId || 'all'}`;
      const lockAcquired = await acquireLock(lockKey, LOCK_DURATION_MS);

      if (!lockAcquired && !manual) {
        logger.debug('Scan already in progress, skipping', { lockKey });
        return {
          postsFound: 0,
          postsQueued: 0,
          postsFailed: 0,
          queuedPostIds: [],
        };
      }

      try {
        // Find posts ready for publishing
        const now = new Date();
        const readyPosts = await prisma.socialMediaPost.findMany({
          where: {
            status: 'SCHEDULED',
            scheduledFor: {
              lte: now,
            },
            ...(tenantId && { tenantId }),
          },
          take: batchSize,
          orderBy: {
            scheduledFor: 'asc', // Process oldest first
          },
          select: {
            id: true,
            tenantId: true,
            targetPlatforms: true,
          },
        });

        logger.info('Found scheduled posts ready for publishing', {
          count: readyPosts.length,
          tenantId: tenantId || 'all',
        });

        if (readyPosts.length === 0) {
          return {
            postsFound: 0,
            postsQueued: 0,
            postsFailed: 0,
            queuedPostIds: [],
          };
        }

        // Queue each post for publishing
        const queuedPostIds: number[] = [];
        const errors: string[] = [];

        for (const post of readyPosts) {
          // Skip posts without a valid tenantId
          if (!post.tenantId) {
            logger.warn('Skipping post without tenantId', { postId: post.id });
            errors.push(`Post ${post.id}: Missing tenantId`);
            continue;
          }

          try {
            await queuePostForPublishing({
              id: post.id,
              tenantId: post.tenantId,
              targetPlatforms: post.targetPlatforms as string[],
            });
            queuedPostIds.push(post.id);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Post ${post.id}: ${errorMessage}`);
            logger.error('Failed to queue post', {
              postId: post.id,
              error: errorMessage,
            });
          }
        }

        const result: ScheduledPostScanResult = {
          postsFound: readyPosts.length,
          postsQueued: queuedPostIds.length,
          postsFailed: errors.length,
          queuedPostIds,
          ...(errors.length > 0 && { errors }),
        };

        logger.info('Scheduled post scan completed', {
          postsFound: result.postsFound,
          postsQueued: result.postsQueued,
          postsFailed: result.postsFailed,
        });

        return result;
      } finally {
        // Release the lock
        await releaseLock(lockKey);
      }
    },
    {
      connection: redis,
      concurrency: 1, // Only one scan job at a time
    },
  );

  // Register worker event handlers
  worker.on('completed', (job, result) => {
    logger.debug('Scan job completed', {
      jobId: job.id,
      postsQueued: result.postsQueued,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Scan job failed', {
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  logger.info('Scheduled post worker created and listening');

  return worker;
}

// ============================================================================
// SCHEDULING FUNCTIONS
// ============================================================================

/**
 * Sets up the recurring scheduled post scanning job.
 *
 * Creates a repeating job that runs every minute to check for
 * posts that are ready to be published.
 *
 * @param cronPattern - Cron pattern for the schedule (default: every minute)
 * @returns The created repeating job or null if queues are not available
 */
export async function setupScheduledPostScanning(
  cronPattern: string = '* * * * *', // Every minute
): Promise<Job<ScheduledPostScanJobData> | null> {
  if (!scheduledPostScanQueue) {
    console.warn('Scheduled post scan queue not available');
    return null;
  }

  // Remove any existing repeating jobs first
  const repeatableJobs = await scheduledPostScanQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'scan-scheduled-posts') {
      await scheduledPostScanQueue.removeRepeatableByKey(job.key);
    }
  }

  // Create the new repeating job
  return scheduledPostScanQueue.add(
    'scan-scheduled-posts',
    { batchSize: DEFAULT_BATCH_SIZE },
    {
      repeat: {
        pattern: cronPattern,
      },
      jobId: 'scheduled-post-scan-recurring',
    },
  );
}

/**
 * Triggers an immediate scheduled post scan.
 *
 * Useful for manual triggering or testing.
 *
 * @param tenantId - Optional tenant ID to limit scan
 * @returns The created job or null if queues are not available
 */
export async function triggerScheduledPostScan(
  tenantId?: string,
): Promise<Job<ScheduledPostScanJobData> | null> {
  if (!scheduledPostScanQueue) {
    console.warn('Scheduled post scan queue not available');
    return null;
  }

  return scheduledPostScanQueue.add(
    'scan-scheduled-posts-manual',
    {
      tenantId,
      manual: true,
    },
    {
      jobId: `scheduled-post-scan-manual-${Date.now()}`,
    },
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Queue a post for publishing via the main publishing queue.
 *
 * @param post - Post data to queue
 */
async function queuePostForPublishing(post: {
  id: number;
  tenantId: string;
  targetPlatforms: string[];
}): Promise<void> {
  if (!socialPublishingQueue) {
    throw new Error('Social publishing queue not available');
  }

  const jobData: SocialPublishingJobData = {
    tenantId: post.tenantId,
    postId: post.id,
    platforms: post.targetPlatforms,
    immediate: false, // Scheduled post, not immediate
  };

  await socialPublishingQueue.add('publish-scheduled-post', jobData, {
    jobId: `scheduled-publish-${post.id}-${Date.now()}`,
  });

  // Mark the post as being processed to prevent duplicate queuing
  await prisma.socialMediaPost.update({
    where: { id: post.id },
    data: {
      status: 'PUBLISHING',
      lastAttemptAt: new Date(),
    },
  });
}

/**
 * Acquire a distributed lock using Redis.
 *
 * @param key - Lock key
 * @param durationMs - Lock duration in milliseconds
 * @returns True if lock was acquired
 */
async function acquireLock(key: string, durationMs: number): Promise<boolean> {
  if (!redis) return true; // If no Redis, proceed without locking

  const result = await redis.set(key, '1', 'PX', durationMs, 'NX');
  return result === 'OK';
}

/**
 * Release a distributed lock.
 *
 * @param key - Lock key to release
 */
async function releaseLock(key: string): Promise<void> {
  if (!redis) return;

  await redis.del(key);
}

/**
 * Gets the status of the scheduled post scanning.
 *
 * @returns Status information about the scheduled post scanning
 */
export async function getScheduledPostScanStatus(): Promise<{
  isRunning: boolean;
  nextRun: Date | null;
  lastRun: Date | null;
  pendingPosts: number;
}> {
  if (!scheduledPostScanQueue) {
    return {
      isRunning: false,
      nextRun: null,
      lastRun: null,
      pendingPosts: 0,
    };
  }

  // Get repeatable jobs to find next run
  const repeatableJobs = await scheduledPostScanQueue.getRepeatableJobs();
  const scanJob = repeatableJobs.find((j) => j.name === 'scan-scheduled-posts');

  // Get completed jobs to find last run
  const completedJobs = await scheduledPostScanQueue.getCompleted(0, 1);
  const lastRun =
    completedJobs.length > 0
      ? new Date(completedJobs[0].finishedOn || 0)
      : null;

  // Count pending posts
  const pendingPosts = await prisma.socialMediaPost.count({
    where: {
      status: 'SCHEDULED',
      scheduledFor: {
        lte: new Date(),
      },
    },
  });

  // Check if any active jobs are running
  const activeJobs = await scheduledPostScanQueue.getActive();
  const isRunning = activeJobs.length > 0;

  return {
    isRunning,
    nextRun:
      scanJob && scanJob.next !== undefined ? new Date(scanJob.next) : null,
    lastRun,
    pendingPosts,
  };
}

export default createScheduledPostWorker;
