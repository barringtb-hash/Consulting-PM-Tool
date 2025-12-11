/**
 * Tenant Service
 *
 * Business logic for tenant management including:
 * - Tenant CRUD operations
 * - User management within tenants
 * - Branding configuration
 * - Domain management
 * - Module enablement
 */

import { prisma } from '../prisma/client';
import { Prisma } from '@prisma/client';
import type {
  CreateTenantInput,
  UpdateTenantInput,
  TenantBrandingInput,
  TenantDomainInput,
  TenantModuleInput,
  TenantRole,
} from './tenant.types';
import { randomBytes } from 'crypto';

/**
 * Generate a URL-safe slug from a string.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Generate a unique verification token.
 */
function generateVerifyToken(): string {
  return `pmo-verify-${randomBytes(16).toString('hex')}`;
}

// ============================================================================
// TENANT CRUD
// ============================================================================

/**
 * Create a new tenant with default pipeline.
 */
export async function createTenant(
  input: CreateTenantInput,
  ownerUserId: number,
) {
  // Generate slug if not provided
  const slug = input.slug || generateSlug(input.name);

  // Check slug uniqueness
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (existingTenant) {
    throw new Error(`Tenant with slug "${slug}" already exists`);
  }

  // Create tenant with owner and default pipeline in a transaction
  const tenant = await prisma.$transaction(async (tx) => {
    // Create tenant
    const newTenant = await tx.tenant.create({
      data: {
        name: input.name,
        slug,
        plan: input.plan || 'STARTER',
        billingEmail: input.billingEmail,
        settings: input.settings as Prisma.InputJsonValue,
        status: 'ACTIVE',
      },
    });

    // Add owner as TenantUser
    await tx.tenantUser.create({
      data: {
        tenantId: newTenant.id,
        userId: ownerUserId,
        role: 'OWNER',
        acceptedAt: new Date(),
      },
    });

    // Create default pipeline
    await tx.pipeline.create({
      data: {
        tenantId: newTenant.id,
        name: 'Sales Pipeline',
        isDefault: true,
        stages: {
          create: [
            {
              name: 'Lead',
              order: 1,
              probability: 10,
              type: 'OPEN',
              color: '#6B7280',
            },
            {
              name: 'Qualified',
              order: 2,
              probability: 25,
              type: 'OPEN',
              color: '#3B82F6',
            },
            {
              name: 'Proposal',
              order: 3,
              probability: 50,
              type: 'OPEN',
              color: '#8B5CF6',
            },
            {
              name: 'Negotiation',
              order: 4,
              probability: 75,
              type: 'OPEN',
              color: '#F59E0B',
            },
            {
              name: 'Closed Won',
              order: 5,
              probability: 100,
              type: 'WON',
              color: '#10B981',
            },
            {
              name: 'Closed Lost',
              order: 6,
              probability: 0,
              type: 'LOST',
              color: '#EF4444',
            },
          ],
        },
      },
    });

    // Create default branding
    await tx.tenantBranding.create({
      data: {
        tenantId: newTenant.id,
      },
    });

    return newTenant;
  });

  return tenant;
}

/**
 * Get tenant by ID.
 */
export async function getTenantById(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branding: true,
      modules: true,
      domains: true,
      _count: {
        select: {
          users: true,
          accounts: true,
          opportunities: true,
        },
      },
    },
  });
}

/**
 * Get tenant by slug.
 */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      branding: true,
      modules: true,
    },
  });
}

/**
 * Update tenant.
 */
export async function updateTenant(tenantId: string, input: UpdateTenantInput) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: input.name,
      plan: input.plan,
      billingEmail: input.billingEmail,
      settings: input.settings as Prisma.InputJsonValue,
      status: input.status,
    },
  });
}

/**
 * Delete tenant (soft delete by setting status to CANCELLED).
 */
export async function deleteTenant(tenantId: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'CANCELLED',
    },
  });
}

// ============================================================================
// TENANT USER MANAGEMENT
// ============================================================================

/**
 * Add a user to a tenant.
 */
