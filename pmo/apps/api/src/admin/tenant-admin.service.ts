/**
 * System Admin Tenant Management Service
 *
 * Provides business logic for system administrators to manage
 * tenants across the entire platform, including:
 * - Listing all tenants with filtering and pagination
 * - Creating tenants with owner assignment
 * - Updating tenant settings, plans, and status
 * - Managing tenant users
 * - Configuring tenant modules
 */

import { prisma } from '../prisma/client';
import { Prisma, TenantPlan, TenantStatus, TenantRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type {
  CreateTenantAdminInput,
  UpdateTenantAdminInput,
  AddTenantUserAdminInput,
  ConfigureTenantModuleAdminInput,
  ListTenantsQuery,
} from '../validation/tenant-admin.schema';

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
 * Generate a random temporary password
 */
function generateTempPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Tenant list result with pagination
 */
export interface TenantListResult {
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
    status: TenantStatus;
    billingEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
    trialEndsAt: Date | null;
    _count: {
      users: number;
      accounts: number;
      opportunities: number;
    };
    owner: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * List all tenants with filtering and pagination (System Admin only)
 */
export async function listAllTenants(
  query: ListTenantsQuery,
): Promise<TenantListResult> {
  const { page, limit, search, plan, status, sortBy, sortOrder } = query;

  // Build where clause
  const where: Prisma.TenantWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      {
        users: {
          some: {
            user: {
              email: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  if (plan) {
    where.plan = plan;
  }

  if (status) {
    where.status = status;
  }

  // Build orderBy clause
  const orderBy: Prisma.TenantOrderByWithRelationInput = {};
  orderBy[sortBy as keyof Prisma.TenantOrderByWithRelationInput] = sortOrder;

  // Get total count
  const total = await prisma.tenant.count({ where });

  // Get tenants with related data
  const tenants = await prisma.tenant.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      _count: {
        select: {
          users: true,
          accounts: true,
          opportunities: true,
        },
      },
      users: {
        where: { role: 'OWNER' },
        take: 1,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Transform to include owner info
  const transformedTenants = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    status: tenant.status,
    billingEmail: tenant.billingEmail,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    trialEndsAt: tenant.trialEndsAt,
    _count: tenant._count,
    owner: tenant.users[0]?.user || null,
  }));

  return {
    tenants: transformedTenants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get tenant details by ID with full stats (System Admin only)
 */
export async function getTenantDetailsById(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
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
          crmContacts: true,
          activities: true,
          clients: true,
          projects: true,
        },
      },
      users: {
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
      },
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
}

/**
 * Create a new tenant with owner (System Admin only)
 */
export async function createTenantByAdmin(input: CreateTenantAdminInput) {
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
  // This ensures atomicity - if any step fails, everything rolls back
  const result = await prisma.$transaction(async (tx) => {
    // Check if owner email exists
    let ownerUser = await tx.user.findUnique({
      where: { email: input.ownerEmail },
    });

    let tempPassword: string | null = null;

    // If user doesn't exist, create a new user inside the transaction
    if (!ownerUser) {
      tempPassword = generateTempPassword();
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
      const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

      ownerUser = await tx.user.create({
        data: {
          email: input.ownerEmail,
          name: input.ownerName || input.ownerEmail.split('@')[0],
          passwordHash,
          role: 'USER',
          timezone: 'America/New_York',
        },
      });
    }

    // Create tenant
    const newTenant = await tx.tenant.create({
      data: {
        name: input.name,
        slug,
        plan: input.plan || 'STARTER',
        billingEmail: input.billingEmail,
        status: 'ACTIVE',
        trialEndsAt: input.trialEndsAt,
      },
    });

    // Add owner as TenantUser
    await tx.tenantUser.create({
      data: {
        tenantId: newTenant.id,
        userId: ownerUser.id,
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

    return {
      tenant: newTenant,
      ownerUser,
      tempPassword,
    };
  });

  return {
    tenant: result.tenant,
    owner: {
      id: result.ownerUser.id,
      email: result.ownerUser.email,
      name: result.ownerUser.name,
      isNewUser: !!result.tempPassword,
      tempPassword: result.tempPassword,
    },
  };
}

/**
 * Update a tenant (System Admin only)
 */
export async function updateTenantByAdmin(
  tenantId: string,
  input: UpdateTenantAdminInput,
) {
  // Verify tenant exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!existingTenant) {
    throw new Error('Tenant not found');
  }

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: input.name,
      plan: input.plan,
      status: input.status,
      billingEmail: input.billingEmail,
      trialEndsAt: input.trialEndsAt,
      settings: input.settings as Prisma.InputJsonValue,
    },
  });
}

/**
 * Suspend a tenant (System Admin only)
 */
export async function suspendTenant(tenantId: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'SUSPENDED',
    },
  });
}

