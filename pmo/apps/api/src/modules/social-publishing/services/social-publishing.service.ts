/**
 * Social Publishing Service
 *
 * Orchestrates social media publishing operations using Prisma for persistence
 * and the Ayrshare adapter for cross-platform publishing.
 *
 * This service handles:
 * - Configuration management (API keys, connected platforms)
 * - Post CRUD operations
 * - Publishing and scheduling workflows
 * - Metrics synchronization
 *
 * @module social-publishing/services
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { AyrshareAdapter } from '../adapters/unified/ayrshare.adapter';
import {
  SocialPublishingConfig,
  SocialMediaPost,
  PublishingHistory,
  PublishStatus,
  ConnectedPlatform,
  CreateConfigInput,
  UpdateConfigInput,
  CreatePostInput,
  UpdatePostInput,
  PostFilters,
  ServicePublishResult,
  PlatformPublishResult,
  PublishingError,
  PublishingErrorType,
  MediaType,
} from '../types';

// ============================================================================
// CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Get the social publishing configuration for a tenant.
 *
 * @param tenantId - The tenant identifier
 * @returns The configuration or null if not found
 */
export async function getConfig(
  tenantId: string,
): Promise<SocialPublishingConfig | null> {
  return prisma.socialPublishingConfig.findUnique({
    where: { tenantId },
  });
}

/**
 * Create a new social publishing configuration for a tenant.
 *
 * @param tenantId - The tenant identifier
 * @param data - Configuration input data
 * @returns The created configuration
 * @throws Error if configuration already exists
 */
