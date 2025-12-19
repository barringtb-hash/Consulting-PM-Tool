/**
 * Lead Scoring Service for Intake
 *
 * Scores intake submissions based on configurable criteria
 * to help prioritize follow-ups and predict conversion likelihood.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';
import { detectIndustry } from '../ai';

// ============================================================================
// TYPES
// ============================================================================

export interface ScoringRule {
  id: string;
  name: string;
  description: string;
  category: 'firmographic' | 'engagement' | 'qualification' | 'urgency' | 'fit';
  condition: ScoringCondition;
  points: number;
  maxPoints?: number;
}

export interface ScoringCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'regex';
  value: unknown;
}

export interface ScoringModel {
  id: string;
  name: string;
  description?: string;
  rules: ScoringRule[];
  maxScore: number;
  thresholds: {
    hot: number;
    warm: number;
    cold: number;
  };
}

export interface ScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  priority: 'hot' | 'warm' | 'cold';
  breakdown: ScoreBreakdown[];
  recommendations: string[];
  predictedConversionRate?: number;
}

export interface ScoreBreakdown {
  ruleId: string;
  ruleName: string;
  category: string;
  points: number;
  maxPoints: number;
  matched: boolean;
  reason: string;
}

// ============================================================================
// DEFAULT SCORING MODELS
// ============================================================================

const DEFAULT_SCORING_MODELS: Record<string, ScoringModel> = {
  legal: {
    id: 'legal-default',
    name: 'Legal Services Scoring Model',
    rules: [
      {
        id: 'case-type-high-value',
        name: 'High-Value Case Type',
        description: 'Case types that typically result in higher engagement',
        category: 'qualification',
        condition: { field: 'case_type', operator: 'in', value: ['personal_injury', 'medical_malpractice', 'corporate', 'real_estate'] },
        points: 20,
      },
      {
        id: 'urgency-indicator',
        name: 'Urgency Indicator',
        description: 'Client indicated urgent need',
        category: 'urgency',
        condition: { field: 'urgency', operator: 'in', value: ['urgent', 'asap', 'immediate'] },
        points: 15,
      },
      {
        id: 'budget-above-threshold',
        name: 'Budget Above Threshold',
        description: 'Client has significant budget',
        category: 'qualification',
        condition: { field: 'budget', operator: 'greater_than', value: 5000 },
        points: 15,
      },
      {
        id: 'referral-source',
        name: 'Referral Source',
        description: 'Came through referral',
        category: 'fit',
        condition: { field: 'source', operator: 'in', value: ['referral', 'client_referral', 'attorney_referral'] },
        points: 15,
      },
      {
        id: 'complete-contact-info',
        name: 'Complete Contact Information',
        description: 'Provided phone and email',
        category: 'engagement',
        condition: { field: 'phone', operator: 'exists', value: true },
        points: 10,
      },
      {
        id: 'detailed-description',
        name: 'Detailed Description',
        description: 'Provided detailed case description',
        category: 'engagement',
        condition: { field: 'description', operator: 'regex', value: '.{100,}' },
        points: 10,
      },
      {
        id: 'business-client',
        name: 'Business Client',
        description: 'Representing a business entity',
        category: 'firmographic',
        condition: { field: 'client_type', operator: 'equals', value: 'business' },
        points: 15,
      },
    ],
    maxScore: 100,
    thresholds: { hot: 70, warm: 40, cold: 0 },
  },
  healthcare: {
    id: 'healthcare-default',
    name: 'Healthcare Scoring Model',
    rules: [
      {
        id: 'insurance-verified',
        name: 'Insurance Verified',
        description: 'Has verified insurance information',
        category: 'qualification',
        condition: { field: 'insurance_member_id', operator: 'exists', value: true },
        points: 20,
      },
      {
        id: 'new-patient',
        name: 'New Patient',
        description: 'First-time patient seeking care',
        category: 'fit',
        condition: { field: 'patient_type', operator: 'equals', value: 'new' },
        points: 15,
      },
      {
        id: 'referred-by-provider',
        name: 'Provider Referral',
        description: 'Referred by another healthcare provider',
        category: 'fit',
        condition: { field: 'referral_source', operator: 'in', value: ['physician', 'specialist', 'hospital'] },
        points: 15,
      },
      {
        id: 'appointment-flexibility',
        name: 'Scheduling Flexibility',
        description: 'Flexible with appointment times',
        category: 'engagement',
        condition: { field: 'preferred_times', operator: 'contains', value: 'any' },
        points: 10,
      },
      {
        id: 'complete-medical-history',
        name: 'Complete Medical History',
        description: 'Provided medical history details',
        category: 'engagement',
        condition: { field: 'medical_history', operator: 'exists', value: true },
        points: 15,
      },
      {
        id: 'urgent-care-needed',
        name: 'Urgent Care Needed',
        description: 'Indicated urgent care need',
        category: 'urgency',
        condition: { field: 'urgency_level', operator: 'in', value: ['urgent', 'emergency'] },
        points: 25,
      },
    ],
    maxScore: 100,
    thresholds: { hot: 70, warm: 40, cold: 0 },
  },
  consulting: {
    id: 'consulting-default',
    name: 'Consulting Services Scoring Model',
    rules: [
      {
        id: 'company-size',
        name: 'Company Size',
        description: 'Mid-size or enterprise company',
        category: 'firmographic',
        condition: { field: 'company_size', operator: 'in', value: ['51-200', '201-500', '500+'] },
        points: 20,
      },
      {
        id: 'budget-range',
        name: 'Budget Range',
        description: 'Has significant project budget',
        category: 'qualification',
        condition: { field: 'budget', operator: 'greater_than', value: 25000 },
        points: 20,
      },
      {
        id: 'decision-maker',
        name: 'Decision Maker',
        description: 'Contact is a decision maker',
        category: 'qualification',
        condition: { field: 'title', operator: 'regex', value: '(CEO|CTO|CFO|VP|Director|Head|Manager)' },
        points: 15,
      },
      {
        id: 'clear-timeline',
        name: 'Clear Timeline',
        description: 'Has defined project timeline',
        category: 'urgency',
        condition: { field: 'timeline', operator: 'in', value: ['immediate', '1-3_months', '3-6_months'] },
        points: 15,
      },
      {
        id: 'defined-scope',
        name: 'Defined Scope',
        description: 'Provided detailed project scope',
        category: 'engagement',
        condition: { field: 'project_scope', operator: 'regex', value: '.{200,}' },
        points: 15,
      },
      {
        id: 'previous-engagement',
        name: 'Previous Engagement',
        description: 'Has worked with consultants before',
        category: 'fit',
        condition: { field: 'previous_consultant', operator: 'equals', value: true },
        points: 15,
      },
    ],
    maxScore: 100,
    thresholds: { hot: 70, warm: 40, cold: 0 },
  },
  general: {
    id: 'general-default',
    name: 'General Scoring Model',
    rules: [
      {
        id: 'complete-contact',
        name: 'Complete Contact Info',
        description: 'Provided all contact information',
        category: 'engagement',
        condition: { field: 'email', operator: 'exists', value: true },
        points: 15,
      },
      {
        id: 'phone-provided',
        name: 'Phone Provided',
        description: 'Provided phone number',
        category: 'engagement',
        condition: { field: 'phone', operator: 'exists', value: true },
        points: 10,
      },
      {
        id: 'detailed-message',
        name: 'Detailed Message',
        description: 'Provided detailed inquiry',
        category: 'engagement',
        condition: { field: 'message', operator: 'regex', value: '.{100,}' },
        points: 15,
      },
      {
        id: 'referral',
        name: 'Referral Source',
        description: 'Came through referral',
        category: 'fit',
        condition: { field: 'source', operator: 'equals', value: 'referral' },
        points: 20,
      },
      {
        id: 'budget-indicated',
        name: 'Budget Indicated',
        description: 'Has a defined budget',
        category: 'qualification',
        condition: { field: 'budget', operator: 'exists', value: true },
        points: 15,
      },
      {
        id: 'urgent-timeline',
        name: 'Urgent Timeline',
        description: 'Needs assistance soon',
        category: 'urgency',
        condition: { field: 'timeline', operator: 'in', value: ['immediate', 'this_week', 'this_month'] },
        points: 25,
      },
    ],
    maxScore: 100,
    thresholds: { hot: 65, warm: 35, cold: 0 },
  },
};

// ============================================================================
// MAIN SCORING FUNCTIONS
// ============================================================================

/**
 * Score an intake submission
 */
