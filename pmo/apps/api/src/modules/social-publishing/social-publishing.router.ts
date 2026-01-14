/**
 * Social Publishing Router
 *
 * Express router for social media publishing API endpoints.
 * Handles configuration, post management, publishing actions, and metrics.
 *
 * All endpoints require authentication and tenant context.
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  TenantRequest,
} from '../../tenant/tenant.middleware';
import * as socialPublishingService from './services/social-publishing.service';
import { PublishingError, PublishingErrorType } from './types';
import {
  configCreateUpdateSchema,
  postCreateSchema,
  postUpdateSchema,
  postListQuerySchema,
  publishNowSchema,
  schedulePostSchema,
  cancelPostSchema,
  metricsQuerySchema,
  historyQuerySchema,
  platformSyncSchema,
} from './validation/social-publishing.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract tenant ID from request context.
 * Falls back to header or user-based resolution.
 */
function getTenantId(req: TenantRequest): string | undefined {
  return req.tenantContext?.tenantId;
}

/**
 * Parse and validate numeric ID from route parameters.
 * Returns null if invalid.
 */
function parseId(idParam: string | string[] | undefined): number | null {
  const id = parseInt(String(idParam), 10);
  return isNaN(id) || id <= 0 ? null : id;
}

/**
 * Convert lowercase platform name to uppercase Prisma enum value.
 */
function toPrismaPublishingPlatform(
  platform: string,
):
  | 'LINKEDIN'
  | 'TWITTER'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'PINTEREST'
  | 'THREADS'
  | 'BLUESKY' {
  return platform.toUpperCase() as
    | 'LINKEDIN'
    | 'TWITTER'
    | 'INSTAGRAM'
    | 'FACEBOOK'
    | 'TIKTOK'
    | 'YOUTUBE'
    | 'PINTEREST'
    | 'THREADS'
    | 'BLUESKY';
}

/**
 * Convert lowercase status name to uppercase Prisma enum value.
 */
function toPrismaPublishStatus(
  status: string,
):
  | 'DRAFT'
  | 'PENDING'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'PARTIALLY_PUBLISHED' {
  const statusMap: Record<
    string,
    | 'DRAFT'
    | 'PENDING'
    | 'SCHEDULED'
    | 'PUBLISHING'
    | 'PUBLISHED'
    | 'FAILED'
    | 'PARTIALLY_PUBLISHED'
  > = {
    draft: 'DRAFT',
    pending: 'PENDING',
    scheduled: 'SCHEDULED',
    publishing: 'PUBLISHING',
    published: 'PUBLISHED',
    failed: 'FAILED',
    cancelled: 'DRAFT', // Map cancelled to draft for filter purposes
  };
  return statusMap[status] || 'DRAFT';
}

/**
 * Map PublishingError types to HTTP responses.
 */
function handlePublishingError(res: Response, error: unknown): void {
  if (error instanceof PublishingError) {
    const errorMap: Record<
      PublishingErrorType,
      { status: number; code: string }
    > = {
      [PublishingErrorType.AUTH_ERROR]: { status: 401, code: 'unauthorized' },
      [PublishingErrorType.RATE_LIMIT]: { status: 429, code: 'rate_limited' },
      [PublishingErrorType.INVALID_CONTENT]: {
        status: 400,
        code: 'invalid_content',
      },
      [PublishingErrorType.MEDIA_ERROR]: { status: 400, code: 'media_error' },
      [PublishingErrorType.PLATFORM_UNAVAILABLE]: {
        status: 503,
        code: 'platform_unavailable',
      },
      [PublishingErrorType.PLATFORM_NOT_CONNECTED]: {
        status: 400,
        code: 'platform_not_connected',
      },
      [PublishingErrorType.NETWORK_ERROR]: {
        status: 502,
        code: 'network_error',
      },
      [PublishingErrorType.UNKNOWN_ERROR]: {
        status: 500,
        code: 'unknown_error',
      },
    };

    const errorInfo = errorMap[error.type] || {
      status: 500,
      code: 'unknown_error',
    };

    res.status(errorInfo.status).json({
      error: errorInfo.code,
      message: error.message,
      platform: error.platform,
    });
    return;
  }

  // Handle regular errors
  const message =
    error instanceof Error ? error.message : 'Internal server error';

  // Check for common error patterns in message
  if (message.includes('not found') || message.includes('Not found')) {
    res.status(404).json({ error: 'not_found', message });
    return;
  }

  res.status(500).json({
    error: 'internal_error',
    message,
  });
}

// ============================================================================
// Configuration Endpoints
// ============================================================================

/**
 * GET /api/social-publishing/config
 * Get tenant social publishing configuration.
 */
