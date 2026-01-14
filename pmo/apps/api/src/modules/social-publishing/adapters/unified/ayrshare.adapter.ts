/**
 * Ayrshare Adapter
 *
 * Implements the PublishingAdapter interface for Ayrshare's unified social media API.
 * Ayrshare provides a single API to publish to multiple social platforms simultaneously.
 *
 * Key endpoints:
 * - POST /post - Publish to social media
 * - DELETE /post - Delete a post
 * - GET /analytics/post - Get post analytics
 * - GET /user - Get connected platforms
 *
 * @see https://docs.ayrshare.com/rest-api/endpoints
 * @module social-publishing/adapters/unified/ayrshare
 */

import {
  PublishingAdapter,
  PublishRequest,
  PublishResult,
  PlatformPublishResult,
  ConnectedPlatform,
  PostMetrics,
  PublishingPlatform,
  PublishingError,
  PublishingErrorType,
} from '../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ayrshare API base URL */
const AYRSHARE_BASE_URL = 'https://api.ayrshare.com/api';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Map internal platform names to Ayrshare platform identifiers
 */
const PLATFORM_MAP: Record<PublishingPlatform, string> = {
  [PublishingPlatform.LINKEDIN]: 'linkedin',
  [PublishingPlatform.TWITTER]: 'twitter',
  [PublishingPlatform.INSTAGRAM]: 'instagram',
  [PublishingPlatform.FACEBOOK]: 'facebook',
  [PublishingPlatform.TIKTOK]: 'tiktok',
  [PublishingPlatform.YOUTUBE]: 'youtube',
  [PublishingPlatform.PINTEREST]: 'pinterest',
  [PublishingPlatform.THREADS]: 'threads',
  [PublishingPlatform.BLUESKY]: 'bluesky',
};

/**
 * Reverse map Ayrshare platform identifiers to internal names
 */
const REVERSE_PLATFORM_MAP: Record<string, PublishingPlatform> = Object.entries(
  PLATFORM_MAP,
).reduce(
  (acc, [key, value]) => {
    acc[value] = key as PublishingPlatform;
    return acc;
  },
  {} as Record<string, PublishingPlatform>,
);

// ============================================================================
// LOGGER
// ============================================================================

/**
 * Logger interface for consistent logging across the adapter
 */
interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console logger implementation
 */
const defaultLogger: Logger = {
  debug: (msg, ctx) => console.debug(`[AyrshareAdapter] ${msg}`, ctx || ''),
  info: (msg, ctx) => console.info(`[AyrshareAdapter] ${msg}`, ctx || ''),
  warn: (msg, ctx) => console.warn(`[AyrshareAdapter] ${msg}`, ctx || ''),
  error: (msg, ctx) => console.error(`[AyrshareAdapter] ${msg}`, ctx || ''),
};

// ============================================================================
// TYPES
// ============================================================================

interface AyrsharePostResponse {
  status: string;
  id?: string;
  refId?: string;
  postIds?: Array<{
    platform: string;
    postId: string;
    postUrl: string;
    status: string;
  }>;
  errors?: Array<{
    platform: string;
    message: string;
    code?: string;
  }>;
}

interface AyrshareUserResponse {
  platforms?: Array<{
    platform: string;
    connected: boolean;
    displayName?: string;
    username?: string;
    profileImageUrl?: string;
    profileId?: string;
    expiresAt?: string;
  }>;
  error?: string;
}

interface AyrshareAnalyticsResponse {
  analytics?: {
    impressions?: number;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    clicks?: number;
    engagementRate?: number;
    reach?: number;
  };
  error?: string;
}

interface AyrshareDeleteResponse {
  status: string;
  deleted?: boolean;
  error?: string;
}

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

/**
 * Ayrshare Publishing Adapter
 *
 * Provides integration with Ayrshare's unified social media API for
 * cross-platform publishing, scheduling, and analytics.
 *
 * @example
 * ```typescript
 * // Using environment variable (AYRSHARE_API_KEY)
 * const adapter = new AyrshareAdapter();
 *
 * // With explicit API key
 * const adapter = new AyrshareAdapter({ apiKey: 'your-api-key' });
 *
 * // Publish immediately
 * const result = await adapter.publish({
 *   content: 'Hello from PMO!',
 *   platforms: ['LINKEDIN', 'TWITTER'],
 * });
 * ```
 */