export async function scoreSubmission(
  submissionId: number,
  options?: {
    modelId?: string;
    industry?: string;
  }
): Promise<ScoreResult> {
  // Get submission with form data
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    include: {
      form: true,
      config: true,
    },
  });

  if (!submission) {
    throw new Error('Submission not found');
  }

  const formData = (submission.formData as Record<string, unknown>) || {};

  // Determine scoring model to use
  let industry = options?.industry;
  if (!industry) {
    // Try to detect from form data
    const description = Object.values(formData)
      .filter(v => typeof v === 'string')
      .join(' ');
    industry = await detectIndustry(description);
  }

  const model = getScoringModel(options?.modelId || industry || 'general');

  // Calculate score
  const result = calculateScore(formData, model);

  // Add AI predictions if available
  if (env.openaiApiKey) {
    try {
      const aiPredictions = await getAIPredictions(formData, result);
      result.predictedConversionRate = aiPredictions.conversionRate;
      result.recommendations = [
        ...result.recommendations,
        ...aiPredictions.recommendations,
      ];
    } catch (error) {
      console.error('AI predictions failed:', error);
    }
  }

  return result;
}

/**
 * Calculate score using a model
 */
export function calculateScore(
  data: Record<string, unknown>,
  model: ScoringModel
): ScoreResult {
  const breakdown: ScoreBreakdown[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;

  for (const rule of model.rules) {
    const ruleMaxPoints = rule.maxPoints || rule.points;
    maxPossibleScore += ruleMaxPoints;

    const matched = evaluateCondition(data, rule.condition);
    const points = matched ? rule.points : 0;
    totalScore += points;

    breakdown.push({
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      points,
      maxPoints: ruleMaxPoints,
      matched,
      reason: matched
        ? `Matched: ${rule.description}`
        : `Not matched: ${rule.condition.field} did not meet criteria`,
    });
  }

  const percentage = maxPossibleScore > 0
    ? Math.round((totalScore / maxPossibleScore) * 100)
    : 0;

  const grade = getGrade(percentage);
  const priority = getPriority(totalScore, model.thresholds);
  const recommendations = generateRecommendations(breakdown, model);

  return {
    totalScore,
    maxPossibleScore,
    percentage,
    grade,
    priority,
    breakdown,
    recommendations,
  };
}

/**
 * Evaluate a scoring condition against data
 */
function evaluateCondition(
  data: Record<string, unknown>,
  condition: ScoringCondition
): boolean {
  const value = getNestedValue(data, condition.field);

  switch (condition.operator) {
    case 'equals':
      return value === condition.value;

    case 'contains':
      return typeof value === 'string' &&
        value.toLowerCase().includes(String(condition.value).toLowerCase());

    case 'greater_than':
      return typeof value === 'number' && value > Number(condition.value);

    case 'less_than':
      return typeof value === 'number' && value < Number(condition.value);

    case 'in':
      if (Array.isArray(condition.value)) {
        const lowerValue = typeof value === 'string' ? value.toLowerCase() : value;
        return condition.value.some(v =>
          typeof v === 'string' && typeof lowerValue === 'string'
            ? v.toLowerCase() === lowerValue
            : v === lowerValue
        );
      }
      return false;

    case 'not_in':
      if (Array.isArray(condition.value)) {
        const lowerValue = typeof value === 'string' ? value.toLowerCase() : value;
        return !condition.value.some(v =>
          typeof v === 'string' && typeof lowerValue === 'string'
            ? v.toLowerCase() === lowerValue
            : v === lowerValue
        );
      }
      return true;

    case 'exists':
      return condition.value
        ? value !== undefined && value !== null && value !== ''
        : value === undefined || value === null || value === '';

    case 'regex':
      if (typeof value !== 'string') return false;
      try {
        const regex = new RegExp(String(condition.value), 'i');
        return regex.test(value);
      } catch {
        return false;
      }

    default:
      return false;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Get letter grade from percentage
 */
function getGrade(percentage: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Get priority level from score and thresholds
 */
function getPriority(
  score: number,
  thresholds: ScoringModel['thresholds']
): 'hot' | 'warm' | 'cold' {
  if (score >= thresholds.hot) return 'hot';
  if (score >= thresholds.warm) return 'warm';
  return 'cold';
}

/**
 * Generate recommendations based on score breakdown
 */
function generateRecommendations(
  breakdown: ScoreBreakdown[],
  model: ScoringModel
): string[] {
  const recommendations: string[] = [];
  const unmatchedRules = breakdown.filter(b => !b.matched);

  // Group by category
  const categoryScores: Record<string, { earned: number; possible: number }> = {};
  for (const item of breakdown) {
    if (!categoryScores[item.category]) {
      categoryScores[item.category] = { earned: 0, possible: 0 };
    }
    categoryScores[item.category].possible += item.maxPoints;
    if (item.matched) {
      categoryScores[item.category].earned += item.points;
    }
  }

  // Recommend based on weak categories
  for (const [category, scores] of Object.entries(categoryScores)) {
    const percentage = (scores.earned / scores.possible) * 100;
    if (percentage < 50) {
      switch (category) {
        case 'engagement':
          recommendations.push('Follow up to gather more detailed information');
          break;
        case 'qualification':
          recommendations.push('Qualify budget and decision-making authority');
          break;
        case 'urgency':
          recommendations.push('Clarify timeline and urgency of needs');
          break;
        case 'fit':
          recommendations.push('Assess fit with your services and ideal client profile');
          break;
        case 'firmographic':
          recommendations.push('Research company background and size');
          break;
      }
    }
  }

  // Top unmatched high-value rules
  const highValueUnmatched = unmatchedRules
    .filter(r => r.maxPoints >= 15)
    .slice(0, 2);

  for (const rule of highValueUnmatched) {
    recommendations.push(`Missing: ${rule.ruleName} - worth ${rule.maxPoints} points`);
  }

  return recommendations.slice(0, 5);
}

/**
 * Get AI-powered predictions
 */
async function getAIPredictions(
  data: Record<string, unknown>,
  currentScore: ScoreResult
): Promise<{ conversionRate: number; recommendations: string[] }> {
  const dataSnapshot = JSON.stringify(data).substring(0, 1000);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a lead scoring analyst. Based on the intake data and current score, predict conversion likelihood and provide recommendations.

Return a JSON object with:
- conversionRate: estimated conversion probability (0-100)
- recommendations: array of 2-3 actionable recommendations for follow-up`,
        },
        {
          role: 'user',
          content: `Current score: ${currentScore.totalScore}/${currentScore.maxPossibleScore} (${currentScore.percentage}%)
Priority: ${currentScore.priority}
Grade: ${currentScore.grade}

Intake data summary:
${dataSnapshot}

Provide conversion prediction and recommendations.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);

  return {
    conversionRate: Math.min(100, Math.max(0, parsed.conversionRate || 50)),
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 3)
      : [],
  };
}

// ============================================================================
// MODEL MANAGEMENT
// ============================================================================

/**
 * Get scoring model by ID or industry
 */
export function getScoringModel(idOrIndustry: string): ScoringModel {
  // Check if it's a model ID
  for (const model of Object.values(DEFAULT_SCORING_MODELS)) {
    if (model.id === idOrIndustry) {
      return model;
    }
  }

  // Check if it's an industry
  if (DEFAULT_SCORING_MODELS[idOrIndustry]) {
    return DEFAULT_SCORING_MODELS[idOrIndustry];
  }

  // Return general model as fallback
  return DEFAULT_SCORING_MODELS.general;
}

/**
 * Get all available scoring models
 */
export function getAvailableScoringModels(): ScoringModel[] {
  return Object.values(DEFAULT_SCORING_MODELS);
}

/**
 * Create custom scoring model
 */
export function createScoringModel(
  name: string,
  rules: ScoringRule[],
  options?: {
    description?: string;
    maxScore?: number;
    thresholds?: ScoringModel['thresholds'];
  }
): ScoringModel {
  const id = `custom-${Date.now()}`;
  const maxScore = options?.maxScore ||
    rules.reduce((sum, r) => sum + (r.maxPoints || r.points), 0);

  return {
    id,
    name,
    description: options?.description,
    rules,
    maxScore,
    thresholds: options?.thresholds || { hot: 70, warm: 40, cold: 0 },
  };
}

/**
 * Validate scoring model
 */
export function validateScoringModel(model: ScoringModel): string[] {
  const errors: string[] = [];

  if (!model.id) errors.push('Model must have an ID');
  if (!model.name) errors.push('Model must have a name');
  if (!model.rules || model.rules.length === 0) {
    errors.push('Model must have at least one rule');
  }

  for (const rule of model.rules || []) {
    if (!rule.id) errors.push(`Rule missing ID`);
    if (!rule.name) errors.push(`Rule missing name`);
    if (!rule.condition) errors.push(`Rule ${rule.id} missing condition`);
    if (typeof rule.points !== 'number') {
      errors.push(`Rule ${rule.id} must have numeric points`);
    }
  }

  return errors;
}
