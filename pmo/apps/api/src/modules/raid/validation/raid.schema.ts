/**
 * RAID Validation Schemas
 *
 * Zod schemas for validating RAID (Risks, Action Items, Issues, Decisions) data.
 * These schemas ensure data integrity for all RAID module operations.
 *
 * @module modules/raid/validation
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Action Item status enum values
 */
export const ActionItemStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  CONVERTED_TO_TASK: 'CONVERTED_TO_TASK',
} as const;

/**
 * Action Item priority enum values (uses shared Priority enum: P0, P1, P2)
 */
export const ActionItemPriority = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
} as const;

/**
 * Decision status enum values
 */
export const DecisionStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUPERSEDED: 'SUPERSEDED',
  DEFERRED: 'DEFERRED',
} as const;

/**
 * Decision impact enum values
 */
export const DecisionImpact = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

/**
 * Project Issue status enum values
 */
export const ProjectIssueStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  ESCALATED: 'ESCALATED',
} as const;

/**
 * Project Issue severity enum values
 */
export const ProjectIssueSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

/**
 * Project Issue category enum values
 */
export const ProjectIssueCategory = {
  TECHNICAL: 'TECHNICAL',
  RESOURCE: 'RESOURCE',
  SCOPE: 'SCOPE',
  BUDGET: 'BUDGET',
  TIMELINE: 'TIMELINE',
  QUALITY: 'QUALITY',
  COMMUNICATION: 'COMMUNICATION',
  EXTERNAL: 'EXTERNAL',
  OTHER: 'OTHER',
} as const;

// =============================================================================
// ACTION ITEM SCHEMAS
// =============================================================================

/**
 * Base schema for Action Item fields
 */
// Helper to convert empty strings to undefined for optional date fields
const optionalDateSchema = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.coerce.date().optional().nullable(),
);

const actionItemBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  assigneeId: z.number().int().positive().optional().nullable(),
  assigneeName: z.string().max(255).optional().nullable(),
  dueDate: optionalDateSchema,
  priority: z.nativeEnum(ActionItemPriority).default('P2'),
  status: z.nativeEnum(ActionItemStatus).default('OPEN'),
  sourceMeetingId: z.number().int().positive().optional().nullable(),
  sourceText: z
    .string()
    .max(1000, 'Source text too long')
    .optional()
    .nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

/**
 * Schema for creating an Action Item
 */
export const createActionItemSchema = actionItemBaseSchema.extend({
  projectId: z.number().int().positive(),
});

/**
 * Schema for updating an Action Item
 */
export const updateActionItemSchema = actionItemBaseSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'At least one field must be provided',
  );

/**
 * Schema for filtering Action Items
 */
export const actionItemFiltersSchema = z.object({
  status: z.array(z.nativeEnum(ActionItemStatus)).optional(),
  priority: z.array(z.nativeEnum(ActionItemPriority)).optional(),
  assigneeId: z.number().int().positive().optional(),
  overdue: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Schema for converting an Action Item to a Task
 */
export const convertToTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  milestoneId: z.number().int().positive().optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeIds: z.array(z.number().int().positive()).optional(),
});

// =============================================================================
// DECISION SCHEMAS
// =============================================================================

/**
 * Base schema for Decision fields
 */
const decisionBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  context: z.string().max(2000, 'Context too long').optional().nullable(),
  rationale: z.string().max(2000, 'Rationale too long').optional().nullable(),
  impact: z.nativeEnum(DecisionImpact).default('MEDIUM'),
  status: z.nativeEnum(DecisionStatus).default('PENDING'),
  decisionMakerId: z.number().int().positive().optional().nullable(),
  decisionMakerName: z.string().max(255).optional().nullable(),
  decisionDate: optionalDateSchema,
  effectiveDate: optionalDateSchema,
  reviewDate: optionalDateSchema,
  sourceMeetingId: z.number().int().positive().optional().nullable(),
  sourceText: z
    .string()
    .max(1000, 'Source text too long')
    .optional()
    .nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/**
 * Schema for creating a Decision
 */
export const createDecisionSchema = decisionBaseSchema.extend({
  projectId: z.number().int().positive(),
});

/**
 * Schema for updating a Decision
 */
