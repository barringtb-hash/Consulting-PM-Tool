/**
 * Opportunity Validation Schemas
 *
 * Zod schemas for CRM Opportunity (Deal) API endpoints.
 */

import { z } from 'zod';

// Input length limits for security (prevents resource exhaustion)
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CURRENCY_LENGTH = 3;
const MAX_SEARCH_LENGTH = 200;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;
const MAX_LOST_REASON_LENGTH = 200;
const MAX_LOST_DETAIL_LENGTH = 2000;
const MAX_ROLE_LENGTH = 100;

export const opportunityStatusEnum = z.enum(['OPEN', 'WON', 'LOST']);

export const createOpportunitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  accountId: z.number().int().positive(),
  pipelineId: z.number().int().positive().optional(),
  stageId: z.number().int().positive(),
  amount: z.number().positive().optional(),
  probability: z.number().min(0).max(100).optional(),
  currency: z.string().length(MAX_CURRENCY_LENGTH).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  leadSource: z.string().max(50).optional(),
  campaignId: z.number().int().positive().optional(),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  contactIds: z.array(z.number().int().positive()).max(50).optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial().omit({
  accountId: true,
});

export const listOpportunitiesSchema = z.object({
  status: opportunityStatusEnum.optional(),
  pipelineId: z.coerce.number().int().positive().optional(),
  stageId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  expectedCloseFrom: z.coerce.date().optional(),
  expectedCloseTo: z.coerce.date().optional(),
  amountMin: z.coerce.number().positive().optional(),
  amountMax: z.coerce.number().positive().optional(),
  search: z.string().max(MAX_SEARCH_LENGTH).optional(),
  tags: z.string().max(500).optional(), // Comma-separated
  archived: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const moveStageSchema = z.object({
  stageId: z.number().int().positive(),
});

export const markWonSchema = z.object({
  actualCloseDate: z.coerce.date().optional(),
  amount: z.number().positive().optional(),
});

export const markLostSchema = z.object({
  lostReason: z.string().max(MAX_LOST_REASON_LENGTH).optional(),
  lostReasonDetail: z.string().max(MAX_LOST_DETAIL_LENGTH).optional(),
  competitorId: z.number().int().positive().optional(),
});

export const addContactSchema = z.object({
  contactId: z.number().int().positive(),
  role: z.string().max(MAX_ROLE_LENGTH).optional(),
  isPrimary: z.boolean().optional(),
});

// Type exports
export type OpportunityStatus = z.infer<typeof opportunityStatusEnum>;
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type ListOpportunitiesInput = z.infer<typeof listOpportunitiesSchema>;
export type MoveStageInput = z.infer<typeof moveStageSchema>;
export type MarkWonInput = z.infer<typeof markWonSchema>;
export type MarkLostInput = z.infer<typeof markLostSchema>;
export type AddContactInput = z.infer<typeof addContactSchema>;
