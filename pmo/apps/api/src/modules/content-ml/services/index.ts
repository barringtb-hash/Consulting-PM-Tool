/**
 * Content ML Services - Module Exports
 *
 * Exports all services for the content-ml module including:
 * - Brand voice analysis and consistency checking
 * - Content generation with brand voice
 * - SEO optimization and keyword suggestions
 * - Content ideation and management
 * - Content repurposing across platforms
 *
 * @module content-ml/services
 */

// Brand voice services
export {
  trainBrandVoice,
  getVoiceProfile,
  getVoiceTrainingStatus,
  checkVoiceConsistency,
  suggestVoiceImprovements,
  addVoiceSample,
  getVoiceSamples,
  removeVoiceSample,
  resetVoiceTraining,
  type VoiceTrainingStatus,
  type StoredVoiceSample,
} from './brand-voice.service';

// Content generation services
export {
  generateContent,
  generateHashtags,
  generateCaptions,
  type ContentGenerationRequest,
  type GeneratedContentResult,
} from './content-generation.service';

// SEO optimization services
export {
  analyzeSEO,
  suggestKeywords,
  optimizeContent,
  type KeywordSuggestion,
  type ContentOptimizationResult,
  type OptimizationChange,
} from './seo-optimization.service';

// Content ideas services
export {
  generateIdeas,
  saveIdea,
  getIdeas,
  updateIdeaStatus,
  deleteIdea,
  getIdeaById,
  getIdeaStats,
  type ContentIdeaRequest,
  type IdeaSource,
  type IdeaStatus,
  type ContentIdeaFilters,
  type SavedContentIdea,
  type IdeaStats,
} from './content-ideas.service';

// Content repurposing services
export {
  repurposeContent,
  optimizeForPlatform,
  getSuggestedFormats,
  getPlatformConstraints,
  PLATFORM_CONSTRAINTS,
  type RepurposeResult,
  type PlatformOptimizedContent,
} from './content-repurposing.service';