export const updateDecisionSchema = decisionBaseSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'At least one field must be provided',
  );

/**
 * Schema for filtering Decisions
 */
export const decisionFiltersSchema = z.object({
  status: z.array(z.nativeEnum(DecisionStatus)).optional(),
  impact: z.array(z.nativeEnum(DecisionImpact)).optional(),
  decisionMakerId: z.number().int().positive().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Schema for superseding a Decision
 */
export const supersedeDecisionSchema = z.object({
  newDecisionId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

// =============================================================================
// PROJECT ISSUE SCHEMAS
// =============================================================================

/**
 * Base schema for Project Issue fields
 */
const projectIssueBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  severity: z.nativeEnum(ProjectIssueSeverity).default('MEDIUM'),
  category: z.nativeEnum(ProjectIssueCategory).default('OTHER'),
  status: z.nativeEnum(ProjectIssueStatus).default('OPEN'),
  assigneeId: z.number().int().positive().optional().nullable(),
  assigneeName: z.string().max(255).optional().nullable(),
  reportedById: z.number().int().positive().optional().nullable(),
  reportedByName: z.string().max(255).optional().nullable(),
  reportedDate: optionalDateSchema,
  targetResolutionDate: optionalDateSchema,
  actualResolutionDate: optionalDateSchema,
  resolution: z.string().max(2000, 'Resolution too long').optional().nullable(),
  impact: z
    .string()
    .max(1000, 'Impact description too long')
    .optional()
    .nullable(),
  workaround: z.string().max(1000, 'Workaround too long').optional().nullable(),
  sourceMeetingId: z.number().int().positive().optional().nullable(),
  sourceText: z
    .string()
    .max(1000, 'Source text too long')
    .optional()
    .nullable(),
  escalationLevel: z.number().int().min(0).max(5).default(0),
});

/**
 * Schema for creating a Project Issue
 */
export const createProjectIssueSchema = projectIssueBaseSchema.extend({
  projectId: z.number().int().positive(),
});

/**
 * Schema for updating a Project Issue
 */
export const updateProjectIssueSchema = projectIssueBaseSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'At least one field must be provided',
  );

/**
 * Schema for filtering Project Issues
 */
export const projectIssueFiltersSchema = z.object({
  status: z.array(z.nativeEnum(ProjectIssueStatus)).optional(),
  severity: z.array(z.nativeEnum(ProjectIssueSeverity)).optional(),
  category: z.array(z.nativeEnum(ProjectIssueCategory)).optional(),
  assigneeId: z.number().int().positive().optional(),
  escalated: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Schema for escalating an Issue
 */
export const escalateIssueSchema = z.object({
  reason: z.string().max(500).optional(),
  escalateTo: z.string().max(255).optional(),
});

// =============================================================================
// RAID EXTRACTION SCHEMAS
// =============================================================================

/**
 * Schema for RAID extraction options
 */
export const raidExtractionOptionsSchema = z.object({
  extractRisks: z.boolean().default(true),
  extractActionItems: z.boolean().default(true),
  extractDecisions: z.boolean().default(true),
  extractIssues: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(0.6),
  autoSave: z.boolean().default(false),
});

/**
 * Schema for text extraction request
 */
export const extractFromTextSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text too long'),
  projectId: z.number().int().positive(),
  context: z.string().max(500).optional(),
  options: raidExtractionOptionsSchema.optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
export type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;
export type ActionItemFilters = z.infer<typeof actionItemFiltersSchema>;
export type ConvertToTaskInput = z.infer<typeof convertToTaskSchema>;

export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;
export type DecisionFilters = z.infer<typeof decisionFiltersSchema>;
export type SupersedeDecisionInput = z.infer<typeof supersedeDecisionSchema>;

export type CreateProjectIssueInput = z.infer<typeof createProjectIssueSchema>;
export type UpdateProjectIssueInput = z.infer<typeof updateProjectIssueSchema>;
export type ProjectIssueFilters = z.infer<typeof projectIssueFiltersSchema>;
export type EscalateIssueInput = z.infer<typeof escalateIssueSchema>;

export type RAIDExtractionOptions = z.infer<typeof raidExtractionOptionsSchema>;
export type ExtractFromTextInput = z.infer<typeof extractFromTextSchema>;
