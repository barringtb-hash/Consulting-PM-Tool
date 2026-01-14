/**
 * Social Publishing Validation Schemas
 *
 * Zod schemas for validating social media publishing API requests.
 * These schemas ensure type safety and data validation at the API boundary.
 */

import { z } from 'zod';

/**
 * Supported social media platforms
 */
export const SocialPlatformEnum = z.enum([
  'twitter',
  'facebook',
  'instagram',
  'linkedin',
  'threads',
  'tiktok',
  'youtube',
  'pinterest',
]);

export type SocialPlatform = z.infer<typeof SocialPlatformEnum>;

/**
 * Post status values
 */
export const PostStatusEnum = z.enum([
  'draft',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled',
]);

export type PostStatus = z.infer<typeof PostStatusEnum>;

// ============================================================================
// Configuration Schemas
// ============================================================================

/**
 * Schema for creating or updating tenant configuration
 */
export const configCreateUpdateSchema = z.object({
  ayrshareApiKey: z.string().min(1, 'API key is required'),
  ayrshareProfileKey: z.string().optional(),
  defaultPlatforms: z.array(SocialPlatformEnum).optional(),
  webhookUrl: z.string().url().optional(),
  autoPublish: z.boolean().optional().default(false),
  timezone: z.string().optional().default('UTC'),
});

export type ConfigCreateUpdateInput = z.infer<typeof configCreateUpdateSchema>;

// ============================================================================
// Post Schemas
// ============================================================================

/**
 * Media attachment schema
 */
export const mediaAttachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video', 'gif']),
  altText: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export type MediaAttachment = z.infer<typeof mediaAttachmentSchema>;

/**
 * Platform-specific content overrides
 */
export const platformContentSchema = z.object({
  platform: SocialPlatformEnum,
  content: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
});

export type PlatformContent = z.infer<typeof platformContentSchema>;

/**
 * Schema for creating a new post
 */
export const postCreateSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
  platforms: z
    .array(SocialPlatformEnum)
    .min(1, 'At least one platform is required'),
  mediaUrls: z.array(z.string().url()).optional(),
  media: z.array(mediaAttachmentSchema).optional(),
  scheduledFor: z.string().datetime().optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  platformContent: z.array(platformContentSchema).optional(),
  linkUrl: z.string().url().optional(),
  campaignId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  isDraft: z.boolean().optional().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;

/**
 * Schema for updating an existing post
 */
export const postUpdateSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  platforms: z.array(SocialPlatformEnum).min(1).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  media: z.array(mediaAttachmentSchema).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  platformContent: z.array(platformContentSchema).optional(),
  linkUrl: z.string().url().nullable().optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  isDraft: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PostUpdateInput = z.infer<typeof postUpdateSchema>;

/**
 * Schema for listing posts with filters
 */
export const postListQuerySchema = z.object({
  status: PostStatusEnum.optional(),
  platform: SocialPlatformEnum.optional(),
  campaignId: z.coerce.number().int().positive().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  isDraft: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['createdAt', 'scheduledFor', 'publishedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PostListQuery = z.infer<typeof postListQuerySchema>;

// ============================================================================
// Publishing Action Schemas
// ============================================================================

/**
 * Schema for publishing a post immediately
 */
export const publishNowSchema = z.object({
  platforms: z.array(SocialPlatformEnum).optional(),
});

export type PublishNowInput = z.infer<typeof publishNowSchema>;

/**
 * Schema for scheduling a post
 */
export const schedulePostSchema = z.object({
  scheduledFor: z.string().datetime(),
  platforms: z.array(SocialPlatformEnum).optional(),
  timezone: z.string().optional(),
});

export type SchedulePostInput = z.infer<typeof schedulePostSchema>;

/**
 * Schema for cancelling a scheduled post
 */
export const cancelPostSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CancelPostInput = z.infer<typeof cancelPostSchema>;

// ============================================================================
// Metrics and History Schemas
// ============================================================================

/**
 * Schema for metrics query parameters
 */
export const metricsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  platform: SocialPlatformEnum.optional(),
  refresh: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;

/**
 * Schema for history query parameters
 */
export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

// ============================================================================
// Platform Sync Schema
// ============================================================================

/**
 * Schema for platform sync request
 */
export const platformSyncSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
});

export type PlatformSyncInput = z.infer<typeof platformSyncSchema>;
