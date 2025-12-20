/**
 * AI Intake Module Exports
 *
 * Central export point for all AI-powered intake features.
 */

// Form Generation
export {
  generateForm,
  suggestFields,
  type FormGenerationRequest,
  type GeneratedForm,
  type GeneratedField,
  type FieldSuggestion,
} from './form-generator.service';

// Industry Detection
export {
  detectIndustry,
  detectIndustryWithDetails,
  detectIndustryRuleBased,
  getAvailableIndustries,
  getIndustryDisplayName,
  type IndustryType,
  type IndustryDetectionResult,
} from './industry-detector';

// Field Mapping
export {
  mapAIFieldsToSchema,
  validateMappedField,
  validateMappedFields,
  type AIGeneratedField,
  type MappedField,
} from './field-mapper';

// Prompts
export {
  getIndustryPrompt,
  getAllIndustryPrompts,
  hasSpecializedPrompt,
} from './prompts';
