/**
 * Activity Validation Schemas
 *
 * Zod schemas for CRM Activity API endpoints.
 */

import { z } from 'zod';

// Input length limits for security (prevents resource exhaustion)
const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_OUTCOME_LENGTH = 2000;
const MAX_SEARCH_LENGTH = 200;
const MAX_EXTERNAL_ID_LENGTH = 200;
const MAX_EXTERNAL_SOURCE_LENGTH = 100;
const MAX_DURATION_MINUTES = 1440; // 24 hours

export const activityTypeEnum = z.enum([
  'CALL',
  'EMAIL',
  'MEETING',
  'TASK',
  'NOTE',
  'SMS',
  'LINKEDIN_MESSAGE',
  'CHAT',
  'DEMO',
  'PROPOSAL',
  'CONTRACT',
  'OTHER',
]);

export const activityStatusEnum = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export const activityPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const createActivitySchema = z.object({
  type: activityTypeEnum,
  accountId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  subject: z.string().max(MAX_SUBJECT_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  outcome: z.string().max(MAX_OUTCOME_LENGTH).optional(),
  scheduledAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional(),
  duration: z.number().int().positive().max(MAX_DURATION_MINUTES).optional(),
  status: activityStatusEnum.optional(),
  priority: activityPriorityEnum.optional(),
  externalId: z.string().max(MAX_EXTERNAL_ID_LENGTH).optional(),
  externalSource: z.string().max(MAX_EXTERNAL_SOURCE_LENGTH).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateActivitySchema = createActivitySchema.partial().extend({
  completedAt: z.coerce.date().optional().nullable(),
  ownerId: z.number().int().positive().optional(),
});

export const listActivitiesSchema = z.object({
  type: z.string().max(200).optional(), // Comma-separated types
  status: z.string().max(100).optional(), // Comma-separated statuses
  priority: activityPriorityEnum.optional(),
  accountId: z.coerce.number().int().positive().optional(),
  contactId: z.coerce.number().int().positive().optional(),
  opportunityId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  scheduledFrom: z.coerce.date().optional(),
  scheduledTo: z.coerce.date().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  search: z.string().max(MAX_SEARCH_LENGTH).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const completeActivitySchema = z.object({
  outcome: z.string().max(MAX_OUTCOME_LENGTH).optional(),
});

export const logCallSchema = z.object({
  accountId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  subject: z.string().max(MAX_SUBJECT_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  outcome: z.string().max(MAX_OUTCOME_LENGTH).optional(),
  duration: z.number().int().positive().max(MAX_DURATION_MINUTES).optional(),
});

export const logNoteSchema = z.object({
  accountId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  subject: z.string().max(MAX_SUBJECT_LENGTH).optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(MAX_DESCRIPTION_LENGTH),
});

// Type exports
export type ActivityType = z.infer<typeof activityTypeEnum>;
export type ActivityStatus = z.infer<typeof activityStatusEnum>;
export type ActivityPriority = z.infer<typeof activityPriorityEnum>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesInput = z.infer<typeof listActivitiesSchema>;
export type CompleteActivityInput = z.infer<typeof completeActivitySchema>;
export type LogCallInput = z.infer<typeof logCallSchema>;
export type LogNoteInput = z.infer<typeof logNoteSchema>;
