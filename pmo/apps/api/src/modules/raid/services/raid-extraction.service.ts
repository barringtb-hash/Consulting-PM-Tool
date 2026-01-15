/**
 * RAID Extraction Service
 *
 * Uses LLM (OpenAI GPT) to extract Risks, Action Items, Issues, and Decisions
 * from meeting notes and other project-related text.
 *
 * @module modules/raid/services
 */

import { prisma } from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { hasProjectAccess } from '../../../utils/project-access';
import { llmService } from '../../../services/llm.service';
import {
  RAID_EXTRACTION_SYSTEM_PROMPT,
  RAID_EXTRACTION_USER_PROMPT,
  RAID_EXTRACTION_TEXT_PROMPT,
} from '../prompts/raid-extraction-prompts';
import type { RAIDExtractionOptions } from '../validation/raid.schema';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extracted risk from text
 */
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

/**
 * Extracted action item from text
 */
export interface ExtractedActionItem {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  sourceText: string;
  confidence: number;
}

/**
 * Extracted issue from text
 */
export interface ExtractedIssue {
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  impact?: string;
  workaround?: string;
  assignee?: string;
  sourceText: string;
  confidence: number;
}

/**
 * Extracted decision from text
 */
export interface ExtractedDecision {
  title: string;
  description?: string;
  context?: string;
  rationale?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  decisionMaker?: string;
  effectiveDate?: string;
  sourceText: string;
  confidence: number;
}

/**
 * Complete extraction result
 */
export interface ExtractionResult {
  meetingId?: number;
  projectId: number;
  risks: ExtractedRisk[];
  actionItems: ExtractedActionItem[];
  issues: ExtractedIssue[];
  decisions: ExtractedDecision[];
  summary?: string;
  extractedAt: Date;
  llmUsed: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates project access for extraction
 */
const validateProjectAccess = async (
  projectId: number,
  userId: number,
): Promise<
  | { error: 'not_found' | 'forbidden'; project?: never }
  | {
      project: {
        id: number;
        name: string;
        ownerId: number;
        isSharedWithTenant: boolean | null;
        visibility: string | null;
      };
      error?: never;
    }
> => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      isSharedWithTenant: true,
      visibility: true,
    },
  });

  if (!project) {
    return { error: 'not_found' };
  }

  if (!hasProjectAccess(project, userId)) {
    return { error: 'forbidden' };
  }

  return { project };
};

/**
 * Parses LLM response JSON safely
 */
const parseExtractionResponse = (
  content: string,
): {
  risks?: ExtractedRisk[];
  actionItems?: ExtractedActionItem[];
  issues?: ExtractedIssue[];
  decisions?: ExtractedDecision[];
  summary?: string;
} | null => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse extraction response:', error);
    return null;
  }
};

/**
 * Filter items by confidence threshold
 */
const filterByConfidence = <T extends { confidence: number }>(
  items: T[],
  threshold: number,
): T[] => {
  return items.filter((item) => item.confidence >= threshold);
};

// =============================================================================
// RULE-BASED EXTRACTION (FALLBACK)
// =============================================================================

/**
 * Rule-based extraction when LLM is unavailable
 */
const ruleBasedExtraction = (
  text: string,
  _projectId: number,
): Omit<
  ExtractionResult,
  'meetingId' | 'projectId' | 'extractedAt' | 'llmUsed'
