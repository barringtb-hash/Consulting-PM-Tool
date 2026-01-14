/**
 * Social Publishing Module - React Query Hooks
 *
 * This module provides all React Query hooks for social media publishing.
 * Supports configuration management, post CRUD, publishing actions, and metrics.
 *
 * @module social-publishing
 * @see moduleRegistry for module dependencies and invalidation rules
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { http } from '../../http';
import type {
  CancelPostInput,
  CancelResponse,
  ConfigCreateUpdateInput,
  ConfigResponse,
  ConnectedPlatform,
  HistoryQuery,
  HistoryResponse,
  MetricsQuery,
  MetricsResponse,
  PlatformSyncInput,
  PlatformSyncResponse,
  PlatformsResponse,
  PostCreateInput,
  PostFilters,
  PostResponse,
  PostsListResponse,
  PostUpdateInput,
  PublishNowInput,
  PublishResponse,
  SchedulePostInput,
  ScheduleResponse,
  SocialPost,
  SocialPublishingConfig,
} from './types';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query keys namespace for social publishing
 */
export const socialPublishingKeys = {
  all: ['socialPublishing'] as const,
  config: () => [...socialPublishingKeys.all, 'config'] as const,
  platforms: () => [...socialPublishingKeys.all, 'platforms'] as const,
  posts: {
    all: () => [...socialPublishingKeys.all, 'posts'] as const,
    list: (filters?: PostFilters) =>
      [...socialPublishingKeys.posts.all(), 'list', filters] as const,
    detail: (id: number) =>
      [...socialPublishingKeys.posts.all(), 'detail', id] as const,
    metrics: (id: number) =>
      [...socialPublishingKeys.posts.detail(id), 'metrics'] as const,
    history: (id: number) =>
      [...socialPublishingKeys.posts.detail(id), 'history'] as const,
  },
};

// ============================================================================
// API Functions
// ============================================================================

const API_BASE = '/api/social-publishing';

/**
 * Fetch social publishing configuration
 */
async function fetchConfig(): Promise<SocialPublishingConfig | null> {
  const response = await http.get<ConfigResponse>(`${API_BASE}/config`);
  return response.config;
}

/**
 * Update social publishing configuration
 */
async function updateConfig(
  data: ConfigCreateUpdateInput,
): Promise<SocialPublishingConfig> {
  const response = await http.post<ConfigResponse>(`${API_BASE}/config`, data);
  return response.config!;
}

/**
 * Fetch connected platforms
 */
async function fetchPlatforms(): Promise<ConnectedPlatform[]> {
  const response = await http.get<PlatformsResponse>(`${API_BASE}/platforms`);
  return response.platforms;
}

/**
 * Sync platforms from provider
 */
async function syncPlatforms(
  input?: PlatformSyncInput,
): Promise<PlatformSyncResponse> {
  return http.post<PlatformSyncResponse>(
    `${API_BASE}/platforms/sync`,
    input || {},
  );
}

/**
 * Fetch posts with optional filters
 */
async function fetchPosts(filters?: PostFilters): Promise<PostsListResponse> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/posts?${queryString}`
    : `${API_BASE}/posts`;

  return http.get<PostsListResponse>(url);
}

/**
 * Fetch a single post by ID
 */
async function fetchPost(postId: number): Promise<SocialPost> {
  const response = await http.get<PostResponse>(`${API_BASE}/posts/${postId}`);
  return response.post;
}

/**
 * Create a new post
 */
async function createPost(data: PostCreateInput): Promise<SocialPost> {
  const response = await http.post<PostResponse>(`${API_BASE}/posts`, data);
  return response.post;
}

/**
 * Update an existing post
 */
async function updatePost(
  postId: number,
  data: PostUpdateInput,
): Promise<SocialPost> {
  const response = await http.patch<PostResponse>(
    `${API_BASE}/posts/${postId}`,
    data,
  );
  return response.post;
}

/**
 * Delete a post
 */
async function deletePost(postId: number): Promise<void> {
  await http.delete(`${API_BASE}/posts/${postId}`);
}

/**
 * Publish a post immediately
 */
async function publishPost(
  postId: number,
  input?: PublishNowInput,
): Promise<PublishResponse> {
  return http.post<PublishResponse>(
    `${API_BASE}/posts/${postId}/publish`,
    input || {},
  );
}

/**
 * Schedule a post for later
 */
async function schedulePost(
  postId: number,
  input: SchedulePostInput,
): Promise<ScheduleResponse> {
  return http.post<ScheduleResponse>(
    `${API_BASE}/posts/${postId}/schedule`,
    input,
  );
}

/**
 * Cancel a scheduled post
 */
async function cancelScheduledPost(
  postId: number,
  input?: CancelPostInput,
): Promise<CancelResponse> {
  return http.post<CancelResponse>(
    `${API_BASE}/posts/${postId}/cancel`,
    input || {},
  );
}

/**
 * Fetch metrics for a post
 */
async function fetchPostMetrics(
  postId: number,
  query?: MetricsQuery,
): Promise<MetricsResponse> {
  const params = new URLSearchParams();

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/posts/${postId}/metrics?${queryString}`
    : `${API_BASE}/posts/${postId}/metrics`;

  return http.get<MetricsResponse>(url);
}

