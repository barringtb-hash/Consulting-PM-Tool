/**
 * Social Publishing Module Types
 *
 * Type definitions for social media publishing hooks and API interactions.
 * These types mirror the backend API contracts for type-safe frontend operations.
 *
 * @module social-publishing/types
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Supported social media platforms
 */
export type SocialPlatform =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'threads'
  | 'tiktok'
  | 'youtube'
  | 'pinterest';

/**
 * Post status values
 */
export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

/**
 * Publishing platform enum (Prisma-compatible)
 */
export type PublishingPlatform =
  | 'LINKEDIN'
  | 'TWITTER'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'THREADS'
  | 'PINTEREST'
  | 'YOUTUBE'
  | 'BLUESKY';

/**
 * Publish status enum (Prisma-compatible)
 */
export type PublishStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Social publishing configuration for a tenant
 */
export interface SocialPublishingConfig {
  id: number;
  tenantId: string;
  ayrshareApiKey?: string;
  ayrshareProfileKey?: string;
  defaultPlatforms?: SocialPlatform[];
  webhookUrl?: string;
  autoPublish: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating or updating configuration
 */
export interface ConfigCreateUpdateInput {
  ayrshareApiKey: string;
  ayrshareProfileKey?: string;
  defaultPlatforms?: SocialPlatform[];
  webhookUrl?: string;
  autoPublish?: boolean;
  timezone?: string;
}

/**
 * Connected platform information
 */
export interface ConnectedPlatform {
  platform: PublishingPlatform;
  accountId: string;
  accountName: string;
  connected: boolean;
  lastSync?: string;
  username?: string;
  displayName?: string;
  profileImageUrl?: string;
  profileId?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Post Types
// ============================================================================

/**
 * Media attachment for posts
 */
export interface MediaAttachment {
  url: string;
  type: 'image' | 'video' | 'gif';
  altText?: string;
  thumbnailUrl?: string;
}

/**
 * Platform-specific content overrides
 */
export interface PlatformContent {
  platform: SocialPlatform;
  content?: string;
  hashtags?: string[];
  mentions?: string[];
}

/**
 * Social media post entity
 */
export interface SocialPost {
  id: number;
  tenantId: string;
  content: string;
  platforms: SocialPlatform[];
  mediaUrls?: string[];
  media?: MediaAttachment[];
  scheduledFor?: string | null;
  publishedAt?: string | null;
  hashtags?: string[];
  mentions?: string[];
  platformContent?: PlatformContent[];
  linkUrl?: string | null;
  campaignId?: number | null;
  clientId?: number | null;
  projectId?: number | null;
  isDraft: boolean;
  status: PostStatus;
  metadata?: Record<string, unknown>;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Input for creating a new post
 */
export interface PostCreateInput {
  content: string;
  platforms: SocialPlatform[];
  mediaUrls?: string[];
  media?: MediaAttachment[];
  scheduledFor?: string;
  hashtags?: string[];
  mentions?: string[];
  platformContent?: PlatformContent[];
  linkUrl?: string;
  campaignId?: number;
  clientId?: number;
  projectId?: number;
  isDraft?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating an existing post
 */
export interface PostUpdateInput {
  content?: string;
  platforms?: SocialPlatform[];
  mediaUrls?: string[];
  media?: MediaAttachment[];
  scheduledFor?: string | null;
  hashtags?: string[];
  mentions?: string[];
  platformContent?: PlatformContent[];
  linkUrl?: string | null;
  campaignId?: number | null;
  isDraft?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Filters for listing posts
 */
export interface PostFilters {
  status?: PostStatus;
  platform?: SocialPlatform;
  campaignId?: number;
  clientId?: number;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  isDraft?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'scheduledFor' | 'publishedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated posts response
 */
export interface PostsListResponse {
  posts: SocialPost[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Publishing Action Types
// ============================================================================

/**
 * Platform-specific publish result
 */
export interface PlatformResult {
  platform: PublishingPlatform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  errorCode?: string;
  publishedAt?: string;
}

/**
 * Input for publishing a post immediately
 */
export interface PublishNowInput {
  platforms?: SocialPlatform[];
}

/**
 * Response from immediate publish action
 */
export interface PublishResponse {
  post: SocialPost;
  publishedAt: string;
  platformResults: PlatformResult[];
}

/**
 * Input for scheduling a post
 */
export interface SchedulePostInput {
  scheduledFor: string;
  platforms?: SocialPlatform[];
  timezone?: string;
}

/**
 * Response from schedule action
 */
export interface ScheduleResponse {
  post: SocialPost;
  scheduledFor: string;
}

/**
 * Input for cancelling a scheduled post
 */
export interface CancelPostInput {
  reason?: string;
}

/**
 * Response from cancel action
 */
export interface CancelResponse {
  post: SocialPost;
  cancelledAt: string;
}

// ============================================================================
// Metrics and History Types
// ============================================================================

/**
 * Post engagement metrics
 */
export interface PostMetrics {
  platform: PublishingPlatform;
  postId: string;
  impressions?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  engagementRate?: number;
  reach?: number;
  video?: {
    watchTime?: number;
    averageViewDuration?: number;
    completionRate?: number;
  };
  updatedAt: string;
  raw?: Record<string, unknown>;
}

/**
 * Aggregated metrics response
 */
export interface MetricsResponse {
  metrics: PostMetrics[];
  lastUpdated: string;
}

/**
 * Query parameters for metrics
 */
export interface MetricsQuery {
  startDate?: string;
  endDate?: string;
  platform?: SocialPlatform;
  refresh?: boolean;
}

/**
 * Publishing history entry
 */
export interface HistoryEntry {
  id: number;
  postId: number;
  action: string;
  platform?: PublishingPlatform;
  status: string;
  details?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  createdById?: number;
}

/**
 * History response
 */
export interface HistoryResponse {
  history: HistoryEntry[];
  total: number;
}

/**
 * Query parameters for history
 */
export interface HistoryQuery {
  limit?: number;
  offset?: number;
}

// ============================================================================
// Platform Sync Types
// ============================================================================

/**
 * Input for platform sync
 */
export interface PlatformSyncInput {
  forceRefresh?: boolean;
}

/**
 * Platform sync response
 */
export interface PlatformSyncResponse {
  platforms: ConnectedPlatform[];
  syncedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard config response wrapper
 */
export interface ConfigResponse {
  config: SocialPublishingConfig | null;
}

/**
 * Standard platforms response wrapper
 */
export interface PlatformsResponse {
  platforms: ConnectedPlatform[];
}

/**
 * Standard post response wrapper
 */
export interface PostResponse {
  post: SocialPost;
}
