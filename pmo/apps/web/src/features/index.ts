/**
 * Feature module exports
 *
 * This module provides feature flag functionality and feature-specific components.
 */

// Feature flag system
export {
  FeatureProvider,
  useFeatures,
  useFeature,
  FeatureGate,
  featuresQueryKey,
  type FeatureFlags,
} from './FeatureContext';