> => {
  const risks: ExtractedRisk[] = [];
  const actionItems: ExtractedActionItem[] = [];
  const issues: ExtractedIssue[] = [];
  const decisions: ExtractedDecision[] = [];

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

  // Risk patterns
  const riskPatterns = [
    { pattern: /risk[s]?\s*(is|are|:)/i, severity: 'MEDIUM' as const },
    { pattern: /concern[s]?\s*(is|are|about|:)/i, severity: 'MEDIUM' as const },
    { pattern: /blocker[s]?\s*(is|are|:)/i, severity: 'HIGH' as const },
    {
      pattern: /critical\s+(issue|problem|risk)/i,
      severity: 'CRITICAL' as const,
    },
    { pattern: /might\s+(not|fail|miss|delay)/i, severity: 'MEDIUM' as const },
    { pattern: /behind\s+schedule/i, severity: 'HIGH' as const },
    { pattern: /over\s*budget/i, severity: 'HIGH' as const },
  ];

  // Action item patterns
  const actionPatterns = [
    /(\w+)\s+(will|should|needs?\s+to|must)\s+(.+)/i,
    /action\s*(?:item)?:?\s*(.+)/i,
    /todo:?\s*(.+)/i,
    /follow\s*up:?\s*(.+)/i,
    /assigned\s+to\s+(\w+)/i,
  ];

  // Issue patterns
  const issuePatterns = [
    { pattern: /problem[s]?\s*(is|are|with|:)/i, severity: 'MEDIUM' as const },
    { pattern: /issue[s]?\s*(is|are|with|:)/i, severity: 'MEDIUM' as const },
    { pattern: /bug[s]?\s*(is|are|found|:)/i, severity: 'HIGH' as const },
    { pattern: /broken\s+/i, severity: 'HIGH' as const },
    { pattern: /not\s+working/i, severity: 'MEDIUM' as const },
    { pattern: /failing/i, severity: 'HIGH' as const },
  ];

  // Decision patterns
  const decisionPatterns = [
    /decided\s+(to|that|on)\s+(.+)/i,
    /decision:?\s*(.+)/i,
    /agreed\s+(to|that|on)\s+(.+)/i,
    /approved\s+(.+)/i,
    /we\s+will\s+(go|proceed|move)\s+(with|forward)/i,
  ];

  for (const sentence of sentences) {
    // Check for risks
    for (const { pattern, severity } of riskPatterns) {
      if (pattern.test(sentence)) {
        risks.push({
          title: extractTitle(sentence),
          description: sentence.trim(),
          severity,
          likelihood: 'MEDIUM',
          category: inferCategory(sentence),
          sourceText: sentence.trim(),
          confidence: 0.7,
        });
        break;
      }
    }

    // Check for action items
    for (const pattern of actionPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        actionItems.push({
          title: extractTitle(match[0]),
          description: match[0].trim(),
          priority: 'P3',
          assignee: extractName(sentence),
          sourceText: sentence.trim(),
          confidence: 0.65,
        });
        break;
      }
    }

    // Check for issues
    for (const { pattern, severity } of issuePatterns) {
      if (pattern.test(sentence)) {
        issues.push({
          title: extractTitle(sentence),
          description: sentence.trim(),
          severity,
          category: inferIssueCategory(sentence),
          sourceText: sentence.trim(),
          confidence: 0.65,
        });
        break;
      }
    }

    // Check for decisions
    for (const pattern of decisionPatterns) {
      if (pattern.test(sentence)) {
        decisions.push({
          title: extractTitle(sentence),
          description: sentence.trim(),
          impact: 'MEDIUM',
          sourceText: sentence.trim(),
          confidence: 0.65,
        });
        break;
      }
    }
  }

  return { risks, actionItems, issues, decisions };
};

/**
 * Extract a title from text (first ~60 chars)
 */
const extractTitle = (text: string): string => {
  const cleaned = text.trim().replace(/^[-:*]\s*/, '');
  return cleaned.length > 60 ? cleaned.slice(0, 57) + '...' : cleaned;
};

/**
 * Infer risk category from text
 */