export async function addUserToTenant(
  tenantId: string,
  userId: number,
  role: TenantRole = 'MEMBER',
) {
  return prisma.tenantUser.create({
    data: {
      tenantId,
      userId,
      role,
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
}

/**
 * Remove a user from a tenant.
 */
export async function removeUserFromTenant(tenantId: string, userId: number) {
  return prisma.tenantUser.delete({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });
}

/**
 * Update user role in tenant.
 */
export async function updateUserRole(
  tenantId: string,
  userId: number,
  role: TenantRole,
) {
  return prisma.tenantUser.update({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    data: { role },
  });
}

/**
 * Get all users in a tenant.
 */
export async function getTenantUsers(tenantId: string) {
  return prisma.tenantUser.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      invitedAt: 'asc',
    },
  });
}

/**
 * Get user's role in a tenant.
 */
export async function getUserTenantRole(tenantId: string, userId: number) {
  const tenantUser = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });

  return tenantUser?.role;
}

// ============================================================================
// BRANDING
// ============================================================================

/**
 * Update tenant branding.
 */
export async function updateTenantBranding(
  tenantId: string,
  input: TenantBrandingInput,
) {
  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      ...input,
    },
    update: input,
  });
}

/**
 * Get tenant branding.
 */
export async function getTenantBranding(tenantId: string) {
  return prisma.tenantBranding.findUnique({
    where: { tenantId },
  });
}

// ============================================================================
// CUSTOM DOMAINS
// ============================================================================

/**
 * Add a custom domain to a tenant.
 */
export async function addTenantDomain(
  tenantId: string,
  input: TenantDomainInput,
) {
  // Generate verification token
  const verifyToken = generateVerifyToken();

  return prisma.tenantDomain.create({
    data: {
      tenantId,
      domain: input.domain.toLowerCase(),
      isPrimary: input.isPrimary || false,
      verifyToken,
    },
  });
}

/**
 * Verify a custom domain.
 */
export async function verifyTenantDomain(domainId: string) {
  // In production, this would verify DNS records
  // For now, just mark as verified
  return prisma.tenantDomain.update({
    where: { id: domainId },
    data: {
      verified: true,
      verifiedAt: new Date(),
      sslStatus: 'PROVISIONING',
    },
  });
}

/**
 * Remove a custom domain.
 */
export async function removeTenantDomain(domainId: string) {
  return prisma.tenantDomain.delete({
    where: { id: domainId },
  });
}

/**
 * Get all domains for a tenant.
 */
export async function getTenantDomains(tenantId: string) {
  return prisma.tenantDomain.findMany({
    where: { tenantId },
    orderBy: {
      isPrimary: 'desc',
    },
  });
}

// ============================================================================
// MODULE MANAGEMENT
// ============================================================================

/**
 * Enable or configure a module for a tenant.
 */
export async function configureTenantModule(
  tenantId: string,
  input: TenantModuleInput,
) {
  return prisma.tenantModule.upsert({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId: input.moduleId,
      },
    },
    create: {
      tenantId,
      moduleId: input.moduleId,
      enabled: input.enabled ?? true,
      tier: input.tier || 'BASIC',
      usageLimits: input.usageLimits as Prisma.InputJsonValue,
      settings: input.settings as Prisma.InputJsonValue,
    },
    update: {
      enabled: input.enabled,
      tier: input.tier,
      usageLimits: input.usageLimits as Prisma.InputJsonValue,
      settings: input.settings as Prisma.InputJsonValue,
    },
  });
}

/**
 * Check if a module is enabled for a tenant.
 */
export async function isModuleEnabled(tenantId: string, moduleId: string) {
  const module = await prisma.tenantModule.findUnique({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
  });

  if (!module) return false;
  if (!module.enabled) return false;

  // Check if trial expired
  if (module.tier === 'TRIAL' && module.trialEndsAt) {
    if (new Date() > module.trialEndsAt) {
      return false;
    }
  }

  return true;
}

/**
 * Get all modules for a tenant.
 */
export async function getTenantModules(tenantId: string) {
  return prisma.tenantModule.findMany({
    where: { tenantId },
  });
}

/**
 * Start a trial for a module.
 */
export async function startModuleTrial(
  tenantId: string,
  moduleId: string,
  trialDays: number = 14,
) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  return prisma.tenantModule.upsert({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    create: {
      tenantId,
      moduleId,
      enabled: true,
      tier: 'TRIAL',
      trialEndsAt,
    },
    update: {
      enabled: true,
      tier: 'TRIAL',
      trialEndsAt,
    },
  });
}
