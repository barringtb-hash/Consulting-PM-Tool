import { MilestoneStatus } from '@prisma/client';
import { z } from 'zod';

const nullableDate = z.preprocess(
  (value) => (value === null ? null : value),
  z.coerce.date().nullable(),
);

const milestoneStatusEnum =
  MilestoneStatus ??
  ({
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
  } as const);

export const milestoneCreateSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  status: z.nativeEnum(milestoneStatusEnum).optional(),
});

export const milestoneUpdateSchema = milestoneCreateSchema
  .partial()
  .extend({
    dueDate: nullableDate.optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'At least one field must be provided',
  );

export type MilestoneCreateInput = z.infer<typeof milestoneCreateSchema>;
export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateSchema>;