const inferCategory = (text: string): string => {
  const lower = text.toLowerCase();
  const categories: [string, string[]][] = [
    [
      'TECHNICAL',
      ['bug', 'code', 'system', 'api', 'database', 'server', 'performance'],
    ],
    [
      'RESOURCE',
      ['team', 'staff', 'capacity', 'bandwidth', 'availability', 'people'],
    ],
    ['TIMELINE', ['timeline', 'deadline', 'delay', 'late', 'schedule', 'time']],
    ['BUDGET', ['cost', 'budget', 'expense', 'money', 'funding', 'financial']],
    ['EXTERNAL', ['vendor', 'client', 'third-party', 'external', 'partner']],
    ['SCOPE', ['scope', 'requirement', 'feature', 'change']],
    ['QUALITY', ['quality', 'testing', 'defect', 'regression']],
  ];

  for (const [category, keywords] of categories) {
    if (keywords.some((k) => lower.includes(k))) {
      return category;
    }
  }

  return 'SCOPE';
};

/**
 * Infer issue category from text
 */
const inferIssueCategory = (text: string): string => {
  const lower = text.toLowerCase();
  const categories: [string, string[]][] = [
    [
      'TECHNICAL',
      ['bug', 'code', 'system', 'api', 'database', 'server', 'crash', 'error'],
    ],
    ['RESOURCE', ['team', 'staff', 'capacity', 'bandwidth', 'availability']],
    ['TIMELINE', ['timeline', 'deadline', 'delay', 'late', 'schedule']],
    ['BUDGET', ['cost', 'budget', 'expense', 'over budget']],
    ['SCOPE', ['scope', 'requirement', 'feature']],
    ['QUALITY', ['quality', 'testing', 'defect']],
    ['COMMUNICATION', ['miscommunication', 'unclear', 'confusion']],
    ['EXTERNAL', ['vendor', 'third-party', 'external']],
  ];

  for (const [category, keywords] of categories) {
    if (keywords.some((k) => lower.includes(k))) {
      return category;
    }
  }

  return 'OTHER';
};

/**
 * Extract a potential name from text
 */
const extractName = (text: string): string | undefined => {
  const namePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  const matches = text.match(namePattern);

  if (matches && matches.length > 0) {
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
      'We',
      'They',
      'It',
    ]);

    for (const match of matches) {
      if (!nonNames.has(match.split(' ')[0])) {
        return match;
      }
    }
  }

  return undefined;
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Extracts RAID items from meeting notes using LLM
 *
 * @param meetingId - The meeting ID to extract from
 * @param userId - The ID of the user requesting extraction
 * @param options - Optional extraction options
 * @returns Extraction result with all RAID items
 */
export const extractFromMeeting = async (
  meetingId: number,
  userId: number,
  options?: RAIDExtractionOptions,
): Promise<
  ExtractionResult | { error: 'not_found' | 'forbidden' | 'no_notes' }
> => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Get meeting with project info
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    select: {
      id: true,
      title: true,
      notes: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          isSharedWithTenant: true,
          visibility: true,
        },
      },
    },
  });

  if (!meeting) {
    return { error: 'not_found' };
  }

  if (!hasProjectAccess(meeting.project, userId)) {
    return { error: 'forbidden' };
  }

  if (!meeting.notes || meeting.notes.trim().length === 0) {
    return { error: 'no_notes' };
  }

  const confidenceThreshold = options?.confidenceThreshold ?? 0.6;

  // Try LLM extraction
  if (llmService.isAvailable()) {
    try {
      const response = await llmService.completeWithSystem(
        RAID_EXTRACTION_SYSTEM_PROMPT,
        RAID_EXTRACTION_USER_PROMPT(
          meeting.title,
          meeting.project.name,
          meeting.notes,
          options,
        ),
        { maxTokens: 3000, temperature: 0.2 },
      );

      const parsed = parseExtractionResponse(response.content);

      if (parsed) {
        return {
          meetingId: meeting.id,
          projectId: meeting.projectId,
          risks: filterByConfidence(parsed.risks ?? [], confidenceThreshold),
          actionItems: filterByConfidence(
            parsed.actionItems ?? [],
            confidenceThreshold,
          ),
          issues: filterByConfidence(parsed.issues ?? [], confidenceThreshold),
          decisions: filterByConfidence(
            parsed.decisions ?? [],
            confidenceThreshold,
          ),
          summary: parsed.summary,
          extractedAt: new Date(),
          llmUsed: true,
        };
      }
    } catch (error) {
      console.error('LLM extraction failed, falling back to rules:', error);
    }
  }

  // Fall back to rule-based extraction
  const ruleResult = ruleBasedExtraction(meeting.notes, meeting.projectId);

  return {
    meetingId: meeting.id,
    projectId: meeting.projectId,
    ...ruleResult,
    extractedAt: new Date(),
    llmUsed: false,
  };
};

