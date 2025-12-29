/**
 * Bug Tracking Module
 *
 * A comprehensive bug tracking and error monitoring system that provides:
 *
 * Features:
 * - Issue management (bugs, issues, feature requests, improvements)
 * - Label-based categorization
 * - Comment threads on issues
 * - File attachments
 * - Assignment and status workflows
 * - Bulk operations
 *
 * Error Collection:
 * - Browser error capture (window.onerror, unhandledrejection)
 * - React error boundary integration
 * - Error deduplication via hashing
 * - Error grouping into issues
 *
 * External Integrations:
 * - Vercel log drain webhook
 * - Render log stream webhook
 * - AI assistant API for programmatic issue submission
 *
 * API Key Authentication:
 * - Secure API keys for external services
 * - Permission-based access control
 * - Usage tracking
 *
 * @module bug-tracking
 */

// Export types
export * from './types';

// Export services
export * from './bug-tracking.service';
export * from './error-collector.service';
export * from './api-key.service';

// Export router
export { default as bugTrackingRouter } from './bug-tracking.router';
