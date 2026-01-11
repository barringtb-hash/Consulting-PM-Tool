/**
 * Validation schemas for Account CTA API endpoints
 */

import { z } from 'zod';

export const createCTASchema = z.object({
  type: z.enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE']),
  priority: z
    .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
    .optional()
    .default('MEDIUM'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  reason: z.string().max(500).optional(),
  dueDate: z.coerce.date().optional(),
  playbookId: z.number().int().positive().optional(),
  successPlanId: z.number().int().positive().optional(),
});

export const updateCTASchema = z.object({
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'SNOOZED', 'COMPLETED', 'CANCELLED'])
    .optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  reason: z.string().max(500).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  snoozeUntil: z.coerce.date().optional(),
  resolutionNotes: z.string().max(2000).optional(),
  outcome: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).optional(),
  ownerId: z.number().int().positive().optional(),
  playbookId: z.number().int().positive().nullable().optional(),
});

export const listCTAsSchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  type: z
    .enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE'])
    .optional(),
  status: z
    .union([
      z.enum(['OPEN', 'IN_PROGRESS', 'SNOOZED', 'COMPLETED', 'CANCELLED']),
      z.array(
        z.enum(['OPEN', 'IN_PROGRESS', 'SNOOZED', 'COMPLETED', 'CANCELLED']),
      ),
    ])
    .optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  overdue: z.coerce.boolean().optional(),
  snoozed: z.coerce.boolean().optional(),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const closeCTASchema = z.object({
  outcome: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  resolutionNotes: z.string().max(2000).optional(),
});

export const snoozeCTASchema = z.object({
  snoozeUntil: z.coerce.date(),
});

export type CreateCTAInput = z.infer<typeof createCTASchema>;
export type UpdateCTAInput = z.infer<typeof updateCTASchema>;
export type ListCTAsInput = z.infer<typeof listCTAsSchema>;
export type CloseCTAInput = z.infer<typeof closeCTASchema>;
export type SnoozeCTAInput = z.infer<typeof snoozeCTASchema>;
