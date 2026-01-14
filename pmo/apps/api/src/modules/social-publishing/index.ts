/**
 * Social Publishing Module
 *
 * Unified social media publishing across multiple platforms via adapters.
 *
 * Features:
 * - Multi-platform publishing (LinkedIn, Twitter, Instagram, Facebook, etc.)
 * - Post scheduling and queue management
 * - Engagement metrics and analytics
 * - Media attachment handling
 * - Platform-specific content optimization
 *
 * Supported Providers:
 * - Ayrshare (primary adapter)
 *
 * @module social-publishing
 */

// Router - export as both named and default for flexibility
import socialPublishingRouterDefault from './social-publishing.router';
export { socialPublishingRouterDefault as socialPublishingRouter };
export default socialPublishingRouterDefault;

// Types
export * from './types';

// Services
export * from './services';

// Adapters
export * from './adapters';

// Workers
export * from './workers';
