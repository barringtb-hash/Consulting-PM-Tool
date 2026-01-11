import { z } from 'zod';

const nullableDate = z.preprocess(
  (value) => (value === null ? null : value),
  z.coerce.date().nullable(),
);

const taskStatusEnum = {
  BACKLOG: 'BACKLOG',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
} as const;

const taskPriorityEnum = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
} as const;

export const MeetingBaseSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1, 'Title is required'),
  date: z.coerce.date(),
  time: z.string().min(1, 'Time is required'),
  attendees: z.array(z.string().min(1)).default([]),
  notes: z.string().optional(),
  decisions: z.string().optional(),
  risks: z.string().optional(),
});

export const CreateMeetingSchema = MeetingBaseSchema;

export const UpdateMeetingSchema = MeetingBaseSchema.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  'At least one field must be provided',
);

export const MeetingSchema = MeetingBaseSchema.extend({
  id: z.number().int().positive(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateTaskFromSelectionSchema = z.object({
  meetingId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  selectionText: z.string().min(1, 'Selection text is required'),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.nativeEnum(taskStatusEnum).optional(),
  priority: z.nativeEnum(taskPriorityEnum).optional(),
  dueDate: nullableDate.optional(),
  milestoneId: z.number().int().positive().optional(),
});

export type MeetingBase = z.infer<typeof MeetingBaseSchema>;
export type CreateMeetingInput = z.infer<typeof CreateMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof UpdateMeetingSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
export type CreateTaskFromSelectionInput = z.infer<
  typeof CreateTaskFromSelectionSchema
>;