export class AyrshareAdapter implements PublishingAdapter {
  public readonly name = 'ayrshare';
  private readonly apiKey: string;
  private readonly logger: Logger;

  /**
   * Creates a new AyrshareAdapter instance
   *
   * @param options - Configuration options
   * @param options.apiKey - Ayrshare API key (defaults to AYRSHARE_API_KEY env var)
   * @param options.logger - Custom logger implementation
   * @throws {PublishingError} If no API key is provided or found in environment
   */
  constructor(options?: { apiKey?: string; logger?: Logger } | string) {
    // Support both string (legacy) and options object
    let apiKey: string | undefined;
    let logger: Logger | undefined;

    if (typeof options === 'string') {
      apiKey = options;
    } else if (options) {
      apiKey = options.apiKey;
      logger = options.logger;
    }

    // Fall back to environment variable
    apiKey = apiKey || process.env.AYRSHARE_API_KEY;

    if (!apiKey) {
      throw new PublishingError(
        'Ayrshare API key is required. Set AYRSHARE_API_KEY environment variable or pass apiKey option.',
        PublishingErrorType.AUTH_ERROR,
      );
    }

    this.apiKey = apiKey;
    this.logger = logger || defaultLogger;
  }

  /**
   * Publish content immediately to specified platforms
   *
   * @param request - Publish request with content and target platforms
   * @param profileKey - Optional profile key for multi-profile accounts
   * @returns Promise resolving to publish result with per-platform status
   */
  async publish(
    request: PublishRequest,
    profileKey?: string,
  ): Promise<PublishResult> {
    this.logger.info('Publishing content', {
      platforms: request.platforms,
      contentLength: request.content.length,
      hasMedia: !!request.media?.length,
    });

    const platforms = request.platforms.map(
      (p) => PLATFORM_MAP[p] || p.toLowerCase(),
    );

    const body: Record<string, unknown> = {
      post: request.content,
      platforms,
      shortenLinks: request.shortenLinks ?? true,
    };

    // Add media if present
    if (request.media && request.media.length > 0) {
      body.mediaUrls = request.media.map((m) => m.url);
    }

    // Add hashtags if present
    if (request.hashtags && request.hashtags.length > 0) {
      // Ensure hashtags have # prefix
      const formattedHashtags = request.hashtags.map((tag) =>
        tag.startsWith('#') ? tag : `#${tag}`,
      );
      body.post = `${request.content}\n\n${formattedHashtags.join(' ')}`;
    }

    // Add link if present
    if (request.linkUrl) {
      body.link = request.linkUrl;
    }

    // Add platform-specific options
    if (request.platformOptions) {
      this.addPlatformOptions(body, request.platformOptions);
    }

    try {
      const response = await this.makeRequest<AyrsharePostResponse>(
        '/post',
        'POST',
        body,
        profileKey,
      );

      const result = this.parsePublishResponse(response, request.platforms);
      this.logger.info('Publish completed', {
        success: result.success,
        referenceId: result.referenceId,
        platformCount: result.platformResults.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to publish content', {
        error: error instanceof Error ? error.message : String(error),
        platforms: request.platforms,
      });
      throw error;
    }
  }

