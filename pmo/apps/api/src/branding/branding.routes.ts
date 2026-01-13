/**
 * Branding Routes
 *
 * API endpoints for managing white-label branding.
 */

import { Router, Response, NextFunction, Request } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { requireTenant, type TenantRequest } from '../tenant/tenant.middleware';
import { getTenantContext } from '../tenant/tenant.context';
import * as brandingService from './branding.service';
import { prisma } from '../prisma/client';
import { z } from 'zod';

const router = Router();

// Validation schemas
const brandingUpdateSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  logoLightUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  fontFamily: z.string().max(50).optional(),
  customCss: z.string().max(50000).nullable().optional(),
  emailLogoUrl: z.string().url().nullable().optional(),
  emailFooterText: z.string().max(500).nullable().optional(),
});

const colorSchemeSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
});

const logoUpdateSchema = z.object({
  type: z.enum(['primary', 'light', 'favicon', 'email']),
  url: z.string().url().nullable(),
});

// ============================================================================
// BRANDING CONFIGURATION
// ============================================================================

/**
 * GET /api/branding
 * Get complete branding configuration.
 */
router.get(
  '/branding',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const branding = await brandingService.getTenantBranding(tenantId);

      res.json({ data: branding });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/branding
 * Update branding configuration.
 */
router.put(
  '/branding',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = brandingUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const branding = await brandingService.updateTenantBranding(
        tenantId,
        validation.data,
      );

      res.json({ data: branding });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/branding/reset
 * Reset branding to defaults.
 */
router.post(
  '/branding/reset',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const branding = await brandingService.resetBrandingToDefaults(tenantId);

      res.json({
        message: 'Branding reset to defaults',
        data: branding,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// LOGOS
// ============================================================================

/**
 * GET /api/branding/logos
 * Get logo URLs.
 */
router.get(
  '/branding/logos',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const logos = await brandingService.getLogos(tenantId);

      res.json({ data: logos });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/branding/logo
 * Update a specific logo.
 */
router.put(
  '/branding/logo',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = logoUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { type, url } = validation.data;
      await brandingService.updateLogo(tenantId, type, url);

      res.json({ message: 'Logo updated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// COLOR SCHEME
// ============================================================================

/**
 * GET /api/branding/colors
 * Get color scheme.
 */
router.get(
  '/branding/colors',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const colors = await brandingService.getColorScheme(tenantId);

      res.json({ data: colors });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/branding/colors
 * Update color scheme.
 */
router.put(
  '/branding/colors',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = colorSchemeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      await brandingService.updateColorScheme(tenantId, validation.data);

      res.json({ message: 'Color scheme updated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// CSS
// ============================================================================

/**
 * GET /api/branding/css
 * Get CSS variables for current branding.
 */
router.get(
  '/branding/css',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const branding = await brandingService.getTenantBranding(tenantId);

      const cssVariables = brandingService.generateCssVariables({
        primaryColor:
          branding.primaryColor ||
          brandingService.DEFAULT_BRANDING.primaryColor,
        secondaryColor:
          branding.secondaryColor ||
          brandingService.DEFAULT_BRANDING.secondaryColor,
        accentColor:
          branding.accentColor || brandingService.DEFAULT_BRANDING.accentColor,
        fontFamily:
          branding.fontFamily || brandingService.DEFAULT_BRANDING.fontFamily,
      });

      res.json({
        data: {
          cssVariables,
          customCss: branding.customCss,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/branding/custom-css
 * Update custom CSS.
 */
router.put(
  '/branding/custom-css',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { customCss } = req.body as { customCss?: string };

      await brandingService.updateCustomCss(tenantId, customCss ?? null);

      res.json({ message: 'Custom CSS updated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// EMAIL BRANDING
// ============================================================================

/**
 * GET /api/branding/email
 * Get email branding settings.
 */
router.get(
  '/branding/email',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const emailBranding = await brandingService.getEmailBranding(tenantId);

      res.json({ data: emailBranding });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/branding/email
 * Update email branding settings.
 */
router.put(
  '/branding/email',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { emailLogoUrl, emailFooterText } = req.body as {
        emailLogoUrl?: string;
        emailFooterText?: string;
      };

      await brandingService.updateEmailBranding(tenantId, {
        emailLogoUrl,
        emailFooterText,
      });

      res.json({ message: 'Email branding updated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// PREVIEW
// ============================================================================

/**
 * POST /api/branding/preview
 * Generate a branding preview without saving.
 */
router.post(
  '/branding/preview',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const previewChanges = req.body as Record<string, unknown>;

      const preview = await brandingService.generateBrandingPreview(
        tenantId,
        previewChanges,
      );

      res.json({ data: preview });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// PUBLIC BRANDING (for embedded widgets)
// ============================================================================

/**
 * GET /api/branding/public/:tenantSlug
 * Get public branding for embedded widgets.
 */
router.get(
  '/branding/public/:tenantSlug',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = String(req.params.tenantSlug);

      // Find tenant by slug
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const branding = await brandingService.getTenantBranding(tenant.id);

      // Return only public branding info
      res.json({
        data: {
          logoUrl: branding.logoUrl,
          faviconUrl: branding.faviconUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          accentColor: branding.accentColor,
          fontFamily: branding.fontFamily,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
