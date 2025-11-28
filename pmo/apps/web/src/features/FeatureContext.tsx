import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '../api/config';
import { buildOptions, handleResponse } from '../api/http';

/**
 * Feature flags configuration returned by the API.
 */
export interface FeatureFlags {
  /** Marketing content generation, campaigns, brand profiles, publishing */
  marketing: boolean;
  /** Sales pipeline, leads management, lead conversion */
  sales: boolean;
  /** AI assets library (prompts, workflows, datasets, evaluations, guardrails) */
  aiAssets: boolean;
  /** Meeting notes, decisions tracking, task creation from meetings */
  meetings: boolean;
  /** Admin features (user management) */
  admin: boolean;
}

/**
 * Default feature flags - all enabled by default.
 * Used during initial load before API response.
 */
const defaultFeatures: FeatureFlags = {
  marketing: true,
  sales: true,
  aiAssets: true,
  meetings: true,
  admin: true,
};

interface FeatureContextValue {
  features: FeatureFlags;
  isLoading: boolean;
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean;
}

const FeatureContext = createContext<FeatureContextValue | undefined>(
  undefined,
);

/**
 * Fetch feature flags from the API.
 */
async function fetchFeatures(): Promise<FeatureFlags> {
  const response = await fetch(buildApiUrl('/features'), buildOptions());
  const data = await handleResponse<{ features: FeatureFlags }>(response);
  return data.features;
}

/**
 * Query key for features - used for React Query caching.
 */
export const featuresQueryKey = ['features'] as const;

/**
 * Provider component that fetches and provides feature flags to the app.
 *
 * Features are fetched once on app load and cached for the session.
 * During loading, all features are assumed to be enabled (optimistic).
 *
 * @example
 * // Wrap your app with the provider
 * <FeatureProvider>
 *   <App />
 * </FeatureProvider>
 *
 * // Use in components
 * const { isFeatureEnabled } = useFeatures();
 * if (isFeatureEnabled('marketing')) {
 *   return <MarketingSection />;
 * }
 */
export function FeatureProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { data: features, isLoading } = useQuery({
    queryKey: featuresQueryKey,
    queryFn: fetchFeatures,
    staleTime: Infinity, // Features don't change during session
    gcTime: Infinity,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const value = useMemo<FeatureContextValue>(
    () => ({
      features: features ?? defaultFeatures,
      isLoading,
      isFeatureEnabled: (feature: keyof FeatureFlags) =>
        (features ?? defaultFeatures)[feature],
    }),
    [features, isLoading],
  );

  return (
    <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>
  );
}

/**
 * Hook to access feature flags and check if features are enabled.
 *
 * @returns Feature context with flags and helper function
 * @throws Error if used outside of FeatureProvider
 *
 * @example
 * function MyComponent() {
 *   const { isFeatureEnabled, features } = useFeatures();
 *
 *   if (!isFeatureEnabled('marketing')) {
 *     return null; // Don't render if feature is disabled
 *   }
 *
 *   return <div>Marketing Feature Content</div>;
 * }
 */
export function useFeatures(): FeatureContextValue {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled.
 * Convenience wrapper around useFeatures().isFeatureEnabled().
 *
 * @param feature - The feature to check
 * @returns boolean indicating if the feature is enabled
 *
 * @example
 * function MyComponent() {
 *   const isMarketingEnabled = useFeature('marketing');
 *
 *   if (!isMarketingEnabled) {
 *     return <Navigate to="/dashboard" />;
 *   }
 *
 *   return <MarketingPage />;
 * }
 */
export function useFeature(feature: keyof FeatureFlags): boolean {
  const { isFeatureEnabled } = useFeatures();
  return isFeatureEnabled(feature);
}

/**
 * Component that conditionally renders children based on feature flag.
 *
 * @example
 * <FeatureGate feature="marketing">
 *   <MarketingSection />
 * </FeatureGate>
 *
 * // With fallback
 * <FeatureGate feature="marketing" fallback={<UpgradeBanner />}>
 *   <MarketingSection />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): JSX.Element {
  const isEnabled = useFeature(feature);
  return <>{isEnabled ? children : fallback}</>;
}
