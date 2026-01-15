/**
 * RAID Module
 *
 * Provides comprehensive RAID (Risks, Action Items, Issues, Decisions)
 * management capabilities for project management.
 *
 * Features:
 * - Action Items: Track informal tasks from meetings
 * - Decisions: Document and track project decisions
 * - Issues: Manage current project problems
 * - Extraction: AI-powered RAID extraction from text
 * - Summary: Aggregated RAID health metrics
 *
 * @module modules/raid
 */

// Main router
export { default as raidRouter } from './raid.router';

// Sub-routers (for testing or individual mounting)
export { default as actionItemsRouter } from './action-items.router';
export { default as decisionsRouter } from './decisions.router';
export { default as projectIssuesRouter } from './project-issues.router';
export { default as raidExtractionRouter } from './raid-extraction.router';

// Services
export * as actionItemService from './services/action-item.service';
export * as decisionService from './services/decision.service';
export * as projectIssueService from './services/project-issue.service';
export * as raidExtractionService from './services/raid-extraction.service';
export * as raidSummaryService from './services/raid-summary.service';

// Types
export type { ActionItem } from './services/action-item.service';
export type { Decision } from './services/decision.service';
export type { ProjectIssue } from './services/project-issue.service';
export type {
  ExtractedRisk,
  ExtractedActionItem,
  ExtractedIssue,
  ExtractedDecision,
  ExtractionResult,
} from './services/raid-extraction.service';
export type {
  RAIDCounts,
  RAIDSummary,
  RAIDTrendPoint,
  HealthIndicator,
} from './services/raid-summary.service';

// Validation schemas
export {
  // Action Item schemas
  createActionItemSchema,
  updateActionItemSchema,
  actionItemFiltersSchema,
  convertToTaskSchema,
  ActionItemStatus,
  ActionItemPriority,

  // Decision schemas
  createDecisionSchema,
  updateDecisionSchema,
  decisionFiltersSchema,
  supersedeDecisionSchema,
  DecisionStatus,
  DecisionImpact,

  // Project Issue schemas
  createProjectIssueSchema,
  updateProjectIssueSchema,
  projectIssueFiltersSchema,
  escalateIssueSchema,
  ProjectIssueStatus,
  ProjectIssueSeverity,
  RAIDSourceType,

  // Extraction schemas
  raidExtractionOptionsSchema,
  extractFromTextSchema,
} from './validation/raid.schema';

// Schema types
export type {
  CreateActionItemInput,
  UpdateActionItemInput,
  ActionItemFilters,
  ConvertToTaskInput,
  CreateDecisionInput,
  UpdateDecisionInput,
  DecisionFilters,
  SupersedeDecisionInput,
  CreateProjectIssueInput,
  UpdateProjectIssueInput,
  ProjectIssueFilters,
  EscalateIssueInput,
  RAIDExtractionOptions,
  ExtractFromTextInput,
} from './validation/raid.schema';

// Prompts (for customization)
export {
  RAID_EXTRACTION_SYSTEM_PROMPT,
  RAID_EXTRACTION_USER_PROMPT,
  RAID_EXTRACTION_TEXT_PROMPT,
  RAID_SUMMARY_PROMPT,
} from './prompts/raid-extraction-prompts';
