/**
 * Lead Priority Ranking Service
 *
 * Ranks leads by priority for sales outreach based on ML predictions
 * and engagement signals.
 *
 * @module lead-ml/services
 */

import { prisma } from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { jsonPrompt, isAIAvailable } from '../../ai-monitoring/ai-client';
import { logger } from '../../../utils/logger';

import { calculateConversionProbability } from './lead-rule-based-prediction.service';
import {
  LEAD_ML_SYSTEM_PROMPT,
  buildPriorityRankingPrompt,
} from '../prompts/lead-ml-prompts';
import type { LLMMetadata } from '../types';

// ============================================================================
// Types
// ============================================================================

interface RankedLead {
  leadId: number;
  email: string;
  name: string | null;
  company: string | null;
  title: string | null;
  score: number;
  scoreLevel: string;
  priorityRank: number;
  priorityTier: 'top' | 'high' | 'medium' | 'low';
  priorityScore: number;
  conversionProbability: number;
  reasoning: string;
}

interface PriorityRankingResult {
  rankings: RankedLead[];
  insights: {
    topLeadCount: number;
    avgConversionProbability: number;
    commonPatterns: string[];
  };
  llmMetadata: LLMMetadata;
}

interface LeadForRanking {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  title: string | null;
  score: number;
  scoreLevel: string;
  daysSinceLastActivity: number;
  totalActivities: number;
  emailOpenRate: number;
}

// ============================================================================
// LLM Response Schema
// ============================================================================

interface LLMRankingResponse {
  rankings: Array<{
    leadId: number;
    priorityRank: number;
    priorityTier: 'top' | 'high' | 'medium' | 'low';
    priorityScore: number;
    conversionProbability: number;
    reasoning: string;
  }>;
  insights: {
    topLeadCount: number;
    avgConversionProbability: number;
    commonPatterns: string[];
  };
}

// ============================================================================
// Ranking Functions
// ============================================================================

/**
 * Calculate priority score for a lead (rule-based)
 */
