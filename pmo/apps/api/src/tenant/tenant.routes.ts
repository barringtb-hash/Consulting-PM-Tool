/**
 * Tenant Management Routes
 *
 * API endpoints for tenant administration including:
 * - Tenant CRUD
 * - User management
 * - Branding configuration
 * - Domain management
 * - Module management
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as tenantService from './tenant.service';
import {
  requireAuth,
  requireAdmin,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';
import { requireRole, requireTenantRole } from '../auth/role.middleware';
import { getTenantContext, hasTenantContext } from './tenant.context';
import type { TenantRequest } from './tenant.middleware';
import { logAudit } from '../services/audit.service';
import { AuditAction } from '@prisma/client';
import { prisma } from '../prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  billingEmail: z.string().email().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  billingEmail: z.string().email().optional(),
});

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  logoLightUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  fontFamily: z.string().max(100).optional(),
  customCss: z.string().max(10000).optional().nullable(),
  emailLogoUrl: z.string().url().optional().nullable(),
  emailFooterText: z.string().max(500).optional().nullable(),
});

const addDomainSchema = z.object({
  domain: z.string().min(4).max(255),
  isPrimary: z.boolean().optional(),
});

// Schema for adding an existing user by ID
const addUserByIdSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

// Schema for creating a new user by email (for tenant admins)
const addUserByEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

// Combined schema - either userId OR email+name
const addUserSchema = z.union([addUserByIdSchema, addUserByEmailSchema]);

const updateUserRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

const moduleConfigSchema = z.object({
  moduleId: z.string().min(1),
  enabled: z.boolean().optional(),
  tier: z.enum(['TRIAL', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
});

// ============================================================================
// USER'S TENANTS ROUTES (Tenant Switching)
// ============================================================================

/**
 * GET /api/tenants/my
 * Get all tenants the current user belongs to
 */
router.get(
  '/tenants/my',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const memberships = await prisma.tenantUser.findMany({
      where: { userId: req.userId },
      include: {
        tenant: {
          include: {
            branding: true,
          },
        },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    const tenants = memberships
      .filter((m) => m.tenant.status === 'ACTIVE')
      .map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        plan: m.tenant.plan,
        role: m.role,
        logoUrl: m.tenant.branding?.logoUrl,
        primaryColor: m.tenant.branding?.primaryColor,
      }));

    res.json({ data: tenants });
  },
);

/**
 * POST /api/tenants/switch/:tenantId
 * Switch to a different tenant
 */
router.post(
  '/tenants/switch/:tenantId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Verify user has access to this tenant
    const membership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: req.userId!,
        },
      },
      include: { tenant: true },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: 'You do not have access to this tenant' });
    }

    if (membership.tenant.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'This tenant is not active' });
    }

    // Log the tenant switch for audit
    const previousTenantId = hasTenantContext()
      ? getTenantContext().tenantId
      : undefined;
    await logAudit({
      userId: req.userId,
      action: AuditAction.TENANT_SWITCH,
      entityType: 'Tenant',
      entityId: tenantId,
      metadata: {
        previousTenantId,
        newTenantId: tenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      data: {
        tenant: {
          id: membership.tenant.id,
          name: membership.tenant.name,
          slug: membership.tenant.slug,
          plan: membership.tenant.plan,
        },
        role: membership.role,
      },
    });
  },
);

// ============================================================================
// TENANT ROUTES
// ============================================================================

/**
 * POST /api/tenants
 * Create a new tenant (platform admins only)
 * Regular users should NOT be able to create tenants.
 * Use /api/admin/tenants for tenant creation with owner assignment.
 */
router.post(
  '/tenants',
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const tenant = await tenantService.createTenant(parsed.data, req.userId!);
      res.status(201).json({ data: tenant });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  },
);

/**
 * GET /api/tenants/current
 * Get current tenant details
 */
router.get(
  '/tenants/current',
  requireAuth,
  async (_req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ data: tenant });
  },
);

/**
 * PUT /api/tenants/current
 * Update current tenant
 */
router.put(
  '/tenants/current',
  requireAuth,
  requireRole('ADMIN'),
  async (req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const parsed = updateTenantSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const tenant = await tenantService.updateTenant(tenantId, parsed.data);
    res.json({ data: tenant });
  },
);

// ============================================================================
// BRANDING ROUTES
// ============================================================================

/**
 * GET /api/tenants/current/branding
 * Get tenant branding
 */
router.get(
  '/tenants/current/branding',
  requireAuth,
  async (_req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const branding = await tenantService.getTenantBranding(tenantId);
    res.json({ data: branding });
  },
);