router.get(
  '/config',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    try {
      const config = await socialPublishingService.getConfig(tenantId);
      res.json({ config });
    } catch (error) {
      console.error('Error getting social publishing config:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * POST /api/social-publishing/config
 * Create or update tenant social publishing configuration.
 */
router.post(
  '/config',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const parsed = configCreateUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid configuration data',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      // Check if config exists to decide create vs update
      const existing = await socialPublishingService.getConfig(tenantId);

      // Map schema fields to service fields
      const configData = {
        apiKey: parsed.data.ayrshareApiKey,
        profileKey: parsed.data.ayrshareProfileKey,
        defaultTimezone: parsed.data.timezone,
        provider: 'ayrshare',
      };

      let config;
      if (existing) {
        config = await socialPublishingService.updateConfig(
          tenantId,
          configData,
        );
      } else {
        config = await socialPublishingService.createConfig(
          tenantId,
          configData,
        );
      }

      res.status(existing ? 200 : 201).json({ config });
    } catch (error) {
      console.error('Error saving social publishing config:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * GET /api/social-publishing/platforms
 * List connected social media platforms for the tenant.
 */
router.get(
  '/platforms',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    try {
      const config = await socialPublishingService.getConfig(tenantId);
      const platforms = config?.connectedPlatforms || [];
      res.json({ platforms });
    } catch (error) {
      console.error('Error getting platforms:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * POST /api/social-publishing/platforms/sync
 * Sync connected platforms from Ayrshare.
 */
router.post(
  '/platforms/sync',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const parsed = platformSyncSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid sync parameters',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const platforms =
        await socialPublishingService.syncConnectedPlatforms(tenantId);
      res.json({
        platforms,
        syncedAt: new Date(),
      });
    } catch (error) {
      console.error('Error syncing platforms:', error);
      handlePublishingError(res, error);
    }
  },
);

// ============================================================================
// Post Management Endpoints
// ============================================================================

/**
 * GET /api/social-publishing/posts
 * List posts with optional filters.
 */
router.get(
  '/posts',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const parsed = postListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid query parameters',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      // Map schema fields to service filter fields
      const filters = {
        status: parsed.data.status
          ? toPrismaPublishStatus(parsed.data.status)
          : undefined,
        targetPlatform: parsed.data.platform
          ? toPrismaPublishingPlatform(parsed.data.platform)
          : undefined,
        startDate: parsed.data.startDate
          ? new Date(parsed.data.startDate)
          : undefined,
        endDate: parsed.data.endDate
          ? new Date(parsed.data.endDate)
          : undefined,
        search: parsed.data.search,
        page: parsed.data.offset
          ? Math.floor(parsed.data.offset / (parsed.data.limit || 50)) + 1
          : 1,
        limit: parsed.data.limit || 50,
        sortBy: parsed.data.sortBy as
          | 'createdAt'
          | 'scheduledFor'
          | 'publishedAt'
          | undefined,
        sortOrder: parsed.data.sortOrder as 'asc' | 'desc' | undefined,
      };

      const posts = await socialPublishingService.listPosts(tenantId, filters);

      res.json({
        posts,
        total: posts.length, // Real total would need a separate count query
        limit: parsed.data.limit || 50,
        offset: parsed.data.offset || 0,
      });
    } catch (error) {
      console.error('Error listing posts:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * POST /api/social-publishing/posts
 * Create a new social media post.
 */
router.post(
  '/posts',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const parsed = postCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid post data',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      // Map schema fields to service input fields, converting platform names to uppercase
      const postData = {
        text: parsed.data.content,
        mediaUrls: parsed.data.mediaUrls,
        linkUrl: parsed.data.linkUrl,
        hashtags: parsed.data.hashtags,
        targetPlatforms: parsed.data.platforms.map(toPrismaPublishingPlatform),
        scheduledFor: parsed.data.scheduledFor
          ? new Date(parsed.data.scheduledFor)
          : undefined,
      };

      const post = await socialPublishingService.createPost(
        tenantId,
        req.userId,
        postData,
      );

      res.status(201).json({ post });
    } catch (error) {
      console.error('Error creating post:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * GET /api/social-publishing/posts/:id
 * Get a single post by ID.
 */
router.get(
  '/posts/:id',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    try {
      const post = await socialPublishingService.getPost(postId, tenantId);

      if (!post) {
        res
          .status(404)
          .json({ error: 'post_not_found', message: 'Post not found' });
        return;
      }

      res.json({ post });
    } catch (error) {
      console.error('Error getting post:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * PATCH /api/social-publishing/posts/:id
 * Update an existing post.
 */
router.patch(
  '/posts/:id',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    const parsed = postUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid post data',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      // Map schema fields to service input fields
      const updateData = {
        text: parsed.data.content,
        mediaUrls: parsed.data.mediaUrls,
        linkUrl: parsed.data.linkUrl === null ? undefined : parsed.data.linkUrl,
        hashtags: parsed.data.hashtags,
        targetPlatforms: parsed.data.platforms?.map(toPrismaPublishingPlatform),
        scheduledFor:
          parsed.data.scheduledFor === null
            ? undefined
            : parsed.data.scheduledFor
              ? new Date(parsed.data.scheduledFor)
              : undefined,
      };

      const post = await socialPublishingService.updatePost(
        postId,
        tenantId,
        updateData,
      );

      res.json({ post });
    } catch (error) {
      console.error('Error updating post:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * DELETE /api/social-publishing/posts/:id
 * Delete a post.
 */
router.delete(
  '/posts/:id',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    try {
      await socialPublishingService.deletePost(postId, tenantId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting post:', error);
      handlePublishingError(res, error);
    }
  },
);

// ============================================================================
// Publishing Action Endpoints
// ============================================================================

/**
 * POST /api/social-publishing/posts/:id/publish
 * Publish a post immediately.
 */
router.post(
  '/posts/:id/publish',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    const parsed = publishNowSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid publish parameters',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const result = await socialPublishingService.publishPost(
        postId,
        tenantId,
      );

      res.json({
        post: result.post,
        publishedAt: result.post.publishedAt,
        platformResults: result.platformResults,
        success: result.success,
      });
    } catch (error) {
      console.error('Error publishing post:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * POST /api/social-publishing/posts/:id/schedule
 * Schedule a post for later publishing.
 */
router.post(
  '/posts/:id/schedule',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    const parsed = schedulePostSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid schedule parameters',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const scheduledFor = new Date(parsed.data.scheduledFor);
      const post = await socialPublishingService.schedulePost(
        postId,
        tenantId,
        scheduledFor,
      );

      res.json({
        post,
        scheduledFor: post.scheduledFor,
      });
    } catch (error) {
      console.error('Error scheduling post:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * POST /api/social-publishing/posts/:id/cancel
 * Cancel a scheduled post.
 */
router.post(
  '/posts/:id/cancel',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    const parsed = cancelPostSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid cancel parameters',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const post = await socialPublishingService.cancelScheduledPost(
        postId,
        tenantId,
      );

      res.json({
        post,
        cancelledAt: new Date(),
      });
    } catch (error) {
      console.error('Error cancelling post:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * DELETE /api/social-publishing/posts/:id/schedule
 * Cancel a scheduled post (alternative endpoint using DELETE method).
 * This is an alias for POST /posts/:id/cancel for RESTful semantics.
 */
router.delete(
  '/posts/:id/schedule',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    try {
      const post = await socialPublishingService.cancelScheduledPost(
        postId,
        tenantId,
      );

      res.json({
        post,
        cancelledAt: new Date(),
      });
    } catch (error) {
      console.error('Error cancelling scheduled post:', error);
      handlePublishingError(res, error);
    }
  },
);

// ============================================================================
// Metrics and History Endpoints
// ============================================================================

/**
 * GET /api/social-publishing/posts/:id/metrics
 * Get engagement metrics for a published post.
 */
router.get(
  '/posts/:id/metrics',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    const parsed = metricsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid query parameters',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      // Verify post belongs to tenant
      const post = await socialPublishingService.getPost(postId, tenantId);
      if (!post) {
        res
          .status(404)
          .json({ error: 'post_not_found', message: 'Post not found' });
        return;
      }

      // Optionally sync metrics if refresh requested
      if (parsed.data.refresh) {
        await socialPublishingService.syncPostMetrics(postId);
      }

      // Get history entries which contain metrics
      const history =
        await socialPublishingService.getPublishingHistory(postId);
      const metrics = history
        .filter((h) => h.status === 'PUBLISHED')
        .map((h) => ({
          platform: h.platform,
          impressions: h.impressions || 0,
          likes: h.likes || 0,
          comments: h.comments || 0,
          shares: h.shares || 0,
          clicks: h.clicks || 0,
          lastUpdated: h.lastMetricSync || h.createdAt,
        }));

      res.json({
        metrics,
        lastUpdated: metrics.length > 0 ? metrics[0].lastUpdated : null,
      });
    } catch (error) {
      console.error('Error getting post metrics:', error);
      handlePublishingError(res, error);
    }
  },
);

/**
 * GET /api/social-publishing/posts/:id/history
 * Get publishing history for a post.
 */
router.get(
  '/posts/:id/history',
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res
        .status(400)
        .json({ error: 'tenant_required', message: 'Tenant context required' });
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      res.status(400).json({ error: 'invalid_id', message: 'Invalid post ID' });
      return;
    }

    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid query parameters',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      // Verify post belongs to tenant
      const post = await socialPublishingService.getPost(postId, tenantId);
      if (!post) {
        res
          .status(404)
          .json({ error: 'post_not_found', message: 'Post not found' });
        return;
      }

      const history =
        await socialPublishingService.getPublishingHistory(postId);

      res.json({
        history,
        total: history.length,
      });
    } catch (error) {
      console.error('Error getting post history:', error);
      handlePublishingError(res, error);
    }
  },
);

export default router;
