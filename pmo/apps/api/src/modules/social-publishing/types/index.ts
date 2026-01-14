/**
 * Social Publishing Types
 *
 * Type definitions for the social media publishing module.
 * Supports unified publishing across multiple platforms via adapters.
 *
 * @module social-publishing/types
 */

import {
  PublishingPlatform as PrismaPublishingPlatform,
  PublishStatus as PrismaPublishStatus,
  SocialPublishingConfig,
  SocialMediaPost,
  PublishingHistory,
} from '@prisma/client';

// Re-export Prisma types for convenience
export type { SocialPublishingConfig, SocialMediaPost, PublishingHistory };

// Use Prisma enums to ensure consistency
export const PublishingPlatform = PrismaPublishingPlatform;
export type PublishingPlatform = PrismaPublishingPlatform;

export const PublishStatus = PrismaPublishStatus;
export type PublishStatus = PrismaPublishStatus;

// ============================================================================
// AYRSHARE API TYPES
// ============================================================================

/**
 * Configuration for Ayrshare API connection
 */
export interface AyrshareConfig {
  /** Ayrshare API key */
  apiKey: string;
  /** Profile key for business accounts (optional) */
  profileKey?: string;
}

/**
 * Result of a media upload operation
 */
export interface MediaUploadResult {
  /** URL of the uploaded media */
  url: string;
  /** Unique identifier for the uploaded media */
  id: string;
  /** MIME type of the uploaded file */
  mimeType: string;
}

/**
 * Media type for attachments
 */
export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  GIF = 'GIF',
  DOCUMENT = 'DOCUMENT',
}

/**
 * Media attachment for social posts
 */
export interface MediaAttachment {
  /** URL of the media file */
  url: string;
  /** Type of media */
  type: MediaType;
  /** Alternative text for accessibility */
  altText?: string;
  /** Optional thumbnail URL */
  thumbnailUrl?: string;
  /** File size in bytes */
  size?: number;
  /** MIME type */
  mimeType?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Duration in seconds (for video) */
  duration?: number;
}

/**
 * Platform-specific options for publishing
 */
export interface PlatformOptions {
  /** LinkedIn-specific options */
  linkedin?: {
    /** Article URL for link posts */
    articleUrl?: string;
    /** Company page ID (for company posts) */
    companyId?: string;
    /** Visibility setting */
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  };
  /** Twitter-specific options */
  twitter?: {
    /** Reply to tweet ID */
    replyToId?: string;
    /** Quote tweet ID */
    quoteTweetId?: string;
    /** Poll options */
    poll?: {
      options: string[];
      durationMinutes: number;
    };
  };
  /** Instagram-specific options */
  instagram?: {
    /** Location ID */
    locationId?: string;
    /** Share to story */
    shareToStory?: boolean;
    /** First comment to add */
    firstComment?: string;
  };
  /** Facebook-specific options */
  facebook?: {
    /** Page ID */
    pageId?: string;
    /** Link URL */
    linkUrl?: string;
    /** Post to story */
    postToStory?: boolean;
  };
  /** TikTok-specific options */
  tiktok?: {
    /** Privacy level */
    privacyLevel?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    /** Allow comments */
    allowComments?: boolean;
    /** Allow duet */
    allowDuet?: boolean;
    /** Allow stitch */
    allowStitch?: boolean;
  };
  /** YouTube-specific options */
  youtube?: {
    /** Video title */
    title?: string;
    /** Video description */
    description?: string;
    /** Video tags */
    tags?: string[];
    /** Privacy status */
    privacyStatus?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    /** Category ID */
    categoryId?: string;
  };
}

/**
 * Request to publish content to social platforms
 */