/**
 * Fetch publishing history for a post
 */
async function fetchPostHistory(
  postId: number,
  query?: HistoryQuery,
): Promise<HistoryResponse> {
  const params = new URLSearchParams();

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/posts/${postId}/history?${queryString}`
    : `${API_BASE}/posts/${postId}/history`;

  return http.get<HistoryResponse>(url);
}

// ============================================================================
// Configuration Hooks
// ============================================================================

/**
 * Fetch social publishing configuration for the current tenant.
 *
 * @returns Query result with configuration or null if not configured
 */
export function useSocialPublishingConfig(): UseQueryResult<
  SocialPublishingConfig | null,
  Error
> {
  return useQuery({
    queryKey: socialPublishingKeys.config(),
    queryFn: fetchConfig,
  });
}

/**
 * Update social publishing configuration.
 *
 * Creates or updates the configuration for the current tenant.
 */
export function useUpdateSocialPublishingConfig(): UseMutationResult<
  SocialPublishingConfig,
  Error,
  ConfigCreateUpdateInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      // Invalidate config and platforms as API key change affects both
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.config(),
      });
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.platforms(),
      });
    },
  });
}

/**
 * Fetch connected social media platforms.
 *
 * Returns the list of platforms connected via the publishing provider.
 */
export function useConnectedPlatforms(): UseQueryResult<
  ConnectedPlatform[],
  Error
> {
  return useQuery({
    queryKey: socialPublishingKeys.platforms(),
    queryFn: fetchPlatforms,
  });
}

/**
 * Sync platforms from the publishing provider.
 *
 * Forces a refresh of connected platform information from Ayrshare.
 */
export function useSyncPlatforms(): UseMutationResult<
  PlatformSyncResponse,
  Error,
  PlatformSyncInput | undefined,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncPlatforms,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.platforms(),
      });
    },
  });
}

// ============================================================================
// Post Hooks
// ============================================================================

/**
 * Fetch social posts with optional filters.
 *
 * Supports pagination, status filtering, platform filtering, and search.
 *
 * @param filters - Optional filters for the post list
 * @returns Query result with paginated posts
 */
export function useSocialPosts(
  filters?: PostFilters,
): UseQueryResult<PostsListResponse, Error> {
  return useQuery({
    queryKey: socialPublishingKeys.posts.list(filters),
    queryFn: () => fetchPosts(filters),
  });
}

/**
 * Fetch a single social post by ID.
 *
 * @param postId - The post ID to fetch
 * @returns Query result with the post
 */
export function useSocialPost(
  postId: number,
): UseQueryResult<SocialPost, Error> {
  return useQuery({
    queryKey: socialPublishingKeys.posts.detail(postId),
    queryFn: () => fetchPost(postId),
    enabled: !!postId && postId > 0,
  });
}

/**
 * Create a new social media post.
 *
 * The post is created as a draft by default. Use usePublishPost or
 * useSchedulePost to publish or schedule it.
 */
export function useCreateSocialPost(): UseMutationResult<
  SocialPost,
  Error,
  PostCreateInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.all(),
      });
    },
  });
}

/**
 * Update an existing social post.
 *
 * Only draft and scheduled posts can be updated. Published posts are immutable.
 */
export function useUpdateSocialPost(): UseMutationResult<
  SocialPost,
  Error,
  { postId: number; payload: PostUpdateInput },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, payload }) => updatePost(postId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.all(),
      });
      queryClient.setQueryData(
        socialPublishingKeys.posts.detail(variables.postId),
        data,
      );
    },
  });
}

/**
 * Delete a social post.
 *
 * Permanently removes the post. Published posts may also be removed from
 * connected platforms depending on provider capabilities.
 */
export function useDeleteSocialPost(): UseMutationResult<
  void,
  Error,
  number,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.all(),
      });
      queryClient.removeQueries({
        queryKey: socialPublishingKeys.posts.detail(postId),
      });
    },
  });
}

// ============================================================================
// Publishing Action Hooks
// ============================================================================

/**
 * Publish a post immediately to selected platforms.
 *
 * Triggers immediate publishing to all target platforms. The post status
 * will be updated based on the results from each platform.
 */
export function usePublishPost(): UseMutationResult<
  PublishResponse,
  Error,
  { postId: number; input?: PublishNowInput },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, input }) => publishPost(postId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.all(),
      });
      queryClient.setQueryData(
        socialPublishingKeys.posts.detail(variables.postId),
        data.post,
      );
      // Invalidate history as publishing adds a new history entry
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.history(variables.postId),
      });
    },
  });
}

/**
 * Schedule a post for future publishing.
 *
 * Sets the post to be published at the specified time. The post status
 * will change to 'scheduled'.
 */
export function useSchedulePost(): UseMutationResult<
  ScheduleResponse,
  Error,
  { postId: number; input: SchedulePostInput },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, input }) => schedulePost(postId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.all(),
      });
      queryClient.setQueryData(
        socialPublishingKeys.posts.detail(variables.postId),
        data.post,
      );
      // Invalidate history as scheduling adds a new history entry
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.history(variables.postId),
      });
    },
  });
}

/**
 * Cancel a scheduled post.
 *
 * Removes the post from the publishing queue. The post status will change
 * to 'cancelled' and it can be rescheduled or published manually.
 */
export function useCancelScheduledPost(): UseMutationResult<
  CancelResponse,
  Error,
  { postId: number; input?: CancelPostInput },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, input }) => cancelScheduledPost(postId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.all(),
      });
      queryClient.setQueryData(
        socialPublishingKeys.posts.detail(variables.postId),
        data.post,
      );
      // Invalidate history as cancellation adds a new history entry
      queryClient.invalidateQueries({
        queryKey: socialPublishingKeys.posts.history(variables.postId),
      });
    },
  });
}

// ============================================================================
// Metrics Hooks
// ============================================================================

/**
 * Fetch engagement metrics for a published post.
 *
 * Returns metrics from each platform the post was published to, including
 * impressions, likes, comments, shares, and engagement rate.
 *
 * @param postId - The post ID to get metrics for
 * @param query - Optional query parameters for filtering
 * @returns Query result with platform metrics
 */
export function usePostMetrics(
  postId: number,
  query?: MetricsQuery,
): UseQueryResult<MetricsResponse, Error> {
  return useQuery({
    queryKey: socialPublishingKeys.posts.metrics(postId),
    queryFn: () => fetchPostMetrics(postId, query),
    enabled: !!postId && postId > 0,
    // Metrics can be stale, refetch less frequently
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch publishing history for a post.
 *
 * Returns a chronological log of all publishing actions taken on the post,
 * including scheduling, publishing, failures, and cancellations.
 *
 * @param postId - The post ID to get history for
 * @param query - Optional pagination parameters
 * @returns Query result with history entries
 */
export function usePostHistory(
  postId: number,
  query?: HistoryQuery,
): UseQueryResult<HistoryResponse, Error> {
  return useQuery({
    queryKey: socialPublishingKeys.posts.history(postId),
    queryFn: () => fetchPostHistory(postId, query),
    enabled: !!postId && postId > 0,
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  // Configuration types
  SocialPublishingConfig,
  ConfigCreateUpdateInput,
  ConnectedPlatform,
  // Post types
  SocialPost,
  PostCreateInput,
  PostUpdateInput,
  PostFilters,
  PostsListResponse,
  MediaAttachment,
  PlatformContent,
  // Publishing types
  PublishNowInput,
  PublishResponse,
  SchedulePostInput,
  ScheduleResponse,
  CancelPostInput,
  CancelResponse,
  PlatformResult,
  // Metrics and history types
  PostMetrics,
  MetricsResponse,
  MetricsQuery,
  HistoryEntry,
  HistoryResponse,
  HistoryQuery,
  // Platform types
  PlatformSyncInput,
  PlatformSyncResponse,
  // Enum types
  SocialPlatform,
  PostStatus,
  PublishingPlatform,
  PublishStatus,
} from './types';