/**
 * Activate a tenant (System Admin only)
 */
export async function activateTenant(tenantId: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
    },
  });
}

/**
 * Cancel a tenant - soft delete (System Admin only)
 */
export async function cancelTenant(tenantId: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'CANCELLED',
    },
  });
}

/**
 * Get users of a specific tenant (System Admin only)
 */
export async function getTenantUsersByAdmin(tenantId: string) {
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
          timezone: true,
        },
      },
    },
    orderBy: {
      invitedAt: 'asc',
    },
  });
}

/**
 * Add a user to a tenant (System Admin only)
 * Creates user if doesn't exist
 */
export async function addUserToTenantByAdmin(
  tenantId: string,
  input: AddTenantUserAdminInput,
) {
  // Check if tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  let tempPassword: string | null = null;

  // Create user if doesn't exist
  if (!user) {
    tempPassword = generateTempPassword();
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name || input.email.split('@')[0],
        passwordHash,
        role: 'USER',
        timezone: 'America/New_York',
      },
    });
  }

  // Check if user is already in tenant
  const existingMembership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId: user.id,
      },
    },
  });

  if (existingMembership) {
    throw new Error('User is already a member of this tenant');
  }

  // Add user to tenant
  const tenantUser = await prisma.tenantUser.create({
    data: {
      tenantId,
      userId: user.id,
      role: input.role as TenantRole,
      acceptedAt: new Date(),
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

  return {
    tenantUser,
    isNewUser: !!tempPassword,
    tempPassword,
  };
}

/**
 * Remove a user from a tenant (System Admin only)
 */
export async function removeUserFromTenantByAdmin(
  tenantId: string,
  userId: number,
) {
  // Check if this is the only owner
  const ownerCount = await prisma.tenantUser.count({
    where: {
      tenantId,
      role: 'OWNER',
    },
  });

  const userMembership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });

  if (userMembership?.role === 'OWNER' && ownerCount === 1) {
    throw new Error('Cannot remove the only owner. Transfer ownership first.');
  }

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
 * Update user role in a tenant (System Admin only)
 */
export async function updateTenantUserRoleByAdmin(
  tenantId: string,
  userId: number,
  role: TenantRole,
) {
  // If demoting from OWNER, ensure there's another owner
  const currentMembership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });

  if (currentMembership?.role === 'OWNER' && role !== 'OWNER') {
    const ownerCount = await prisma.tenantUser.count({
      where: {
        tenantId,
        role: 'OWNER',
      },
    });

    if (ownerCount === 1) {
      throw new Error(
        'Cannot demote the only owner. Assign another owner first.',
      );
    }
  }

  return prisma.tenantUser.update({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    data: { role },
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
 * Configure a module for a tenant (System Admin only)
 */
export async function configureTenantModuleByAdmin(
  tenantId: string,
  input: ConfigureTenantModuleAdminInput,
) {
  // Calculate trial end date if starting trial
  let trialEndsAt: Date | undefined;
  if (input.tier === 'TRIAL' && input.trialDays) {
    trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + input.trialDays);
  }

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
      enabled: input.enabled,
      tier: input.tier || 'BASIC',
      usageLimits: input.usageLimits as Prisma.InputJsonValue,
      settings: input.settings as Prisma.InputJsonValue,
      trialEndsAt,
    },
    update: {
      enabled: input.enabled,
      tier: input.tier,
      usageLimits: input.usageLimits as Prisma.InputJsonValue,
      settings: input.settings as Prisma.InputJsonValue,
      ...(trialEndsAt && { trialEndsAt }),
    },
  });
}

/**
 * Get tenant stats summary (System Admin only)
 */
export async function getTenantStats() {
  const [totalTenants, byPlan, byStatus] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.groupBy({
      by: ['plan'],
      _count: { id: true },
    }),
    prisma.tenant.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  return {
    total: totalTenants,
    byPlan: Object.fromEntries(byPlan.map((p) => [p.plan, p._count.id])),
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
  };
}

/**
 * Update tenant branding (System Admin only)
 */
export interface UpdateTenantBrandingInput {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  logoSmallUrl?: string | null;
  faviconUrl?: string | null;
  fontFamily?: string | null;
  customCss?: string | null;
  emailLogoUrl?: string | null;
  emailFooterText?: string | null;
}

export async function updateTenantBrandingByAdmin(
  tenantId: string,
  input: UpdateTenantBrandingInput,
) {
  // Check if tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Upsert branding
  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      ...input,
    },
    update: input,
  });
}
