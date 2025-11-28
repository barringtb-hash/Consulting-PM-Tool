import { Request, Response, NextFunction } from 'express';
import { features, FeatureName } from '../config/env';

/**
 * Middleware factory that creates a feature gate for API routes.
 * Returns 403 Forbidden if the specified feature is disabled.
 *
 * @param feature - The feature name to check (from env.features)
 * @returns Express middleware that blocks requests if feature is disabled
 *
 * @example
 * // Protect an entire router
 * app.use('/api/marketing', requireFeature('marketing'), marketingRouter);
 *
 * // Protect a specific route
 * router.get('/campaigns', requireFeature('marketing'), getCampaigns);
 */
export const requireFeature = (feature: FeatureName) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!features[feature]) {
      res.status(403).json({
        error: 'Feature not available',
        feature,
        message: `The ${feature} feature is not enabled for this deployment.`,
      });
      return;
    }
    next();
  };
};

/**
 * Check if a feature is enabled.
 * Useful for conditional logic within route handlers.
 *
 * @param feature - The feature name to check
 * @returns boolean indicating if the feature is enabled
 */
export const isFeatureEnabled = (feature: FeatureName): boolean => {
  return features[feature];
};
