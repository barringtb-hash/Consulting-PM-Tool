/**
 * Validation schemas for Playbook API endpoints
 */

import { z } from 'zod';

export const createPlaybookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ctaType: z
    .enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE'])
    .optional(),
  category: z.string().max(100).optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        daysFromStart: z.number().int().min(0).max(365).optional().default(0),
        assignToOwner: z.boolean().optional().default(true),
      }),
    )
    .optional(),
});

export const updatePlaybookSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  ctaType: z
    .enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE'])
    .nullable()
    .optional(),
  category: z.string().max(100).nullable().optional(),
});

export const listPlaybooksSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  ctaType: z
    .enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE'])
    .optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'timesUsed', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const addPlaybookTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  daysFromStart: z.number().int().min(0).max(365).optional().default(0),
  assignToOwner: z.boolean().optional().default(true),
});

export const updatePlaybookTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  daysFromStart: z.number().int().min(0).max(365).optional(),
  assignToOwner: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const reorderPlaybookTasksSchema = z.object({
  taskIds: z.array(z.number().int().positive()),
});

export const clonePlaybookSchema = z.object({
  newName: z.string().min(1).max(200),
});

export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;
export type UpdatePlaybookInput = z.infer<typeof updatePlaybookSchema>;
export type ListPlaybooksInput = z.infer<typeof listPlaybooksSchema>;
export type AddPlaybookTaskInput = z.infer<typeof addPlaybookTaskSchema>;
export type UpdatePlaybookTaskInput = z.infer<typeof updatePlaybookTaskSchema>;
export type ReorderPlaybookTasksInput = z.infer<
  typeof reorderPlaybookTasksSchema
>;
export type ClonePlaybookInput = z.infer<typeof clonePlaybookSchema>;
