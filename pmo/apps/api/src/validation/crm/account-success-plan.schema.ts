/**
 * Validation schemas for Account Success Plan API endpoints
 */

import { z } from 'zod';

export const createSuccessPlanSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  customerGoals: z
    .array(
      z.object({
        goal: z.string(),
        metric: z.string().optional(),
        baseline: z.number().optional(),
        target: z.number().optional(),
      }),
    )
    .optional(),
  isCustomerVisible: z.boolean().optional().default(false),
});

export const updateSuccessPlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])
    .optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  customerGoals: z
    .array(
      z.object({
        goal: z.string(),
        metric: z.string().optional(),
        baseline: z.number().optional(),
        target: z.number().optional(),
      }),
    )
    .optional(),
  isCustomerVisible: z.boolean().optional(),
  customerNotes: z.string().max(2000).optional(),
  ownerId: z.number().int().positive().optional(),
});

export const listSuccessPlansSchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  status: z
    .union([
      z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
      z.array(z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])),
    ])
    .optional(),
  sortBy: z.enum(['targetDate', 'createdAt', 'progressPercent']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  successCriteria: z.string().max(1000).optional(),
});

export const updateObjectiveSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z
    .enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'])
    .optional(),
  dueDate: z.coerce.date().nullable().optional(),
  successCriteria: z.string().max(1000).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional().default('P1'),
  dueDate: z.coerce.date().optional(),
  ownerId: z.number().int().positive().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']),
});

export type CreateSuccessPlanInput = z.infer<typeof createSuccessPlanSchema>;
export type UpdateSuccessPlanInput = z.infer<typeof updateSuccessPlanSchema>;
export type ListSuccessPlansInput = z.infer<typeof listSuccessPlansSchema>;
export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>;
export type UpdateObjectiveInput = z.infer<typeof updateObjectiveSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
