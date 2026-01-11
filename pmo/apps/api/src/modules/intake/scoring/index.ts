/**
 * Lead Scoring Module Exports
 *
 * Central export point for intake lead scoring features.
 */

export {
  scoreSubmission,
  calculateScore,
  getScoringModel,
  getAvailableScoringModels,
  createScoringModel,
  validateScoringModel,
  type ScoringRule,
  type ScoringCondition,
  type ScoringModel,
  type ScoreResult,
  type ScoreBreakdown,
} from './lead-scoring.service';
