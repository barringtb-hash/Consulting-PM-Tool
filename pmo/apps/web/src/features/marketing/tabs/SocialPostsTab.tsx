/**
 * Social Posts Tab
 *
 * Extracted from SocialPublishingPage for use in the unified Marketing page.
 * Manages social media posts with a view filter pattern (instead of nested tabs).
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  Plus,
  Send,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit2,
  Image,
  Hash,
  ExternalLink,
  MoreVertical,
  X,
  Settings,
} from 'lucide-react';

import { http } from '../../../api/http';
import useRedirectOnUnauthorized from '../../../auth/useRedirectOnUnauthorized';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { Modal } from '../../../ui/Modal';
import { useToast } from '../../../ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

type PublishingPlatform =
  | 'LINKEDIN'
  | 'TWITTER'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'THREADS'
  | 'PINTEREST'
  | 'YOUTUBE'
  | 'BLUESKY';

type PublishStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

type PostViewFilter = 'all' | 'scheduled' | 'published' | 'drafts';

interface ConnectedPlatform {
  platform: PublishingPlatform;
  accountId: string;
  accountName: string;
  connected: boolean;
  lastSync?: string;
  username?: string;
  profileImageUrl?: string;
  expiresAt?: string;
}

interface SocialPost {
  id: number;
  text: string;
  status: PublishStatus;
  targetPlatforms: PublishingPlatform[];
  mediaUrls?: string[];
  linkUrl?: string;
  hashtags?: string[];
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    name: string;
  };
  platformResults?: PlatformResult[];
}

interface PlatformResult {
  platform: PublishingPlatform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  publishedAt?: string;
}

interface SocialPublishingConfig {
  id: number;
  tenantId: string;
  provider: string;
  isActive: boolean;
  defaultTimezone?: string;
  autoHashtags?: boolean;
  shortenUrls?: boolean;
}

interface CreatePostInput {
  text: string;
  targetPlatforms: PublishingPlatform[];
  mediaUrls?: string[];
  linkUrl?: string;
  hashtags?: string[];
  scheduledFor?: string;
}

interface PostFilters {
  status?: PublishStatus;
  targetPlatform?: PublishingPlatform;
  limit?: number;
  offset?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchConfig(): Promise<SocialPublishingConfig | null> {
  try {
    const data = await http.get<{ config: SocialPublishingConfig }>(
      '/social-publishing/config',
    );
    return data.config || null;
  } catch {
    return null;
  }
}

async function fetchPlatforms(): Promise<ConnectedPlatform[]> {
  try {
    const data = await http.get<{ platforms: ConnectedPlatform[] }>(
      '/social-publishing/platforms',
    );
    return data.platforms || [];
  } catch {
    return [];
  }
}

async function fetchPosts(
  filters: PostFilters,
): Promise<{ posts: SocialPost[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.targetPlatform)
    params.set('targetPlatform', filters.targetPlatform);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const queryString = params.toString();
  const url = queryString
    ? `/social-publishing/posts?${queryString}`
    : '/social-publishing/posts';
  return http.get<{ posts: SocialPost[]; total: number }>(url);
}

async function createPost(
  input: CreatePostInput,
): Promise<{ post: SocialPost }> {
  return http.post<{ post: SocialPost }>('/social-publishing/posts', input);
}

async function updatePost(
  id: number,
  input: Partial<CreatePostInput>,
): Promise<{ post: SocialPost }> {
  return http.patch<{ post: SocialPost }>(
    `/social-publishing/posts/${id}`,
    input,
  );
}

async function deletePost(id: number): Promise<void> {
  await http.delete(`/social-publishing/posts/${id}`);
}

async function publishPost(
  id: number,
): Promise<{ post: SocialPost; platformResults: PlatformResult[] }> {
  return http.post<{ post: SocialPost; platformResults: PlatformResult[] }>(
    `/social-publishing/posts/${id}/publish`,
  );
}

async function schedulePost(
  id: number,
  scheduledFor: string,
): Promise<{ post: SocialPost }> {
  return http.post<{ post: SocialPost }>(
    `/social-publishing/posts/${id}/schedule`,
    { scheduledFor },
  );
}

async function cancelScheduledPost(id: number): Promise<{ post: SocialPost }> {
  return http.post<{ post: SocialPost }>(
    `/social-publishing/posts/${id}/cancel`,
  );
}

// ============================================================================
// HOOKS
// ============================================================================

const QUERY_KEYS = {
  config: ['social-publishing', 'config'] as const,
  platforms: ['social-publishing', 'platforms'] as const,
  posts: (filters?: PostFilters) =>
    ['social-publishing', 'posts', filters] as const,
};

function useSocialPublishingConfig(): UseQueryResult<
  SocialPublishingConfig | null,
  Error
> {
  return useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000,
  });
}

function useConnectedPlatforms(): UseQueryResult<ConnectedPlatform[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.platforms,
    queryFn: fetchPlatforms,
    staleTime: 2 * 60 * 1000,
  });
}

function usePosts(
  filters: PostFilters,
): UseQueryResult<{ posts: SocialPost[]; total: number }, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.posts(filters),
    queryFn: () => fetchPosts(filters),
    staleTime: 30 * 1000,
  });
}

function useCreatePost(): UseMutationResult<
  { post: SocialPost },
  Error,
  CreatePostInput,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['social-publishing', 'posts'],
      });
    },
  });
}

function useUpdatePost(): UseMutationResult<
  { post: SocialPost },
  Error,
  { id: number; input: Partial<CreatePostInput> },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updatePost(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['social-publishing', 'posts'],
      });
    },
  });
}

function useDeletePost(): UseMutationResult<void, Error, number, unknown> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['social-publishing', 'posts'],
      });
    },
  });
}

function usePublishPost(): UseMutationResult<
  { post: SocialPost; platformResults: PlatformResult[] },
  Error,
  number,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishPost,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['social-publishing', 'posts'],
      });
    },
  });
}

function useSchedulePost(): UseMutationResult<
  { post: SocialPost },
  Error,
  { id: number; scheduledFor: string },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledFor }) => schedulePost(id, scheduledFor),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['social-publishing', 'posts'],
      });
    },
  });
}

function useCancelScheduledPost(): UseMutationResult<
  { post: SocialPost },
  Error,
  number,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelScheduledPost,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['social-publishing', 'posts'],
      });
    },
  });
}

// ============================================================================
// CONSTANTS AND HELPERS
// ============================================================================

const PLATFORM_CONFIG: Record<
  PublishingPlatform,
  { label: string; color: string; icon: string }
> = {
  LINKEDIN: { label: 'LinkedIn', color: 'bg-blue-600', icon: 'in' },
  TWITTER: {
    label: 'Twitter/X',
    color: 'bg-neutral-900 dark:bg-white dark:text-neutral-900',
    icon: 'X',
  },
  INSTAGRAM: {
    label: 'Instagram',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    icon: 'IG',
  },
  FACEBOOK: { label: 'Facebook', color: 'bg-blue-500', icon: 'fb' },
  TIKTOK: { label: 'TikTok', color: 'bg-neutral-900', icon: 'TT' },
  THREADS: { label: 'Threads', color: 'bg-neutral-800', icon: '@' },
  PINTEREST: { label: 'Pinterest', color: 'bg-red-600', icon: 'P' },
  YOUTUBE: { label: 'YouTube', color: 'bg-red-500', icon: 'YT' },
  BLUESKY: { label: 'Bluesky', color: 'bg-sky-500', icon: 'BS' },
};

const STATUS_CONFIG: Record<
  PublishStatus,
  { label: string; variant: BadgeVariant }
> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  SCHEDULED: { label: 'Scheduled', variant: 'primary' },
  PUBLISHING: { label: 'Publishing', variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
};

const VIEW_FILTER_CONFIG: {
  id: PostViewFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'all', label: 'All Posts', icon: Edit2 },
  { id: 'scheduled', label: 'Scheduled', icon: Clock },
  { id: 'published', label: 'Published', icon: CheckCircle },
  { id: 'drafts', label: 'Drafts', icon: Edit2 },
];

const SUGGESTED_HASHTAGS = [
  '#AI',
  '#Consulting',
  '#Business',
  '#Strategy',
  '#Innovation',
  '#Leadership',
  '#Tech',
  '#Productivity',
  '#Growth',
  '#Digital',
];

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 0) return 'Past';
  if (diffMinutes < 60) return `in ${diffMinutes}m`;
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays < 7) return `in ${diffDays}d`;
  return formatDate(dateString);
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  iconBg: string;
  iconColor: string;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: StatCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {label}
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

interface PlatformBadgeProps {
  platform: PublishingPlatform;
  size?: 'sm' | 'md';
}

function PlatformBadge({
  platform,
  size = 'sm',
}: PlatformBadgeProps): JSX.Element {
  const config = PLATFORM_CONFIG[platform];
  const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-8 h-8 text-xs';

  return (
    <div
      className={`${sizeClasses} rounded-full ${config.color} text-white flex items-center justify-center font-bold`}
      title={config.label}
    >
      {config.icon}
    </div>
  );
}

interface PostCardProps {
  post: SocialPost;
  onEdit: (post: SocialPost) => void;
  onDelete: (postId: number) => void;
  onPublish: (postId: number) => void;
  onCancel: (postId: number) => void;
  isPublishing: boolean;
  isCancelling: boolean;
}

function PostCard({
  post,
  onEdit,
  onDelete,
  onPublish,
  onCancel,
  isPublishing,
  isCancelling,
}: PostCardProps): JSX.Element {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = STATUS_CONFIG[post.status];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-1.5 flex-wrap">
          {post.targetPlatforms.map((platform) => (
            <PlatformBadge key={platform} platform={platform} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Post actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(post);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                {post.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onPublish(post.id);
                    }}
                    disabled={isPublishing}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <Send className="w-4 h-4" />
                    Publish Now
                  </button>
                )}
                {post.status === 'SCHEDULED' && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onCancel(post.id);
                    }}
                    disabled={isCancelling}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <X className="w-4 h-4" />
                    Cancel Schedule
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(post.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-neutral-800 dark:text-neutral-200 line-clamp-3 mb-3">
        {post.text}
      </p>

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          <Image className="w-3.5 h-3.5" />
          {post.mediaUrls.length} media file
          {post.mediaUrls.length > 1 ? 's' : ''}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <span>Created: {formatDate(post.createdAt)}</span>
        {post.scheduledFor && post.status === 'SCHEDULED' && (
          <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeTime(post.scheduledFor)}
          </span>
        )}
        {post.publishedAt && post.status === 'PUBLISHED' && (
          <span className="flex items-center gap-1 text-success-600 dark:text-success-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Published: {formatDate(post.publishedAt)}
          </span>
        )}
      </div>

      {post.platformResults &&
        post.platformResults.length > 0 &&
        post.status === 'PUBLISHED' && (
          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
              Platform Results
            </p>
            <div className="flex flex-wrap gap-2">
              {post.platformResults.map((result) => (
                <div
                  key={result.platform}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                    result.success
                      ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                      : 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
                  }`}
                >
                  <PlatformBadge platform={result.platform} size="sm" />
                  {result.success ? (
                    result.postUrl ? (
                      <a
                        href={result.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )
                  ) : (
                    <span title={result.error}>
                      <AlertCircle className="w-3 h-3" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
    </Card>
  );
}

function PostCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-5 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-5 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    </Card>
  );
}

interface PostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  editingPost?: SocialPost | null;
  connectedPlatforms: ConnectedPlatform[];
}

function PostComposer({
  isOpen,
  onClose,
  editingPost,
  connectedPlatforms,
}: PostComposerProps): JSX.Element {
  const { showToast } = useToast();
  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const publishPostMutation = usePublishPost();
  const schedulePostMutation = useSchedulePost();

  const [text, setText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    PublishingPlatform[]
  >([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>(
    'draft',
  );

  useEffect(() => {
    if (isOpen && editingPost) {
      setText(editingPost.text);
      setSelectedPlatforms(editingPost.targetPlatforms);
      setHashtags(editingPost.hashtags || []);
      setLinkUrl(editingPost.linkUrl || '');
      if (editingPost.scheduledFor) {
        const date = new Date(editingPost.scheduledFor);
        setScheduleDate(date.toISOString().split('T')[0]);
        setScheduleTime(date.toTimeString().slice(0, 5));
        setPublishMode('schedule');
      } else {
        setPublishMode('draft');
      }
    } else if (isOpen) {
      setText('');
      setSelectedPlatforms([]);
      setHashtags([]);
      setHashtagInput('');
      setLinkUrl('');
      setScheduleDate('');
      setScheduleTime('');
      setPublishMode('draft');
    }
  }, [isOpen, editingPost]);

  const handlePlatformToggle = useCallback((platform: PublishingPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }, []);

  const handleAddHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags((prev) => [...prev, tag]);
      setHashtagInput('');
    }
  }, [hashtagInput, hashtags]);

  const handleRemoveHashtag = useCallback((tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      showToast('Please enter post content', 'error');
      return;
    }
    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }

    const input: CreatePostInput = {
      text: text.trim(),
      targetPlatforms: selectedPlatforms,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      linkUrl: linkUrl.trim() || undefined,
    };

    try {
      let postId: number;

      if (editingPost) {
        const result = await updatePostMutation.mutateAsync({
          id: editingPost.id,
          input,
        });
        postId = result.post.id;
        showToast('Post updated successfully', 'success');
      } else {
        const result = await createPostMutation.mutateAsync(input);
        postId = result.post.id;
        showToast('Post created successfully', 'success');
      }

      if (publishMode === 'now') {
        await publishPostMutation.mutateAsync(postId);
        showToast('Post published successfully', 'success');
      } else if (publishMode === 'schedule' && scheduleDate && scheduleTime) {
        const scheduledFor = new Date(
          `${scheduleDate}T${scheduleTime}`,
        ).toISOString();
        await schedulePostMutation.mutateAsync({ id: postId, scheduledFor });
        showToast('Post scheduled successfully', 'success');
      }

      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save post';
      showToast(message, 'error');
    }
  }, [
    text,
    selectedPlatforms,
    hashtags,
    linkUrl,
    publishMode,
    scheduleDate,
    scheduleTime,
    editingPost,
    createPostMutation,
    updatePostMutation,
    publishPostMutation,
    schedulePostMutation,
    showToast,
    onClose,
  ]);

  const isLoading =
    createPostMutation.isPending ||
    updatePostMutation.isPending ||
    publishPostMutation.isPending ||
    schedulePostMutation.isPending;

  const availablePlatforms = connectedPlatforms.filter((p) => p.connected);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPost ? 'Edit Post' : 'Create New Post'}
      size="large"
    >
      <div className="space-y-6">
        <Textarea
          label="Post Content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What would you like to share?"
          rows={4}
          required
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Target Platforms
          </label>
          {availablePlatforms.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No connected platforms. Please connect platforms in Settings.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {availablePlatforms.map((platform) => {
                const config = PLATFORM_CONFIG[platform.platform];
                const isSelected = selectedPlatforms.includes(
                  platform.platform,
                );
                return (
                  <button
                    key={platform.platform}
                    type="button"
                    onClick={() => handlePlatformToggle(platform.platform)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                    }`}
                  >
                    <PlatformBadge platform={platform.platform} />
                    <span className="text-sm font-medium">{config.label}</span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Hashtags
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              placeholder="Add hashtag..."
              onKeyDown={(e) =>
                e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())
              }
            />
            <Button variant="secondary" onClick={handleAddHashtag}>
              <Hash className="w-4 h-4" />
            </Button>
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-sm"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveHashtag(tag)}
                    className="hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 mr-1">
              Suggestions:
            </span>
            {SUGGESTED_HASHTAGS.slice(0, 6).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const cleanTag = tag.replace('#', '');
                  if (!hashtags.includes(cleanTag)) {
                    setHashtags((prev) => [...prev, cleanTag]);
                  }
                }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Link URL (optional)"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          type="url"
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Publishing Option
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="publishMode"
                value="draft"
                checked={publishMode === 'draft'}
                onChange={() => setPublishMode('draft')}
                className="text-primary-600"
              />
              <span className="text-sm">Save as Draft</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="publishMode"
                value="now"
                checked={publishMode === 'now'}
                onChange={() => setPublishMode('now')}
                className="text-primary-600"
              />
              <span className="text-sm">Publish Now</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="publishMode"
                value="schedule"
                checked={publishMode === 'schedule'}
                onChange={() => setPublishMode('schedule')}
                className="text-primary-600"
              />
              <span className="text-sm">Schedule</span>
            </label>
          </div>
        </div>

        {publishMode === 'schedule' && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              required
            />
            <Input
              label="Time"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              required
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {publishMode === 'now' ? (
              <>
                <Send className="w-4 h-4" />
                Publish Now
              </>
            ) : publishMode === 'schedule' ? (
              <>
                <Calendar className="w-4 h-4" />
                Schedule Post
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Save Draft
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {description}
        </p>
        {action}
      </div>
    </Card>
  );
}

const ErrorState: React.FC<{
  title: string;
  message: string;
  onRetry?: () => void;
}> = ({ title, message, onRetry }) => (
  <Card className="p-8 text-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-error-100 dark:bg-error-900/50 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-error-600 dark:text-error-400" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  </Card>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface SocialPostsTabProps {
  onNavigateToSettings?: () => void;
}

export function SocialPostsTab({
  onNavigateToSettings,
}: SocialPostsTabProps): JSX.Element {
  const { showToast } = useToast();
  const [viewFilter, setViewFilter] = useState<PostViewFilter>('all');
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Queries
  const configQuery = useSocialPublishingConfig();
  const platformsQuery = useConnectedPlatforms();
  const allPostsQuery = usePosts({ limit: 50 });

  // Mutations
  const deletePostMutation = useDeletePost();
  const publishPostMutation = usePublishPost();
  const cancelPostMutation = useCancelScheduledPost();

  useRedirectOnUnauthorized(configQuery.error);
  useRedirectOnUnauthorized(platformsQuery.error);

  // Computed values
  const platforms = platformsQuery.data || [];
  const connectedCount = platforms.filter((p) => p.connected).length;
  const allPosts = useMemo(
    () => allPostsQuery.data?.posts ?? [],
    [allPostsQuery.data],
  );

  // Filter posts based on view filter
  const filteredPosts = useMemo(() => {
    switch (viewFilter) {
      case 'scheduled':
        return allPosts.filter((p) => p.status === 'SCHEDULED');
      case 'published':
        return allPosts.filter((p) => p.status === 'PUBLISHED');
      case 'drafts':
        return allPosts.filter((p) => p.status === 'DRAFT');
      default:
        return allPosts;
    }
  }, [allPosts, viewFilter]);

  const stats = useMemo(
    () => ({
      total: allPosts.length,
      published: allPosts.filter((p) => p.status === 'PUBLISHED').length,
      scheduled: allPosts.filter((p) => p.status === 'SCHEDULED').length,
      drafts: allPosts.filter((p) => p.status === 'DRAFT').length,
      connected: connectedCount,
    }),
    [allPosts, connectedCount],
  );

  // Handlers
  const handleEditPost = useCallback((post: SocialPost) => {
    setEditingPost(post);
    setShowComposer(true);
  }, []);

  const handleDeletePost = useCallback(
    (postId: number) => {
      if (!confirm('Are you sure you want to delete this post?')) return;
      deletePostMutation.mutate(postId, {
        onSuccess: () => {
          showToast('Post deleted successfully', 'success');
        },
        onError: (error) => {
          showToast(error.message || 'Failed to delete post', 'error');
        },
      });
    },
    [deletePostMutation, showToast],
  );

  const handlePublishPost = useCallback(
    (postId: number) => {
      publishPostMutation.mutate(postId, {
        onSuccess: () => {
          showToast('Post published successfully', 'success');
        },
        onError: (error) => {
          showToast(error.message || 'Failed to publish post', 'error');
        },
      });
    },
    [publishPostMutation, showToast],
  );

  const handleCancelPost = useCallback(
    (postId: number) => {
      cancelPostMutation.mutate(postId, {
        onSuccess: () => {
          showToast('Scheduled post cancelled', 'success');
        },
        onError: (error) => {
          showToast(error.message || 'Failed to cancel post', 'error');
        },
      });
    },
    [cancelPostMutation, showToast],
  );

  const handleCloseComposer = useCallback(() => {
    setShowComposer(false);
    setEditingPost(null);
  }, []);

  const isLoading =
    configQuery.isLoading ||
    platformsQuery.isLoading ||
    allPostsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={<Send className="w-5 h-5" />}
            label="Published"
            value={stats.published}
            iconBg="bg-success-100 dark:bg-success-900/50"
            iconColor="text-success-600 dark:text-success-400"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Scheduled"
            value={stats.scheduled}
            iconBg="bg-primary-100 dark:bg-primary-900/50"
            iconColor="text-primary-600 dark:text-primary-400"
          />
          <StatCard
            icon={<Edit2 className="w-5 h-5" />}
            label="Drafts"
            value={stats.drafts}
            iconBg="bg-neutral-100 dark:bg-neutral-800"
            iconColor="text-neutral-600 dark:text-neutral-400"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Total Posts"
            value={stats.total}
            iconBg="bg-violet-100 dark:bg-violet-900/50"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Connected"
            value={stats.connected}
            iconBg="bg-blue-100 dark:bg-blue-900/50"
            iconColor="text-blue-600 dark:text-blue-400"
          />
        </div>
      )}

      {/* View Filter & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {VIEW_FILTER_CONFIG.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.id}
                variant={viewFilter === filter.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewFilter(filter.id)}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToSettings && (
            <Button variant="ghost" size="sm" onClick={onNavigateToSettings}>
              <Settings className="w-4 h-4" />
              Platform Settings
            </Button>
          )}
          <Button onClick={() => setShowComposer(true)}>
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Posts Grid */}
      {allPostsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : allPostsQuery.isError ? (
        <ErrorState
          title="Failed to load posts"
          message={
            allPostsQuery.error?.message ||
            'An error occurred while loading posts'
          }
          onRetry={() => allPostsQuery.refetch()}
        />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={<Edit2 className="w-8 h-8 text-neutral-400" />}
          title={
            viewFilter === 'all' ? 'No posts yet' : `No ${viewFilter} posts`
          }
          description={
            viewFilter === 'all'
              ? 'Create your first post to start publishing content across your social media platforms.'
              : `You don't have any ${viewFilter} posts at the moment.`
          }
          action={
            <Button onClick={() => setShowComposer(true)}>
              <Plus className="w-4 h-4" />
              Create Post
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onPublish={handlePublishPost}
              onCancel={handleCancelPost}
              isPublishing={publishPostMutation.isPending}
              isCancelling={cancelPostMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* No config warning */}
      {!configQuery.data && !configQuery.isLoading && (
        <Card className="p-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                Configuration Required
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Social publishing requires API configuration. Go to Settings to
                set up the Ayrshare integration.
              </p>
              {onNavigateToSettings && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={onNavigateToSettings}
                >
                  <Settings className="w-4 h-4" />
                  Go to Settings
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Post Composer Modal */}
      <PostComposer
        isOpen={showComposer}
        onClose={handleCloseComposer}
        editingPost={editingPost}
        connectedPlatforms={platforms}
      />
    </div>
  );
}

export default SocialPostsTab;
