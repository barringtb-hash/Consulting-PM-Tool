/**
 * Admin Module Exports
 *
 * System administration functionality including:
 * - Tenant management (create, update, suspend, cancel tenants)
 * - User management across tenants
 * - Module configuration
 */

export { default as tenantAdminRouter } from './tenant-admin.routes';
export * as tenantAdminService from './tenant-admin.service';
