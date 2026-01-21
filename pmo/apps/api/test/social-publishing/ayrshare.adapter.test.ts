/**
 * Ayrshare Adapter Tests
 *
 * Tests for the Ayrshare publishing adapter that integrates with the
 * Ayrshare unified social media API.
 *
 * Tests cover:
 * - Successful publishing to multiple platforms
 * - Error handling (auth errors, rate limiting, network errors)
 * - Scheduled post publishing
 * - Post deletion
 * - Connected platforms retrieval
 * - Post metrics retrieval
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AyrshareAdapter,
  createAyrshareAdapter,
} from '../../src/modules/social-publishing/adapters/unified/ayrshare.adapter';
import {
  PublishingPlatform,
  PublishingError,
  PublishingErrorType,
  MediaType,
} from '../../src/modules/social-publishing/types';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AyrshareAdapter', () => {
  const testApiKey = 'test-api-key-12345';

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default env var for tests that don't explicitly pass apiKey
    process.env.AYRSHARE_API_KEY = testApiKey;
  });

  afterEach(() => {
    delete process.env.AYRSHARE_API_KEY;
  });

  describe('constructor', () => {
    it('creates adapter with explicit API key', () => {
      const adapter = new AyrshareAdapter({ apiKey: 'explicit-key' });
      expect(adapter.name).toBe('ayrshare');
    });

    it('creates adapter with legacy string API key', () => {
      const adapter = new AyrshareAdapter('legacy-key');
      expect(adapter.name).toBe('ayrshare');
    });

    it('creates adapter using environment variable', () => {
      process.env.AYRSHARE_API_KEY = 'env-api-key';
      const adapter = new AyrshareAdapter();
      expect(adapter.name).toBe('ayrshare');
    });

    it('throws error when no API key provided', () => {
      delete process.env.AYRSHARE_API_KEY;

      expect(() => new AyrshareAdapter()).toThrow(PublishingError);
      expect(() => new AyrshareAdapter()).toThrow(
        'Ayrshare API key is required',
      );
    });

    it('creates adapter with custom logger', () => {
      const customLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const adapter = new AyrshareAdapter({
        apiKey: testApiKey,
        logger: customLogger,
      });
      expect(adapter.name).toBe('ayrshare');
    });
  });

  describe('createAyrshareAdapter factory', () => {
    it('creates adapter with options object', () => {
      const adapter = createAyrshareAdapter({ apiKey: testApiKey });
      expect(adapter).toBeInstanceOf(AyrshareAdapter);
    });

    it('creates adapter with string API key', () => {
      const adapter = createAyrshareAdapter(testApiKey);
      expect(adapter).toBeInstanceOf(AyrshareAdapter);
    });

    it('creates adapter with no arguments using env var', () => {
      const adapter = createAyrshareAdapter();
      expect(adapter).toBeInstanceOf(AyrshareAdapter);
    });
  });

  describe('publish', () => {
    it('publishes content to single platform successfully', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-123',
          postIds: [
            {
              platform: 'linkedin',
              postId: 'li-post-123',
              postUrl: 'https://linkedin.com/posts/123',
              status: 'success',
            },
          ],
        }),
      });

      const result = await adapter.publish({
        content: 'Hello from PMO!',
        platforms: [PublishingPlatform.LINKEDIN],
      });

      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('ref-123');
      expect(result.platformResults).toHaveLength(1);
      expect(result.platformResults[0]).toMatchObject({
        platform: 'LINKEDIN',
        success: true,
        postId: 'li-post-123',
        postUrl: 'https://linkedin.com/posts/123',
      });

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ayrshare.com/api/post',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${testApiKey}`,
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('publishes content to multiple platforms', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-456',
          postIds: [
            {
              platform: 'linkedin',
              postId: 'li-123',
              postUrl: 'https://linkedin.com/posts/123',
              status: 'success',
            },
            {
              platform: 'twitter',
              postId: 'tw-456',
              postUrl: 'https://twitter.com/status/456',
              status: 'success',
            },
          ],
        }),
      });

      const result = await adapter.publish({
        content: 'Multi-platform post!',
        platforms: [PublishingPlatform.LINKEDIN, PublishingPlatform.TWITTER],
      });

      expect(result.success).toBe(true);
      expect(result.platformResults).toHaveLength(2);
      expect(result.platformResults.map((r) => r.platform)).toContain(
        'LINKEDIN',
      );
      expect(result.platformResults.map((r) => r.platform)).toContain(
        'TWITTER',
      );
    });

    it('handles partial success (some platforms fail)', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'partial',
          refId: 'ref-789',
          postIds: [
            {
              platform: 'linkedin',
              postId: 'li-789',
              postUrl: 'https://linkedin.com/posts/789',
              status: 'success',
            },
          ],
          errors: [
            {
              platform: 'twitter',
              message: 'Rate limit exceeded',
              code: 'RATE_LIMIT',
            },
          ],
        }),
      });

      const result = await adapter.publish({
        content: 'Partial success post',
        platforms: [PublishingPlatform.LINKEDIN, PublishingPlatform.TWITTER],
      });

      expect(result.success).toBe(false);
      expect(result.platformResults).toHaveLength(2);

      const linkedinResult = result.platformResults.find(
        (r) => r.platform === 'LINKEDIN',
      );
      const twitterResult = result.platformResults.find(
        (r) => r.platform === 'TWITTER',
      );

      expect(linkedinResult?.success).toBe(true);
      expect(twitterResult?.success).toBe(false);
      expect(twitterResult?.error).toBe('Rate limit exceeded');
    });

    it('includes media URLs in publish request', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-media',
          postIds: [
            {
              platform: 'instagram',
              postId: 'ig-123',
              postUrl: 'https://instagram.com/p/123',
              status: 'success',
            },
          ],
        }),
      });

      await adapter.publish({
        content: 'Post with media',
        platforms: [PublishingPlatform.INSTAGRAM],
        media: [
          { url: 'https://example.com/image1.jpg', type: MediaType.IMAGE },
          { url: 'https://example.com/image2.jpg', type: MediaType.IMAGE },
        ],
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.mediaUrls).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ]);
    });

    it('formats hashtags and appends to content', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-hashtags',
          postIds: [
            {
              platform: 'twitter',
              postId: 'tw-123',
              postUrl: 'https://twitter.com/status/123',
              status: 'success',
            },
          ],
        }),
      });

      await adapter.publish({
        content: 'Post with hashtags',
        platforms: [PublishingPlatform.TWITTER],
        hashtags: ['PMO', '#consulting', 'business'],
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.post).toContain('Post with hashtags');
      expect(body.post).toContain('#PMO');
      expect(body.post).toContain('#consulting');
      expect(body.post).toContain('#business');
    });

    it('includes link URL in publish request', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-link',
          postIds: [],
        }),
      });

      await adapter.publish({
        content: 'Check out this link',
        platforms: [PublishingPlatform.LINKEDIN],
        linkUrl: 'https://example.com/article',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.link).toBe('https://example.com/article');
    });

    it('includes profile key header for multi-profile accounts', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-profile',
          postIds: [],
        }),
      });

      await adapter.publish(
        {
          content: 'Profile-specific post',
          platforms: [PublishingPlatform.TWITTER],
        },
        'profile-key-123',
      );

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers['Profile-Key']).toBe('profile-key-123');
    });

    it('adds LinkedIn-specific options', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-li',
          postIds: [],
        }),
      });

      await adapter.publish({
        content: 'LinkedIn article post',
        platforms: [PublishingPlatform.LINKEDIN],
        platformOptions: {
          linkedin: {
            articleUrl: 'https://example.com/article',
            companyId: 'company-123',
            visibility: 'CONNECTIONS',
          },
        },
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.linkedInOptions).toMatchObject({
        article: 'https://example.com/article',
        companyId: 'company-123',
        visibility: 'CONNECTIONS',
      });
    });

    it('adds Twitter-specific options with poll', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-tw',
          postIds: [],
        }),
      });

      await adapter.publish({
        content: 'Twitter poll',
        platforms: [PublishingPlatform.TWITTER],
        platformOptions: {
          twitter: {
            poll: {
              options: ['Option A', 'Option B', 'Option C'],
              durationMinutes: 1440,
            },
          },
        },
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.twitterOptions.poll).toMatchObject({
        options: ['Option A', 'Option B', 'Option C'],
        duration_minutes: 1440,
      });
    });
  });

  describe('schedulePost', () => {
    it('schedules post for future publication', async () => {
      const adapter = new AyrshareAdapter(testApiKey);
      const futureDate = new Date(Date.now() + 86400000); // 24 hours from now

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-scheduled',
          postIds: [
            {
              platform: 'linkedin',
              postId: 'scheduled-li-123',
              postUrl: 'https://linkedin.com/posts/scheduled',
              status: 'success',
            },
          ],
        }),
      });

      const result = await adapter.schedulePost(
        {
          content: 'Scheduled post content',
          platforms: [PublishingPlatform.LINKEDIN],
        },
        futureDate,
      );

      expect(result.success).toBe(true);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.scheduleDate).toBe(futureDate.toISOString());
    });

    it('throws error when scheduled time is in the past', async () => {
      const adapter = new AyrshareAdapter(testApiKey);
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      await expect(
        adapter.schedulePost(
          {
            content: 'Past scheduled post',
            platforms: [PublishingPlatform.TWITTER],
          },
          pastDate,
        ),
      ).rejects.toThrow('Scheduled time must be in the future');
    });
  });

  describe('deletePost', () => {
    it('deletes post from platforms successfully', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          deleted: true,
        }),
      });

      await expect(
        adapter.deletePost('post-id-123', [
          PublishingPlatform.LINKEDIN,
          PublishingPlatform.TWITTER,
        ]),
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ayrshare.com/api/post',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            id: 'post-id-123',
            platforms: ['linkedin', 'twitter'],
          }),
        }),
      );
    });

    it('throws error when delete fails', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'error',
          error: 'Post not found',
        }),
      });

      await expect(
        adapter.deletePost('invalid-id', [PublishingPlatform.LINKEDIN]),
      ).rejects.toThrow(PublishingError);
    });
  });

  describe('getConnectedPlatforms', () => {
    it('returns list of connected platforms', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          platforms: [
            {
              platform: 'linkedin',
              connected: true,
              displayName: 'John Doe',
              username: 'johndoe',
              profileImageUrl: 'https://example.com/avatar.jpg',
              profileId: 'li-profile-123',
            },
            {
              platform: 'twitter',
              connected: true,
              displayName: 'John D',
              username: 'johnd',
              profileId: 'tw-profile-456',
            },
            {
              platform: 'instagram',
              connected: false,
            },
          ],
        }),
      });

      const platforms = await adapter.getConnectedPlatforms();

      expect(platforms).toHaveLength(3);
      expect(platforms[0]).toMatchObject({
        platform: 'LINKEDIN',
        connected: true,
        displayName: 'John Doe',
        username: 'johndoe',
      });
      expect(platforms[2].connected).toBe(false);
    });

    it('returns empty array when no platforms connected', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const platforms = await adapter.getConnectedPlatforms();
      expect(platforms).toEqual([]);
    });

    it('throws error on API error response', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'Invalid API key',
        }),
      });

      await expect(adapter.getConnectedPlatforms()).rejects.toThrow(
        PublishingError,
      );
    });
  });

  describe('getPostMetrics', () => {
    it('returns metrics for a post', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: {
            impressions: 1500,
            views: 1200,
            likes: 45,
            comments: 12,
            shares: 8,
            clicks: 25,
            engagementRate: 4.5,
            reach: 950,
          },
        }),
      });

      const metrics = await adapter.getPostMetrics('post-123');

      expect(metrics).toMatchObject({
        postId: 'post-123',
        impressions: 1500,
        views: 1200,
        likes: 45,
        comments: 12,
        shares: 8,
        clicks: 25,
        engagementRate: 4.5,
        reach: 950,
      });
      expect(metrics.updatedAt).toBeInstanceOf(Date);
    });

    it('throws error on metrics fetch failure', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'Post not found',
        }),
      });

      await expect(adapter.getPostMetrics('invalid-id')).rejects.toThrow(
        PublishingError,
      );
    });
  });

  describe('validateCredentials', () => {
    it('returns true for valid credentials', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          platforms: [],
        }),
      });

      const isValid = await adapter.validateCredentials();
      expect(isValid).toBe(true);
    });

    it('returns false for invalid credentials', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockRejectedValueOnce(new Error('Unauthorized'));

      const isValid = await adapter.validateCredentials();
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles 401 Unauthorized as AUTH_ERROR', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'Invalid API key' }),
      });

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.LINKEDIN],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishingError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.AUTH_ERROR,
        );
      }
    });

    it('handles 403 Forbidden as AUTH_ERROR', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: 'Access denied' }),
      });

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.TWITTER],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishingError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.AUTH_ERROR,
        );
      }
    });

    it('handles 429 Too Many Requests as RATE_LIMIT', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: 'Rate limit exceeded' }),
      });

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.TWITTER],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishingError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.RATE_LIMIT,
        );
      }
    });

    it('handles 400 Bad Request as INVALID_CONTENT', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Content too long' }),
      });

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.TWITTER],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishingError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.INVALID_CONTENT,
        );
      }
    });

    it('handles 503 Service Unavailable as PLATFORM_UNAVAILABLE', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service temporarily unavailable',
      });

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.LINKEDIN],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishingError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.PLATFORM_UNAVAILABLE,
        );
      }
    });

    it('handles network errors as NETWORK_ERROR', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.LINKEDIN],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishingError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.NETWORK_ERROR,
        );
      }
    });

    it('handles request timeout as NETWORK_ERROR', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      // Simulate AbortError (timeout)
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.LINKEDIN],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishingError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.NETWORK_ERROR,
        );
        expect((error as PublishingError).message).toBe('Request timed out');
      }
    });

    it('preserves existing PublishingError when thrown', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      const originalError = new PublishingError(
        'Custom error',
        PublishingErrorType.MEDIA_ERROR,
        PublishingPlatform.INSTAGRAM,
      );

      mockFetch.mockRejectedValueOnce(originalError);

      try {
        await adapter.publish({
          content: 'Test',
          platforms: [PublishingPlatform.INSTAGRAM],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(originalError);
        expect((error as PublishingError).type).toBe(
          PublishingErrorType.MEDIA_ERROR,
        );
      }
    });
  });

  describe('platform mapping', () => {
    it('maps all supported platforms correctly', async () => {
      const adapter = new AyrshareAdapter(testApiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          refId: 'ref-all',
          postIds: [
            { platform: 'linkedin', status: 'success' },
            { platform: 'twitter', status: 'success' },
            { platform: 'instagram', status: 'success' },
            { platform: 'facebook', status: 'success' },
            { platform: 'tiktok', status: 'success' },
            { platform: 'youtube', status: 'success' },
            { platform: 'pinterest', status: 'success' },
            { platform: 'threads', status: 'success' },
            { platform: 'bluesky', status: 'success' },
          ],
        }),
      });

      const result = await adapter.publish({
        content: 'All platforms',
        platforms: [
          PublishingPlatform.LINKEDIN,
          PublishingPlatform.TWITTER,
          PublishingPlatform.INSTAGRAM,
          PublishingPlatform.FACEBOOK,
          PublishingPlatform.TIKTOK,
          PublishingPlatform.YOUTUBE,
          PublishingPlatform.PINTEREST,
          PublishingPlatform.THREADS,
          PublishingPlatform.BLUESKY,
        ],
      });

      expect(result.platformResults).toHaveLength(9);
      expect(result.platformResults.every((r) => r.success)).toBe(true);
    });
  });
});