function calculatePriorityScore(lead: LeadForRanking): number {
  let score = 0;

  // Base score from lead score
  score += lead.score * 0.5;

  // Recency bonus
  if (lead.daysSinceLastActivity < 3) score += 20;
  else if (lead.daysSinceLastActivity < 7) score += 15;
  else if (lead.daysSinceLastActivity < 14) score += 10;
  else if (lead.daysSinceLastActivity > 30) score -= 15;

  // Activity bonus
  if (lead.totalActivities > 10) score += 15;
  else if (lead.totalActivities > 5) score += 10;
  else if (lead.totalActivities > 0) score += 5;

  // Email engagement bonus
  if (lead.emailOpenRate > 0.5) score += 15;
  else if (lead.emailOpenRate > 0.3) score += 10;
  else if (lead.emailOpenRate > 0.1) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine priority tier from score
 */
function getPriorityTier(score: number): 'top' | 'high' | 'medium' | 'low' {
  if (score >= 75) return 'top';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

/**
 * Generate reasoning for ranking (rule-based)
 */
function generateReasoning(lead: LeadForRanking): string {
  const reasons: string[] = [];

  if (lead.daysSinceLastActivity < 7) {
    reasons.push('recent activity');
  } else if (lead.daysSinceLastActivity > 14) {
    reasons.push('needs re-engagement');
  }

  if (lead.emailOpenRate > 0.3) {
    reasons.push('strong email engagement');
  }

  if (lead.totalActivities > 10) {
    reasons.push('highly active');
  }

  if (lead.score >= 80) {
    reasons.push('high score (HOT)');
  } else if (lead.score >= 50) {
    reasons.push('warm prospect');
  }

  if (lead.company) {
    reasons.push('company identified');
  }

  if (reasons.length === 0) {
    return 'Standard lead requiring nurturing';
  }

  return (
    reasons.join(', ').charAt(0).toUpperCase() + reasons.join(', ').slice(1)
  );
}

/**
 * Rank leads using rule-based approach
 */
function rankLeadsRuleBased(leads: LeadForRanking[]): PriorityRankingResult {
  // Calculate priority score for each lead
  const scoredLeads = leads.map((lead) => {
    const priorityScore = calculatePriorityScore(lead);
    const features = {
      demographic: {
        hasCompany: !!lead.company,
        hasTitle: !!lead.title,
        hasPhone: false,
        emailDomainType: 'corporate' as const,
        titleSeniority: 'unknown' as const,
        companySizeEstimate: 'unknown' as const,
        emailDomain: lead.email.split('@')[1] || null,
      },
      behavioral: {
        emailOpenCount: Math.round(lead.emailOpenRate * 10),
        emailClickCount: 0,
        pageViewCount: 0,
        formSubmitCount: 0,
        meetingCount: 0,
        callCount: 0,
        activityVelocity:
          lead.totalActivities / Math.max(1, lead.daysSinceLastActivity),
        channelDiversity: 1,
        highValueActionCount: 0,
        totalActivities: lead.totalActivities,
      },
      temporal: {
        daysSinceCreated: 30,
        daysSinceLastActivity: lead.daysSinceLastActivity,
        recencyScore: Math.max(0, 100 - lead.daysSinceLastActivity * 5),
        activityBurst: false,
        dayPattern: 'mixed' as const,
        timePattern: 'mixed' as const,
        leadAgeWeeks: 4,
      },
      engagement: {
        totalEngagementScore: lead.score,
        emailOpenRate: lead.emailOpenRate,
        emailClickRate: 0,
        sequenceEngagement: 0,
        avgResponseTime: null,
        isInActiveSequence: false,
        currentSequenceStep: null,
      },
      text: {
        messageSentiment: null,
        messageIntent: null,
        topicTags: [],
        urgencyLevel: null,
        hasMessage: false,
        messageLength: 0,
      },
    };

    const conversionProbability = calculateConversionProbability(features);

    return {
      ...lead,
      priorityScore,
      conversionProbability,
      priorityTier: getPriorityTier(priorityScore),
      reasoning: generateReasoning(lead),
    };
  });

  // Sort by priority score
  scoredLeads.sort((a, b) => b.priorityScore - a.priorityScore);

  // Assign ranks
  const rankings: RankedLead[] = scoredLeads.map((lead, index) => ({
    leadId: lead.id,
    email: lead.email,
    name: lead.name,
    company: lead.company,
    title: lead.title,
    score: lead.score,
    scoreLevel: lead.scoreLevel,
    priorityRank: index + 1,
    priorityTier: lead.priorityTier,
    priorityScore: Math.round(lead.priorityScore),
    conversionProbability: lead.conversionProbability,
    reasoning: lead.reasoning,
  }));

  // Calculate insights
  const topCount = rankings.filter((r) => r.priorityTier === 'top').length;
  const avgProbability =
    rankings.length > 0
      ? rankings.reduce((sum, r) => sum + r.conversionProbability, 0) /
        rankings.length
      : 0;

  const patterns: string[] = [];
  const recentCount = rankings.filter((r) => {
    const lead = scoredLeads.find((l) => l.id === r.leadId);
    return lead?.daysSinceLastActivity !== undefined
      ? lead.daysSinceLastActivity < 7
      : false;
  }).length;
  if (recentCount > rankings.length * 0.5) {
    patterns.push('Majority of leads have recent activity');
  }
  const highEngagement = rankings.filter((r) => r.score >= 50).length;
  if (highEngagement > rankings.length * 0.3) {
    patterns.push('Good proportion of warm/hot leads');
  }

  return {
    rankings,
    insights: {
      topLeadCount: topCount,
      avgConversionProbability: Math.round(avgProbability * 100) / 100,
      commonPatterns: patterns,
    },
    llmMetadata: {
      model: 'rule-based-fallback',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Rank leads using LLM
 */
async function rankLeadsWithLLM(
  leads: LeadForRanking[],
  tenantId: string,
): Promise<PriorityRankingResult> {
  const prompt = buildPriorityRankingPrompt(leads);

  const startTime = Date.now();
  const result = await jsonPrompt<LLMRankingResponse>(prompt, {
    tenantId,
    toolId: 'lead-ml',
    operation: 'priority-ranking',
    model: 'gpt-4o-mini',
    systemPrompt: LEAD_ML_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 2500,
  });

  const latencyMs = Date.now() - startTime;
  const data = result.data;

  // Map LLM response to our format
  const rankings: RankedLead[] = data.rankings.map((r) => {
    const lead = leads.find((l) => l.id === r.leadId);
    return {
      leadId: r.leadId,
      email: lead?.email || '',
      name: lead?.name || null,
      company: lead?.company || null,
      title: lead?.title || null,
      score: lead?.score || 0,
      scoreLevel: lead?.scoreLevel || 'COLD',
      priorityRank: r.priorityRank,
      priorityTier: r.priorityTier,
      priorityScore: r.priorityScore,
      conversionProbability: r.conversionProbability,
      reasoning: r.reasoning,
    };
  });

  return {
    rankings,
    insights: data.insights,
    llmMetadata: {
      model: result.usage.model,
      tokensUsed: result.usage.totalTokens,
      latencyMs,
      estimatedCost: result.usage.estimatedCost,
    },
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get priority-ranked leads for a config
 */
export async function getRankedLeads(
  configId: number,
  options?: {
    limit?: number;
    minScore?: number;
    minProbability?: number;
    useLLM?: boolean;
  },
): Promise<PriorityRankingResult> {
  const limit = options?.limit || 20;
  const minScore = options?.minScore || 0;
  const useLLM = options?.useLLM ?? true;

  // Fetch leads with activity data
  const leads = await prisma.scoredLead.findMany({
    where: {
      configId,
      isActive: true,
      score: { gte: minScore },
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      title: true,
      score: true,
      scoreLevel: true,
      totalEmailsSent: true,
      totalEmailsOpened: true,
      totalWebsiteVisits: true,
      lastEngagementAt: true,
      _count: {
        select: { activities: true },
      },
    },
    orderBy: { score: 'desc' },
    take: Math.min(limit, 50), // Cap at 50 for LLM context
  });

  if (leads.length === 0) {
    return {
      rankings: [],
      insights: {
        topLeadCount: 0,
        avgConversionProbability: 0,
        commonPatterns: [],
      },
      llmMetadata: {
        model: 'none',
        tokensUsed: 0,
        latencyMs: 0,
        estimatedCost: 0,
      },
    };
  }

  // Transform to ranking format
  const leadsForRanking: LeadForRanking[] = leads.map((lead) => {
    const daysSinceLastActivity = lead.lastEngagementAt
      ? Math.floor(
          (Date.now() - lead.lastEngagementAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 30;

    const emailOpenRate =
      lead.totalEmailsSent > 0
        ? lead.totalEmailsOpened / lead.totalEmailsSent
        : 0;

    return {
      id: lead.id,
      email: lead.email,
      name: lead.name,
      company: lead.company,
      title: lead.title,
      score: lead.score,
      scoreLevel: lead.scoreLevel,
      daysSinceLastActivity,
      totalActivities: lead._count.activities,
      emailOpenRate,
    };
  });

  // Use LLM if available and requested
  const tenantId = hasTenantContext() ? getTenantId() : 'system';

  if (useLLM && isAIAvailable() && leads.length <= 20) {
    try {
      return await rankLeadsWithLLM(leadsForRanking, tenantId);
    } catch (error) {
      logger.warn('LLM ranking failed, falling back to rule-based', { error });
    }
  }

  // Fall back to rule-based
  const result = rankLeadsRuleBased(leadsForRanking);

  // Apply minimum probability filter if specified
  if (options?.minProbability) {
    result.rankings = result.rankings.filter(
      (r) => r.conversionProbability >= options.minProbability!,
    );
    result.insights.topLeadCount = result.rankings.filter(
      (r) => r.priorityTier === 'top',
    ).length;
  }

  return result;
}

/**
 * Get top N leads by priority
 */
export async function getTopPriorityLeads(
  configId: number,
  n: number = 10,
): Promise<RankedLead[]> {
  const result = await getRankedLeads(configId, { limit: n });
  return result.rankings.slice(0, n);
}

/**
 * Get leads by priority tier
 */
export async function getLeadsByTier(
  configId: number,
  tier: 'top' | 'high' | 'medium' | 'low',
): Promise<RankedLead[]> {
  const result = await getRankedLeads(configId, { limit: 100 });
  return result.rankings.filter((r) => r.priorityTier === tier);
}
