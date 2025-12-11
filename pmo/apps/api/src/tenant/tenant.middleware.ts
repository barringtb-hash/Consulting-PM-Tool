/**
 * Tenant Resolution Middleware
 *
 * This middleware extracts and validates tenant context from incoming requests.
 * Tenant can be identified via:
 * 1. Subdomain: acme.yourcrm.com -> tenant slug "acme"
 * 2. Custom domain: crm.acmecorp.com -> lookup in TenantDomain table
 * 3. JWT claim: For API calls, tenant info embedded in token
 * 4. Header: X-Tenant-ID for service-to-service calls
 */

import { Response, NextFunction } from 'express';
import { tenantStorage } from './tenant.context';
import { prisma } from '../prisma/client';
import { env } from '../config/env';
import type { TenantContext, TenantPlan } from './tenant.types';
import type { AuthenticatedRequest } from '../auth/auth.middleware';

// Extended request type with tenant context
export interface TenantRequest extends AuthenticatedRequest {
  tenantContext?: TenantContext;
}

/**
 * Extract subdomain from hostname.
 * Examples:
 * - acme.yourcrm.com -> "acme"
 * - www.yourcrm.com -> null (www is not a tenant)
 * - localhost:3001 -> null
 * - yourcrm.com -> null
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Skip localhost and IP addresses
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const parts = host.split('.');

  // Need at least 3 parts for subdomain (sub.domain.tld)
  if (parts.length < 3) {
    return null;
  }

  // First part is subdomain, but skip "www" and "api"
  const subdomain = parts[0];
  if (subdomain === 'www' || subdomain === 'api' || subdomain === 'app') {
    return null;
  }

  return subdomain;
}

/**
 * Look up tenant by custom domain.
 */
async function findTenantByDomain(domain: string) {
  const tenantDomain = await prisma.tenantDomain.findUnique({
    where: { domain, verified: true },
    include: { tenant: true },
  });

  return tenantDomain?.tenant;
}

/**
 * Look up tenant by slug.
 */
async function findTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}

/**
 * Look up tenant from user's tenant membership.
 */
async function findTenantByUserId(userId: number) {
  const tenantUser = await prisma.tenantUser.findFirst({
    where: { userId },
    include: { tenant: true },
  });

  return tenantUser?.tenant;
}

/**
 * Main tenant resolution middleware.
 * Extracts tenant from request and sets up tenant context.
 */
export async function tenantMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let tenantSlug: string | null = null;
    let tenant: {
      id: string;
      slug: string;
      plan: string;
      status: string;
    } | null = null;

    // 1. Try to extract from subdomain
    tenantSlug = extractSubdomain(req.hostname);

    if (tenantSlug) {
      tenant = await findTenantBySlug(tenantSlug);
    }

    // 2. Try custom domain lookup if no subdomain found
    if (!tenant) {
      const customDomainTenant = await findTenantByDomain(req.hostname);
      if (customDomainTenant) {
        tenant = customDomainTenant;
        tenantSlug = customDomainTenant.slug;
      }
    }

    // 3. Try X-Tenant-ID header (for service-to-service calls)
    if (!tenant) {
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      if (headerTenantId) {
        tenant = await prisma.tenant.findUnique({
          where: { id: headerTenantId },
        });
        if (tenant) {
          tenantSlug = tenant.slug;
        }
      }
    }

    // 4. Try from authenticated user's tenant membership
    if (!tenant && req.userId) {
      const userTenant = await findTenantByUserId(req.userId);
      if (userTenant) {
        tenant = userTenant;
        tenantSlug = userTenant.slug;
      }
    }

    // 5. Try default tenant for development/single-tenant mode
    if (!tenant && env.multiTenantEnabled === false) {
      tenant = await prisma.tenant.findFirst({
        where: { slug: env.defaultTenantSlug },
      });
      if (tenant) {
        tenantSlug = tenant.slug;
      }
    }

    // If still no tenant found, return error
    if (!tenant || !tenantSlug) {
      res.status(400).json({
        error: 'Tenant not found',
        message:
          'Unable to determine tenant from request. Please check your URL or authentication.',
      });
      return;
    }

    // Check tenant status
    if (tenant.status !== 'ACTIVE') {
      res.status(403).json({
        error: 'Tenant inactive',
        message: `This account is ${tenant.status.toLowerCase()}. Please contact support.`,
      });
      return;
    }

    // Create tenant context
    const tenantContext: TenantContext = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantPlan: tenant.plan as TenantPlan,
    };

    // Attach to request for easy access
    req.tenantContext = tenantContext;

    // Run the rest of the middleware chain within tenant context
    tenantStorage.run(tenantContext, () => {
      next();
    });
  } catch (error) {
    console.error('Tenant middleware error:', error);
    next(error);
  }
}

/**
 * Optional tenant middleware that doesn't fail if tenant is not found.
 * Useful for public endpoints that can work with or without tenant context.
 */
export async function optionalTenantMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let tenantSlug: string | null = extractSubdomain(req.hostname);
    let tenant = tenantSlug ? await findTenantBySlug(tenantSlug) : null;

    if (!tenant) {
      const customDomainTenant = await findTenantByDomain(req.hostname);
      if (customDomainTenant) {
        tenant = customDomainTenant;
        tenantSlug = customDomainTenant.slug;
      }
    }

    if (tenant && tenant.status === 'ACTIVE') {
      const tenantContext: TenantContext = {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantPlan: tenant.plan as TenantPlan,
      };
      req.tenantContext = tenantContext;

      tenantStorage.run(tenantContext, () => {
        next();
      });
    } else {
      // No tenant context - continue without it
      next();
    }
  } catch (error) {
    // Log but don't fail - this is optional middleware
    console.warn('Optional tenant middleware error:', error);
    next();
  }
}

/**
 * Middleware to require tenant context.
 * Use this on routes that absolutely require a tenant.
 */
export function requireTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.tenantContext) {
    res.status(400).json({
      error: 'Tenant required',
      message: 'This endpoint requires a valid tenant context.',
    });
    return;
  }
  next();
}
