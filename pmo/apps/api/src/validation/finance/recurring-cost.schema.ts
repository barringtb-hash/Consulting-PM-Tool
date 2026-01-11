import { z } from 'zod';

export const createRecurringCostSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum([
    'SUBSCRIPTION',
    'LICENSE',
    'PAYROLL',
    'BENEFITS',
    'CONTRACTOR',
    'RENT',
    'UTILITIES',
    'INSURANCE',
    'MAINTENANCE',
    'OTHER',
  ]),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  frequency: z.enum([
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'SEMIANNUALLY',
    'YEARLY',
  ]),
  billingDay: z.number().int().min(1).max(31).optional(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional(),
  nextDueDate: z.string().datetime().or(z.date()),
  accountId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive(),
  vendorName: z.string().max(255).optional(),
  vendorUrl: z.string().url().optional(),
  contractNumber: z.string().max(100).optional(),
  seatCount: z.number().int().positive().optional(),
  costPerSeat: z.number().positive().optional(),
  employeeId: z.number().int().positive().optional(),
  department: z.string().max(100).optional(),
  autoRenew: z.boolean().default(true),
  renewalAlertDays: z.number().int().min(1).max(365).default(30),
});

export const updateRecurringCostSchema = createRecurringCostSchema
  .partial()
  .extend({
    status: z
      .enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'])
      .optional(),
  });

export const listRecurringCostsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z
    .enum(['name', 'amount', 'nextDueDate', 'createdAt'])
    .default('nextDueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'])
    .optional(),
  type: z
    .enum([
      'SUBSCRIPTION',
      'LICENSE',
      'PAYROLL',
      'BENEFITS',
      'CONTRACTOR',
      'RENT',
      'UTILITIES',
      'INSURANCE',
      'MAINTENANCE',
      'OTHER',
    ])
    .optional(),
  accountId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().max(100).optional(),
  dueBefore: z.string().datetime().optional(),
});

export type CreateRecurringCostInput = z.infer<
  typeof createRecurringCostSchema
>;
export type UpdateRecurringCostInput = z.infer<
  typeof updateRecurringCostSchema
>;
export type ListRecurringCostsInput = z.infer<typeof listRecurringCostsSchema>;
