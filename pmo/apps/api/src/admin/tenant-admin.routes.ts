/**
 * System Admin Tenant Management Routes
 *
 * All routes require global ADMIN role (system administrator).
 * These endpoints allow managing all tenants in the platform.
 */

import { Router, Response } from 'express';
import {
  requireAdmin,
  requireSuperAdmin,
  AuthenticatedRequest,
} from '../auth/auth.middleware';
import {
  createTenantAdminSchema,
  updateTenantAdminSchema,
  addTenantUserAdminSchema,
  configureTenantModuleAdminSchema,
  listTenantsQuerySchema,
} from '../validation/tenant-admin.schema';
import * as tenantAdminService from './tenant-admin.service';
import type { UpdateTenantBrandingInput } from './tenant-admin.service';
import * as tenantService from '../tenant/tenant.service';
import { logAudit } from '../services/audit.service';
import { AuditAction } from '@prisma/client';

const router = Router();

/**
 * GET /api/admin/tenants
 * List all tenants with filtering and pagination
 */
router.get(
  '/tenants',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = listTenantsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await tenantAdminService.listAllTenants(parsed.data);
      return res.json(result);
    } catch (error) {
      console.error('Error listing tenants:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to list tenants',
      });
    }
  },
);

/**
 * GET /api/admin/tenants/stats
 * Get tenant statistics summary
 */
router.get(
  '/tenants/stats',
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await tenantAdminService.getTenantStats();
      return res.json(stats);
    } catch (error) {
      console.error('Error getting tenant stats:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to get tenant stats',
      });
    }
  },
);

/**
 * POST /api/admin/tenants
 * Create a new tenant
 */
router.post(
  '/tenants',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createTenantAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await tenantAdminService.createTenantByAdmin(parsed.data);
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error creating tenant:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to create tenant',
      });
    }
  },
);

/**
 * GET /api/admin/tenants/:tenantId
 * Get tenant details by ID
 */
router.get(
  '/tenants/:tenantId',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const tenant = await tenantAdminService.getTenantDetailsById(tenantId);
      return res.json(tenant);
    } catch (error) {
      console.error('Error getting tenant:', error);
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get tenant',
      });
    }
  },
);

/**
 * PUT /api/admin/tenants/:tenantId
 * Update a tenant
 */
router.put(
  '/tenants/:tenantId',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const parsed = updateTenantAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const tenant = await tenantAdminService.updateTenantByAdmin(
        tenantId,
        parsed.data,
      );
      return res.json(tenant);
    } catch (error) {
      console.error('Error updating tenant:', error);
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to update tenant',
      });
    }
  },
);

/**
 * POST /api/admin/tenants/:tenantId/suspend
 * Suspend a tenant with optional reason
 */
router.post(
  '/tenants/:tenantId/suspend',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const body = req.body as { reason?: string };
      const { reason } = body;

      const tenant = await tenantService.suspendTenant(tenantId, reason);

      // Audit log
      await logAudit({
        userId: req.userId,
        action: AuditAction.UPDATE,
        entityType: 'Tenant',
        entityId: tenantId,
        after: { status: 'SUSPENDED', reason },
        metadata: {
          adminAction: 'suspend',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.json({ data: tenant });
    } catch (error) {
      console.error('Error suspending tenant:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to suspend tenant',
      });
    }
  },
);

/**
 * POST /api/admin/tenants/:tenantId/reactivate
 * Reactivate a suspended tenant
 */
router.post(
  '/tenants/:tenantId/reactivate',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const tenant = await tenantService.reactivateTenant(tenantId);

      // Audit log
      await logAudit({
        userId: req.userId,
        action: AuditAction.UPDATE,
        entityType: 'Tenant',
        entityId: tenantId,
        after: { status: 'ACTIVE' },
        metadata: {
          adminAction: 'reactivate',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.json({ data: tenant });
    } catch (error) {
      console.error('Error reactivating tenant:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reactivate tenant',
      });
    }
  },
);

/**
 * POST /api/admin/tenants/:tenantId/activate
 * Activate a tenant (legacy endpoint - use reactivate for suspended tenants)
 */
router.post(
  '/tenants/:tenantId/activate',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const tenant = await tenantAdminService.activateTenant(tenantId);
      return res.json(tenant);
    } catch (error) {
      console.error('Error activating tenant:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to activate tenant',
      });
    }
  },
);

/**
 * POST /api/admin/tenants/:tenantId/initiate-deletion
 * Initiate tenant deletion with 30-day retention period
 */
router.post(
  '/tenants/:tenantId/initiate-deletion',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const tenant = await tenantService.initiateTenantDeletion(tenantId);

      // Audit log
      await logAudit({
        userId: req.userId,
        action: AuditAction.DELETE,
        entityType: 'Tenant',
        entityId: tenantId,
        after: { status: 'CANCELLED' },
        metadata: {
          adminAction: 'initiate-deletion',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.json({ data: tenant });
    } catch (error) {
      console.error('Error initiating tenant deletion:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to initiate tenant deletion',
      });
    }
  },
);

/**
 * POST /api/admin/tenants/:tenantId/cancel-deletion
 * Cancel pending tenant deletion
 */
router.post(
  '/tenants/:tenantId/cancel-deletion',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const tenant = await tenantService.cancelTenantDeletion(tenantId);

      // Audit log
      await logAudit({
        userId: req.userId,
        action: AuditAction.UPDATE,
        entityType: 'Tenant',
        entityId: tenantId,
        after: { status: 'ACTIVE', deletionCancelled: true },
        metadata: {
          adminAction: 'cancel-deletion',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.json({ data: tenant });
    } catch (error) {
      console.error('Error cancelling tenant deletion:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to cancel tenant deletion',
      });
    }
  },
);

