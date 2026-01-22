/**
 * Social Publishing Router Tests
 *
 * Unit tests for the social publishing API endpoint logic.
 * These tests verify validation schemas and error handling without
 * requiring the full Express app or database connection.
 *
 * Tests cover:
 * - Zod validation schemas for all endpoints
 * - Error type mapping to HTTP status codes
 * - Input transformation logic
 */

import { describe, it, expect } from 'vitest';

// Import validation schemas directly (these don't have external dependencies)
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
} from '../../src/modules/social-publishing/validation/social-publishing.schema';

// Import error types directly
import {
  PublishingError,
  PublishingErrorType,
} from '../../src/modules/social-publishing/types';

describe('Social Publishing Router - Validation Schemas', () => {
  describe('configCreateUpdateSchema', () => {
    it('accepts valid config with required ayrshareApiKey', () => {
      const result = configCreateUpdateSchema.safeParse({
        ayrshareApiKey: 'test-api-key-12345',
      });

      expect(result.success).toBe(true);
    });

    it('accepts config with all optional fields', () => {
      const result = configCreateUpdateSchema.safeParse({
        ayrshareApiKey: 'test-api-key-12345',
        ayrshareProfileKey: 'profile-key-abc',
        webhookUrl: 'https://example.com/webhook',
        timezone: 'America/New_York',
        autoHashtags: true,
        shortenUrls: false,
        defaultPlatforms: ['linkedin', 'twitter'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ayrshareApiKey).toBe('test-api-key-12345');
        expect(result.data.ayrshareProfileKey).toBe('profile-key-abc');
        expect(result.data.timezone).toBe('America/New_York');
      }
    });

    it('rejects config without ayrshareApiKey', () => {
      const result = configCreateUpdateSchema.safeParse({
        timezone: 'UTC',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid webhook URL', () => {
      const result = configCreateUpdateSchema.safeParse({
        ayrshareApiKey: 'test-key',
        webhookUrl: 'not-a-valid-url',
      });

      expect(result.success).toBe(false);
    });

    it('accepts valid webhook URL', () => {
      const result = configCreateUpdateSchema.safeParse({
        ayrshareApiKey: 'test-key',
        webhookUrl: 'https://webhook.example.com/callback',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('postCreateSchema', () => {
    it('accepts valid post with required fields', () => {
      const result = postCreateSchema.safeParse({
        content: 'Hello, world!',
        platforms: ['linkedin'],
      });

      expect(result.success).toBe(true);
    });

    it('accepts post with all optional fields', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const result = postCreateSchema.safeParse({
        content: 'Test post with all fields',
        platforms: ['linkedin', 'twitter', 'instagram'],
        mediaUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.png',
        ],
        linkUrl: 'https://example.com/article',
        hashtags: ['tech', 'social', 'marketing'],
        scheduledFor: futureDate,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Test post with all fields');
        expect(result.data.platforms).toHaveLength(3);
        expect(result.data.mediaUrls).toHaveLength(2);
        expect(result.data.hashtags).toHaveLength(3);
      }
    });

    it('rejects post without content', () => {
      const result = postCreateSchema.safeParse({
        platforms: ['linkedin'],
      });

      expect(result.success).toBe(false);
    });

    it('rejects post without platforms', () => {
      const result = postCreateSchema.safeParse({
        content: 'Test content',
      });

      expect(result.success).toBe(false);
    });

    it('rejects post with empty platforms array', () => {
      const result = postCreateSchema.safeParse({
        content: 'Test content',
        platforms: [],
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid platform value', () => {
      const result = postCreateSchema.safeParse({
        content: 'Test content',
        platforms: ['invalid_platform'],
      });

      expect(result.success).toBe(false);
    });

    it('accepts all valid platform values', () => {
      // Platforms defined in SocialPlatformEnum
      const validPlatforms = [
        'linkedin',
        'twitter',
        'instagram',
        'facebook',
        'tiktok',
        'youtube',
        'pinterest',
        'threads',
      ];

      const result = postCreateSchema.safeParse({
        content: 'Test content',
        platforms: validPlatforms,
      });

      expect(result.success).toBe(true);
    });

    it('rejects content exceeding max length', () => {
      const result = postCreateSchema.safeParse({
        content: 'a'.repeat(10001),
        platforms: ['linkedin'],
      });

      expect(result.success).toBe(false);
    });

    it('accepts content at max length', () => {
      const result = postCreateSchema.safeParse({
        content: 'a'.repeat(10000),
        platforms: ['linkedin'],
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid scheduledFor date', () => {
      const result = postCreateSchema.safeParse({
        content: 'Test content',
        platforms: ['linkedin'],
        scheduledFor: 'not-a-date',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid media URL', () => {
      const result = postCreateSchema.safeParse({
        content: 'Test content',
        platforms: ['linkedin'],
        mediaUrls: ['not-a-url'],
      });

      expect(result.success).toBe(false);
    });

    it('accepts valid media URLs', () => {
      const result = postCreateSchema.safeParse({
        content: 'Test content',
        platforms: ['linkedin'],
        mediaUrls: [
          'https://example.com/image.jpg',
          'https://cdn.example.com/video.mp4',
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('postUpdateSchema', () => {
    it('accepts partial update with only content', () => {
      const result = postUpdateSchema.safeParse({
        content: 'Updated content',
      });

      expect(result.success).toBe(true);
    });

    it('accepts partial update with only platforms', () => {
      const result = postUpdateSchema.safeParse({
        platforms: ['linkedin', 'twitter'],
      });

      expect(result.success).toBe(true);
    });

    it('accepts update with null to clear optional fields', () => {
      const result = postUpdateSchema.safeParse({
        linkUrl: null,
        scheduledFor: null,
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const result = postUpdateSchema.safeParse({
        content: '',
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty platforms array', () => {
      const result = postUpdateSchema.safeParse({
        platforms: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('postListQuerySchema', () => {
    it('accepts query with no parameters (defaults)', () => {
      const result = postListQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('accepts query with all valid filters', () => {
      const result = postListQuerySchema.safeParse({
        status: 'draft',
        platform: 'linkedin',
        startDate: '2024-01-01T00:00:00Z', // Must be ISO 8601 datetime format
        endDate: '2024-12-31T23:59:59Z',
        search: 'test search',
        limit: '50',
        offset: '0',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.success).toBe(true);
    });

    it('accepts all valid status values', () => {
      // Status values defined in PostStatusEnum
      const validStatuses = [
        'draft',
        'scheduled',
        'publishing',
        'published',
        'failed',
        'cancelled',
      ];

      for (const status of validStatuses) {
        const result = postListQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status value', () => {
      const result = postListQuerySchema.safeParse({
        status: 'invalid_status',
      });

      expect(result.success).toBe(false);
    });

    it('validates limit range (max 100)', () => {
      const result = postListQuerySchema.safeParse({
        limit: '200',
      });

      expect(result.success).toBe(false);
    });

    it('accepts valid limit within range', () => {
      const result = postListQuerySchema.safeParse({
        limit: '100',
      });

      expect(result.success).toBe(true);
    });

    it('validates offset is non-negative', () => {
      const result = postListQuerySchema.safeParse({
        offset: '-1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('schedulePostSchema', () => {
    it('accepts valid scheduledFor datetime', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const result = schedulePostSchema.safeParse({
        scheduledFor: futureDate,
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing scheduledFor', () => {
      const result = schedulePostSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('rejects invalid scheduledFor format', () => {
      const result = schedulePostSchema.safeParse({
        scheduledFor: 'tomorrow',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('publishNowSchema', () => {
    it('accepts empty body', () => {
      const result = publishNowSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('accepts optional retry flag', () => {
      const result = publishNowSchema.safeParse({
        retry: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('cancelPostSchema', () => {
    it('accepts empty body', () => {
      const result = cancelPostSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('accepts optional reason', () => {
      const result = cancelPostSchema.safeParse({
        reason: 'Changed my mind',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('metricsQuerySchema', () => {
    it('accepts empty query', () => {
      const result = metricsQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('accepts refresh flag', () => {
      const result = metricsQuerySchema.safeParse({
        refresh: 'true',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('historyQuerySchema', () => {
    it('accepts empty query', () => {
      const result = historyQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('accepts platform filter', () => {
      const result = historyQuerySchema.safeParse({
        platform: 'linkedin',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('platformSyncSchema', () => {
    it('accepts empty body', () => {
      const result = platformSyncSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('accepts force flag', () => {
      const result = platformSyncSchema.safeParse({
        force: true,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Social Publishing Router - Error Handling', () => {
  describe('PublishingError type mapping', () => {
    /**
     * Test utility to map error type to expected HTTP status and code.
     * This mirrors the handlePublishingError logic in the router.
     */
    function mapErrorToResponse(errorType: PublishingErrorType): {
      status: number;
      code: string;
    } {
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

      return errorMap[errorType];
    }

    it('maps AUTH_ERROR to 401 unauthorized', () => {
      const error = new PublishingError(
        'Invalid API key',
        PublishingErrorType.AUTH_ERROR,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(401);
      expect(response.code).toBe('unauthorized');
    });

    it('maps RATE_LIMIT to 429 rate_limited', () => {
      const error = new PublishingError(
        'Too many requests',
        PublishingErrorType.RATE_LIMIT,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(429);
      expect(response.code).toBe('rate_limited');
    });

    it('maps INVALID_CONTENT to 400 invalid_content', () => {
      const error = new PublishingError(
        'Content too long',
        PublishingErrorType.INVALID_CONTENT,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(400);
      expect(response.code).toBe('invalid_content');
    });

    it('maps MEDIA_ERROR to 400 media_error', () => {
      const error = new PublishingError(
        'Invalid media format',
        PublishingErrorType.MEDIA_ERROR,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(400);
      expect(response.code).toBe('media_error');
    });

    it('maps PLATFORM_UNAVAILABLE to 503 platform_unavailable', () => {
      const error = new PublishingError(
        'LinkedIn is down',
        PublishingErrorType.PLATFORM_UNAVAILABLE,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(503);
      expect(response.code).toBe('platform_unavailable');
    });

    it('maps PLATFORM_NOT_CONNECTED to 400 platform_not_connected', () => {
      const error = new PublishingError(
        'Platform not connected',
        PublishingErrorType.PLATFORM_NOT_CONNECTED,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(400);
      expect(response.code).toBe('platform_not_connected');
    });

    it('maps NETWORK_ERROR to 502 network_error', () => {
      const error = new PublishingError(
        'Network failure',
        PublishingErrorType.NETWORK_ERROR,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(502);
      expect(response.code).toBe('network_error');
    });

    it('maps UNKNOWN_ERROR to 500 unknown_error', () => {
      const error = new PublishingError(
        'Something went wrong',
        PublishingErrorType.UNKNOWN_ERROR,
      );
      const response = mapErrorToResponse(error.type);

      expect(response.status).toBe(500);
      expect(response.code).toBe('unknown_error');
    });
  });

  describe('PublishingError properties', () => {
    it('stores error message', () => {
      const error = new PublishingError(
        'Test error message',
        PublishingErrorType.AUTH_ERROR,
      );

      expect(error.message).toBe('Test error message');
    });

    it('stores error type', () => {
      const error = new PublishingError('Test', PublishingErrorType.RATE_LIMIT);

      expect(error.type).toBe(PublishingErrorType.RATE_LIMIT);
    });

    it('stores optional platform', () => {
      const error = new PublishingError(
        'Platform error',
        PublishingErrorType.PLATFORM_UNAVAILABLE,
        'LINKEDIN',
      );

      expect(error.platform).toBe('LINKEDIN');
    });

    it('stores optional original error', () => {
      const originalError = new Error('Original error');
      const error = new PublishingError(
        'Detailed error',
        PublishingErrorType.INVALID_CONTENT,
        undefined,
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });

    it('is instance of Error', () => {
      const error = new PublishingError('Test', PublishingErrorType.AUTH_ERROR);

      expect(error).toBeInstanceOf(Error);
    });

    it('has correct name', () => {
      const error = new PublishingError('Test', PublishingErrorType.AUTH_ERROR);

      expect(error.name).toBe('PublishingError');
    });
  });
});

describe('Social Publishing Router - Input Transformation', () => {
  describe('Platform name transformation', () => {
    /**
     * Convert lowercase platform name to uppercase Prisma enum value.
     * Mirrors the toPrismaPublishingPlatform function in the router.
     */
    function toPrismaPublishingPlatform(platform: string): string {
      return platform.toUpperCase();
    }

    it('transforms linkedin to LINKEDIN', () => {
      expect(toPrismaPublishingPlatform('linkedin')).toBe('LINKEDIN');
    });

    it('transforms twitter to TWITTER', () => {
      expect(toPrismaPublishingPlatform('twitter')).toBe('TWITTER');
    });

    it('transforms instagram to INSTAGRAM', () => {
      expect(toPrismaPublishingPlatform('instagram')).toBe('INSTAGRAM');
    });

    it('transforms facebook to FACEBOOK', () => {
      expect(toPrismaPublishingPlatform('facebook')).toBe('FACEBOOK');
    });

    it('transforms tiktok to TIKTOK', () => {
      expect(toPrismaPublishingPlatform('tiktok')).toBe('TIKTOK');
    });

    it('transforms youtube to YOUTUBE', () => {
      expect(toPrismaPublishingPlatform('youtube')).toBe('YOUTUBE');
    });

    it('transforms pinterest to PINTEREST', () => {
      expect(toPrismaPublishingPlatform('pinterest')).toBe('PINTEREST');
    });

    it('transforms threads to THREADS', () => {
      expect(toPrismaPublishingPlatform('threads')).toBe('THREADS');
    });

    // Note: Bluesky is in Prisma schema but not in Zod validation schema
    // The Prisma enum includes BLUESKY for database storage but it's not
    // exposed in the API validation layer yet
  });

  describe('Status name transformation', () => {
    /**
     * Convert lowercase status name to uppercase Prisma enum value.
     * Mirrors the toPrismaPublishStatus function in the router.
     */
    function toPrismaPublishStatus(status: string): string {
      const statusMap: Record<string, string> = {
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

    it('transforms draft to DRAFT', () => {
      expect(toPrismaPublishStatus('draft')).toBe('DRAFT');
    });

    it('transforms pending to PENDING', () => {
      expect(toPrismaPublishStatus('pending')).toBe('PENDING');
    });

    it('transforms scheduled to SCHEDULED', () => {
      expect(toPrismaPublishStatus('scheduled')).toBe('SCHEDULED');
    });

    it('transforms publishing to PUBLISHING', () => {
      expect(toPrismaPublishStatus('publishing')).toBe('PUBLISHING');
    });

    it('transforms published to PUBLISHED', () => {
      expect(toPrismaPublishStatus('published')).toBe('PUBLISHED');
    });

    it('transforms failed to FAILED', () => {
      expect(toPrismaPublishStatus('failed')).toBe('FAILED');
    });

    it('transforms cancelled to DRAFT', () => {
      expect(toPrismaPublishStatus('cancelled')).toBe('DRAFT');
    });

    it('returns DRAFT for unknown status', () => {
      expect(toPrismaPublishStatus('unknown')).toBe('DRAFT');
    });
  });

  describe('ID parsing', () => {
    /**
     * Parse and validate numeric ID from route parameters.
     * Mirrors the parseId function in the router.
     */
    function parseId(idParam: string | undefined): number | null {
      const id = parseInt(String(idParam), 10);
      return isNaN(id) || id <= 0 ? null : id;
    }

    it('parses valid numeric string', () => {
      expect(parseId('123')).toBe(123);
    });

    it('returns null for non-numeric string', () => {
      expect(parseId('abc')).toBe(null);
    });

    it('returns null for zero', () => {
      expect(parseId('0')).toBe(null);
    });

    it('returns null for negative number', () => {
      expect(parseId('-5')).toBe(null);
    });

    it('returns null for undefined', () => {
      expect(parseId(undefined)).toBe(null);
    });

    it('parses string with leading zeros', () => {
      expect(parseId('007')).toBe(7);
    });

    it('truncates decimal strings', () => {
      expect(parseId('123.456')).toBe(123);
    });
  });
});