/**
 * PUT /api/tenants/current/branding
 * Update tenant branding
 */
router.put(
  '/tenants/current/branding',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const parsed = brandingSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const branding = await tenantService.updateTenantBranding(
      tenantId,
      parsed.data,
    );
    res.json({ data: branding });
  },
);

// ============================================================================
// DOMAIN ROUTES
// ============================================================================

/**
 * GET /api/tenants/current/domains
 * List tenant domains
 */
router.get(
  '/tenants/current/domains',
  requireAuth,
  async (_req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const domains = await tenantService.getTenantDomains(tenantId);
    res.json({ data: domains });
  },
);

/**
 * POST /api/tenants/current/domains
 * Add custom domain
 */
router.post(
  '/tenants/current/domains',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    try {
      const { tenantId } = getTenantContext();
      const parsed = addDomainSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const domain = await tenantService.addTenantDomain(tenantId, parsed.data);
      res.status(201).json({ data: domain });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return res.status(409).json({ error: 'Domain already in use' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/tenants/current/domains/:domainId/verify
 * Verify domain
 */
router.post(
  '/tenants/current/domains/:domainId/verify',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    const domain = await tenantService.verifyTenantDomain(req.params.domainId);
    res.json({ data: domain });
  },
);

/**
 * DELETE /api/tenants/current/domains/:domainId
 * Remove custom domain
 */
router.delete(
  '/tenants/current/domains/:domainId',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    await tenantService.removeTenantDomain(req.params.domainId);
    res.status(204).send();
  },
);

// ============================================================================
// USER MANAGEMENT ROUTES
// Only OWNER and ADMIN tenant roles can manage users
// ============================================================================

/**
 * GET /api/tenants/current/users
 * List tenant users
 * Any authenticated tenant member can view the user list
 */
router.get(
  '/tenants/current/users',
  requireAuth,
  async (_req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const users = await tenantService.getTenantUsers(tenantId);
    res.json({ data: users });
  },
);

/**
 * Generate a temporary password for new users.
 * Generates enough random bytes to ensure 16 characters after removing special chars.
 */
function generateTempPassword(): string {
  const desiredLength = 16;
  let password = '';
  while (password.length < desiredLength) {
    const chunk = randomBytes(12).toString('base64').replace(/[+/=]/g, '');
    password += chunk;
  }
  return password.slice(0, desiredLength);
}

/**
 * POST /api/tenants/current/users
 * Add user to tenant (OWNER or ADMIN only)
 *
 * Supports two modes:
 * 1. Add existing user by ID: { userId: 123, role: "MEMBER" }
 * 2. Create new user by email: { email: "user@example.com", name: "John Doe", role: "MEMBER" }
 *
 * When creating a new user, a temporary password is generated and returned.
 * The user should be prompted to change their password on first login.
 */
router.post(
  '/tenants/current/users',
  requireAuth,
  requireTenantRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = getTenantContext();
      const parsed = addUserSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const data = parsed.data;
      let userId: number;
      let isNewUser = false;
      let tempPassword: string | undefined;

      // Check if adding by userId or creating by email
      if ('userId' in data) {
        // Adding existing user by ID
        userId = data.userId;

        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
      } else {
        // Creating new user by email
        const { email, name } = data;

        // Check if user with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (existingUser) {
          // Existing user found by email; reuse user and add to tenant only.
          // This path is distinct from the explicit userId flow.
          // isNewUser remains false so no temp password is generated.
          userId = existingUser.id;
        } else {
          // Create new user with temporary password
          tempPassword = generateTempPassword();
          const saltRounds = parseInt(
            process.env.BCRYPT_SALT_ROUNDS || '10',
            10,
          );
          const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

          // Use transaction to ensure user creation and tenant addition are atomic
          const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                email: email.toLowerCase(),
                name,
                passwordHash,
                role: 'USER', // New users get USER role (not admin)
                timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
              },
            });

            const tenantUser = await tx.tenantUser.create({
              data: {
                tenantId,
                userId: newUser.id,
                role: data.role || 'MEMBER',
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            });

            return { newUser, tenantUser };
          });

          userId = result.newUser.id;
          isNewUser = true;

          // Log the action (tenantId is derived from tenant context)
          await logAudit({
            userId: req.userId,
            action: AuditAction.CREATE,
            entityType: 'TenantUser',
            entityId: result.tenantUser.id.toString(),
            after: { userId, role: data.role, isNewUser, tenantId },
            metadata: {
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });

          // Return response with user info and temp password
          return res.status(201).json({
            data: {
              tenantUser: result.tenantUser,
              isNewUser: true,
              tempPassword,
            },
          });
        }
      }

      // Add existing user to tenant (non-transactional path)
      const tenantUser = await tenantService.addUserToTenant(
        tenantId,
        userId,
        data.role,
      );

      // Log the action (tenantId is derived from tenant context)
      await logAudit({
        userId: req.userId,
        action: AuditAction.CREATE,
        entityType: 'TenantUser',
        entityId: tenantUser.id.toString(),
        after: { userId, role: data.role, isNewUser, tenantId },
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      // Return response with user info
      const response: {
        tenantUser: typeof tenantUser;
        isNewUser: boolean;
        tempPassword?: string;
      } = {
        tenantUser,
        isNewUser,
      };

      // Only include temp password if new user was created
      if (isNewUser && tempPassword) {
        response.tempPassword = tempPassword;
      }

      res.status(201).json({ data: response });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return res
          .status(409)
          .json({ error: 'User already belongs to this tenant' });
      }
      throw error;
    }
  },
);

