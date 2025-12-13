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
  type AuthenticatedRequest,
} from '../auth/auth.middleware';
import { requireRole } from '../auth/role.middleware';
import { getTenantContext } from './tenant.context';
import type { TenantRequest } from './tenant.middleware';

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

const addUserSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

const moduleConfigSchema = z.object({
  moduleId: z.string().min(1),
  enabled: z.boolean().optional(),
  tier: z.enum(['TRIAL', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
});

// ============================================================================
// TENANT ROUTES
// ============================================================================

/**
 * POST /api/tenants
 * Create a new tenant (owner only - platform admin)
 */
router.post(
  '/tenants',
  requireAuth,
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
// ============================================================================

/**
 * GET /api/tenants/current/users
 * List tenant users
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
 * POST /api/tenants/current/users
 * Add user to tenant
 */
router.post(
  '/tenants/current/users',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    try {
      const { tenantId } = getTenantContext();
      const parsed = addUserSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const tenantUser = await tenantService.addUserToTenant(
        tenantId,
        parsed.data.userId,
        parsed.data.role,
      );
      res.status(201).json({ data: tenantUser });
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
 * Update user role
 */
router.put(
  '/tenants/current/users/:userId/role',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const userId = parseInt(req.params.userId, 10);
    const parsed = updateUserRoleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const tenantUser = await tenantService.updateUserRole(
      tenantId,
      userId,
      parsed.data.role,
    );
    res.json({ data: tenantUser });
  },
);

/**
 * DELETE /api/tenants/current/users/:userId
 * Remove user from tenant
 */
router.delete(
  '/tenants/current/users/:userId',
  requireAuth,
  async (req: TenantRequest, res: Response) => {
    const { tenantId } = getTenantContext();
    const userId = parseInt(req.params.userId, 10);

    await tenantService.removeUserFromTenant(tenantId, userId);
    res.status(204).send();
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
