/**
 * @pmo/shared-types
 *
 * Shared TypeScript types for PMO platform.
 *
 * @example
 * // Import all types
 * import { Account, PaginatedResponse } from '@pmo/shared-types';
 *
 * // Import from specific modules
 * import { Account, Opportunity } from '@pmo/shared-types/crm';
 * import { PaginationMeta } from '@pmo/shared-types/api';
 */

// API types
export * from './api';

// CRM types
export * from './crm';
