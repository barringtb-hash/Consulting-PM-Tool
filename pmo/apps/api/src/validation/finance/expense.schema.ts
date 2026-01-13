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

export const createExpenseSchema = z.object({
  description: z.string().min(1).max(500),
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
  date: z.string().datetime().or(z.date()),
  categoryId: z.number().int().positive(),
  accountId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  budgetId: z.number().int().positive().optional(),
  vendorName: z.string().max(255).optional(),
  vendorId: z.string().max(100).optional(),
  invoiceNumber: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  notes: z.string().max(2000).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        type: z.string(),
      }),
    )
    .max(10)
    .default([]),
  allocations: z
    .array(
      z.object({
        accountId: z.number().int().positive().optional(),
        projectId: z.number().int().positive().optional(),
        percentage: z.number().min(0).max(100),
        amount: z.number().positive(),
      }),
    )
    .optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  status: z
    .enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'])
    .optional(),
});

export const listExpensesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(['date', 'amount', 'status', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z
    .enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'])
    .optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  budgetId: z.coerce.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

export const approveExpenseSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const rejectExpenseSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesInput = z.infer<typeof listExpensesSchema>;