export interface PublishRequest {
  /** Post content/caption (primary text) */
  content: string;
  /** Target platforms for publishing */
  platforms: PublishingPlatform[];
  /** Media attachments with full metadata */
  media?: MediaAttachment[];
  /** Platform-specific options */
  platformOptions?: PlatformOptions;
  /** Hashtags to include */
  hashtags?: string[];
  /** Mentions to include */
  mentions?: string[];
  /** Link URL to include in the post */
  linkUrl?: string;
  /** Shorten links automatically */
  shortenLinks?: boolean;
  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Result of publishing to a single platform
 */
export interface PlatformPublishResult {
  /** Platform where post was published */
  platform: PublishingPlatform;
  /** Whether publish was successful */
  success: boolean;
  /** Platform-specific post ID */
  postId?: string;
  /** URL to the published post */
  postUrl?: string;
  /** Error message if failed */
  error?: string;
  /** Error code from platform */
  errorCode?: string;
  /** Timestamp of publication */
  publishedAt?: Date;
}

/**
 * Overall result of a publish operation
 */
export interface PublishResult {
  /** Whether all platforms succeeded */
  success: boolean;
  /** Results per platform */
  platformResults: PlatformPublishResult[];
  /** Provider-specific reference ID */
  referenceId?: string;
  /** Timestamp of the operation */
  timestamp: Date;
}

/**
 * Connected platform information
 */
export interface ConnectedPlatform {
  /** Platform type */
  platform: PublishingPlatform;
  /** Platform-specific account ID */
  accountId: string;
  /** Display name for the account */
  accountName: string;
  /** Whether currently connected and authorized */
  connected: boolean;
  /** Last sync/verification timestamp */
  lastSync?: Date;
  /** Platform username/handle */
  username?: string;
  /** Profile display name (alias for accountName) */
  displayName?: string;
  /** Profile image URL */
  profileImageUrl?: string;
  /** Profile/page ID */
  profileId?: string;
  /** Connection expiration date */
  expiresAt?: Date;
  /** Additional platform metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Post engagement metrics
 */
export interface PostMetrics {
  /** Platform the metrics are from */
  platform: PublishingPlatform;
  /** Platform-specific post ID */
  postId: string;
  /** Number of impressions */
  impressions?: number;
  /** Number of views */
  views?: number;
  /** Number of likes/reactions */
  likes?: number;
  /** Number of comments */
  comments?: number;
  /** Number of shares/retweets */
  shares?: number;
  /** Number of saves/bookmarks */
  saves?: number;
  /** Number of clicks */
  clicks?: number;
  /** Engagement rate percentage */
  engagementRate?: number;
  /** Reach (unique viewers) */
  reach?: number;
  /** Video-specific metrics */
  video?: {
    /** Total watch time in seconds */
    watchTime?: number;
    /** Average view duration in seconds */
    averageViewDuration?: number;
    /** Completion rate percentage */
    completionRate?: number;
  };
  /** When metrics were last updated */
  updatedAt: Date;
  /** Raw response from provider */
  raw?: Record<string, unknown>;
}

/**
 * Aggregated metrics across platforms
 */
export interface AggregatedMetrics {
  /** Post reference ID */
  referenceId: string;
  /** Metrics by platform */
  platforms: PostMetrics[];
  /** Total impressions across platforms */
  totalImpressions: number;
  /** Total engagement (likes + comments + shares) */
  totalEngagement: number;
  /** Overall engagement rate */
  overallEngagementRate: number;
  /** When aggregation was computed */
  computedAt: Date;
}

/**
 * Publishing adapter interface
 * Implemented by unified API providers (Ayrshare, Buffer, etc.)
 */
export interface PublishingAdapter {
  /** Adapter name for identification */
  readonly name: string;

  /**
   * Publish content immediately to specified platforms
   */
  publish(request: PublishRequest, profileKey?: string): Promise<PublishResult>;

  /**
   * Schedule a post for future publication
   */
  schedulePost(
    request: PublishRequest,
    scheduledFor: Date,
    profileKey?: string,
  ): Promise<PublishResult>;

  /**
   * Delete a published post
   */
  deletePost(postId: string, platforms: PublishingPlatform[]): Promise<void>;

  /**
   * Get list of connected platforms
   */
  getConnectedPlatforms(profileKey?: string): Promise<ConnectedPlatform[]>;

