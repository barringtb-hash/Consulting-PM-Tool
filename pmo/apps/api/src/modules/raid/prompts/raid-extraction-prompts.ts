/**
 * RAID Extraction Prompts
 *
 * LLM prompts for extracting Risks, Action Items, Issues, and Decisions
 * from meeting notes and other project text.
 *
 * @module modules/raid/prompts
 */

/**
 * System prompt that establishes the AI's role as a project management expert
 */
export const RAID_EXTRACTION_SYSTEM_PROMPT = `You are an expert project management analyst specializing in RAID (Risks, Action Items, Issues, Decisions) analysis. Your task is to carefully analyze project-related text and extract structured RAID items.

Key principles:
1. Be thorough but precise - only extract items that are clearly stated or strongly implied
2. Provide confidence scores (0-1) for each extracted item
3. Include the exact source text that supports each extraction
4. Categorize items appropriately based on their nature and severity
5. Identify assignees and due dates when mentioned
6. Distinguish between:
   - RISKS: Future uncertainties that could negatively impact the project
   - ACTION ITEMS: Specific tasks that someone needs to do
   - ISSUES: Current problems that are actively affecting the project
   - DECISIONS: Choices that have been made or need to be made

When extracting, consider:
- Explicit statements ("We decided to...", "John will...", "There's a risk that...")
- Implicit indicators (concerns expressed, blockers mentioned, agreements made)
- Context clues (urgency, severity, stakeholder involvement)`;

/**
 * User prompt template for RAID extraction from meeting notes
 *
 * @param meetingTitle - The title of the meeting
 * @param projectName - The name of the project
 * @param notes - The meeting notes text
 * @param options - Extraction options (which RAID components to extract)
 */
export const RAID_EXTRACTION_USER_PROMPT = (
  meetingTitle: string,
  projectName: string,
  notes: string,
  options?: {
    extractRisks?: boolean;
    extractActionItems?: boolean;
    extractDecisions?: boolean;
    extractIssues?: boolean;
  },
): string => {
  const extractAll = !options;
  const extractRisks = extractAll || options?.extractRisks;
  const extractActionItems = extractAll || options?.extractActionItems;
  const extractDecisions = extractAll || options?.extractDecisions;
  const extractIssues = extractAll || options?.extractIssues;

  return `Analyze the following meeting notes and extract RAID items.

Meeting: ${meetingTitle}
Project: ${projectName}

MEETING NOTES:
"""
${notes.slice(0, 6000)}
"""

Extract and return a JSON object with the following structure:
{
  ${
    extractRisks
      ? `"risks": [
    {
      "title": "Brief risk title (max 100 chars)",
      "description": "Detailed description of the risk",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "likelihood": "HIGH" | "MEDIUM" | "LOW",
      "category": "TIMELINE" | "BUDGET" | "SCOPE" | "RESOURCE" | "TECHNICAL" | "EXTERNAL" | "QUALITY",
      "mitigation": "Suggested mitigation strategy if discussed",
      "owner": "Person responsible for managing this risk if mentioned",
      "sourceText": "Exact quote from the notes",
      "confidence": 0.0-1.0
    }
  ],`
      : ''
  }
  ${
    extractActionItems
      ? `"actionItems": [
    {
      "title": "Clear action item title (max 100 chars)",
      "description": "Additional details if any",
      "assignee": "Person assigned if mentioned",
      "dueDate": "ISO date string if mentioned (YYYY-MM-DD)",
      "priority": "P1" | "P2" | "P3" | "P4",
      "sourceText": "Exact quote from the notes",
      "confidence": 0.0-1.0
    }
  ],`
      : ''
  }
  ${
    extractIssues
      ? `"issues": [
    {
      "title": "Brief issue title (max 100 chars)",
      "description": "Detailed description of the issue",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "category": "TECHNICAL" | "RESOURCE" | "SCOPE" | "BUDGET" | "TIMELINE" | "QUALITY" | "COMMUNICATION" | "EXTERNAL" | "OTHER",
      "impact": "Description of how this issue affects the project",
      "workaround": "Temporary workaround if discussed",
      "assignee": "Person responsible for resolving if mentioned",
      "sourceText": "Exact quote from the notes",
      "confidence": 0.0-1.0
    }
  ],`
      : ''
  }
  ${
    extractDecisions
      ? `"decisions": [
    {
      "title": "Brief decision title (max 100 chars)",
      "description": "Full description of the decision",
      "context": "Why this decision was being considered",
      "rationale": "Reasoning behind the decision if explained",
      "impact": "HIGH" | "MEDIUM" | "LOW",
      "decisionMaker": "Person who made the decision if mentioned",
      "effectiveDate": "ISO date string if mentioned (YYYY-MM-DD)",
      "sourceText": "Exact quote from the notes",
      "confidence": 0.0-1.0
    }
  ],`
      : ''
  }
  "summary": "2-3 sentence summary of the key RAID takeaways from this meeting"
}

Guidelines:
- Only include items with confidence >= 0.6
- Return empty arrays if no items are found for a category
- Be specific and actionable in titles
- Include relevant context in descriptions
- Preserve exact quotes for traceability
- Priority mapping: P1 = Critical/Urgent, P2 = High, P3 = Medium, P4 = Low

Return ONLY valid JSON, no additional text.`;
};

