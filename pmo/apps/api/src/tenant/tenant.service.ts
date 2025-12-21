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

// Type for the transaction client that works with extended Prisma clients
type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

/**
 * Check which tables exist in the database from a given list.
 * Returns a Set of lowercase table names that exist.
 * PostgreSQL stores unquoted identifiers in lowercase in pg_tables.
 */
async function getExistingTables(
  tx: TransactionClient,
  tableNames: string[],
): Promise<Set<string>> {
  const result = await tx.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = ANY(${tableNames})
  `;
  return new Set(result.map((r) => r.tablename));
}

/**
 * Helper to delete finance module data for a tenant.
 * Checks which tables exist before attempting deletion to avoid
 * transaction abort errors in PostgreSQL.
 */
async function deleteFinanceModuleData(
  tx: TransactionClient,
  tenantId: string,
): Promise<void> {
  // Query for finance-related tables using lowercase names (how PostgreSQL stores them)
  const financeTableNames = [
    'financealert',
    'financeinsight',
    'accountprofitability',
    'expense',
    'recurringcost',
    'budget',
    'expensecategory',
    'financeconfig',
  ];

  const existingTables = await getExistingTables(tx, financeTableNames);

  // Only delete from tables that exist (order matters for FK constraints)
  if (existingTables.has('financealert')) {
    await tx.financeAlert.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('financeinsight')) {
    await tx.financeInsight.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('accountprofitability')) {
    await tx.accountProfitability.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('expense')) {
    await tx.expense.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('recurringcost')) {
    await tx.recurringCost.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('budget')) {
    await tx.budget.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('expensecategory')) {
    await tx.expenseCategory.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('financeconfig')) {
    await tx.financeConfig.deleteMany({ where: { tenantId } });
  }
}

/**
 * Helper to delete AI monitoring data for a tenant.
 * Checks which tables exist before attempting deletion to avoid
 * transaction abort errors in PostgreSQL.
 */
async function deleteAIMonitoringData(
  tx: TransactionClient,
  tenantId: string,
): Promise<void> {
  const aiTableNames = ['aiusageevent', 'aiusagesummary'];
  const existingTables = await getExistingTables(tx, aiTableNames);

  if (existingTables.has('aiusageevent')) {
    await tx.aIUsageEvent.deleteMany({ where: { tenantId } });
  }
  if (existingTables.has('aiusagesummary')) {
    await tx.aIUsageSummary.deleteMany({ where: { tenantId } });
  }
}

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

// ============================================================================
// TENANT LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Suspend a tenant (reversible).
 * Users can still log in but cannot perform most actions.
 */
export async function suspendTenant(tenantId: string, reason?: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.status === 'SUSPENDED') {
    throw new Error('Tenant is already suspended');
  }

  const currentSettings = (tenant.settings as Record<string, unknown>) || {};

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'SUSPENDED',
      settings: {
        ...currentSettings,
        suspensionReason: reason,
        suspendedAt: new Date().toISOString(),
        previousStatus: tenant.status,
      },
    },
  });
}

/**
 * Reactivate a suspended tenant.
 */
export async function reactivateTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.status !== 'SUSPENDED') {
    throw new Error('Tenant is not suspended');
  }

  const currentSettings = (tenant.settings as Record<string, unknown>) || {};

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
      settings: {
        ...currentSettings,
        suspensionReason: null,
        suspendedAt: null,
        previousStatus: null,
        reactivatedAt: new Date().toISOString(),
      },
    },
  });
}

/**
 * Initiate tenant deletion with 30-day retention period.
 * After the retention period, data will be permanently deleted.
 */
export async function initiateTenantDeletion(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.status === 'CANCELLED') {
    throw new Error('Tenant deletion has already been initiated');
  }

  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30); // 30-day retention

  const currentSettings = (tenant.settings as Record<string, unknown>) || {};

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'CANCELLED',
      settings: {
        ...currentSettings,
        deletionInitiatedAt: new Date().toISOString(),
        scheduledDeletionDate: deletionDate.toISOString(),
        previousStatus: tenant.status,
      },
    },
  });
}

/**
 * Cancel pending tenant deletion and restore to active status.
 */
export async function cancelTenantDeletion(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.status !== 'CANCELLED') {
    throw new Error('Tenant is not pending deletion');
  }

  const currentSettings = (tenant.settings as Record<string, unknown>) || {};

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
      settings: {
        ...currentSettings,
        deletionInitiatedAt: null,
        scheduledDeletionDate: null,
        previousStatus: null,
        deletionCancelledAt: new Date().toISOString(),
      },
    },
  });
}

/**
 * Permanently delete a tenant and all associated data.
 * Should only be called after the retention period has passed.
 */
export async function permanentlyDeleteTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.status !== 'CANCELLED') {
    throw new Error(
      'Tenant must be in CANCELLED status for permanent deletion',
    );
  }

  // Verify retention period has passed
  const settings = tenant.settings as Record<string, unknown>;
  if (settings?.scheduledDeletionDate) {
    const scheduledDate = new Date(settings.scheduledDeletionDate as string);
    if (new Date() < scheduledDate) {
      throw new Error(
        `Deletion scheduled for ${scheduledDate.toISOString()}. Cannot delete before retention period ends.`,
      );
    }
  }

  // Delete all tenant data in a transaction (respecting FK constraints)
  await prisma.$transaction(async (tx) => {
    // Delete CRM Activities
    await tx.cRMActivity.deleteMany({ where: { tenantId } });

    // Delete Opportunity-related data
    await tx.opportunityStageHistory.deleteMany({
      where: { opportunity: { tenantId } },
    });
    await tx.opportunityContact.deleteMany({
      where: { opportunity: { tenantId } },
    });
    await tx.opportunity.deleteMany({ where: { tenantId } });

    // Delete CRM Contacts
    await tx.cRMContact.deleteMany({ where: { tenantId } });

    // Delete Finance module data (order matters for FK constraints)
    await deleteFinanceModuleData(tx, tenantId);

    // Delete AI monitoring data
    await deleteAIMonitoringData(tx, tenantId);

    // Delete Accounts
    await tx.account.deleteMany({ where: { tenantId } });

    // Delete Pipeline Stages then Pipelines
    await tx.salesPipelineStage.deleteMany({
      where: { pipeline: { tenantId } },
    });
    await tx.pipeline.deleteMany({ where: { tenantId } });

    // Delete Notifications
    await tx.notification.deleteMany({ where: { tenantId } });

    // Delete Integrations and Sync Logs
    await tx.syncLog.deleteMany({
      where: { integration: { tenantId } },
    });
    await tx.integration.deleteMany({ where: { tenantId } });

    // Delete Usage data
    await tx.usageEvent.deleteMany({ where: { tenantId } });
    await tx.usageSummary.deleteMany({ where: { tenantId } });

    // Delete Saved Reports
    await tx.savedReport.deleteMany({ where: { tenantId } });

    // Delete Legacy PMO data
    await tx.task.deleteMany({ where: { tenantId } });
    await tx.milestone.deleteMany({ where: { tenantId } });
    await tx.meeting.deleteMany({ where: { tenantId } });
    await tx.project.deleteMany({ where: { tenantId } });
    await tx.contact.deleteMany({ where: { tenantId } });
    await tx.client.deleteMany({ where: { tenantId } });
    await tx.aIAsset.deleteMany({ where: { tenantId } });
    await tx.marketingContent.deleteMany({ where: { tenantId } });
    await tx.campaign.deleteMany({ where: { tenantId } });
    await tx.inboundLead.deleteMany({ where: { tenantId } });

    // Delete Tenant configuration
    await tx.tenantModule.deleteMany({ where: { tenantId } });
    await tx.tenantDomain.deleteMany({ where: { tenantId } });
    await tx.tenantBranding.deleteMany({ where: { tenantId } });
    await tx.tenantUser.deleteMany({ where: { tenantId } });

    // IMPORTANT: Do NOT delete audit logs for compliance purposes.
    // Regulatory frameworks (GDPR, SOC 2, HIPAA) often require audit log
    // retention even after account deletion. The audit logs are marked as
    // belonging to a deleted tenant while preserving all original metadata.
    const auditLogs = await tx.auditLog.findMany({
      where: { tenantId },
      select: { id: true, metadata: true },
    });

    const deletionTimestamp = new Date().toISOString();
    for (const log of auditLogs) {
      const existingMetadata = (log.metadata as Record<string, unknown>) || {};
      await tx.auditLog.update({
        where: { id: log.id },
        data: {
          metadata: {
            ...existingMetadata,
            _tenantDeleted: true,
            _tenantDeletedAt: deletionTimestamp,
          },
        },
      });
    }

    // Delete Health metrics
    await tx.tenantHealthMetrics.deleteMany({ where: { tenantId } });

    // Finally, delete the tenant
    await tx.tenant.delete({ where: { id: tenantId } });
  });

  return { deleted: true, tenantId };
}

/**
 * Export tenant data for compliance or data portability.
 */
export async function exportTenantData(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branding: true,
      modules: true,
      domains: true,
      users: {
        include: {
          user: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
      },
      accounts: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      crmContacts: true,
      opportunities: {
        include: {
          stage: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      activities: {
        include: {
          owner: { select: { id: true, name: true } },
        },
        take: 1000, // Limit for performance
      },
      pipelines: {
        include: { stages: true },
      },
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return {
    exportedAt: new Date().toISOString(),
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      createdAt: tenant.createdAt,
    },
    branding: tenant.branding,
    modules: tenant.modules,
    domains: tenant.domains,
    users: tenant.users,
    accounts: tenant.accounts,
    contacts: tenant.crmContacts,
    opportunities: tenant.opportunities,
    activities: tenant.activities,
    pipelines: tenant.pipelines,
  };
}

/**
 * Get tenants scheduled for deletion.
 * Used by scheduled job to process permanent deletions.
 */
export async function getTenantsForDeletion() {
  const now = new Date();

  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'CANCELLED',
    },
  });

  // Filter to only those past their retention period
  return tenants.filter((tenant) => {
    const settings = tenant.settings as Record<string, unknown>;
    if (settings?.scheduledDeletionDate) {
      const scheduledDate = new Date(settings.scheduledDeletionDate as string);
      return now >= scheduledDate;
    }
    return false;
  });
}

/**
 * Force delete a tenant immediately (Super Admin only).
 * Bypasses the 30-day retention period for immediate permanent deletion.
 * This is a destructive operation that cannot be undone.
 */
export async function forceDeleteTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Delete all tenant data in a transaction (respecting FK constraints)
  await prisma.$transaction(async (tx) => {
    // Delete CRM Activities
    await tx.cRMActivity.deleteMany({ where: { tenantId } });

    // Delete Opportunity-related data
    await tx.opportunityStageHistory.deleteMany({
      where: { opportunity: { tenantId } },
    });
    await tx.opportunityContact.deleteMany({
      where: { opportunity: { tenantId } },
    });
    await tx.opportunity.deleteMany({ where: { tenantId } });

    // Delete CRM Contacts
    await tx.cRMContact.deleteMany({ where: { tenantId } });

    // Delete Finance module data (order matters for FK constraints)
    await deleteFinanceModuleData(tx, tenantId);

    // Delete AI monitoring data
    await deleteAIMonitoringData(tx, tenantId);

    // Delete Accounts
    await tx.account.deleteMany({ where: { tenantId } });

    // Delete Pipeline Stages then Pipelines
    await tx.salesPipelineStage.deleteMany({
      where: { pipeline: { tenantId } },
    });
    await tx.pipeline.deleteMany({ where: { tenantId } });

    // Delete Notifications
    await tx.notification.deleteMany({ where: { tenantId } });

    // Delete Integrations and Sync Logs
    await tx.syncLog.deleteMany({
      where: { integration: { tenantId } },
    });
    await tx.integration.deleteMany({ where: { tenantId } });

    // Delete Usage data
    await tx.usageEvent.deleteMany({ where: { tenantId } });
    await tx.usageSummary.deleteMany({ where: { tenantId } });

    // Delete Saved Reports
    await tx.savedReport.deleteMany({ where: { tenantId } });

    // Delete Legacy PMO data
    await tx.task.deleteMany({ where: { tenantId } });
    await tx.milestone.deleteMany({ where: { tenantId } });
    await tx.meeting.deleteMany({ where: { tenantId } });
    await tx.project.deleteMany({ where: { tenantId } });
    await tx.contact.deleteMany({ where: { tenantId } });
    await tx.client.deleteMany({ where: { tenantId } });
    await tx.aIAsset.deleteMany({ where: { tenantId } });
    await tx.marketingContent.deleteMany({ where: { tenantId } });
    await tx.campaign.deleteMany({ where: { tenantId } });
    await tx.inboundLead.deleteMany({ where: { tenantId } });

    // Delete Tenant configuration
    await tx.tenantModule.deleteMany({ where: { tenantId } });
    await tx.tenantDomain.deleteMany({ where: { tenantId } });
    await tx.tenantBranding.deleteMany({ where: { tenantId } });
    await tx.tenantUser.deleteMany({ where: { tenantId } });

    // IMPORTANT: Do NOT delete audit logs for compliance purposes.
    // Regulatory frameworks (GDPR, SOC 2, HIPAA) often require audit log
    // retention even after account deletion. The audit logs are marked as
    // belonging to a deleted tenant while preserving all original metadata.
    const auditLogs = await tx.auditLog.findMany({
      where: { tenantId },
      select: { id: true, metadata: true },
    });

    const deletionTimestamp = new Date().toISOString();
    for (const log of auditLogs) {
      const existingMetadata = (log.metadata as Record<string, unknown>) || {};
      await tx.auditLog.update({
        where: { id: log.id },
        data: {
          metadata: {
            ...existingMetadata,
            _tenantDeleted: true,
            _tenantDeletedAt: deletionTimestamp,
            _forceDeleted: true,
          },
        },
      });
    }

    // Delete Health metrics
    await tx.tenantHealthMetrics.deleteMany({ where: { tenantId } });

    // Finally, delete the tenant
    await tx.tenant.delete({ where: { id: tenantId } });
  });

  return { deleted: true, tenantId, forceDeleted: true };
}
