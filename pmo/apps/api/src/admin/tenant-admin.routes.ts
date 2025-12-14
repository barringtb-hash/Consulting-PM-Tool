/**
 * System Admin Tenant Management Routes
 *
 * All routes require global ADMIN role (system administrator).
 * These endpoints allow managing all tenants in the platform.
 */

import { Router, Response } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../auth/auth.middleware';
import {
  createTenantAdminSchema,
  updateTenantAdminSchema,
  addTenantUserAdminSchema,
  configureTenantModuleAdminSchema,
  listTenantsQuerySchema,
} from '../validation/tenant-admin.schema';
import * as tenantAdminService from './tenant-admin.service';

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
      const { tenantId } = req.params;
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
      const { tenantId } = req.params;
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
 * Suspend a tenant
 */
router.post(
  '/tenants/:tenantId/suspend',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const tenant = await tenantAdminService.suspendTenant(tenantId);
      return res.json(tenant);
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
 * POST /api/admin/tenants/:tenantId/activate
 * Activate a tenant
 */
router.post(
  '/tenants/:tenantId/activate',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
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
 * POST /api/admin/tenants/:tenantId/cancel
 * Cancel a tenant (soft delete)
 */
router.post(
  '/tenants/:tenantId/cancel',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
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
      const { tenantId } = req.params;
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
 */
router.post(
  '/tenants/:tenantId/users',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const parsed = addTenantUserAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await tenantAdminService.addUserToTenantByAdmin(
        tenantId,
        parsed.data,
      );
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error adding user to tenant:', error);
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
      const { tenantId, userId } = req.params;
      const body = req.body as { role?: string };
      const { role } = body;

      if (!role || !['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const result = await tenantAdminService.updateTenantUserRoleByAdmin(
        tenantId,
        parseInt(userId, 10),
        role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
      );
      return res.json(result);
    } catch (error) {
      console.error('Error updating user role:', error);
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
      const { tenantId, userId } = req.params;
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
      const { tenantId } = req.params;
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

export default router;
