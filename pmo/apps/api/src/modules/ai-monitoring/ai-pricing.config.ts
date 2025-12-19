/**
 * AI Pricing Configuration
 *
 * Centralized pricing for all AI models used in the platform.
 * Prices are in USD per 1,000 tokens.
 * Updated: December 2024
 */

export interface ModelPricing {
  promptPer1k: number;
  completionPer1k: number;
  description?: string;
}

export const AI_MODEL_PRICING: Record<string, ModelPricing> = {
  // GPT-4 models
  'gpt-4': {
    promptPer1k: 0.03,
    completionPer1k: 0.06,
    description: 'GPT-4 (8K context)',
  },
  'gpt-4-32k': {
    promptPer1k: 0.06,
    completionPer1k: 0.12,
    description: 'GPT-4 (32K context)',
  },
  'gpt-4-turbo': {
    promptPer1k: 0.01,
    completionPer1k: 0.03,
    description: 'GPT-4 Turbo (128K context)',
  },
  'gpt-4-turbo-preview': {
    promptPer1k: 0.01,
    completionPer1k: 0.03,
    description: 'GPT-4 Turbo Preview',
  },
  'gpt-4o': {
    promptPer1k: 0.005,
    completionPer1k: 0.015,
    description: 'GPT-4o (Omni)',
  },
  'gpt-4o-mini': {
    promptPer1k: 0.00015,
    completionPer1k: 0.0006,
    description: 'GPT-4o Mini (cost-effective)',
  },

  // GPT-3.5 models
  'gpt-3.5-turbo': {
    promptPer1k: 0.0005,
    completionPer1k: 0.0015,
    description: 'GPT-3.5 Turbo',
  },
  'gpt-3.5-turbo-16k': {
    promptPer1k: 0.003,
    completionPer1k: 0.004,
    description: 'GPT-3.5 Turbo (16K context)',
  },

  // Embedding models
  'text-embedding-ada-002': {
    promptPer1k: 0.0001,
    completionPer1k: 0,
    description: 'Ada v2 Embeddings',
  },
  'text-embedding-3-small': {
    promptPer1k: 0.00002,
    completionPer1k: 0,
    description: 'Embedding 3 Small',
  },
  'text-embedding-3-large': {
    promptPer1k: 0.00013,
    completionPer1k: 0,
    description: 'Embedding 3 Large',
  },

  // Vision models (same as base, but noting vision capability)
  'gpt-4-vision-preview': {
    promptPer1k: 0.01,
    completionPer1k: 0.03,
    description: 'GPT-4 Vision',
  },

  // Default fallback for unknown models
  unknown: {
    promptPer1k: 0.01,
    completionPer1k: 0.03,
    description: 'Unknown model (using GPT-4 Turbo pricing as fallback)',
  },
};

/**
 * AI Cost Thresholds (confirmed configuration)
 */
export const AI_COST_THRESHOLDS = {
  // Monthly thresholds
  warningMonthly: 100, // USD - trigger warning alert
  criticalMonthly: 150, // USD - trigger critical alert

  // Daily thresholds (derived from monthly)
  warningDaily: 100 / 30, // ~$3.33/day
  criticalDaily: 150 / 30, // ~$5/day

  // Per-tenant thresholds (can be overridden per tenant)
  defaultTenantWarning: 50, // USD/month per tenant
  defaultTenantCritical: 100, // USD/month per tenant
};

/**
 * Calculate cost for a given model and token usage
 */
export function calculateAICost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = AI_MODEL_PRICING[model] || AI_MODEL_PRICING['unknown'];

  const promptCost = (promptTokens / 1000) * pricing.promptPer1k;
  const completionCost = (completionTokens / 1000) * pricing.completionPer1k;

  return promptCost + completionCost;
}

/**
 * Get pricing for a model (with fallback)
 */
export function getModelPricing(model: string): ModelPricing {
  return AI_MODEL_PRICING[model] || AI_MODEL_PRICING['unknown'];
}

/**
 * List of all known models
 */
export function getKnownModels(): string[] {
  return Object.keys(AI_MODEL_PRICING).filter((m) => m !== 'unknown');
}
