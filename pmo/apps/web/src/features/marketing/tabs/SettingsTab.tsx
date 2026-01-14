/**
 * Settings Tab
 *
 * Platform connections and configuration tab for the unified Marketing page.
 * Extracted from SocialPublishingPage for modular architecture.
 *
 * Features:
 * - Display connected social media platforms
 * - Platform sync functionality
 * - Configuration warning when not configured
 *
 * @module features/marketing/tabs/SettingsTab
 */

import React from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { RefreshCw, Link2, Link2Off, AlertCircle } from 'lucide-react';

import { http } from '../../../api/http';
import useRedirectOnUnauthorized from '../../../auth/useRedirectOnUnauthorized';
import { Button } from '../../../ui/Button';
import { Card, CardHeader } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { useToast } from '../../../ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported publishing platforms
 */
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

/**
 * Connected platform information
 */
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

/**
 * Publishing configuration
 */
interface SocialPublishingConfig {
  id: number;
  tenantId: string;
  provider: string;
  isActive: boolean;
  defaultTimezone?: string;
  autoHashtags?: boolean;
  shortenUrls?: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch social publishing configuration
 */
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

/**
 * Fetch connected platforms
 */
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

/**
 * Sync platforms from provider
 */
async function syncPlatforms(
  forceRefresh = false,
): Promise<{ platforms: ConnectedPlatform[]; syncedAt: string }> {
  return http.post<{ platforms: ConnectedPlatform[]; syncedAt: string }>(
    '/social-publishing/platforms/sync',
    {
      forceRefresh,
    },
  );
}

// ============================================================================
// HOOKS
// ============================================================================

const QUERY_KEYS = {
  config: ['social-publishing', 'config'] as const,
  platforms: ['social-publishing', 'platforms'] as const,
};

/**
 * Hook to fetch social publishing configuration
 */
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

/**
 * Hook to fetch connected platforms
 */
function useConnectedPlatforms(): UseQueryResult<ConnectedPlatform[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.platforms,
    queryFn: fetchPlatforms,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to sync platforms from provider
 */
function useSyncPlatforms(): UseMutationResult<
  { platforms: ConnectedPlatform[]; syncedAt: string },
  Error,
  boolean,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPlatforms,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.platforms, data.platforms);
    },
  });
}

// ============================================================================
// CONSTANTS AND HELPERS
// ============================================================================

/**
 * Platform display configuration
 */
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

/**
 * Format date for display
 */
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Skeleton for platform connection card
 */
function ConnectionCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    </Card>
  );
}

/**
 * Platform connection card
 */
interface ConnectionCardProps {
  platform: ConnectedPlatform;
  onSync: () => void;
  isSyncing: boolean;
}

function ConnectionCard({
  platform,
  onSync,
  isSyncing,
}: ConnectionCardProps): JSX.Element {
  const config = PLATFORM_CONFIG[platform.platform];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-full ${config.color} text-white flex items-center justify-center text-lg font-bold`}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              {config.label}
            </h3>
            {platform.connected ? (
              <Badge variant="success" size="sm">
                <Link2 className="w-3 h-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                <Link2Off className="w-3 h-3" />
                Disconnected
              </Badge>
            )}
          </div>
          {platform.accountName && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
              {platform.username
                ? `@${platform.username}`
                : platform.accountName}
            </p>
          )}
          {platform.lastSync && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Last synced: {formatDate(platform.lastSync)}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </Card>
  );
}

/**
 * Empty state component for when no platforms are configured
 */
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface SettingsTabProps {
  onSyncComplete?: () => void;
}

/**
 * Settings Tab Component
 *
 * Manages social media platform connections and configuration.
 * Displays connected platforms with sync functionality and
 * shows a configuration warning if not set up.
 */
export function SettingsTab({ onSyncComplete }: SettingsTabProps): JSX.Element {
  const { showToast } = useToast();

  // Queries
  const configQuery = useSocialPublishingConfig();
  const platformsQuery = useConnectedPlatforms();

  // Mutations
  const syncPlatformsMutation = useSyncPlatforms();

  useRedirectOnUnauthorized(configQuery.error);
  useRedirectOnUnauthorized(platformsQuery.error);

  // Computed values
  const platforms = platformsQuery.data || [];

  /**
   * Handle platform sync
   */
  const handleSyncPlatforms = () => {
    syncPlatformsMutation.mutate(true, {
      onSuccess: () => {
        showToast('Platforms synced successfully', 'success');
        onSyncComplete?.();
      },
      onError: (error) => {
        showToast(error.message || 'Failed to sync platforms', 'error');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              Connected Platforms
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Manage your social media account connections
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleSyncPlatforms}
            disabled={syncPlatformsMutation.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 ${syncPlatformsMutation.isPending ? 'animate-spin' : ''}`}
            />
            Sync All
          </Button>
        </CardHeader>
      </Card>

      {/* Platforms Grid */}
      {platformsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ConnectionCardSkeleton />
          <ConnectionCardSkeleton />
          <ConnectionCardSkeleton />
          <ConnectionCardSkeleton />
        </div>
      ) : platforms.length === 0 ? (
        <EmptyState
          icon={<Link2 className="w-8 h-8 text-neutral-400" />}
          title="No platforms configured"
          description="Connect your social media accounts to start publishing content. Configure your Ayrshare API key to enable platform connections."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {platforms.map((platform) => (
            <ConnectionCard
              key={platform.platform}
              platform={platform}
              onSync={handleSyncPlatforms}
              isSyncing={syncPlatformsMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Configuration Warning */}
      {!configQuery.data && !configQuery.isLoading && (
        <Card className="mt-6 p-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                Configuration Required
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Social publishing requires API configuration. Please contact
                your administrator to set up the Ayrshare integration.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default SettingsTab;
