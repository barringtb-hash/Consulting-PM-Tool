import { z } from 'zod';

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
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

export const updateBudgetSchema = createBudgetSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional(),
});

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
