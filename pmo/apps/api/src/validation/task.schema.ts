import { Priority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

// Input length limits for security (prevents resource exhaustion)
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

const nullableDate = z.preprocess(
  (value) => (value === null ? null : value),
  z.coerce.date().nullable(),
);

const taskStatusEnum =
  TaskStatus ??
  ({
    NOT_STARTED: 'NOT_STARTED',
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
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  status: z.nativeEnum(taskStatusEnum).optional(),
  priority: z.nativeEnum(taskPriorityEnum).optional(),
  dueDate: z.coerce.date().optional(),
  milestoneId: z.number().int().positive().optional(),
  parentTaskId: z.number().int().positive().optional(),
  assigneeIds: z.array(z.number().int().positive()).optional(),
});

// Schema for creating a subtask (inherits projectId from parent)
// Note: Subtasks do not have priority - they inherit urgency from parent task
export const subtaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  status: z.nativeEnum(taskStatusEnum).optional(),
  dueDate: z.coerce.date().optional(),
  milestoneId: z.number().int().positive().optional(),
  assigneeIds: z.array(z.number().int().positive()).optional(),
});

// Schema for updating a subtask's status
export const subtaskUpdateStatusSchema = z.object({
  status: z.nativeEnum(taskStatusEnum),
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
export type SubtaskCreateInput = z.infer<typeof subtaskCreateSchema>;
export type SubtaskUpdateStatusInput = z.infer<
  typeof subtaskUpdateStatusSchema
>;