/**
 * Extracts RAID items from arbitrary text using LLM
 *
 * @param text - The text to analyze
 * @param projectId - The project ID to associate with
 * @param userId - The ID of the user requesting extraction
 * @param context - Optional context about the text
 * @param options - Optional extraction options
 * @returns Extraction result with all RAID items
 */
export const extractFromText = async (
  text: string,
  projectId: number,
  userId: number,
  context?: string,
  options?: RAIDExtractionOptions,
): Promise<ExtractionResult | { error: 'not_found' | 'forbidden' }> => {
  const projectAccessResult = await validateProjectAccess(projectId, userId);

  if (projectAccessResult.error) {
    return { error: projectAccessResult.error };
  }

  const { project } = projectAccessResult;
  const confidenceThreshold = options?.confidenceThreshold ?? 0.6;

  // Try LLM extraction
  if (llmService.isAvailable()) {
    try {
      const response = await llmService.completeWithSystem(
        RAID_EXTRACTION_SYSTEM_PROMPT,
        RAID_EXTRACTION_TEXT_PROMPT(text, project.name, context),
        { maxTokens: 3000, temperature: 0.2 },
      );

      const parsed = parseExtractionResponse(response.content);

      if (parsed) {
        return {
          projectId,
          risks: filterByConfidence(parsed.risks ?? [], confidenceThreshold),
          actionItems: filterByConfidence(
            parsed.actionItems ?? [],
            confidenceThreshold,
          ),
          issues: filterByConfidence(parsed.issues ?? [], confidenceThreshold),
          decisions: filterByConfidence(
            parsed.decisions ?? [],
            confidenceThreshold,
          ),
          summary: parsed.summary,
          extractedAt: new Date(),
          llmUsed: true,
        };
      }
    } catch (error) {
      console.error('LLM extraction failed, falling back to rules:', error);
    }
  }

  // Fall back to rule-based extraction
  const ruleResult = ruleBasedExtraction(text, projectId);

  return {
    projectId,
    ...ruleResult,
    extractedAt: new Date(),
    llmUsed: false,
  };
};

/**
 * Maps risk category string to database enum
 */
export const mapToRiskCategory = (
  category: string,
):
  | 'TIMELINE'
  | 'BUDGET'
  | 'SCOPE'
  | 'RESOURCE'
  | 'TECHNICAL'
  | 'EXTERNAL'
  | 'QUALITY' => {
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
};

/**
 * Saves extracted risks to the database
 *
 * @param projectId - The project ID
 * @param tenantId - The tenant ID
 * @param risks - Array of extracted risks
 * @param sourceId - Optional source meeting ID
 * @returns Array of created risk IDs
 */
export const saveExtractedRisks = async (
  projectId: number,
  tenantId: string,
  risks: ExtractedRisk[],
  sourceId?: number,
): Promise<number[]> => {
  const createdIds: number[] = [];

  for (const risk of risks) {
    try {
      const created = await prisma.projectRisk.create({
        data: {
          projectId,
          tenantId,
          title: risk.title,
          description: risk.description,
          severity: risk.severity,
          category: mapToRiskCategory(risk.category),
          suggestedMitigation: risk.mitigation,
          relatedQuote: risk.sourceText,
          status: 'IDENTIFIED',
          sourceType: sourceId ? 'MEETING' : 'AI_DETECTED',
          sourceId,
        },
      });
      createdIds.push(created.id);
    } catch (error) {
      console.error('Failed to save extracted risk:', error);
    }
  }

  return createdIds;
};
