/**
 * Social Publishing Service Tests
 *
 * Tests for the social publishing service that orchestrates publishing operations.
 *
 * Tests cover:
 * - Configuration CRUD operations
 * - Post CRUD operations
 * - Publishing and scheduling workflows
 * - Metrics synchronization
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublishingPlatform } from '../../src/modules/social-publishing/types';

// Use vi.hoisted to ensure mocks are available during module factory execution
const { mockPrisma, mockAdapterFunctions } = vi.hoisted(() => ({
  mockPrisma: {
    $disconnect: vi.fn(),
    socialPublishingConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    socialMediaPost: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    publishingHistory: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
  },
  mockAdapterFunctions: {
    publish: vi.fn(),
    schedulePost: vi.fn(),
    deletePost: vi.fn(),
    getConnectedPlatforms: vi.fn(),
    getPostMetrics: vi.fn(),
    validateCredentials: vi.fn(),
  },
}));

// Mock prisma client with both named and default exports
vi.mock('../../src/prisma/client', () => {
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

vi.mock(
  '../../src/modules/social-publishing/adapters/unified/ayrshare.adapter',
  () => {
    // Use a class that wraps the mock functions
    class MockAyrshareAdapter {
      name = 'ayrshare';
      publish = mockAdapterFunctions.publish;
      schedulePost = mockAdapterFunctions.schedulePost;
      deletePost = mockAdapterFunctions.deletePost;
      getConnectedPlatforms = mockAdapterFunctions.getConnectedPlatforms;
      getPostMetrics = mockAdapterFunctions.getPostMetrics;
      validateCredentials = mockAdapterFunctions.validateCredentials;
    }
    return {
      AyrshareAdapter: MockAyrshareAdapter,
    };
  },
);

// Import after mocks
import * as socialPublishingService from '../../src/modules/social-publishing/services/social-publishing.service';

// TODO: Fix vitest mock isolation - mocks are leaking to other test files
// Skipping until proper test isolation is implemented
describe.skip('SocialPublishingService', () => {
  // Access the mock adapter functions
  const mockAdapterInstance = mockAdapterFunctions;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Configuration Management', () => {
    describe('getConfig', () => {
      it('returns config when found', async () => {
        const mockConfig = {
          id: 1,
          tenantId: 'tenant-123',
          provider: 'ayrshare',
          apiKey: 'api-key-123',
          profileKey: null,
          defaultTimezone: 'UTC',
          autoHashtags: false,
          shortenUrls: true,
          connectedPlatforms: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(
          mockConfig,
        );

        const result = await socialPublishingService.getConfig('tenant-123');

        expect(result).toEqual(mockConfig);
        expect(
          mockPrisma.socialPublishingConfig.findUnique,
        ).toHaveBeenCalledWith({
          where: { tenantId: 'tenant-123' },
        });
      });

      it('returns null when config not found', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(null);

        const result =
          await socialPublishingService.getConfig('nonexistent-tenant');

        expect(result).toBeNull();
      });
    });

    describe('createConfig', () => {
      it('creates config with valid credentials', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(null);
        mockAdapterInstance.validateCredentials.mockResolvedValue(true);
        mockAdapterInstance.getConnectedPlatforms.mockResolvedValue([
          {
            platform: 'LINKEDIN',
            connected: true,
            accountId: 'li-123',
            accountName: 'Test',
          },
        ]);

        const mockCreatedConfig = {
          id: 1,
          tenantId: 'tenant-123',
          provider: 'ayrshare',
          apiKey: 'new-api-key',
          profileKey: null,
          defaultTimezone: 'UTC',
          autoHashtags: false,
          shortenUrls: true,
          connectedPlatforms: [{ platform: 'LINKEDIN', connected: true }],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.socialPublishingConfig.create.mockResolvedValue(
          mockCreatedConfig,
        );

        const result = await socialPublishingService.createConfig(
          'tenant-123',
          { apiKey: 'new-api-key' },
        );

        expect(result).toEqual(mockCreatedConfig);
        expect(mockAdapterInstance.validateCredentials).toHaveBeenCalled();
        expect(mockAdapterInstance.getConnectedPlatforms).toHaveBeenCalled();
      });

      it('throws error when config already exists', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
        });

        await expect(
          socialPublishingService.createConfig('tenant-123', {
            apiKey: 'api-key',
          }),
        ).rejects.toThrow('Configuration already exists for this tenant');
      });

      it('throws error when credentials are invalid', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(null);
        mockAdapterInstance.validateCredentials.mockResolvedValue(false);

        await expect(
          socialPublishingService.createConfig('tenant-123', {
            apiKey: 'invalid-key',
          }),
        ).rejects.toThrow('Invalid API credentials');
      });
    });

    describe('updateConfig', () => {
      it('updates config with new API key', async () => {
        const existingConfig = {
          id: 1,
          tenantId: 'tenant-123',
          provider: 'ayrshare',
          apiKey: 'old-key',
          profileKey: null,
        };

        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(
          existingConfig,
        );
        mockAdapterInstance.validateCredentials.mockResolvedValue(true);
        mockPrisma.socialPublishingConfig.update.mockResolvedValue({
          ...existingConfig,
          apiKey: 'new-key',
        });

        const result = await socialPublishingService.updateConfig(
          'tenant-123',
          { apiKey: 'new-key' },
        );

        expect(result.apiKey).toBe('new-key');
        expect(mockAdapterInstance.validateCredentials).toHaveBeenCalled();
      });

      it('throws error when config not found', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(null);

        await expect(
          socialPublishingService.updateConfig('nonexistent', {
            apiKey: 'key',
          }),
        ).rejects.toThrow('Configuration not found');
      });

      it('throws error when new credentials are invalid', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
          apiKey: 'old-key',
        });
        mockAdapterInstance.validateCredentials.mockResolvedValue(false);

        await expect(
          socialPublishingService.updateConfig('tenant-123', {
            apiKey: 'bad-key',
          }),
        ).rejects.toThrow('Invalid API credentials');
      });
    });

    describe('syncConnectedPlatforms', () => {
      it('syncs platforms and updates config', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
          apiKey: 'api-key',
          profileKey: null,
        });

        const platforms = [
          {
            platform: 'LINKEDIN',
            connected: true,
            accountId: 'li-123',
            accountName: 'Test LinkedIn',
          },
          {
            platform: 'TWITTER',
            connected: true,
            accountId: 'tw-456',
            accountName: 'Test Twitter',
          },
        ];
        mockAdapterInstance.getConnectedPlatforms.mockResolvedValue(platforms);
        mockPrisma.socialPublishingConfig.update.mockResolvedValue({});

        const result =
          await socialPublishingService.syncConnectedPlatforms('tenant-123');

        expect(result).toEqual(platforms);
        expect(mockPrisma.socialPublishingConfig.update).toHaveBeenCalledWith({
          where: { tenantId: 'tenant-123' },
          data: { connectedPlatforms: platforms },
        });
      });

      it('throws error when config not found', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(null);

        await expect(
          socialPublishingService.syncConnectedPlatforms('nonexistent'),
        ).rejects.toThrow('Configuration not found');
      });
    });
  });

  describe('Post Management', () => {
    describe('createPost', () => {
      it('creates a draft post without scheduled time', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
        });

        const mockPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Test post content',
          status: 'DRAFT',
          targetPlatforms: ['LINKEDIN', 'TWITTER'],
          createdById: 1,
        };
        mockPrisma.socialMediaPost.create.mockResolvedValue(mockPost);

        const result = await socialPublishingService.createPost(
          'tenant-123',
          1,
          {
            text: 'Test post content',
            targetPlatforms: [
              PublishingPlatform.LINKEDIN,
              PublishingPlatform.TWITTER,
            ],
          },
        );

        expect(result.status).toBe('DRAFT');
        expect(result.text).toBe('Test post content');
      });

      it('creates a scheduled post with scheduled time', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
        });

        const scheduledFor = new Date(Date.now() + 86400000);
        const mockPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Scheduled post',
          status: 'SCHEDULED',
          scheduledFor,
          targetPlatforms: ['LINKEDIN'],
          createdById: 1,
        };
        mockPrisma.socialMediaPost.create.mockResolvedValue(mockPost);

        const result = await socialPublishingService.createPost(
          'tenant-123',
          1,
          {
            text: 'Scheduled post',
            targetPlatforms: [PublishingPlatform.LINKEDIN],
            scheduledFor,
          },
        );

        expect(result.status).toBe('SCHEDULED');
        expect(result.scheduledFor).toEqual(scheduledFor);
      });

      it('throws error when config not found', async () => {
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(null);

        await expect(
          socialPublishingService.createPost('nonexistent', 1, {
            text: 'Test',
            targetPlatforms: [PublishingPlatform.LINKEDIN],
          }),
        ).rejects.toThrow('Social publishing not configured for this tenant');
      });
    });

    describe('getPost', () => {
      it('returns post with relations', async () => {
        const mockPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Test post',
          status: 'DRAFT',
          createdBy: { id: 1, name: 'Test User', email: 'test@example.com' },
          content: null,
          history: [],
        };
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(mockPost);

        const result = await socialPublishingService.getPost(1, 'tenant-123');

        expect(result).toEqual(mockPost);
        expect(mockPrisma.socialMediaPost.findFirst).toHaveBeenCalledWith({
          where: { id: 1, tenantId: 'tenant-123' },
          include: expect.any(Object),
        });
      });

      it('returns null when post not found', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(null);

        const result = await socialPublishingService.getPost(999, 'tenant-123');

        expect(result).toBeNull();
      });
    });

    describe('listPosts', () => {
      it('lists posts with default filters', async () => {
        const mockPosts = [
          { id: 1, text: 'Post 1', status: 'DRAFT' },
          { id: 2, text: 'Post 2', status: 'SCHEDULED' },
        ];
        mockPrisma.socialMediaPost.findMany.mockResolvedValue(mockPosts);

        const result = await socialPublishingService.listPosts('tenant-123');

        expect(result).toEqual(mockPosts);
        expect(mockPrisma.socialMediaPost.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { tenantId: 'tenant-123' },
            orderBy: { createdAt: 'desc' },
          }),
        );
      });

      it('applies status filter', async () => {
        mockPrisma.socialMediaPost.findMany.mockResolvedValue([]);

        await socialPublishingService.listPosts('tenant-123', {
          status: 'SCHEDULED',
        });

        expect(mockPrisma.socialMediaPost.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: 'tenant-123',
              status: 'SCHEDULED',
            }),
          }),
        );
      });

      it('applies platform filter', async () => {
        mockPrisma.socialMediaPost.findMany.mockResolvedValue([]);

        await socialPublishingService.listPosts('tenant-123', {
          targetPlatform: PublishingPlatform.LINKEDIN,
        });

        expect(mockPrisma.socialMediaPost.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              targetPlatforms: { has: 'LINKEDIN' },
            }),
          }),
        );
      });

      it('applies date range filter', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        mockPrisma.socialMediaPost.findMany.mockResolvedValue([]);

        await socialPublishingService.listPosts('tenant-123', {
          startDate,
          endDate,
        });

        expect(mockPrisma.socialMediaPost.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdAt: { gte: startDate, lte: endDate },
            }),
          }),
        );
      });

      it('applies search filter', async () => {
        mockPrisma.socialMediaPost.findMany.mockResolvedValue([]);

        await socialPublishingService.listPosts('tenant-123', {
          search: 'marketing',
        });

        expect(mockPrisma.socialMediaPost.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { text: { contains: 'marketing', mode: 'insensitive' } },
              ]),
            }),
          }),
        );
      });

      it('applies pagination', async () => {
        mockPrisma.socialMediaPost.findMany.mockResolvedValue([]);

        await socialPublishingService.listPosts('tenant-123', {
          page: 2,
          limit: 10,
        });

        expect(mockPrisma.socialMediaPost.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 10,
          }),
        );
      });
    });

    describe('updatePost', () => {
      it('updates draft post successfully', async () => {
        const existingPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Original',
          status: 'DRAFT',
        };
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(existingPost);
        mockPrisma.socialMediaPost.update.mockResolvedValue({
          ...existingPost,
          text: 'Updated',
        });

        const result = await socialPublishingService.updatePost(
          1,
          'tenant-123',
          { text: 'Updated' },
        );

        expect(result.text).toBe('Updated');
      });

      it('updates scheduled post successfully', async () => {
        const existingPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Original',
          status: 'SCHEDULED',
        };
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(existingPost);
        mockPrisma.socialMediaPost.update.mockResolvedValue({
          ...existingPost,
          text: 'Updated',
        });

        const result = await socialPublishingService.updatePost(
          1,
          'tenant-123',
          { text: 'Updated' },
        );

        expect(result.text).toBe('Updated');
      });

      it('throws error when post not found', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(null);

        await expect(
          socialPublishingService.updatePost(999, 'tenant-123', {
            text: 'Update',
          }),
        ).rejects.toThrow('Post not found');
      });

      it('throws error when updating published post', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'PUBLISHED',
        });

        await expect(
          socialPublishingService.updatePost(1, 'tenant-123', {
            text: 'Update',
          }),
        ).rejects.toThrow('Cannot update post in PUBLISHED status');
      });

      it('throws error when updating failed post', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'FAILED',
        });

        await expect(
          socialPublishingService.updatePost(1, 'tenant-123', {
            text: 'Update',
          }),
        ).rejects.toThrow('Cannot update post in FAILED status');
      });
    });

    describe('deletePost', () => {
      it('deletes draft post', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'DRAFT',
        });
        mockPrisma.socialMediaPost.delete.mockResolvedValue({});

        await expect(
          socialPublishingService.deletePost(1, 'tenant-123'),
        ).resolves.toBeUndefined();

        expect(mockPrisma.socialMediaPost.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it('deletes published post and removes from platforms', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
          status: 'PUBLISHED',
          targetPlatforms: ['LINKEDIN'],
          platformResults: [{ postId: 'li-123' }],
        });
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          apiKey: 'api-key',
        });
        mockAdapterInstance.deletePost.mockResolvedValue(undefined);
        mockPrisma.socialMediaPost.delete.mockResolvedValue({});

        await socialPublishingService.deletePost(1, 'tenant-123');

        expect(mockAdapterInstance.deletePost).toHaveBeenCalledWith('li-123', [
          'LINKEDIN',
        ]);
      });

      it('throws error when post not found', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(null);

        await expect(
          socialPublishingService.deletePost(999, 'tenant-123'),
        ).rejects.toThrow('Post not found');
      });
    });
  });

  describe('Publishing Operations', () => {
    describe('publishPost', () => {
      it('publishes draft post successfully', async () => {
        const mockPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Test post',
          status: 'DRAFT',
          targetPlatforms: ['LINKEDIN', 'TWITTER'],
          mediaUrls: [],
          hashtags: [],
          linkUrl: null,
          retryCount: 0,
          maxRetries: 3,
        };

        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(mockPost);
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          apiKey: 'api-key',
          profileKey: null,
          shortenUrls: true,
        });

        mockAdapterInstance.publish.mockResolvedValue({
          success: true,
          platformResults: [
            { platform: 'LINKEDIN', success: true, postId: 'li-123' },
            { platform: 'TWITTER', success: true, postId: 'tw-456' },
          ],
        });

        mockPrisma.socialMediaPost.update.mockResolvedValue({
          ...mockPost,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        });

        mockPrisma.publishingHistory.createMany.mockResolvedValue({
          count: 2,
        });

        const result = await socialPublishingService.publishPost(
          1,
          'tenant-123',
        );

        expect(result.success).toBe(true);
        expect(result.post.status).toBe('PUBLISHED');
      });

      it('handles partial success (some platforms fail)', async () => {
        const mockPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Test post',
          status: 'DRAFT',
          targetPlatforms: ['LINKEDIN', 'TWITTER'],
          mediaUrls: [],
          hashtags: [],
          linkUrl: null,
          retryCount: 0,
          maxRetries: 3,
        };

        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(mockPost);
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          apiKey: 'api-key',
          shortenUrls: true,
        });

        mockAdapterInstance.publish.mockResolvedValue({
          success: false,
          platformResults: [
            { platform: 'LINKEDIN', success: true, postId: 'li-123' },
            {
              platform: 'TWITTER',
              success: false,
              error: 'Rate limit exceeded',
            },
          ],
        });

        mockPrisma.socialMediaPost.update.mockResolvedValue({
          ...mockPost,
          status: 'PARTIALLY_PUBLISHED',
        });

        mockPrisma.publishingHistory.createMany.mockResolvedValue({
          count: 2,
        });

        const result = await socialPublishingService.publishPost(
          1,
          'tenant-123',
        );

        expect(result.success).toBe(false);
        expect(result.post.status).toBe('PARTIALLY_PUBLISHED');
        expect(result.error).toBe('Some platforms failed to publish');
      });

      it('handles complete failure', async () => {
        const mockPost = {
          id: 1,
          tenantId: 'tenant-123',
          text: 'Test post',
          status: 'DRAFT',
          targetPlatforms: ['LINKEDIN'],
          mediaUrls: [],
          hashtags: [],
          linkUrl: null,
          retryCount: 0,
          maxRetries: 3,
        };

        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(mockPost);
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          apiKey: 'api-key',
          shortenUrls: true,
        });

        mockAdapterInstance.publish.mockRejectedValue(
          new Error('Network error'),
        );

        mockPrisma.socialMediaPost.update.mockResolvedValue({
          ...mockPost,
          status: 'FAILED',
          retryCount: 1,
        });

        const result = await socialPublishingService.publishPost(
          1,
          'tenant-123',
        );

        expect(result.success).toBe(false);
        expect(result.post.status).toBe('FAILED');
        expect(result.error).toBe('Network error');
      });

      it('throws error when post not found', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue(null);

        await expect(
          socialPublishingService.publishPost(999, 'tenant-123'),
        ).rejects.toThrow('Post not found');
      });

      it('throws error when config not found', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'DRAFT',
        });
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue(null);

        await expect(
          socialPublishingService.publishPost(1, 'tenant-123'),
        ).rejects.toThrow('Social publishing not configured');
      });

      it('throws error when post already published', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'PUBLISHED',
        });

        await expect(
          socialPublishingService.publishPost(1, 'tenant-123'),
        ).rejects.toThrow('Cannot publish post in PUBLISHED status');
      });
    });

    describe('schedulePost', () => {
      it('schedules draft post for future', async () => {
        const futureDate = new Date(Date.now() + 86400000);
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'DRAFT',
        });
        mockPrisma.socialMediaPost.update.mockResolvedValue({
          id: 1,
          status: 'SCHEDULED',
          scheduledFor: futureDate,
        });

        const result = await socialPublishingService.schedulePost(
          1,
          'tenant-123',
          futureDate,
        );

        expect(result.status).toBe('SCHEDULED');
        expect(result.scheduledFor).toEqual(futureDate);
      });

      it('throws error when post not in draft status', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'PUBLISHED',
        });

        await expect(
          socialPublishingService.schedulePost(
            1,
            'tenant-123',
            new Date(Date.now() + 86400000),
          ),
        ).rejects.toThrow('Cannot schedule post in PUBLISHED status');
      });

      it('throws error when scheduled time is in the past', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'DRAFT',
        });

        await expect(
          socialPublishingService.schedulePost(
            1,
            'tenant-123',
            new Date(Date.now() - 3600000),
          ),
        ).rejects.toThrow('Scheduled time must be in the future');
      });
    });

    describe('cancelScheduledPost', () => {
      it('cancels scheduled post and returns to draft', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'SCHEDULED',
        });
        mockPrisma.socialMediaPost.update.mockResolvedValue({
          id: 1,
          status: 'DRAFT',
          scheduledFor: null,
        });

        const result = await socialPublishingService.cancelScheduledPost(
          1,
          'tenant-123',
        );

        expect(result.status).toBe('DRAFT');
        expect(result.scheduledFor).toBeNull();
      });

      it('throws error when post is not scheduled', async () => {
        mockPrisma.socialMediaPost.findFirst.mockResolvedValue({
          id: 1,
          status: 'DRAFT',
        });

        await expect(
          socialPublishingService.cancelScheduledPost(1, 'tenant-123'),
        ).rejects.toThrow('Post is not scheduled');
      });
    });
  });

  describe('Metrics and History', () => {
    describe('getPublishingHistory', () => {
      it('returns history entries for post', async () => {
        const mockHistory = [
          {
            id: 1,
            postId: 1,
            platform: 'LINKEDIN',
            status: 'PUBLISHED',
            createdAt: new Date(),
          },
          {
            id: 2,
            postId: 1,
            platform: 'TWITTER',
            status: 'FAILED',
            error: 'Rate limit',
            createdAt: new Date(),
          },
        ];
        mockPrisma.publishingHistory.findMany.mockResolvedValue(mockHistory);

        const result = await socialPublishingService.getPublishingHistory(1);

        expect(result).toEqual(mockHistory);
        expect(mockPrisma.publishingHistory.findMany).toHaveBeenCalledWith({
          where: { postId: 1 },
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('syncPostMetrics', () => {
      it('syncs metrics for published post', async () => {
        mockPrisma.socialMediaPost.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
          status: 'PUBLISHED',
          history: [
            {
              id: 1,
              platform: 'LINKEDIN',
              status: 'PUBLISHED',
              externalPostId: 'li-123',
            },
          ],
        });
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          apiKey: 'api-key',
        });

        mockAdapterInstance.getPostMetrics.mockResolvedValue({
          impressions: 1000,
          likes: 50,
          comments: 10,
          shares: 5,
          clicks: 25,
        });

        mockPrisma.publishingHistory.update.mockResolvedValue({});

        await socialPublishingService.syncPostMetrics(1);

        expect(mockAdapterInstance.getPostMetrics).toHaveBeenCalledWith(
          'li-123',
        );
        expect(mockPrisma.publishingHistory.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: expect.objectContaining({
            impressions: 1000,
            likes: 50,
            comments: 10,
            shares: 5,
            clicks: 25,
          }),
        });
      });

      it('throws error when post not published', async () => {
        mockPrisma.socialMediaPost.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
          status: 'DRAFT',
          history: [],
        });

        await expect(
          socialPublishingService.syncPostMetrics(1),
        ).rejects.toThrow('Post has not been published');
      });

      it('continues syncing other platforms when one fails', async () => {
        mockPrisma.socialMediaPost.findUnique.mockResolvedValue({
          id: 1,
          tenantId: 'tenant-123',
          status: 'PUBLISHED',
          history: [
            {
              id: 1,
              platform: 'LINKEDIN',
              status: 'PUBLISHED',
              externalPostId: 'li-123',
            },
            {
              id: 2,
              platform: 'TWITTER',
              status: 'PUBLISHED',
              externalPostId: 'tw-456',
            },
          ],
        });
        mockPrisma.socialPublishingConfig.findUnique.mockResolvedValue({
          apiKey: 'api-key',
        });

        // First call fails, second succeeds
        mockAdapterInstance.getPostMetrics
          .mockRejectedValueOnce(new Error('LinkedIn API error'))
          .mockResolvedValueOnce({
            impressions: 500,
            likes: 25,
          });

        mockPrisma.publishingHistory.update.mockResolvedValue({});

        // Should not throw, should continue with Twitter
        await expect(
          socialPublishingService.syncPostMetrics(1),
        ).resolves.toBeUndefined();

        // Twitter update should still happen
        expect(mockPrisma.publishingHistory.update).toHaveBeenCalledTimes(1);
      });
    });
  });
});
