import { Priority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

const nullableDate = z.preprocess(
  (value) => (value === null ? null : value),
  z.coerce.date().nullable(),
);

const taskStatusEnum =
  TaskStatus ??
  ({
    BACKLOG: 'BACKLOG',
    IN_PROGRESS: 'IN_PROGRESS',
    BLOCKED: 'BLOCKED',
    DONE: 'DONE',
  } as const);

const taskPriorityEnum =
  Priority ??
  ({
    P0: 'P0',
    P1: 'P1',
    P2: 'P2',
  } as const);

export const taskCreateSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.nativeEnum(taskStatusEnum).optional(),
  priority: z.nativeEnum(taskPriorityEnum).optional(),
  dueDate: z.coerce.date().optional(),
  milestoneId: z.number().int().positive().optional(),
});

export const taskUpdateSchema = taskCreateSchema
  .partial()
  .extend({
    milestoneId: z.number().int().positive().nullable().optional(),
    dueDate: nullableDate.optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'At least one field must be provided',
  );

export const taskMoveSchema = z
  .object({
    status: z.nativeEnum(taskStatusEnum).optional(),
    milestoneId: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.milestoneId !== undefined,
    'Status or milestoneId must be provided',
  );

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskMoveInput = z.infer<typeof taskMoveSchema>;