/**
 * User prompt template for RAID extraction from arbitrary text
 *
 * @param text - The text to analyze
 * @param projectName - The name of the project (optional)
 * @param context - Additional context about the text
 */
export const RAID_EXTRACTION_TEXT_PROMPT = (
  text: string,
  projectName?: string,
  context?: string,
): string => {
  return `Analyze the following project-related text and extract RAID items.

${projectName ? `Project: ${projectName}` : ''}
${context ? `Context: ${context}` : ''}

TEXT TO ANALYZE:
"""
${text.slice(0, 6000)}
"""

Extract and return a JSON object with this structure:
{
  "risks": [
    {
      "title": "Brief risk title",
      "description": "Detailed description",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "likelihood": "HIGH" | "MEDIUM" | "LOW",
      "category": "TIMELINE" | "BUDGET" | "SCOPE" | "RESOURCE" | "TECHNICAL" | "EXTERNAL" | "QUALITY",
      "mitigation": "Suggested mitigation if any",
      "owner": "Person responsible if mentioned",
      "sourceText": "Exact quote",
      "confidence": 0.0-1.0
    }
  ],
  "actionItems": [
    {
      "title": "Action item title",
      "description": "Details",
      "assignee": "Person assigned",
      "dueDate": "YYYY-MM-DD if mentioned",
      "priority": "P1" | "P2" | "P3" | "P4",
      "sourceText": "Exact quote",
      "confidence": 0.0-1.0
    }
  ],
  "issues": [
    {
      "title": "Issue title",
      "description": "Description",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "category": "TECHNICAL" | "RESOURCE" | "SCOPE" | "BUDGET" | "TIMELINE" | "QUALITY" | "COMMUNICATION" | "EXTERNAL" | "OTHER",
      "impact": "Impact description",
      "workaround": "Workaround if any",
      "assignee": "Person responsible",
      "sourceText": "Exact quote",
      "confidence": 0.0-1.0
    }
  ],
  "decisions": [
    {
      "title": "Decision title",
      "description": "Full description",
      "context": "Background context",
      "rationale": "Reasoning",
      "impact": "HIGH" | "MEDIUM" | "LOW",
      "decisionMaker": "Who decided",
      "effectiveDate": "YYYY-MM-DD if mentioned",
      "sourceText": "Exact quote",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "Brief summary of findings"
}

Only include items with confidence >= 0.6. Return ONLY valid JSON.`;
};

/**
 * Prompt for generating a RAID summary for a project
 *
 * @param raidData - Object containing all RAID items
 * @param projectName - Name of the project
 */
export const RAID_SUMMARY_PROMPT = (
  raidData: {
    riskCount: number;
    criticalRisks: number;
    actionItemCount: number;
    overdueActionItems: number;
    openIssueCount: number;
    criticalIssues: number;
    recentDecisions: number;
    pendingDecisions: number;
  },
  projectName: string,
): string => {
  return `Generate a brief executive summary of the RAID status for the "${projectName}" project based on these metrics:

RAID Metrics:
- Total Risks: ${raidData.riskCount} (${raidData.criticalRisks} critical/high severity)
- Action Items: ${raidData.actionItemCount} (${raidData.overdueActionItems} overdue)
- Open Issues: ${raidData.openIssueCount} (${raidData.criticalIssues} critical)
- Decisions: ${raidData.recentDecisions} recent, ${raidData.pendingDecisions} pending

Provide a JSON response:
{
  "summary": "2-3 sentence executive summary",
  "healthIndicator": "HEALTHY" | "AT_RISK" | "CRITICAL",
  "topConcerns": ["concern 1", "concern 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}

Return ONLY valid JSON.`;
};