  /**
   * Get metrics for a specific post
   */
  getPostMetrics(postId: string): Promise<PostMetrics>;
}

/**
 * Error types for publishing operations
 */
export enum PublishingErrorType {
  /** Authentication/authorization failed */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Rate limit exceeded */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Invalid content (too long, bad format, etc.) */
  INVALID_CONTENT = 'INVALID_CONTENT',
  /** Media upload failed */
  MEDIA_ERROR = 'MEDIA_ERROR',
  /** Platform temporarily unavailable */
  PLATFORM_UNAVAILABLE = 'PLATFORM_UNAVAILABLE',
  /** Platform not connected */
  PLATFORM_NOT_CONNECTED = 'PLATFORM_NOT_CONNECTED',
  /** Network/connection error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Unknown/unhandled error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Extended error types for more granular error handling
 * Maps to common social platform API error categories
 */
export enum PublishErrorType {
  /** Rate limit exceeded on platform API */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Network connectivity error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Server-side error from platform or provider */
  SERVER_ERROR = 'SERVER_ERROR',
  /** OAuth token expired or revoked */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** Content violates platform guidelines or format requirements */
  INVALID_CONTENT = 'INVALID_CONTENT',
  /** Account suspended or restricted */
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  /** Missing required permissions */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** Media file error (format, size, etc.) */
  MEDIA_ERROR = 'MEDIA_ERROR',
}

/**
 * Custom error class for publishing operations
 */
export class PublishingError extends Error {
  constructor(
    message: string,
    public readonly type: PublishingErrorType,
    public readonly platform?: PublishingPlatform,
    public readonly originalError?: Error,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'PublishingError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// SERVICE INPUT TYPES
// ============================================================================

/**
 * Input for creating a new social publishing configuration
 */
export interface CreateConfigInput {
  provider?: string;
  apiKey: string;
  profileKey?: string;
  defaultTimezone?: string;
  autoHashtags?: boolean;
  shortenUrls?: boolean;
}

/**
 * Input for updating an existing configuration
 */
export interface UpdateConfigInput {
  apiKey?: string;
  profileKey?: string;
  defaultTimezone?: string;
  autoHashtags?: boolean;
  shortenUrls?: boolean;
}

/**
 * Input for creating a new social media post
 */
export interface CreatePostInput {
  text: string;
  contentId?: number;
  mediaUrls?: string[];
  linkUrl?: string;
  hashtags?: string[];
  targetPlatforms: PublishingPlatform[];
  scheduledFor?: Date;
}

/**
 * Input for updating an existing post
 */
export interface UpdatePostInput {
  text?: string;
  mediaUrls?: string[];
  linkUrl?: string;
  hashtags?: string[];
  targetPlatforms?: PublishingPlatform[];
  scheduledFor?: Date;
}

/**
 * Filters for listing posts
 */
export interface PostFilters {
  status?: PublishStatus;
  targetPlatform?: PublishingPlatform;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'scheduledFor' | 'publishedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Post with computed fields and relations
 */
export interface PostWithRelations extends SocialMediaPost {
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
  content?: {
    id: number;
    name: string;
  } | null;
  history?: PublishingHistory[];
}

/**
 * Service-level publish result that includes the updated post
 */
export interface ServicePublishResult {
  success: boolean;
  post: SocialMediaPost;
  platformResults: PlatformPublishResult[];
  error?: string;
}

// ============================================================================
// PROVIDER CONFIGURATION TYPES
// ============================================================================

/**
 * Supported social publishing providers
 */
export type SocialPublishingProvider = 'ayrshare' | 'buffer' | 'publer';

/**
 * Extended tenant configuration for social publishing
 * Wraps the Prisma SocialPublishingConfig with additional runtime data
 */
export interface TenantSocialConfig {
  /** Tenant identifier */
  tenantId: string;
  /** Publishing provider (Ayrshare, Buffer, Publer) */
  provider: SocialPublishingProvider;
  /** Provider API key (encrypted in storage) */
  apiKey: string;
  /** Ayrshare profile key for business accounts */
  profileKey?: string;
  /** Connected platform accounts */
  connectedPlatforms: ConnectedPlatformInfo[];
  /** Default settings */
  defaultSettings?: PublishingDefaultSettings;
  /** Webhook URL for status callbacks */
  webhookUrl?: string;
  /** Whether the config is active */
  isActive?: boolean;
  /** Last sync timestamp */
  lastSyncAt?: Date;
}

/**
 * Default publishing settings
 */
export interface PublishingDefaultSettings {
  /** Default platforms to publish to */
  defaultPlatforms?: PublishingPlatform[];
  /** Auto-optimize content per platform */
  autoOptimize?: boolean;
  /** Include default hashtags */
  defaultHashtags?: string[];
  /** Default scheduling window (for best times feature) */
  schedulingWindow?: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
}

/**
 * Extended connected platform information with account details
 * Used when full account information is needed
 */
export interface ConnectedPlatformInfo {
  /** Platform type */
  platform: PublishingPlatform;
  /** Platform-specific account ID */
  accountId: string;
  /** Display name for the account */
  accountName: string;
  /** Whether currently connected and authorized */
  connected: boolean;
  /** Last sync/verification timestamp */
  lastSync?: Date;
  /** Username/handle on the platform */
  username?: string;
  /** Profile image URL */
  profileImageUrl?: string;
  /** Profile/page ID */
  profileId?: string;
  /** Connection expiration date */
  expiresAt?: Date;
  /** Platform-specific capabilities */
  capabilities?: PlatformCapabilities;
  /** Any connection errors */
  connectionError?: string;
  /** Additional platform metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Platform-specific capabilities
 */
export interface PlatformCapabilities {
  /** Supports image posts */
  supportsImages: boolean;
  /** Supports video posts */
  supportsVideos: boolean;
  /** Supports carousel/multiple images */
  supportsCarousel: boolean;
  /** Supports stories */
  supportsStories: boolean;
  /** Supports reels/shorts */
  supportsReels: boolean;
  /** Supports polls */
  supportsPolls: boolean;
  /** Supports scheduling */
  supportsScheduling: boolean;
  /** Supports link previews */
  supportsLinkPreview: boolean;
}

// ============================================================================
// MEDIA REQUIREMENTS TYPES
// ============================================================================

/**
 * Platform-specific media requirements and limits
 */
export interface MediaRequirements {
  /** Maximum number of images per post */
  maxImages: number;
  /** Maximum video length in seconds */
  maxVideoLength: number;
  /** Supported file formats (e.g., ['jpg', 'png', 'gif']) */
  supportedFormats: string[];
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Recommended image dimensions */
  recommendedDimensions?: ImageDimensions;
  /** Aspect ratio requirements */
  aspectRatios?: AspectRatioRequirement[];
}

/**
 * Image dimension specifications
 */
export interface ImageDimensions {
  /** Recommended width in pixels */
  width: number;
  /** Recommended height in pixels */
  height: number;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
}

/**
 * Aspect ratio requirement for media
 */
export interface AspectRatioRequirement {
  /** Ratio name (e.g., 'square', 'landscape', 'portrait') */
  name: string;
  /** Width ratio */
  widthRatio: number;
  /** Height ratio */
  heightRatio: number;
  /** Whether this ratio is required or optional */
  required: boolean;
}

/**
 * Media validation result
 */
export interface MediaValidationResult {
  /** Whether the media is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings (non-blocking issues) */
  warnings: string[];
  /** Suggested optimizations */
  suggestions: string[];
}

// ============================================================================
// CONTENT OPTIMIZATION TYPES
// ============================================================================

/**
 * Platform-optimized content result
 */
export interface OptimizedContent {
  /** Optimized text content */
  text: string;
  /** Processed hashtags */
  hashtags: string[];
  /** Current character count */
  characterCount: number;
  /** Whether content was truncated to fit limits */
  truncated: boolean;
  /** Original character count before truncation */
  originalCharacterCount?: number;
  /** Platform-specific formatting applied */
  formattingApplied?: string[];
}

/**
 * Content optimization options
 */
export interface ContentOptimizationOptions {
  /** Target platform for optimization */
  platform: PublishingPlatform;
  /** Whether to include hashtags in character count */
  includeHashtagsInCount?: boolean;
  /** Truncation strategy */
  truncationStrategy?: 'smart' | 'hard' | 'none';
  /** Preserve URLs when truncating */
  preserveUrls?: boolean;
  /** Maximum hashtags to include */
  maxHashtags?: number;
}

/**
 * Platform character limits
 */
export interface PlatformCharacterLimits {
  /** Platform */
  platform: PublishingPlatform;
  /** Maximum text length */
  maxLength: number;
  /** Whether URLs count against limit */
  urlsCountAgainstLimit: boolean;
  /** URL character cost (if fixed, e.g., Twitter's t.co) */
  urlCharacterCost?: number;
  /** Whether hashtags count against limit */
  hashtagsCountAgainstLimit: boolean;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Post analytics/metrics (simplified view)
 */
export interface PostAnalytics {
  /** Post identifier */
  postId: string;
  /** Platform */
  platform: PublishingPlatform;
  /** Number of impressions/views */
  impressions: number;
  /** Engagement count (likes, reactions) */
  engagements: number;
  /** Share/repost count */
  shares: number;
  /** Comment count */
  comments: number;
  /** Click count (if link post) */
  clicks?: number;
  /** Engagement rate (engagements / impressions) */
  engagementRate: number;
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Aggregated analytics across platforms
 */
export interface AggregatedAnalytics {
  /** Total impressions */
  totalImpressions: number;
  /** Total engagements */
  totalEngagements: number;
  /** Average engagement rate */
  averageEngagementRate: number;
  /** Best performing platform */
  topPlatform: PublishingPlatform | null;
  /** Per-platform breakdown */
  byPlatform: Partial<Record<PublishingPlatform, PostAnalytics>>;
}

// ============================================================================
// QUEUE TYPES
// ============================================================================

/**
 * Publishing queue item
 */
export interface QueuedPost {
  /** Queue item ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Content to publish */
  content: CreatePostInput;
  /** Current status */
  status: PublishStatus;
  /** Scheduled time */
  scheduledFor: Date;
  /** Retry count */
  retryCount: number;
  /** Maximum retries */
  maxRetries: number;
  /** Last error message */
  lastError?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  /** Total items in queue */
  total: number;
  /** Pending items */
  pending: number;
  /** Scheduled items */
  scheduled: number;
  /** Failed items */
  failed: number;
  /** Processing items */
  processing: number;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/**
 * Webhook payload from Ayrshare
 */
export interface AyrshareWebhookPayload {
  /** Webhook type */
  type: 'post' | 'analytics' | 'error';
  /** Post reference ID */
  refId?: string;
  /** Status update */
  status?: string;
  /** Platform results */
  platforms?: Array<{
    platform: string;
    status: string;
    postId?: string;
    postUrl?: string;
    error?: string;
  }>;
  /** Timestamp */
  timestamp: string;
}

// ============================================================================
// PLATFORM RESULT ALIAS
// ============================================================================

/**
 * Alias for PlatformPublishResult to match requested naming
 * PlatformResult is the preferred name in the request
 */
export type PlatformResult = PlatformPublishResult;

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Social publishing error codes
 */
export type SocialPublishingErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'PLATFORM_NOT_CONNECTED'
  | 'RATE_LIMITED'
  | 'CONTENT_REJECTED'
  | 'MEDIA_INVALID'
  | 'MEDIA_TOO_LARGE'
  | 'CHARACTER_LIMIT_EXCEEDED'
  | 'SCHEDULING_ERROR'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Social publishing error interface
 */
export interface SocialPublishingError {
  /** Error code */
  code: SocialPublishingErrorCode;
  /** Error message */
  message: string;
  /** Affected platform (if platform-specific) */
  platform?: PublishingPlatform;
  /** Original error from provider */
  originalError?: unknown;
  /** Retry eligible */
  retryable: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default media requirements by platform
 */
export const DEFAULT_MEDIA_REQUIREMENTS: Record<
  PublishingPlatform,
  MediaRequirements
> = {
  LINKEDIN: {
    maxImages: 9,
    maxVideoLength: 600, // 10 minutes
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4'],
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },
  TWITTER: {
    maxImages: 4,
    maxVideoLength: 140, // 2:20
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4'],
    maxFileSize: 15 * 1024 * 1024, // 15MB images, 512MB video
  },
  INSTAGRAM: {
    maxImages: 10,
    maxVideoLength: 60,
    supportedFormats: ['jpg', 'jpeg', 'png', 'mp4'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  FACEBOOK: {
    maxImages: 10,
    maxVideoLength: 14400, // 4 hours
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
    maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
  },
  TIKTOK: {
    maxImages: 0, // Video only
    maxVideoLength: 600, // 10 minutes
    supportedFormats: ['mp4', 'mov'],
    maxFileSize: 500 * 1024 * 1024, // 500MB
  },
  THREADS: {
    maxImages: 10,
    maxVideoLength: 300, // 5 minutes
    supportedFormats: ['jpg', 'jpeg', 'png', 'mp4'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  PINTEREST: {
    maxImages: 1,
    maxVideoLength: 900, // 15 minutes
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4'],
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
  YOUTUBE: {
    maxImages: 0, // Video only
    maxVideoLength: 43200, // 12 hours
    supportedFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
    maxFileSize: 256 * 1024 * 1024 * 1024, // 256GB
  },
  BLUESKY: {
    maxImages: 4,
    maxVideoLength: 60,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    maxFileSize: 1 * 1024 * 1024, // 1MB
  },
};

/**
 * Platform character limits
 */
export const PLATFORM_CHARACTER_LIMITS: Record<
  PublishingPlatform,
  PlatformCharacterLimits
> = {
  LINKEDIN: {
    platform: 'LINKEDIN',
    maxLength: 3000,
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
  TWITTER: {
    platform: 'TWITTER',
    maxLength: 280,
    urlsCountAgainstLimit: true,
    urlCharacterCost: 23, // t.co links
    hashtagsCountAgainstLimit: true,
  },
  INSTAGRAM: {
    platform: 'INSTAGRAM',
    maxLength: 2200,
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
  FACEBOOK: {
    platform: 'FACEBOOK',
    maxLength: 63206,
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
  TIKTOK: {
    platform: 'TIKTOK',
    maxLength: 2200,
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
  THREADS: {
    platform: 'THREADS',
    maxLength: 500,
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
  PINTEREST: {
    platform: 'PINTEREST',
    maxLength: 500,
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
  YOUTUBE: {
    platform: 'YOUTUBE',
    maxLength: 5000, // Description
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
  BLUESKY: {
    platform: 'BLUESKY',
    maxLength: 300,
    urlsCountAgainstLimit: true,
    hashtagsCountAgainstLimit: true,
  },
};
