/**
 * Prisma Tenant Extension
 *
 * This extension provides automatic tenant filtering for all database operations.
 * It uses Prisma's extension API to intercept queries and inject tenantId filters.
 *
 * How it works:
 * 1. When a query runs within a tenant context, tenantId is auto-injected
 * 2. findMany/findFirst/count/aggregate/groupBy get WHERE tenantId = X
 * 3. create/createMany get tenantId added to data
 * 4. updateMany/deleteMany get tenantId in WHERE (for bulk operations)
 * 5. update/delete verify tenant ownership before executing (using findFirst)
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

  // Legacy PMO models (tenant-scoped)
  'Client',
  'Contact',
  'Project',
  'Task',
  'Milestone',
  'Meeting',
  'AIAsset',
  'MarketingContent',
  'Campaign',
  'InboundLead',
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
 * Create a Prisma-compatible "record not found" error.
 * This error will be caught by existing error handlers that check for P2025.
 */
function createNotFoundError(
  model: string,
  operation: string,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `An operation failed because it depends on one or more records that were required but not found. Record to ${operation} not found.`,
    {
      code: 'P2025',
      clientVersion: '5.0.0',
      meta: { modelName: model },
    },
  );
}

/**
 * Create tenant-aware Prisma extension.
 *
 * Note: This is designed to work alongside the existing Prisma client.
 * The extension intercepts operations on tenant-scoped models and
 * automatically injects tenantId.
 *
 * @param baseClient - The base Prisma client used for tenant ownership verification
 */
export function createTenantExtension(baseClient: PrismaClient) {
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
            (args.data as Record<string, unknown>).tenantId = getTenantId();
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
          // Prisma's update requires where to match a unique constraint exactly,
          // so we can't add tenantId to the where clause. Instead, we verify
          // tenant ownership by checking if the record exists with matching tenantId
          // before proceeding with the update.
          if (needsTenantFiltering(model) && hasTenantContext()) {
            const tenantId = getTenantId();
            const whereClause = args.where as {
              id?: number | string;
              tenantId?: string;
            };
            const whereId = whereClause.id;

            if (whereId !== undefined) {
              // Use base client to verify tenant ownership
              const modelDelegate = (
                baseClient as unknown as Record<
                  string,
                  {
                    findFirst: (args: {
                      where: { id: number | string; tenantId: string };
                    }) => Promise<unknown>;
                  }
                >
              )[model.charAt(0).toLowerCase() + model.slice(1)];

              if (modelDelegate?.findFirst) {
                const existing = await modelDelegate.findFirst({
                  where: { id: whereId, tenantId },
                });

                if (!existing) {
                  throw createNotFoundError(model, 'update');
                }
              }

              // Strip tenantId from where clause since Prisma requires unique constraint only

              const { tenantId: _, ...cleanWhere } = whereClause;
              args.where = cleanWhere;
            }
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
          // Prisma's delete requires where to match a unique constraint exactly,
          // so we can't add tenantId to the where clause. Instead, we verify
          // tenant ownership by checking if the record exists with matching tenantId
          // before proceeding with the delete.
          if (needsTenantFiltering(model) && hasTenantContext()) {
            const tenantId = getTenantId();
            const whereClause = args.where as {
              id?: number | string;
              tenantId?: string;
            };
            const whereId = whereClause.id;

            if (whereId !== undefined) {
              // Use base client to verify tenant ownership
              const modelDelegate = (
                baseClient as unknown as Record<
                  string,
                  {
                    findFirst: (args: {
                      where: { id: number | string; tenantId: string };
                    }) => Promise<unknown>;
                  }
                >
              )[model.charAt(0).toLowerCase() + model.slice(1)];

              if (modelDelegate?.findFirst) {
                const existing = await modelDelegate.findFirst({
                  where: { id: whereId, tenantId },
                });

                if (!existing) {
                  throw createNotFoundError(model, 'delete');
                }
              }

              // Strip tenantId from where clause since Prisma requires unique constraint only

              const { tenantId: _, ...cleanWhere } = whereClause;
              args.where = cleanWhere;
            }
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
          // Prisma's upsert requires where to match a unique constraint exactly,
          // so we can't add tenantId to the where clause. We verify tenant ownership
          // for existing records and add tenantId to create data for new records.
          if (needsTenantFiltering(model) && hasTenantContext()) {
            const tenantId = getTenantId();
            const whereClause = args.where as {
              id?: number | string;
              tenantId?: string;
            };
            const whereId = whereClause.id;

            // Add tenantId to create data for new records
            (args.create as Record<string, unknown>).tenantId = tenantId;

            // Verify existing record belongs to tenant (if record exists)
            if (whereId !== undefined) {
              const modelDelegate = (
                baseClient as unknown as Record<
                  string,
                  {
                    findFirst: (args: {
                      where: { id: number | string; tenantId: string };
                    }) => Promise<unknown>;
                    findUnique: (args: {
                      where: { id: number | string };
                    }) => Promise<{ tenantId?: string } | null>;
                  }
                >
              )[model.charAt(0).toLowerCase() + model.slice(1)];

              if (modelDelegate?.findUnique) {
                const existing = await modelDelegate.findUnique({
                  where: { id: whereId },
                });

                // If record exists but belongs to different tenant, throw error
                if (existing && existing.tenantId !== tenantId) {
                  throw createNotFoundError(model, 'upsert');
                }
              }

              // Strip tenantId from where clause since Prisma requires unique constraint only

              const { tenantId: _, ...cleanWhere } = whereClause;
              args.where = cleanWhere;
            }
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
