/**
 * Compliance Module Exports
 *
 * Central export point for legal compliance features.
 */

// Conflict Checking
export {
  checkForConflicts,
  quickConflictCheck,
  saveConflictCheckResult,
  type ConflictSeverity,
  type ConflictMatch,
  type ConflictCheckResult,
  type ConflictCheckConfig,
} from './conflict-check.service';

// Engagement Letters
export {
  generateEngagementLetter,
  getAvailableTemplates,
  getTemplate,
  previewTemplate,
  validateLetter,
  type EngagementLetterTemplate,
  type GeneratedLetter,
  type LetterGenerationOptions,
} from './engagement-letter.service';
