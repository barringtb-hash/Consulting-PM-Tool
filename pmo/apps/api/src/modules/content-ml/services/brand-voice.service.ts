/**
 * Brand Voice Service
 *
 * Handles brand voice training, analysis, and consistency checking using OpenAI.
 * Provides functionality to:
 * - Train brand voice from sample content
 * - Check content consistency against trained voice
 * - Suggest improvements to match brand voice
 * - Manage voice samples
 *
 * @module content-ml/services
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import type {
  BrandVoiceProfile,
  BrandVoiceTrainingInput,
  VoiceConsistencyResult,
  VoiceDeviation,
  VoiceSample,
} from '../types';
import {
  BRAND_VOICE_SYSTEM_PROMPT,
  VOICE_CONSISTENCY_SYSTEM_PROMPT,
  buildBrandVoiceTrainingPrompt,
  buildVoiceConsistencyCheckPrompt,
  buildVoiceImprovementPrompt,
} from '../prompts/content-ml-prompts';

// ============================================================================
// Types
// ============================================================================

/**
 * Voice training status values
 */
export type VoiceTrainingStatus = 'pending' | 'training' | 'trained' | 'failed';

/**
 * Extended voice sample with additional metadata for storage
 */
export interface StoredVoiceSample extends VoiceSample {
  /** When the sample was added */
  addedAt?: Date;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'gpt-4o-mini';
const TRAINING_MAX_TOKENS = 2000;
const CONSISTENCY_MAX_TOKENS = 1500;
const IMPROVEMENT_MAX_TOKENS = 3000;
const DEFAULT_TEMPERATURE = 0.3;

/**
 * Default voice consistency result when no profile is available
 */
const DEFAULT_CONSISTENCY_RESULT: VoiceConsistencyResult = {
  consistencyScore: 50,
  toneMatch: 50,
  vocabularyMatch: 50,
  styleMatch: 50,
  deviations: [],
  overallFeedback:
    'No brand voice profile has been trained. Please train a brand voice profile to get meaningful consistency analysis.',
};

// ============================================================================
// Brand Voice Training
// ============================================================================

/**
 * Train brand voice from sample content.
 * Analyzes samples to create a structured voice profile.
 *
 * @param configId - The ContentGeneratorConfig ID to train voice for
 * @param input - Training input containing samples and brand information
 * @returns The generated brand voice profile
 * @throws Error if config not found or LLM service unavailable
 *
 * @example
 * ```typescript
 * const profile = await trainBrandVoice(123, {
 *   sampleContent: ['Sample blog post...', 'Sample email...'],
 *   brandName: 'Acme Corp',
 *   industry: 'Technology',
 *   targetAudience: 'Enterprise decision makers',
 *   tonePreferences: ['professional', 'authoritative']
 * });
 * ```
 */
export async function trainBrandVoice(
  configId: number,
  input: BrandVoiceTrainingInput,
): Promise<BrandVoiceProfile> {
  // Verify config exists
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: { id: true, tenantId: true },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  // Validate input
  if (!input.sampleContent || input.sampleContent.length === 0) {
    throw new Error('At least one content sample is required for training');
  }

  if (input.sampleContent.length < 3) {
    throw new Error(
      'At least 3 content samples are recommended for accurate voice training',
    );
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    throw new Error(
      'LLM service is not available. Please configure OpenAI API key.',
    );
  }

  // Update status to 'training'
  await prisma.contentGeneratorConfig.update({
    where: { id: configId },
    data: {
      voiceTrainingStatus: 'training' as VoiceTrainingStatus,
    },
  });

  try {
    // Build prompt and call LLM
    const prompt = buildBrandVoiceTrainingPrompt(input);

    const result = await llmService.completeWithSystem(
      BRAND_VOICE_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: TRAINING_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    // Parse response into BrandVoiceProfile
    const profile = parseVoiceProfile(result.content);

    // Validate the parsed profile
    validateVoiceProfile(profile);

    // Save profile to ContentGeneratorConfig
    await prisma.contentGeneratorConfig.update({
      where: { id: configId },
      data: {
        brandVoiceProfile: profile as unknown as Record<string, unknown>,
        voiceTrainingStatus: 'trained' as VoiceTrainingStatus,
        voiceTrainedAt: new Date(),
        lastVoiceAnalysis: new Date(),
      },
    });

    return profile;
  } catch (error) {
    // Update status to 'failed' on error
    await prisma.contentGeneratorConfig.update({
      where: { id: configId },
      data: {
        voiceTrainingStatus: 'failed' as VoiceTrainingStatus,
      },
    });

    throw error;
  }
}

/**
 * Parse LLM response into BrandVoiceProfile
 */
function parseVoiceProfile(response: string): BrandVoiceProfile {
  try {
    // Try to extract JSON from response (may have markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      primaryTone: parsed.primaryTone,
      secondaryTones: parsed.secondaryTones || [],
      formality: parsed.formality,
      personality: parsed.personality || [],
      vocabulary: {
        preferred: parsed.vocabulary?.preferred || [],
        avoided: parsed.vocabulary?.avoided || [],
        industryTerms: parsed.vocabulary?.industryTerms || [],
      },
      sentenceStyle: parsed.sentenceStyle,
      rhetoricDevices: parsed.rhetoricDevices || [],
    };
  } catch (error) {
    throw new Error(
      `Failed to parse voice profile from LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validate that a voice profile has required fields
 */
function validateVoiceProfile(profile: BrandVoiceProfile): void {
  if (!profile.primaryTone) {
    throw new Error('Voice profile missing required field: primaryTone');
  }
  if (!profile.formality) {
    throw new Error('Voice profile missing required field: formality');
  }
  if (!profile.sentenceStyle) {
    throw new Error('Voice profile missing required field: sentenceStyle');
  }
}

// ============================================================================
// Get Voice Profile
// ============================================================================

/**
 * Get existing brand voice profile for a config.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @returns The brand voice profile if trained, null otherwise
 *
 * @example
 * ```typescript
 * const profile = await getVoiceProfile(123);
 * if (profile) {
 *   console.log('Primary tone:', profile.primaryTone);
 * }
 * ```
 */
export async function getVoiceProfile(
  configId: number,
): Promise<BrandVoiceProfile | null> {
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: {
      brandVoiceProfile: true,
      voiceTrainingStatus: true,
    },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  if (!config.brandVoiceProfile) {
    return null;
  }

  // Cast the JSON to BrandVoiceProfile
  return config.brandVoiceProfile as unknown as BrandVoiceProfile;
}

/**
 * Get voice training status for a config.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @returns Training status information
 */
export async function getVoiceTrainingStatus(configId: number): Promise<{
  status: VoiceTrainingStatus | null;
  trainedAt: Date | null;
  lastAnalysis: Date | null;
}> {
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: {
      voiceTrainingStatus: true,
      voiceTrainedAt: true,
      lastVoiceAnalysis: true,
    },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  return {
    status: config.voiceTrainingStatus as VoiceTrainingStatus | null,
    trainedAt: config.voiceTrainedAt,
    lastAnalysis: config.lastVoiceAnalysis,
  };
}

// ============================================================================
// Voice Consistency Checking
// ============================================================================

/**
 * Check if content matches brand voice.
 * Returns detailed consistency scores and deviations.
 *
 * @param configId - The ContentGeneratorConfig ID with trained voice
 * @param content - The content to check for consistency
 * @returns Detailed consistency analysis result
 *
 * @example
 * ```typescript
 * const result = await checkVoiceConsistency(123, 'This is my blog post...');
 * if (result.consistencyScore < 70) {
 *   console.log('Content needs voice adjustments');
 *   result.deviations.forEach(d => console.log(d.suggestion));
 * }
 * ```
 */
export async function checkVoiceConsistency(
  configId: number,
  content: string,
): Promise<VoiceConsistencyResult> {
  // Get brand voice profile
  const profile = await getVoiceProfile(configId);

  // If no profile, return default score
  if (!profile) {
    return DEFAULT_CONSISTENCY_RESULT;
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return {
      ...DEFAULT_CONSISTENCY_RESULT,
      overallFeedback:
        'LLM service unavailable. Cannot perform voice consistency check.',
    };
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for consistency check');
  }

  // Build consistency check prompt
  const prompt = buildVoiceConsistencyCheckPrompt(profile, content);

  try {
    const result = await llmService.completeWithSystem(
      VOICE_CONSISTENCY_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: CONSISTENCY_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    // Parse response
    return parseConsistencyResult(result.content);
  } catch (error) {
    // Return a fallback result on error
    return {
      consistencyScore: 50,
      toneMatch: 50,
      vocabularyMatch: 50,
      styleMatch: 50,
      deviations: [],
      overallFeedback: `Error analyzing voice consistency: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse LLM response into VoiceConsistencyResult
 */
function parseConsistencyResult(response: string): VoiceConsistencyResult {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Ensure scores are within valid range
    const clampScore = (score: number): number =>
      Math.max(0, Math.min(100, score));

    const deviations: VoiceDeviation[] = (parsed.deviations || []).map(
      (d: Record<string, unknown>) => ({
        location: String(d.location || 'Unknown'),
        issue: String(d.issue || ''),
        suggestion: String(d.suggestion || ''),
        originalText: String(d.originalText || ''),
        suggestedText: String(d.suggestedText || ''),
      }),
    );

    return {
      consistencyScore: clampScore(parsed.consistencyScore ?? 50),
      toneMatch: clampScore(parsed.toneMatch ?? 50),
      vocabularyMatch: clampScore(parsed.vocabularyMatch ?? 50),
      styleMatch: clampScore(parsed.styleMatch ?? 50),
      deviations,
      overallFeedback: String(parsed.overallFeedback || ''),
    };
  } catch (error) {
    throw new Error(
      `Failed to parse consistency result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Voice Improvement Suggestions
// ============================================================================

/**
 * Suggest improvements to match brand voice.
 * Rewrites content to better align with the trained voice profile.
 *
 * @param configId - The ContentGeneratorConfig ID with trained voice
 * @param content - The content to improve
 * @returns Improved content and list of changes made
 *
 * @example
 * ```typescript
 * const result = await suggestVoiceImprovements(123, 'Original content...');
 * console.log('Improved:', result.improvedContent);
 * console.log('Changes made:', result.changes);
 * ```
 */
export async function suggestVoiceImprovements(
  configId: number,
  content: string,
): Promise<{
  improvedContent: string;
  changes: string[];
}> {
  // Get brand voice profile
  const profile = await getVoiceProfile(configId);

  if (!profile) {
    throw new Error(
      'No brand voice profile found. Please train a voice profile first.',
    );
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    throw new Error(
      'LLM service is not available. Please configure OpenAI API key.',
    );
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for voice improvement');
  }

  // Build improvement prompt
  const prompt = buildVoiceImprovementPrompt(profile, content);

  const result = await llmService.completeWithSystem(
    BRAND_VOICE_SYSTEM_PROMPT,
    prompt,
    {
      model: DEFAULT_MODEL,
      maxTokens: IMPROVEMENT_MAX_TOKENS,
      temperature: 0.4, // Slightly higher for creative rewriting
    },
  );

  // Parse response
  return parseImprovementResult(result.content);
}

/**
 * Parse LLM response into improvement result
 */
function parseImprovementResult(response: string): {
  improvedContent: string;
  changes: string[];
} {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      improvedContent: String(parsed.improvedContent || ''),
      changes: Array.isArray(parsed.changes)
        ? parsed.changes.map((c: unknown) => String(c))
        : [],
    };
  } catch (error) {
    throw new Error(
      `Failed to parse improvement result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Voice Sample Management
// ============================================================================

/**
 * Add new voice sample to training data.
 * Samples are stored for future retraining.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @param sample - The voice sample to add
 *
 * @example
 * ```typescript
 * await addVoiceSample(123, {
 *   text: 'This is a sample blog post from our website...',
 *   type: 'blog',
 *   source: 'website',
 *   isGoodExample: true
 * });
 * ```
 */
export async function addVoiceSample(
  configId: number,
  sample: VoiceSample,
): Promise<void> {
  // Validate sample
  if (!sample.text || sample.text.trim().length === 0) {
    throw new Error('Sample text is required');
  }

  if (!sample.type) {
    throw new Error('Sample type is required');
  }

  // Get current config
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: { voiceSamples: true },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  // Parse existing samples
  const existingSamples: StoredVoiceSample[] = Array.isArray(
    config.voiceSamples,
  )
    ? (config.voiceSamples as unknown as StoredVoiceSample[])
    : [];

  // Add new sample with timestamp
  const newSample: StoredVoiceSample = {
    ...sample,
    addedAt: new Date(),
  };

  existingSamples.push(newSample);

  // Update config with new samples array
  await prisma.contentGeneratorConfig.update({
    where: { id: configId },
    data: {
      voiceSamples: existingSamples as unknown as Record<string, unknown>[],
    },
  });
}

/**
 * Get all voice samples for a config.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @returns Array of voice samples with metadata
 */
export async function getVoiceSamples(
  configId: number,
): Promise<StoredVoiceSample[]> {
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: { voiceSamples: true },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  if (!config.voiceSamples || !Array.isArray(config.voiceSamples)) {
    return [];
  }

  return config.voiceSamples as unknown as StoredVoiceSample[];
}

/**
 * Remove a voice sample by index.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @param sampleIndex - The index of the sample to remove
 */
export async function removeVoiceSample(
  configId: number,
  sampleIndex: number,
): Promise<void> {
  const samples = await getVoiceSamples(configId);

  if (sampleIndex < 0 || sampleIndex >= samples.length) {
    throw new Error(`Invalid sample index: ${sampleIndex}`);
  }

  samples.splice(sampleIndex, 1);

  await prisma.contentGeneratorConfig.update({
    where: { id: configId },
    data: {
      voiceSamples: samples as unknown as Record<string, unknown>[],
    },
  });
}

/**
 * Clear all voice samples and reset training.
 *
 * @param configId - The ContentGeneratorConfig ID
 */
export async function resetVoiceTraining(configId: number): Promise<void> {
  await prisma.contentGeneratorConfig.update({
    where: { id: configId },
    data: {
      voiceSamples: [],
      brandVoiceProfile: undefined,
      voiceTrainingStatus: null,
      voiceTrainedAt: null,
      lastVoiceAnalysis: null,
    },
  });
}
