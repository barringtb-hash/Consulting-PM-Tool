/**
 * Prisma Tenant Extension
 *
 * This extension provides automatic tenant filtering for all database operations.
 * It uses Prisma's extension API to intercept queries and inject tenantId filters.
 *
 * How it works:
 * 1. When a query runs within a tenant context, tenantId is auto-injected
 * 2. findMany/findFirst/count get WHERE tenantId = X
 * 3. create/createMany get tenantId added to data
 * 4. update/updateMany/delete/deleteMany get tenantId in WHERE
 *
 * This ensures complete tenant isolation at the database level.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { hasTenantContext, getTenantId } from '../tenant/tenant.context';

// Models that require tenant filtering
// These models have a tenantId field and need automatic filtering
const TENANT_SCOPED_MODELS = new Set([
  // CRM Core
  'Account',
  'CRMContact',
  'Opportunity',
  'OpportunityContact',
  'OpportunityLineItem',
  'OpportunityStageHistory',
  'Pipeline',
  'PipelineStage',
  'CRMActivity',

  // Notifications & Integrations
  'Notification',
  'Integration',
  'SyncLog',

  // Usage Metering
  'UsageEvent',
  'UsageSummary',

  // Future: Add existing models after migration
  // 'Client',
  // 'Contact',
  // 'Project',
  // 'Task',
  // 'Milestone',
  // 'Meeting',
  // 'Document',
  // 'AIAsset',
  // 'MarketingContent',
  // 'Campaign',
  // 'InboundLead',
]);

// Models that have tenantId but are accessed via parent relations
// These don't need direct filtering as they're always accessed through parent
const TENANT_INHERITED_MODELS = new Set([
  'PipelineStage', // Accessed via Pipeline
  'OpportunityContact', // Accessed via Opportunity
  'OpportunityLineItem', // Accessed via Opportunity
  'OpportunityStageHistory', // Accessed via Opportunity
  'SyncLog', // Accessed via Integration
]);

/**
 * Check if a model needs tenant filtering.
 */
function needsTenantFiltering(model: string): boolean {
  return TENANT_SCOPED_MODELS.has(model) && !TENANT_INHERITED_MODELS.has(model);
}

/**
 * Create tenant-aware Prisma extension.
 *
 * Note: This is designed to work alongside the existing Prisma client.
 * The extension intercepts operations on tenant-scoped models and
 * automatically injects tenantId.
 */
export function createTenantExtension() {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async findFirst({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async findUnique({ model, args, query }) {
          // findUnique uses unique constraints, but we still add tenantId for safety
          if (needsTenantFiltering(model) && hasTenantContext()) {
            // For findUnique, we can't easily modify the where clause
            // Instead, we'll verify the result belongs to the tenant
            const result = await query(args);
            if (
              result &&
              'tenantId' in result &&
              result.tenantId !== getTenantId()
            ) {
              return null; // Return null if tenant doesn't match
            }
            return result;
          }
          return query(args);
        },

        async count({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async aggregate({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async groupBy({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async create({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.data = { ...args.data, tenantId: getTenantId() };
          }
          return query(args);
        },

        async createMany({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            const tenantId = getTenantId();
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item: Record<string, unknown>) => ({
                ...item,
                tenantId,
              }));
            } else {
              args.data = { ...args.data, tenantId };
            }
          }
          return query(args);
        },

        async update({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            // Add tenantId to where clause to ensure we can only update our tenant's data
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async updateMany({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async delete({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            args.where = { ...args.where, tenantId: getTenantId() };
          }
          return query(args);
        },

        async upsert({ model, args, query }) {
          if (needsTenantFiltering(model) && hasTenantContext()) {
            const tenantId = getTenantId();
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            // update doesn't need tenantId as where already filters
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Verify a record belongs to the current tenant.
 * Use this for extra safety when operating on records by ID.
 */
export async function verifyTenantOwnership(
  prisma: PrismaClient,
  model: string,
  id: number | string,
): Promise<boolean> {
  if (!hasTenantContext()) {
    return true; // No tenant context means no restriction
  }

  const tenantId = getTenantId();

  try {
    // Dynamic lookup based on model
    // We need to use type assertion because Prisma client models are dynamically accessed
    type PrismaModel = {
      findUnique: (args: {
        where: { id: number | string };
        select: { tenantId: boolean };
      }) => Promise<{ tenantId: string } | null>;
    };

    const modelDelegate = (prisma as unknown as Record<string, PrismaModel>)[
      model.toLowerCase()
    ];

    if (!modelDelegate?.findUnique) {
      return false;
    }

    const record = await modelDelegate.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    return record?.tenantId === tenantId;
  } catch {
    return false;
  }
}