/**
 * GET /api/admin/tenants/:tenantId/export
 * Export tenant data for compliance/portability
 */
router.get(
  '/tenants/:tenantId/export',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const exportData = await tenantService.exportTenantData(tenantId);

      // Audit log
      await logAudit({
        userId: req.userId,
        action: AuditAction.EXPORT,
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: {
          adminAction: 'export',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.json({ data: exportData });
    } catch (error) {
      console.error('Error exporting tenant data:', error);
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to export tenant data',
      });
    }
  },
);

/**
 * POST /api/admin/tenants/:tenantId/cancel
 * Cancel a tenant (soft delete) - legacy endpoint
 */
router.post(
  '/tenants/:tenantId/cancel',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const tenant = await tenantAdminService.cancelTenant(tenantId);
      return res.json(tenant);
    } catch (error) {
      console.error('Error cancelling tenant:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to cancel tenant',
      });
    }
  },
);

/**
 * GET /api/admin/tenants/:tenantId/users
 * Get all users in a tenant
 */
router.get(
  '/tenants/:tenantId/users',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const users = await tenantAdminService.getTenantUsersByAdmin(tenantId);
      return res.json(users);
    } catch (error) {
      console.error('Error getting tenant users:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to get tenant users',
      });
    }
  },
);

/**
 * POST /api/admin/tenants/:tenantId/users
 * Add a user to a tenant
 * Note: The userRole field can set the user's global role. Only Super Admins can assign SUPER_ADMIN.
 */
router.post(
  '/tenants/:tenantId/users',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const parsed = addTenantUserAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await tenantAdminService.addUserToTenantByAdmin(
        tenantId,
        parsed.data,
        req.userId,
      );
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error adding user to tenant:', error);
      if (error instanceof Error && error.message.includes('Super Admin')) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add user to tenant',
      });
    }
  },
);

/**
 * PUT /api/admin/tenants/:tenantId/users/:userId/role
 * Update user role in a tenant
 */
router.put(
  '/tenants/:tenantId/users/:userId/role',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const userId = String(req.params.userId);
      const parsedUserId = parseInt(userId, 10);

      if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const body = req.body as { role?: string };
      const { role } = body;

      if (!role || !['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const result = await tenantAdminService.updateTenantUserRoleByAdmin(
        tenantId,
        parsedUserId,
        role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
      );
      return res.json(result);
    } catch (error) {
      console.error('Error updating user role:', error);
      if (
        error instanceof Error &&
        error.message.includes('Member not found')
      ) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to update user role',
      });
    }
  },
);

/**
 * DELETE /api/admin/tenants/:tenantId/users/:userId
 * Remove a user from a tenant
 */
router.delete(
  '/tenants/:tenantId/users/:userId',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const userId = String(req.params.userId);
      await tenantAdminService.removeUserFromTenantByAdmin(
        tenantId,
        parseInt(userId, 10),
      );
      return res.status(204).send();
    } catch (error) {
      console.error('Error removing user from tenant:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to remove user from tenant',
      });
    }
  },
);

/**
 * PUT /api/admin/tenants/:tenantId/modules
 * Configure a module for a tenant
 */
router.put(
  '/tenants/:tenantId/modules',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const parsed = configureTenantModuleAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const module = await tenantAdminService.configureTenantModuleByAdmin(
        tenantId,
        parsed.data,
      );
      return res.json(module);
    } catch (error) {
      console.error('Error configuring tenant module:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to configure tenant module',
      });
    }
  },
);

/**
 * PUT /api/admin/tenants/:tenantId/branding
 * Update tenant branding
 */
router.put(
  '/tenants/:tenantId/branding',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const branding = await tenantAdminService.updateTenantBrandingByAdmin(
        tenantId,
        req.body as UpdateTenantBrandingInput,
      );
      return res.json(branding);
    } catch (error) {
      console.error('Error updating tenant branding:', error);
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update tenant branding',
      });
    }
  },
);

// ============================================================================
// SUPER ADMIN ONLY ROUTES
// These routes are restricted to Super Admins (internal platform operators)
// and allow destructive operations that bypass normal safety checks.
// ============================================================================

/**
 * DELETE /api/admin/tenants/:tenantId/force
 * Permanently delete a tenant immediately (Super Admin only).
 * This bypasses the 30-day retention period and cannot be undone.
 * Requires confirmation via request body.
 */
router.delete(
  '/tenants/:tenantId/force',
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const body = req.body as { confirmSlug?: string };

      // Get tenant info for audit and validation
      const tenant = await tenantAdminService.getTenantDetailsById(tenantId);

      // Require confirmation by matching tenant slug
      // This ensures the user explicitly knows which tenant they're deleting
      if (!body.confirmSlug || body.confirmSlug !== tenant.slug) {
        return res.status(400).json({
          error: `Confirmation required. Provide confirmSlug matching the tenant slug.`,
        });
      }

      const tenantName = tenant.name;

      // Force delete the tenant
      const result = await tenantService.forceDeleteTenant(tenantId);

      // Audit log
      await logAudit({
        userId: req.userId,
        action: AuditAction.DELETE,
        entityType: 'Tenant',
        entityId: tenantId,
        before: { name: tenantName, slug: tenant.slug, status: tenant.status },
        after: { deleted: true, forceDeleted: true },
        metadata: {
          adminAction: 'force-delete',
          superAdmin: true,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.json({ data: result });
    } catch (error) {
      console.error('Error force deleting tenant:', error);
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to force delete tenant',
      });
    }
  },
);

export default router;