  /**
   * Schedule a post for future publication
   *
   * @param request - Publish request with content and target platforms
   * @param scheduledFor - Date and time to publish the post (must be in the future)
   * @param profileKey - Optional profile key for multi-profile accounts
   * @returns Promise resolving to publish result with scheduled status
   */
  async schedulePost(
    request: PublishRequest,
    scheduledFor: Date,
    profileKey?: string,
  ): Promise<PublishResult> {
    this.logger.info('Scheduling post', {
      platforms: request.platforms,
      scheduledFor: scheduledFor.toISOString(),
    });

    // Validate scheduled time is in the future
    if (scheduledFor <= new Date()) {
      throw new PublishingError(
        'Scheduled time must be in the future',
        PublishingErrorType.INVALID_CONTENT,
      );
    }

    const platforms = request.platforms.map(
      (p) => PLATFORM_MAP[p] || p.toLowerCase(),
    );

    const body: Record<string, unknown> = {
      post: request.content,
      platforms,
      scheduleDate: scheduledFor.toISOString(),
      shortenLinks: request.shortenLinks ?? true,
    };

    // Add media if present
    if (request.media && request.media.length > 0) {
      body.mediaUrls = request.media.map((m) => m.url);
    }

    // Add hashtags if present
    if (request.hashtags && request.hashtags.length > 0) {
      const formattedHashtags = request.hashtags.map((tag) =>
        tag.startsWith('#') ? tag : `#${tag}`,
      );
      body.post = `${request.content}\n\n${formattedHashtags.join(' ')}`;
    }

    // Add link if present
    if (request.linkUrl) {
      body.link = request.linkUrl;
    }

    // Add platform-specific options
    if (request.platformOptions) {
      this.addPlatformOptions(body, request.platformOptions);
    }

    try {
      const response = await this.makeRequest<AyrsharePostResponse>(
        '/post',
        'POST',
        body,
        profileKey,
      );

      const result = this.parsePublishResponse(response, request.platforms);
      this.logger.info('Post scheduled successfully', {
        success: result.success,
        referenceId: result.referenceId,
        scheduledFor: scheduledFor.toISOString(),
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to schedule post', {
        error: error instanceof Error ? error.message : String(error),
        scheduledFor: scheduledFor.toISOString(),
      });
      throw error;
    }
  }

  /**
   * Delete a published post from specified platforms
   *
   * @param postId - The Ayrshare reference ID or platform-specific post ID
   * @param platforms - Platforms to delete the post from
   * @throws {PublishingError} If deletion fails
   */
  async deletePost(
    postId: string,
    platforms: PublishingPlatform[],
  ): Promise<void> {
    this.logger.info('Deleting post', { postId, platforms });

    const platformNames = platforms.map(
      (p) => PLATFORM_MAP[p] || p.toLowerCase(),
    );

    try {
      const response = await this.makeRequest<AyrshareDeleteResponse>(
        '/post',
        'DELETE',
        {
          id: postId,
          platforms: platformNames,
        },
      );

      if (response.error || response.status === 'error') {
        throw new PublishingError(
          response.error || 'Failed to delete post',
          PublishingErrorType.UNKNOWN_ERROR,
        );
      }

      this.logger.info('Post deleted successfully', { postId, platforms });
    } catch (error) {
      this.logger.error('Failed to delete post', {
        error: error instanceof Error ? error.message : String(error),
        postId,
        platforms,
      });
      throw error;
    }
  }