/**
 * PUT /api/tenants/current/users/:userId/role
 * Update user role (OWNER or ADMIN only)
 */
router.put(
  '/tenants/current/users/:userId/role',
  requireAuth,
  requireTenantRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = getTenantContext();
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const parsed = updateUserRoleSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      // Prevent self-demotion for safety
      if (
        userId === req.userId &&
        parsed.data.role !== 'OWNER' &&
        parsed.data.role !== 'ADMIN'
      ) {
        return res.status(400).json({ error: 'Cannot demote your own role' });
      }

      const tenantUser = await tenantService.updateUserRole(
        tenantId,
        userId,
        parsed.data.role,
      );

      // Log the action (tenantId is derived from tenant context)
      await logAudit({
        userId: req.userId,
        action: AuditAction.UPDATE,
        entityType: 'TenantUser',
        entityId: tenantUser.id.toString(),
        after: { targetUserId: userId, role: parsed.data.role, tenantId },
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.json({ data: tenantUser });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Member not found')
      ) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Failed to update user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  },
);

/**
 * DELETE /api/tenants/current/users/:userId
 * Remove user from tenant (OWNER or ADMIN only)
 */
router.delete(
  '/tenants/current/users/:userId',
  requireAuth,
  requireTenantRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = getTenantContext();
      const userId = parseInt(req.params.userId, 10);

      // Prevent self-removal
      if (userId === req.userId) {
        return res
          .status(400)
          .json({ error: 'Cannot remove yourself from tenant' });
      }

      // Check if this is the last owner
      const tenantUsers = await tenantService.getTenantUsers(tenantId);
      const targetUser = tenantUsers.find((tu) => tu.userId === userId);
      const ownerCount = tenantUsers.filter((tu) => tu.role === 'OWNER').length;

      if (targetUser?.role === 'OWNER' && ownerCount <= 1) {
        return res.status(400).json({
          error: 'Cannot remove the last owner. Transfer ownership first.',
        });
      }

      await tenantService.removeUserFromTenant(tenantId, userId);

      // Log the action (tenantId is derived from tenant context)
      await logAudit({
        userId: req.userId,
        action: AuditAction.DELETE,
        entityType: 'TenantUser',
        entityId: `${tenantId}-${userId}`,
        before: { targetUserId: userId, role: targetUser?.role, tenantId },
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Failed to remove user from tenant:', error);
      res.status(500).json({ error: 'Failed to remove user from tenant' });
    }
  },
);

// ============================================================================
// MODULE MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/tenants/current/modules
 * List tenant modules
 */
router.get(
  '/tenants/current/modules',
  requireAuth,
  async (_req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const modules = await tenantService.getTenantModules(tenantId);
    res.json({ data: modules });
  },
);

/**
 * PUT /api/tenants/current/modules/:moduleId
 * Configure module
 */
router.put(
  '/tenants/current/modules/:moduleId',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const parsed = moduleConfigSchema.safeParse({
      moduleId: req.params.moduleId,
      ...(req.body as object),
    });

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const module = await tenantService.configureTenantModule(
      tenantId,
      parsed.data,
    );
    res.json({ data: module });
  },
);

/**
 * POST /api/tenants/current/modules/:moduleId/trial
 * Start module trial
 */
router.post(
  '/tenants/current/modules/:moduleId/trial',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const body = req.body as { trialDays?: number };
    const trialDays = body.trialDays || 14;

    const module = await tenantService.startModuleTrial(
      tenantId,
      req.params.moduleId,
      trialDays,
    );
    res.json({ data: module });
  },
);

export default router;