export async function createConfig(
  tenantId: string,
  data: CreateConfigInput,
): Promise<SocialPublishingConfig> {
  // Check if config already exists
  const existing = await getConfig(tenantId);
  if (existing) {
    throw new PublishingError(
      'Configuration already exists for this tenant',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Validate credentials before saving
  const adapter = new AyrshareAdapter(data.apiKey);
  const isValid = await adapter.validateCredentials(data.profileKey);

  if (!isValid) {
    throw new PublishingError(
      'Invalid API credentials',
      PublishingErrorType.AUTH_ERROR,
    );
  }

  // Get initial connected platforms
  const connectedPlatforms = await adapter.getConnectedPlatforms(
    data.profileKey,
  );

  return prisma.socialPublishingConfig.create({
    data: {
      tenantId,
      provider: data.provider || 'ayrshare',
      apiKey: data.apiKey,
      profileKey: data.profileKey,
      defaultTimezone: data.defaultTimezone || 'UTC',
      autoHashtags: data.autoHashtags ?? false,
      shortenUrls: data.shortenUrls ?? true,
      connectedPlatforms:
        connectedPlatforms as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Update an existing social publishing configuration.
 *
 * @param tenantId - The tenant identifier
 * @param data - Configuration update data
 * @returns The updated configuration
 * @throws Error if configuration not found
 */
export async function updateConfig(
  tenantId: string,
  data: UpdateConfigInput,
): Promise<SocialPublishingConfig> {
  const existing = await getConfig(tenantId);
  if (!existing) {
    throw new PublishingError(
      'Configuration not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // If API key is being updated, validate the new credentials
  if (data.apiKey) {
    const adapter = new AyrshareAdapter(data.apiKey);
    const isValid = await adapter.validateCredentials(
      data.profileKey || existing.profileKey || undefined,
    );

    if (!isValid) {
      throw new PublishingError(
        'Invalid API credentials',
        PublishingErrorType.AUTH_ERROR,
      );
    }
  }

  return prisma.socialPublishingConfig.update({
    where: { tenantId },
    data: {
      ...(data.apiKey && { apiKey: data.apiKey }),
      ...(data.profileKey !== undefined && { profileKey: data.profileKey }),
      ...(data.defaultTimezone && { defaultTimezone: data.defaultTimezone }),
      ...(data.autoHashtags !== undefined && {
        autoHashtags: data.autoHashtags,
      }),
      ...(data.shortenUrls !== undefined && { shortenUrls: data.shortenUrls }),
    },
  });
}

/**
 * Sync connected platforms from the unified API provider.
 *
 * @param tenantId - The tenant identifier
 * @returns Updated list of connected platforms
 * @throws Error if configuration not found
 */
export async function syncConnectedPlatforms(
  tenantId: string,
): Promise<ConnectedPlatform[]> {
  const config = await getConfig(tenantId);
  if (!config) {
    throw new PublishingError(
      'Configuration not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  const adapter = new AyrshareAdapter(config.apiKey);
  const platforms = await adapter.getConnectedPlatforms(
    config.profileKey || undefined,
  );

  // Update the configuration with the synced platforms
  await prisma.socialPublishingConfig.update({
    where: { tenantId },
    data: {
      connectedPlatforms: platforms as unknown as Prisma.InputJsonValue,
    },
  });

  return platforms;
}

// ============================================================================
// POST CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new social media post.
 *
 * @param tenantId - The tenant identifier
 * @param userId - The user creating the post
 * @param data - Post input data
 * @returns The created post
 */
export async function createPost(
  tenantId: string,
  userId: number,
  data: CreatePostInput,
): Promise<SocialMediaPost> {
  // Validate that config exists
  const config = await getConfig(tenantId);
  if (!config) {
    throw new PublishingError(
      'Social publishing not configured for this tenant',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Determine initial status
  const status: PublishStatus = data.scheduledFor ? 'SCHEDULED' : 'DRAFT';

  return prisma.socialMediaPost.create({
    data: {
      tenantId,
      text: data.text,
      contentId: data.contentId,
      mediaUrls: data.mediaUrls || [],
      linkUrl: data.linkUrl,
      hashtags: data.hashtags || [],
      targetPlatforms: data.targetPlatforms,
      scheduledFor: data.scheduledFor,
      status,
      createdById: userId,
    },
  });
}

/**
 * Get a single post by ID.
 *
 * @param postId - The post identifier
 * @param tenantId - The tenant identifier
 * @returns The post or null if not found
 */
export async function getPost(
  postId: number,
  tenantId: string,
): Promise<SocialMediaPost | null> {
  return prisma.socialMediaPost.findFirst({
    where: {
      id: postId,
      tenantId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      content: {
        select: { id: true, name: true },
      },
      history: true,
    },
  });
}

/**
 * List posts with optional filters.
 *
 * @param tenantId - The tenant identifier
 * @param filters - Optional filter parameters
 * @returns Array of posts matching the filters
 */
export async function listPosts(
  tenantId: string,
  filters?: PostFilters,
): Promise<SocialMediaPost[]> {
  const {
    status,
    targetPlatform,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters || {};

  // Build date filter if provided
  let createdAtFilter: Prisma.DateTimeFilter | undefined;
  if (startDate || endDate) {
    createdAtFilter = {};
    if (startDate) createdAtFilter.gte = startDate;
    if (endDate) createdAtFilter.lte = endDate;
  }

  const where: Prisma.SocialMediaPostWhereInput = {
    tenantId,
    ...(status && { status }),
    ...(targetPlatform && { targetPlatforms: { has: targetPlatform } }),
    ...(createdAtFilter && { createdAt: createdAtFilter }),
    ...(search && {
      OR: [
        { text: { contains: search, mode: 'insensitive' } },
        { hashtags: { has: search.replace('#', '') } },
      ],
    }),
  };

  return prisma.socialMediaPost.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      content: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Update an existing post.
 *
 * @param postId - The post identifier
 * @param tenantId - The tenant identifier
 * @param data - Post update data
 * @returns The updated post
 * @throws Error if post not found or in invalid state
 */
export async function updatePost(
  postId: number,
  tenantId: string,
  data: UpdatePostInput,
): Promise<SocialMediaPost> {
  const existing = await getPost(postId, tenantId);
  if (!existing) {
    throw new PublishingError(
      'Post not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Only allow updates to DRAFT or SCHEDULED posts
  if (!['DRAFT', 'SCHEDULED'].includes(existing.status)) {
    throw new PublishingError(
      `Cannot update post in ${existing.status} status`,
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Determine new status if scheduledFor is being updated
  let newStatus = existing.status;
  if (data.scheduledFor !== undefined) {
    newStatus = data.scheduledFor ? 'SCHEDULED' : 'DRAFT';
  }

  return prisma.socialMediaPost.update({
    where: { id: postId },
    data: {
      ...(data.text !== undefined && { text: data.text }),
      ...(data.mediaUrls !== undefined && { mediaUrls: data.mediaUrls }),
      ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
      ...(data.hashtags !== undefined && { hashtags: data.hashtags }),
      ...(data.targetPlatforms !== undefined && {
        targetPlatforms: data.targetPlatforms,
      }),
      ...(data.scheduledFor !== undefined && {
        scheduledFor: data.scheduledFor,
        status: newStatus,
      }),
    },
  });
}

/**
 * Delete a post.
 *
 * @param postId - The post identifier
 * @param tenantId - The tenant identifier
 * @throws Error if post not found
 */
export async function deletePost(
  postId: number,
  tenantId: string,
): Promise<void> {
  const existing = await getPost(postId, tenantId);
  if (!existing) {
    throw new PublishingError(
      'Post not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // If post was published, attempt to delete from platforms
  if (existing.status === 'PUBLISHED' && existing.platformResults) {
    const config = await getConfig(tenantId);
    if (config) {
      try {
        const adapter = new AyrshareAdapter(config.apiKey);
        const results = existing.platformResults as Array<{ postId: string }>;
        const postIds = results.map((r) => r.postId).filter(Boolean);

        if (postIds.length > 0) {
          await adapter.deletePost(postIds[0], existing.targetPlatforms);
        }
      } catch (error) {
        // Log error but continue with deletion
        console.error('Failed to delete post from platforms:', error);
      }
    }
  }

  await prisma.socialMediaPost.delete({
    where: { id: postId },
  });
}

// ============================================================================
// PUBLISHING FUNCTIONS
// ============================================================================

/**
 * Publish a post immediately to all target platforms.
 *
 * @param postId - The post identifier
 * @param tenantId - The tenant identifier
 * @returns The publish result with per-platform status
 * @throws Error if post not found or not in valid state
 */
export async function publishPost(
  postId: number,
  tenantId: string,
): Promise<ServicePublishResult> {
  const post = await getPost(postId, tenantId);
  if (!post) {
    throw new PublishingError(
      'Post not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Only allow publishing from DRAFT or SCHEDULED status
  if (!['DRAFT', 'SCHEDULED'].includes(post.status)) {
    throw new PublishingError(
      `Cannot publish post in ${post.status} status`,
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  const config = await getConfig(tenantId);
  if (!config) {
    throw new PublishingError(
      'Social publishing not configured',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Update status to PUBLISHING
  await prisma.socialMediaPost.update({
    where: { id: postId },
    data: {
      status: 'PUBLISHING',
      lastAttemptAt: new Date(),
    },
  });

  try {
    const adapter = new AyrshareAdapter(config.apiKey);

    // Build the publish request
    const result = await adapter.publish(
      {
        content: post.text,
        platforms: post.targetPlatforms,
        media: post.mediaUrls.map((url) => ({ url, type: MediaType.IMAGE })),
        hashtags: post.hashtags,
        linkUrl: post.linkUrl || undefined,
        shortenLinks: config.shortenUrls,
      },
      config.profileKey || undefined,
    );

    // Determine overall status
    const allSucceeded = result.platformResults.every((r) => r.success);
    const someSucceeded = result.platformResults.some((r) => r.success);
    const newStatus: PublishStatus = allSucceeded
      ? 'PUBLISHED'
      : someSucceeded
        ? 'PARTIALLY_PUBLISHED'
        : 'FAILED';

    // Update post with results
    const updatedPost = await prisma.socialMediaPost.update({
      where: { id: postId },
      data: {
        status: newStatus,
        publishedAt: allSucceeded || someSucceeded ? new Date() : null,
        platformResults:
          result.platformResults as unknown as Prisma.InputJsonValue,
        retryCount: { increment: allSucceeded ? 0 : 1 },
      },
    });

    // Create publishing history entries
    await createPublishingHistoryEntries(
      tenantId,
      postId,
      result.platformResults,
    );

    return {
      success: result.success,
      post: updatedPost,
      platformResults: result.platformResults,
      error: allSucceeded ? undefined : 'Some platforms failed to publish',
    };
  } catch (error) {
    // Update post with failure status
    const updatedPost = await prisma.socialMediaPost.update({
      where: { id: postId },
      data: {
        status: 'FAILED',
        retryCount: { increment: 1 },
        nextRetryAt: calculateNextRetryTime(
          post.retryCount + 1,
          post.maxRetries,
        ),
      },
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      post: updatedPost,
      platformResults: post.targetPlatforms.map((platform) => ({
        platform,
        success: false,
        error: errorMessage,
      })),
      error: errorMessage,
    };
  }
}

/**
 * Schedule a post for future publication.
 *
 * @param postId - The post identifier
 * @param tenantId - The tenant identifier
 * @param scheduledFor - The date/time to publish
 * @returns The updated post
 * @throws Error if post not found or not in valid state
 */
export async function schedulePost(
  postId: number,
  tenantId: string,
  scheduledFor: Date,
): Promise<SocialMediaPost> {
  const post = await getPost(postId, tenantId);
  if (!post) {
    throw new PublishingError(
      'Post not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Only allow scheduling from DRAFT status
  if (post.status !== 'DRAFT') {
    throw new PublishingError(
      `Cannot schedule post in ${post.status} status`,
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  // Validate scheduled time is in the future
  if (scheduledFor <= new Date()) {
    throw new PublishingError(
      'Scheduled time must be in the future',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  return prisma.socialMediaPost.update({
    where: { id: postId },
    data: {
      scheduledFor,
      status: 'SCHEDULED',
    },
  });
}

/**
 * Cancel a scheduled post.
 *
 * @param postId - The post identifier
 * @param tenantId - The tenant identifier
 * @returns The updated post
 * @throws Error if post not found or not scheduled
 */
export async function cancelScheduledPost(
  postId: number,
  tenantId: string,
): Promise<SocialMediaPost> {
  const post = await getPost(postId, tenantId);
  if (!post) {
    throw new PublishingError(
      'Post not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  if (post.status !== 'SCHEDULED') {
    throw new PublishingError(
      'Post is not scheduled',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  return prisma.socialMediaPost.update({
    where: { id: postId },
    data: {
      scheduledFor: null,
      status: 'DRAFT',
    },
  });
}

// ============================================================================
// HISTORY & METRICS FUNCTIONS
// ============================================================================

/**
 * Get publishing history for a post.
 *
 * @param postId - The post identifier
 * @returns Array of publishing history entries
 */
export async function getPublishingHistory(
  postId: number,
): Promise<PublishingHistory[]> {
  return prisma.publishingHistory.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Sync engagement metrics for a published post.
 *
 * @param postId - The post identifier
 */
export async function syncPostMetrics(postId: number): Promise<void> {
  const post = await prisma.socialMediaPost.findUnique({
    where: { id: postId },
    include: {
      history: true,
    },
  });

  if (!post || !post.tenantId) {
    throw new PublishingError(
      'Post not found',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  if (post.status !== 'PUBLISHED' && post.status !== 'PARTIALLY_PUBLISHED') {
    throw new PublishingError(
      'Post has not been published',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  const config = await getConfig(post.tenantId);
  if (!config) {
    throw new PublishingError(
      'Social publishing not configured',
      PublishingErrorType.INVALID_CONTENT,
    );
  }

  const adapter = new AyrshareAdapter(config.apiKey);

  // Update metrics for each published platform
  for (const historyEntry of post.history) {
    if (historyEntry.status !== 'PUBLISHED' || !historyEntry.externalPostId) {
      continue;
    }

    try {
      const metrics = await adapter.getPostMetrics(historyEntry.externalPostId);

      await prisma.publishingHistory.update({
        where: { id: historyEntry.id },
        data: {
          impressions: metrics.impressions,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          clicks: metrics.clicks,
          lastMetricSync: new Date(),
        },
      });
    } catch (error) {
      // Log error but continue with other platforms
      console.error(
        `Failed to sync metrics for ${historyEntry.platform}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Create publishing history entries for each platform result.
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
 */
function calculateNextRetryTime(
  retryCount: number,
  maxRetries: number,
): Date | null {
  if (retryCount >= maxRetries) {
    return null;
  }

  // Exponential backoff: 5min, 15min, 45min, etc.
  const delayMinutes = 5 * Math.pow(3, retryCount - 1);
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);

  return nextRetry;
}