  /**
   * Get list of connected social media platforms
   *
   * @param profileKey - Optional profile key for multi-profile accounts
   * @returns Promise resolving to array of connected platforms
   */
  async getConnectedPlatforms(
    profileKey?: string,
  ): Promise<ConnectedPlatform[]> {
    this.logger.debug('Fetching connected platforms');

    try {
      const response = await this.makeRequest<AyrshareUserResponse>(
        '/user',
        'GET',
        undefined,
        profileKey,
      );

      if (response.error) {
        throw new PublishingError(
          response.error,
          PublishingErrorType.AUTH_ERROR,
        );
      }

      if (!response.platforms) {
        this.logger.debug('No platforms found in response');
        return [];
      }

      const connectedPlatforms: ConnectedPlatform[] = response.platforms.map(
        (p) => ({
          platform:
            REVERSE_PLATFORM_MAP[p.platform] ||
            (p.platform.toUpperCase() as PublishingPlatform),
          accountId: p.profileId || p.username || p.platform,
          accountName: p.displayName || p.username || p.platform,
          connected: p.connected,
          displayName: p.displayName,
          username: p.username,
          profileImageUrl: p.profileImageUrl,
          profileId: p.profileId,
          expiresAt: p.expiresAt ? new Date(p.expiresAt) : undefined,
        }),
      );

      this.logger.debug('Retrieved connected platforms', {
        total: connectedPlatforms.length,
        connected: connectedPlatforms.filter((p) => p.connected).length,
      });

      return connectedPlatforms;
    } catch (error) {
      this.logger.error('Failed to fetch connected platforms', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get engagement metrics for a specific post
   *
   * @param postId - The Ayrshare reference ID or platform-specific post ID
   * @returns Promise resolving to post metrics
   */
  async getPostMetrics(postId: string): Promise<PostMetrics> {
    this.logger.debug('Fetching post metrics', { postId });

    try {
      const response = await this.makeRequest<AyrshareAnalyticsResponse>(
        `/analytics/post?id=${encodeURIComponent(postId)}`,
        'GET',
      );

      if (response.error) {
        throw new PublishingError(
          response.error,
          PublishingErrorType.UNKNOWN_ERROR,
        );
      }

      const analytics = response.analytics || {};

      const metrics: PostMetrics = {
        platform: 'LINKEDIN' as PublishingPlatform, // Default, should be overridden by caller if needed
        postId,
        impressions: analytics.impressions,
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        clicks: analytics.clicks,
        engagementRate: analytics.engagementRate,
        reach: analytics.reach,
        updatedAt: new Date(),
        raw: response as unknown as Record<string, unknown>,
      };

      this.logger.debug('Retrieved post metrics', {
        postId,
        impressions: metrics.impressions,
        likes: metrics.likes,
        engagementRate: metrics.engagementRate,
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to fetch post metrics', {
        error: error instanceof Error ? error.message : String(error),
        postId,
      });
      throw error;
    }
  }

  /**
   * Validate API credentials by making a test request
   */
  async validateCredentials(profileKey?: string): Promise<boolean> {
    try {
      await this.makeRequest<AyrshareUserResponse>(
        '/user',
        'GET',
        undefined,
        profileKey,
      );
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Make an HTTP request to the Ayrshare API
   *
   * @param endpoint - API endpoint path
   * @param method - HTTP method
   * @param body - Request body for POST/PUT/DELETE
   * @param profileKey - Optional profile key for multi-profile accounts
   * @returns Promise resolving to parsed response
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>,
    profileKey?: string,
  ): Promise<T> {
    const url = `${AYRSHARE_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    // Add profile key for multi-tenant/multi-profile setups
    if (profileKey) {
      headers['Profile-Key'] = profileKey;
    }

    // Set up timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      this.logger.debug('Making API request', {
        method,
        endpoint,
        hasBody: !!body,
      });

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Ayrshare API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          // Use status code message if JSON parsing fails
        }

        // Map HTTP status codes to error types
        const errorType = this.mapStatusToErrorType(response.status);
        throw new PublishingError(
          errorMessage,
          errorType,
          undefined,
          undefined,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof PublishingError) {
        throw error;
      }

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PublishingError(
          'Request timed out',
          PublishingErrorType.NETWORK_ERROR,
          undefined,
          error,
        );
      }

      throw new PublishingError(
        error instanceof Error ? error.message : 'Network request failed',
        PublishingErrorType.NETWORK_ERROR,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Map HTTP status codes to error types
   */
  private mapStatusToErrorType(status: number): PublishingErrorType {
    switch (status) {
      case 401:
      case 403:
        return PublishingErrorType.AUTH_ERROR;
      case 429:
        return PublishingErrorType.RATE_LIMIT;
      case 400:
        return PublishingErrorType.INVALID_CONTENT;
      case 503:
      case 504:
        return PublishingErrorType.PLATFORM_UNAVAILABLE;
      default:
        return PublishingErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * Parse Ayrshare publish response into standard format
   */
  private parsePublishResponse(
    response: AyrsharePostResponse,
    requestedPlatforms: PublishingPlatform[],
  ): PublishResult {
    const platformResults: PlatformPublishResult[] = [];
    let allSuccess = true;

    // Process successful posts
    if (response.postIds) {
      for (const postInfo of response.postIds) {
        const platform =
          REVERSE_PLATFORM_MAP[postInfo.platform] ||
          (postInfo.platform.toUpperCase() as PublishingPlatform);

        const success = postInfo.status === 'success';
        if (!success) {
          allSuccess = false;
        }

        platformResults.push({
          platform,
          success,
          postId: postInfo.postId,
          postUrl: postInfo.postUrl,
          publishedAt: success ? new Date() : undefined,
        });
      }
    }

    // Process errors
    if (response.errors) {
      for (const error of response.errors) {
        const platform =
          REVERSE_PLATFORM_MAP[error.platform] ||
          (error.platform.toUpperCase() as PublishingPlatform);

        allSuccess = false;

        // Check if we already have a result for this platform
        const existingIndex = platformResults.findIndex(
          (r) => r.platform === platform,
        );

        if (existingIndex >= 0) {
          platformResults[existingIndex] = {
            ...platformResults[existingIndex],
            success: false,
            error: error.message,
            errorCode: error.code,
          };
        } else {
          platformResults.push({
            platform,
            success: false,
            error: error.message,
            errorCode: error.code,
          });
        }
      }
    }

    // Add entries for platforms that weren't in the response
    for (const platform of requestedPlatforms) {
      const hasResult = platformResults.some((r) => r.platform === platform);
      if (!hasResult) {
        platformResults.push({
          platform,
          success: false,
          error: 'No response received from platform',
        });
        allSuccess = false;
      }
    }

    return {
      success: allSuccess,
      platformResults,
      referenceId: response.refId || response.id,
      timestamp: new Date(),
    };
  }

  /**
   * Add platform-specific options to the request body
   */
  private addPlatformOptions(
    body: Record<string, unknown>,
    options: NonNullable<PublishRequest['platformOptions']>,
  ): void {
    if (options.linkedin) {
      body.linkedInOptions = {
        ...(options.linkedin.articleUrl && {
          article: options.linkedin.articleUrl,
        }),
        ...(options.linkedin.companyId && {
          companyId: options.linkedin.companyId,
        }),
        ...(options.linkedin.visibility && {
          visibility: options.linkedin.visibility,
        }),
      };
    }

    if (options.twitter) {
      body.twitterOptions = {
        ...(options.twitter.replyToId && { reply: options.twitter.replyToId }),
        ...(options.twitter.quoteTweetId && {
          quote: options.twitter.quoteTweetId,
        }),
        ...(options.twitter.poll && {
          poll: {
            options: options.twitter.poll.options,
            duration_minutes: options.twitter.poll.durationMinutes,
          },
        }),
      };
    }

    if (options.instagram) {
      body.instagramOptions = {
        ...(options.instagram.locationId && {
          locationId: options.instagram.locationId,
        }),
        ...(options.instagram.shareToStory && {
          shareToStory: options.instagram.shareToStory,
        }),
        ...(options.instagram.firstComment && {
          firstComment: options.instagram.firstComment,
        }),
      };
    }

    if (options.facebook) {
      body.facebookOptions = {
        ...(options.facebook.pageId && { pageId: options.facebook.pageId }),
        ...(options.facebook.linkUrl && { link: options.facebook.linkUrl }),
        ...(options.facebook.postToStory && {
          postToStory: options.facebook.postToStory,
        }),
      };
    }

    if (options.tiktok) {
      body.tiktokOptions = {
        ...(options.tiktok.privacyLevel && {
          privacyLevel: options.tiktok.privacyLevel.toLowerCase(),
        }),
        ...(options.tiktok.allowComments !== undefined && {
          disableComment: !options.tiktok.allowComments,
        }),
        ...(options.tiktok.allowDuet !== undefined && {
          disableDuet: !options.tiktok.allowDuet,
        }),
        ...(options.tiktok.allowStitch !== undefined && {
          disableStitch: !options.tiktok.allowStitch,
        }),
      };
    }

    if (options.youtube) {
      body.youTubeOptions = {
        ...(options.youtube.title && { title: options.youtube.title }),
        ...(options.youtube.description && {
          description: options.youtube.description,
        }),
        ...(options.youtube.tags && { tags: options.youtube.tags }),
        ...(options.youtube.privacyStatus && {
          privacyStatus: options.youtube.privacyStatus.toLowerCase(),
        }),
        ...(options.youtube.categoryId && {
          categoryId: options.youtube.categoryId,
        }),
      };
    }
  }
}

/**
 * Factory function to create an Ayrshare adapter instance
 *
 * @param options - Configuration options or API key string (legacy)
 * @returns Configured AyrshareAdapter instance
 *
 * @example
 * ```typescript
 * // Using environment variable (AYRSHARE_API_KEY)
 * const adapter = createAyrshareAdapter();
 *
 * // With explicit API key (legacy style)
 * const adapter = createAyrshareAdapter('your-api-key');
 *
 * // With options object
 * const adapter = createAyrshareAdapter({ apiKey: 'your-api-key' });
 * ```
 */
export function createAyrshareAdapter(
  options?: { apiKey?: string; logger?: Logger } | string,
): AyrshareAdapter {
  return new AyrshareAdapter(options);
}

export default AyrshareAdapter;
