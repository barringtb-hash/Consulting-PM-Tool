/**
 * Domain Management Routes
 *
 * API endpoints for managing custom domains.
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { requireTenant, type TenantRequest } from '../tenant/tenant.middleware';
import { getTenantContext } from '../tenant/tenant.context';
import * as domainService from './domain.service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const addDomainSchema = z.object({
  domain: z.string().min(1),
  isPrimary: z.boolean().optional().default(false),
});

// ============================================================================
// DOMAIN MANAGEMENT
// ============================================================================

/**
 * GET /api/domains
 * Get all custom domains for the current tenant.
 */
router.get(
  '/domains',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const domains = await domainService.getTenantDomains(tenantId);

      res.json({ data: domains });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/domains
 * Add a new custom domain.
 */
router.post(
  '/domains',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = addDomainSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { domain, isPrimary } = validation.data;

      // Validate domain format
      if (!domainService.isValidDomain(domain)) {
        return res.status(400).json({
          error: 'Invalid domain format',
          message: 'Please enter a valid domain name (e.g., app.example.com)',
        });
      }

      const newDomain = await domainService.addDomain(
        tenantId,
        domain,
        isPrimary,
      );

      // Get verification instructions
      const instructions = domainService.getDnsVerificationInstructions(
        newDomain.domain,
        newDomain.verifyToken,
      );

      res.status(201).json({
        data: newDomain,
        verification: instructions,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/domains/:domainId
 * Get domain details.
 */
router.get(
  '/domains/:domainId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);

      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      res.json({ data: domain });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/domains/:domainId
 * Remove a custom domain.
 */
router.delete(
  '/domains/:domainId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      await domainService.removeDomain(domainId, tenantId);

      res.json({ message: 'Domain removed successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/domains/:domainId/primary
 * Set domain as primary.
 */
router.post(
  '/domains/:domainId/primary',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      await domainService.setPrimaryDomain(domainId, tenantId);

      res.json({ message: 'Domain set as primary' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// DNS VERIFICATION
// ============================================================================

/**
 * GET /api/domains/:domainId/verify/instructions
 * Get DNS verification instructions.
 */
router.get(
  '/domains/:domainId/verify/instructions',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);

      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const instructions = domainService.getDnsVerificationInstructions(
        domain.domain,
        domain.verifyToken,
      );

      res.json({ data: instructions });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/domains/:domainId/verify
 * Verify domain ownership.
 */
router.post(
  '/domains/:domainId/verify',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      // Verify domain belongs to tenant
      const domain = await domainService.getDomainById(domainId);

      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const result = await domainService.verifyDomainOwnership(domainId);

      if (result.success) {
        res.json({ data: result });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/domains/:domainId/cname
 * Check CNAME configuration.
 */
router.get(
  '/domains/:domainId/cname',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);

      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const result = await domainService.verifyCnameConfiguration(domainId);

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// SSL MANAGEMENT
// ============================================================================

/**
 * GET /api/domains/:domainId/ssl
 * Get SSL certificate status.
 */
router.get(
  '/domains/:domainId/ssl',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);

      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const sslStatus = await domainService.checkSslStatus(domainId);

      res.json({ data: sslStatus });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/domains/:domainId/ssl/provision
 * Manually trigger SSL provisioning.
 */
router.post(
  '/domains/:domainId/ssl/provision',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);

      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      if (!domain.verified) {
        return res.status(400).json({
          error: 'Domain not verified',
          message: 'Please verify domain ownership before provisioning SSL',
        });
      }

      // Start provisioning in background
      domainService.provisionSsl(domainId).catch((err) => {
        console.error('SSL provisioning error:', err);
      });

      res.status(202).json({
        message: 'SSL provisioning started',
        data: { status: 'PROVISIONING' },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/domains/:domainId/ssl/renew
 * Renew SSL certificate.
 */
router.post(
  '/domains/:domainId/ssl/renew',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);

      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      // Start renewal in background
      domainService.renewSslCertificate(domainId).catch((err) => {
        console.error('SSL renewal error:', err);
      });

      res.status(202).json({
        message: 'SSL renewal started',
        data: { status: 'PROVISIONING' },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
