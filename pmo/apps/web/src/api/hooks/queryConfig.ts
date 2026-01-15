/**
 * React Query Configuration Constants
 *
 * This module provides shared cache configuration constants for React Query hooks.
 * These settings optimize performance by reducing unnecessary refetches while
 * ensuring data freshness for active user sessions.
 *
 * @module queryConfig
 *
 * Configuration Rationale:
 * - staleTime (5 min): Data is considered fresh for 5 minutes, reducing server load
 *   during rapid navigation between pages. This balances freshness with performance.
 * - gcTime (30 min): Cached data is retained for 30 minutes after becoming inactive,
 *   allowing instant display when users return to previously viewed pages.
 *
 * Usage:
 *   import { QUERY_CONFIG, QUERY_CONFIG_FREQUENT, QUERY_CONFIG_STATIC } from './queryConfig';
 *
 *   useQuery({
 *     queryKey: ['example'],
 *     queryFn: fetchExample,
 *     ...QUERY_CONFIG,
 *   });
 */

// ============================================================================
// Standard Configuration
// ============================================================================

/**
 * Standard cache configuration for most data queries.
 *
 * Use for data that changes moderately often (e.g., projects, clients, tasks).
 */
export const QUERY_CONFIG = {
  /** Time in ms before data is considered stale (5 minutes) */
  staleTime: 5 * 60 * 1000,
  /** Time in ms before inactive cache entries are garbage collected (30 minutes) */
  gcTime: 30 * 60 * 1000,
} as const;

// ============================================================================
// Specialized Configurations
// ============================================================================

/**
 * Configuration for frequently changing data.
 *
 * Use for data that needs more frequent updates (e.g., notifications, real-time status).
 */
export const QUERY_CONFIG_FREQUENT = {
  /** Time in ms before data is considered stale (1 minute) */
  staleTime: 1 * 60 * 1000,
  /** Time in ms before inactive cache entries are garbage collected (10 minutes) */
  gcTime: 10 * 60 * 1000,
} as const;

/**
 * Configuration for rarely changing data.
 *
 * Use for reference data or configuration (e.g., dropdown options, templates).
 */
export const QUERY_CONFIG_STATIC = {
  /** Time in ms before data is considered stale (30 minutes) */
  staleTime: 30 * 60 * 1000,
  /** Time in ms before inactive cache entries are garbage collected (60 minutes) */
  gcTime: 60 * 60 * 1000,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type QueryConfigType = typeof QUERY_CONFIG;
