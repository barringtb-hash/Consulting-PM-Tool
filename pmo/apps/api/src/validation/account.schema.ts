/**
 * Account Validation Schemas
 *
 * Zod schemas for CRM Account API endpoints.
 */

import { z } from 'zod';

// Input length limits for security (prevents resource exhaustion)
const MAX_NAME_LENGTH = 200;
const MAX_WEBSITE_LENGTH = 500;
const MAX_PHONE_LENGTH = 50;
const MAX_INDUSTRY_LENGTH = 100;
const MAX_SEARCH_LENGTH = 200;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

// Reusable address schema
const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

export const accountTypeEnum = z.enum([
  'PROSPECT',
  'CUSTOMER',
  'PARTNER',
  'COMPETITOR',
  'CHURNED',
  'OTHER',
]);

export const employeeCountEnum = z.enum([
  'SOLO',
  'MICRO',
  'SMALL',
  'MEDIUM',
  'LARGE',
  'ENTERPRISE',
]);

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH),
  website: z.string().url().max(MAX_WEBSITE_LENGTH).optional(),
  phone: z.string().max(MAX_PHONE_LENGTH).optional(),
  parentAccountId: z.number().int().positive().optional(),
  type: accountTypeEnum.optional(),
  industry: z.string().max(MAX_INDUSTRY_LENGTH).optional(),
  employeeCount: employeeCountEnum.optional(),
  annualRevenue: z.number().positive().optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  healthScore: z.number().min(0).max(100).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  churnRisk: z.number().min(0).max(1).optional(),
  archived: z.boolean().optional(),
});

export const listAccountsSchema = z.object({
  type: z.string().max(20).optional(),
  industry: z.string().max(MAX_INDUSTRY_LENGTH).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  archived: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  healthScoreMin: z.coerce.number().min(0).max(100).optional(),
  healthScoreMax: z.coerce.number().min(0).max(100).optional(),
  search: z.string().max(MAX_SEARCH_LENGTH).optional(),
  tags: z.string().max(500).optional(), // Comma-separated
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const mergeAccountsSchema = z.object({
  sourceAccountId: z.number().int().positive(),
});

// Type exports
export type AccountType = z.infer<typeof accountTypeEnum>;
export type EmployeeCount = z.infer<typeof employeeCountEnum>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ListAccountsInput = z.infer<typeof listAccountsSchema>;
export type MergeAccountsInput = z.infer<typeof mergeAccountsSchema>;
