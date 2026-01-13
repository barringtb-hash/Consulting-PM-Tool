import { z } from 'zod';

// Valid ISO 4217 currency codes (common currencies)
const VALID_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'CNY',
  'INR',
  'MXN',
  'BRL',
  'KRW',
  'SGD',
  'HKD',
  'NZD',
] as const;

// Base budget fields schema (without refinements)
const budgetBaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  amount: z.number().positive(),
  currency: z
    .string()
    .length(3)
    .toUpperCase()
    .refine(
      (val) =>
        VALID_CURRENCIES.includes(val as (typeof VALID_CURRENCIES)[number]),
      {
        message: 'Invalid currency code',
      },
    )
    .default('USD'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional(),
  accountId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  alertThresholds: z
    .array(z.number().min(0).max(100))
    .default([50, 75, 90, 100]),
  allowRollover: z.boolean().default(false),
});

// Date validation refinement
const dateValidation = (data: {
  period?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}) => {
  // End date is required for CUSTOM period
  if (data.period === 'CUSTOM' && !data.endDate) {
    return false;
  }
  // End date must be after start date if provided
  if (data.endDate && data.startDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  }
  return true;
};

const dateValidationMessage = {
  message:
    'End date is required for custom period and must be after start date',
  path: ['endDate'] as const,
};

export const createBudgetSchema = budgetBaseSchema.refine(
  dateValidation,
  dateValidationMessage,
);

export const updateBudgetSchema = budgetBaseSchema
  .partial()
  .extend({
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  })
  .refine(dateValidation, dateValidationMessage);

export const listBudgetsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z
    .enum(['name', 'amount', 'spent', 'startDate', 'createdAt'])
    .default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  period: z
    .enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'])
    .optional(),
  accountId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().max(100).optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ListBudgetsInput = z.infer<typeof listBudgetsSchema>;
