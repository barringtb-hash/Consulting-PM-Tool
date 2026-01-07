/**
 * AI Projects Module
 *
 * Provides AI-powered project management features including:
 * - Project Assistant (natural language interface)
 * - AI Status Summaries
 * - Smart Task Descriptions
 * - Template Matching
 * - Duration Estimation
 */

export { default as aiProjectsRouter } from './ai-projects.router';

// Intent Classification
export {
  classifyProjectIntent,
  classifyProjectIntentAI,
  classifyProjectIntentRuleBased,
  isProjectIntent,
  PROJECT_INTENT_KEYWORDS,
} from './intents/project.intent';
export type { IntentClassification } from './intents/project.intent';

// Intent Handlers
export { handleProjectIntent } from './handlers/project.handler';
export type {
  ProjectContext,
  BotResponse,
  SuggestedAction,
} from './handlers/project.handler';

// Services
export { aiStatusService } from './services/ai-status.service';
export type {
  AIStatusSummary,
  HealthFactor,
  Concern,
  Recommendation,
  ProjectMetrics,
} from './services/ai-status.service';

export { taskEnrichmentService } from './services/task-enrichment.service';
export type {
  TaskEnrichmentSuggestion,
  SubtaskSuggestion,
  DependencySuggestion,
  RelatedTask,
} from './services/task-enrichment.service';

export { templateMatchingService } from './services/template-matching.service';
export type {
  TemplateMatch,
  TemplateApplication,
} from './services/template-matching.service';

// Phase 2: Predictive Intelligence Services
export { healthPredictionService } from './services/health-prediction.service';
export type {
  HealthPrediction,
  RiskFactor,
  PredictionRecommendation,
} from './services/health-prediction.service';

export { scopeDetectionService } from './services/scope-detection.service';
export type {
  ScopeBaseline,
  ScopeChange,
  ScopeAnalysis,
} from './services/scope-detection.service';

export { riskExtractionService } from './services/risk-extraction.service';
export type {
  ExtractedRisk,
  ExtractedActionItem,
  ExtractedDecision,
  ExtractionResult,
} from './services/risk-extraction.service';

// Phase 3: Automation Services
export { digestService } from './services/digest.service';
export type {
  DigestConfig,
  DigestContent,
  DigestSection,
  DigestItem,
} from './services/digest.service';

export { autoSchedulingService } from './services/auto-scheduling.service';
export type {
  ScheduleRequest,
  ScheduleResult,
  ScheduledTask,
  ScheduleWarning,
} from './services/auto-scheduling.service';

export { smartRemindersService } from './services/smart-reminders.service';
export type {
  SmartReminder,
  ReminderPreferences,
} from './services/smart-reminders.service';

// Phase 4: Advanced Analytics Services
export { projectSimilarityService } from './services/project-similarity.service';
export type {
  SimilarProject,
  LessonLearned,
  ProjectProfile,
  SimilaritySearchResult,
} from './services/project-similarity.service';

export { documentGeneratorService } from './services/document-generator.service';
export type {
  DocumentType,
  DocumentTemplate,
  GeneratedDocument,
  GeneratedSection,
  DocumentInput,
} from './services/document-generator.service';

export { portfolioDashboardService } from './services/portfolio-dashboard.service';
export type {
  PortfolioSummary,
  PortfolioProject,
  RiskHeatmap,
  ResourceAnalysis,
  PortfolioInsights,
} from './services/portfolio-dashboard.service';
