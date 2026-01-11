/**
 * Risk Extraction Service
 *
 * Uses NLP and AI to extract risks, action items, and decisions from
 * meeting notes, project updates, and other unstructured text.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';

export interface ExtractedRisk {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  mitigation?: string;
  owner?: string;
  sourceText: string;
  confidence: number;
}

export interface ExtractedActionItem {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  sourceText: string;
  confidence: number;
}

export interface ExtractedDecision {
  decision: string;
  context?: string;
  madeBy?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceText: string;
  confidence: number;
}

export interface ExtractionResult {
  meetingId?: number;
  projectId: number;
  risks: ExtractedRisk[];
  actionItems: ExtractedActionItem[];
  decisions: ExtractedDecision[];
  summary?: string;
  extractedAt: Date;
}

class RiskExtractionService {
  /**
   * Extract risks, action items, and decisions from meeting notes
   */
  async extractFromMeeting(
    meetingId: number,
    tenantId: string,
  ): Promise<ExtractionResult> {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, tenantId },
      select: {
        id: true,
        title: true,
        notes: true,
        projectId: true,
        project: { select: { name: true } },
      },
    });

    if (!meeting || !meeting.notes) {
      throw new Error('Meeting not found or has no notes');
    }

    const result = await this.extractFromText(
      meeting.notes,
      meeting.projectId,
      tenantId,
      {
        context: `Meeting: ${meeting.title}`,
        projectName: meeting.project.name,
      },
    );

    // Store extracted risks
    for (const risk of result.risks) {
      await this.createProjectRisk(
        meeting.projectId,
        tenantId,
        risk,
        meetingId,
      );
    }

    return { ...result, meetingId: meeting.id };
  }

  /**
   * Extract from arbitrary text (updates, emails, etc.)
   */
  async extractFromText(
    text: string,
    projectId: number,
    tenantId: string,
    context?: { context?: string; projectName?: string },
  ): Promise<ExtractionResult> {
    // Validate project exists
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true, name: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Try AI extraction first
    const aiResult = await this.aiExtraction(text, {
      ...context,
      projectName: context?.projectName || project.name,
    });

    // Fall back to rule-based if AI fails
    if (!aiResult) {
      return this.ruleBasedExtraction(text, projectId);
    }

    return {
      projectId,
      ...aiResult,
      extractedAt: new Date(),
    };
  }

  /**
   * Get all risks for a project
   */
  async getProjectRisks(
    projectId: number,
    tenantId: string,
    options?: {
      status?: string[];
      severity?: string[];
      limit?: number;
    },
  ): Promise<ExtractedRisk[]> {
    const whereClause: Record<string, unknown> = {
      projectId,
      tenantId,
    };

    if (options?.status?.length) {
      whereClause.status = { in: options.status };
    }

    if (options?.severity?.length) {
      whereClause.severity = { in: options.severity };
    }

    const risks = await prisma.projectRisk.findMany({
      where: whereClause,
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: options?.limit || 50,
    });

    return risks.map((r) => ({
      title: r.title,
      description: r.description || '',
      severity: r.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
      likelihood: 'MEDIUM' as const, // Default - field doesn't exist on schema
      category: r.category || 'General',
      mitigation: r.suggestedMitigation || undefined,
      owner: r.resolvedBy?.toString(),
      sourceText: r.relatedQuote || '',
      confidence: 0.8, // Default - field doesn't exist on schema
    }));
  }

  /**
   * Analyze risk trends for a project
   */
  async analyzeRiskTrends(
    projectId: number,
    tenantId: string,
  ): Promise<{
    totalRisks: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    openRisks: number;
    mitigatedRisks: number;
    recentlyAdded: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [allRisks, recentRisks] = await Promise.all([
      prisma.projectRisk.findMany({
        where: { projectId, tenantId },
        select: {
          severity: true,
          category: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.projectRisk.count({
        where: { projectId, tenantId, createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const bySeverity: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    const byCategory: Record<string, number> = {};
    let openRisks = 0;
    let mitigatedRisks = 0;

    for (const risk of allRisks) {
      bySeverity[risk.severity] = (bySeverity[risk.severity] || 0) + 1;
      byCategory[risk.category || 'General'] =
        (byCategory[risk.category || 'General'] || 0) + 1;

      if (
        risk.status === 'IDENTIFIED' ||
        risk.status === 'ANALYZING' ||
        risk.status === 'MITIGATING' ||
        risk.status === 'MONITORING'
      ) {
        openRisks++;
      } else if (risk.status === 'RESOLVED') {
        mitigatedRisks++;
      }
    }

    // Calculate trend based on recent risk additions vs mitigations
    const recentPercent =
      allRisks.length > 0 ? (recentRisks / allRisks.length) * 100 : 0;
    const trend: 'increasing' | 'stable' | 'decreasing' =
      recentPercent > 30
        ? 'increasing'
        : recentPercent > 10
          ? 'stable'
          : 'decreasing';

    return {
      totalRisks: allRisks.length,
      bySeverity,
      byCategory,
      openRisks,
      mitigatedRisks,
      recentlyAdded: recentRisks,
      trend,
    };
  }

  // Private helper methods

  private async aiExtraction(
    text: string,
    context?: { context?: string; projectName?: string },
  ): Promise<{
    risks: ExtractedRisk[];
    actionItems: ExtractedActionItem[];
    decisions: ExtractedDecision[];
    summary?: string;
  } | null> {
    try {
      const prompt = `Analyze this project text and extract key information:

${context?.context ? `Context: ${context.context}` : ''}
${context?.projectName ? `Project: ${context.projectName}` : ''}

TEXT:
"""
${text.slice(0, 4000)}
"""

Extract and return JSON:
{
  "risks": [
    {
      "title": "Brief risk title",
      "description": "Detailed description",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "likelihood": "HIGH|MEDIUM|LOW",
      "category": "Technical|Resource|Schedule|Budget|External|Communication",
      "mitigation": "Suggested mitigation action",
      "owner": "Person name if mentioned",
      "sourceText": "The exact text that indicates this risk",
      "confidence": 0.0-1.0
    }
  ],
  "actionItems": [
    {
      "title": "Action item title",
      "description": "Optional details",
      "assignee": "Person name if mentioned",
      "dueDate": "ISO date if mentioned or inferred",
      "priority": "P1|P2|P3|P4",
      "sourceText": "The exact text",
      "confidence": 0.0-1.0
    }
  ],
  "decisions": [
    {
      "decision": "What was decided",
      "context": "Why this decision was made",
      "madeBy": "Who made the decision",
      "impact": "HIGH|MEDIUM|LOW",
      "sourceText": "The exact text",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "Brief 2-3 sentence summary of the text"
}

Only include items with confidence >= 0.6. Return empty arrays if nothing found.`;

      const response = await llmService.complete(prompt, {
        maxTokens: 2000,
        temperature: 0.2,
      });

      return JSON.parse(response.content);
    } catch (error) {
      console.error('AI extraction failed:', error);
      return null;
    }
  }

  private ruleBasedExtraction(
    text: string,
    projectId: number,
  ): ExtractionResult {
    const risks: ExtractedRisk[] = [];
    const actionItems: ExtractedActionItem[] = [];
    const decisions: ExtractedDecision[] = [];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

    // Risk patterns
    const riskPatterns = [
      { pattern: /risk[s]?\s*(is|are|:)/i, severity: 'MEDIUM' as const },
      {
        pattern: /concern[s]?\s*(is|are|about|:)/i,
        severity: 'MEDIUM' as const,
      },
      { pattern: /blocker[s]?\s*(is|are|:)/i, severity: 'HIGH' as const },
      {
        pattern: /critical\s+(issue|problem|risk)/i,
        severity: 'CRITICAL' as const,
      },
      {
        pattern: /might\s+(not|fail|miss|delay)/i,
        severity: 'MEDIUM' as const,
      },
      { pattern: /behind\s+schedule/i, severity: 'HIGH' as const },
      { pattern: /over\s*budget/i, severity: 'HIGH' as const },
    ];

    for (const sentence of sentences) {
      for (const { pattern, severity } of riskPatterns) {
        if (pattern.test(sentence)) {
          risks.push({
            title: this.extractTitle(sentence),
            description: sentence.trim(),
            severity,
            likelihood: 'MEDIUM',
            category: this.inferCategory(sentence),
            sourceText: sentence.trim(),
            confidence: 0.7,
          });
          break;
        }
      }
    }

    // Action item patterns
    const actionPatterns = [
      /(\w+)\s+(will|should|needs?\s+to|must)\s+(.+)/i,
      /action\s*(?:item)?:?\s*(.+)/i,
      /todo:?\s*(.+)/i,
      /follow\s*up:?\s*(.+)/i,
    ];

    for (const sentence of sentences) {
      for (const pattern of actionPatterns) {
        const match = sentence.match(pattern);
        if (match) {
          actionItems.push({
            title: this.extractTitle(match[0]),
            description: match[0].trim(),
            priority: 'P3',
            sourceText: sentence.trim(),
            confidence: 0.65,
            assignee: this.extractName(sentence),
          });
          break;
        }
      }
    }

    // Decision patterns
    const decisionPatterns = [
      /decided\s+(to|that|on)\s+(.+)/i,
      /decision:?\s*(.+)/i,
      /agreed\s+(to|that|on)\s+(.+)/i,
      /approved\s+(.+)/i,
    ];

    for (const sentence of sentences) {
      for (const pattern of decisionPatterns) {
        if (pattern.test(sentence)) {
          decisions.push({
            decision: sentence.trim(),
            impact: 'MEDIUM',
            sourceText: sentence.trim(),
            confidence: 0.65,
          });
          break;
        }
      }
    }

    return {
      projectId,
      risks,
      actionItems,
      decisions,
      extractedAt: new Date(),
    };
  }

  private extractTitle(text: string): string {
    // Get first ~50 characters as title
    const cleaned = text.trim().replace(/^[-:•*]\s*/, '');
    return cleaned.length > 60 ? cleaned.slice(0, 57) + '...' : cleaned;
  }

  private inferCategory(text: string): string {
    const lower = text.toLowerCase();

    const categories: [string, string[]][] = [
      [
        'Technical',
        ['bug', 'code', 'system', 'api', 'database', 'server', 'performance'],
      ],
      [
        'Resource',
        ['team', 'staff', 'capacity', 'bandwidth', 'availability', 'people'],
      ],
      [
        'Schedule',
        ['timeline', 'deadline', 'delay', 'late', 'schedule', 'time'],
      ],
      [
        'Budget',
        ['cost', 'budget', 'expense', 'money', 'funding', 'financial'],
      ],
      ['External', ['vendor', 'client', 'third-party', 'external', 'partner']],
      [
        'Communication',
        ['misunderstanding', 'unclear', 'communication', 'alignment'],
      ],
    ];

    for (const [category, keywords] of categories) {
      if (keywords.some((k) => lower.includes(k))) {
        return category;
      }
    }

    return 'General';
  }

  private extractName(text: string): string | undefined {
    // Simple name extraction - look for capitalized words that look like names
    const namePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    const matches = text.match(namePattern);

    if (matches && matches.length > 0) {
      // Filter out common non-names
      const nonNames = new Set([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
        'The',
        'This',
        'That',
      ]);

      for (const match of matches) {
        if (!nonNames.has(match.split(' ')[0])) {
          return match;
        }
      }
    }

    return undefined;
  }

  private mapToRiskCategory(
    category: string,
  ):
    | 'TIMELINE'
    | 'BUDGET'
    | 'SCOPE'
    | 'RESOURCE'
    | 'TECHNICAL'
    | 'EXTERNAL'
    | 'QUALITY' {
    const categoryMap: Record<
      string,
      | 'TIMELINE'
      | 'BUDGET'
      | 'SCOPE'
      | 'RESOURCE'
      | 'TECHNICAL'
      | 'EXTERNAL'
      | 'QUALITY'
    > = {
      Technical: 'TECHNICAL',
      Resource: 'RESOURCE',
      Schedule: 'TIMELINE',
      Budget: 'BUDGET',
      External: 'EXTERNAL',
      Communication: 'EXTERNAL',
      General: 'SCOPE',
      TIMELINE: 'TIMELINE',
      BUDGET: 'BUDGET',
      SCOPE: 'SCOPE',
      RESOURCE: 'RESOURCE',
      TECHNICAL: 'TECHNICAL',
      EXTERNAL: 'EXTERNAL',
      QUALITY: 'QUALITY',
    };
    return categoryMap[category] || 'SCOPE';
  }

  private async createProjectRisk(
    projectId: number,
    tenantId: string,
    risk: ExtractedRisk,
    sourceId?: number,
  ): Promise<number> {
    const created = await prisma.projectRisk.create({
      data: {
        projectId,
        tenantId,
        title: risk.title,
        description: risk.description,
        severity: risk.severity,
        category: this.mapToRiskCategory(risk.category),
        suggestedMitigation: risk.mitigation,
        relatedQuote: risk.sourceText,
        status: 'IDENTIFIED',
        sourceType: sourceId ? 'MEETING' : 'MANUAL',
        sourceId,
      },
    });

    return created.id;
  }
}

export const riskExtractionService = new RiskExtractionService();
