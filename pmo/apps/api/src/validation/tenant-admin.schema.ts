import { z } from 'zod';

/**
 * Validation schemas for System Admin Tenant Management
 */

/**
 * Schema for creating a new tenant (system admin)
 */
export const createTenantAdminSchema = z.object({
  name: z
    .string()
    .min(1, 'Tenant name is required')
    .max(255, 'Tenant name must be less than 255 characters'),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase letters, numbers, and hyphens only',
    )
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be less than 50 characters')
    .optional(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  ownerEmail: z.string().email('Invalid owner email address'),
  ownerName: z
    .string()
    .min(1, 'Owner name is required')
    .max(255, 'Owner name must be less than 255 characters')
    .optional(),
  billingEmail: z
    .string()
    .email('Invalid billing email address')
    .max(255, 'Billing email must be less than 255 characters')
    .optional(),
  trialEndsAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

/**
 * Schema for updating a tenant (system admin)
 */
export const updateTenantAdminSchema = z.object({
  name: z
    .string()
    .min(1, 'Tenant name is required')
    .max(255, 'Tenant name must be less than 255 characters')
    .optional(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  billingEmail: z
    .string()
    .email('Invalid billing email address')
    .max(255, 'Billing email must be less than 255 characters')
    .nullable()
    .optional(),
  trialEndsAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((val) =>
      val ? new Date(val) : val === null ? null : undefined,
    ),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for adding a user to a tenant (system admin)
 */
export const addTenantUserAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

/**
 * Schema for configuring tenant modules (system admin)
 */
export const configureTenantModuleAdminSchema = z.object({
  moduleId: z.string().min(1, 'Module ID is required'),
  enabled: z.boolean(),
  tier: z.enum(['TRIAL', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
  trialDays: z.number().min(1).max(365).optional(),
  usageLimits: z.record(z.string(), z.number()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for listing tenants with filters
 */
export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'plan', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTenantAdminInput = z.infer<typeof createTenantAdminSchema>;
export type UpdateTenantAdminInput = z.infer<typeof updateTenantAdminSchema>;
export type AddTenantUserAdminInput = z.infer<typeof addTenantUserAdminSchema>;
export type ConfigureTenantModuleAdminInput = z.infer<
  typeof configureTenantModuleAdminSchema
>;
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
