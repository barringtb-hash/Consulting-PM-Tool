/**
 * Project Intent Classifier
 *
 * Classifies user messages into project-related intents for the Project Assistant.
 * Uses a combination of keyword matching and AI classification.
 */

import { llmService } from '../../../services/llm.service';

/**
 * Intent types for project assistant
 * These are defined locally since they're specific to the AI Projects module
 */
export type IntentType =
  | 'PROJECT_STATUS'
  | 'PROJECT_CREATE'
  | 'TASK_STATUS'
  | 'TASK_CREATE'
  | 'MILESTONE_STATUS'
  | 'TEAM_STATUS'
  | 'TEAM_QUERY'
  | 'TIMELINE_QUERY'
  | 'SCHEDULE_QUERY'
  | 'MEETING_SUMMARY'
  | 'RISK_QUERY'
  | 'REPORT_REQUEST'
  | 'GENERAL_HELP'
  | 'UNKNOWN';

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  entities?: {
    projectName?: string;
    taskName?: string;
    milestoneName?: string;
    userName?: string;
    dateReference?: string;
  };
}

/**
 * Keywords for rule-based intent classification
 */
export const PROJECT_INTENT_KEYWORDS: Record<string, string[]> = {
  PROJECT_STATUS: [
    'project status',
    'how is the project',
    'project health',
    'project update',
    'project progress',
    "how's the project",
    'project overview',
    'project summary',
  ],
  PROJECT_CREATE: [
    'create project',
    'new project',
    'start project',
    'setup project',
    'add project',
    'make a project',
  ],
  TASK_STATUS: [
    'task status',
    'tasks',
    'overdue tasks',
    'blocked tasks',
    'in progress tasks',
    'pending tasks',
    'what tasks',
    'open tasks',
    'incomplete tasks',
  ],
  TASK_CREATE: [
    'add task',
    'create task',
    'new task',
    'assign task',
    'make a task',
    'add a task',
  ],
  MILESTONE_STATUS: [
    'milestone',
    'milestones',
    'phase',
    'deliverable',
    'deadline',
    'due date',
    'next milestone',
    'upcoming milestone',
  ],
  TEAM_QUERY: [
    'who is',
    'team',
    'assigned to',
    'working on',
    'team members',
    'who works',
    'whos on',
  ],
  SCHEDULE_QUERY: [
    'due this week',
    'upcoming',
    'schedule',
    'timeline',
    'due today',
    'due tomorrow',
    'this week',
    'next week',
    "what's coming",
    'whats due',
  ],
  REPORT_REQUEST: [
    'report',
    'summary',
    'status report',
    'weekly update',
    'generate report',
    'create report',
    'send report',
    'email report',
  ],
};

/**
 * Classify intent using rule-based keyword matching
 */
export function classifyProjectIntentRuleBased(
  message: string,
): IntentClassification | null {
  const lowerMessage = message.toLowerCase();

  for (const [intent, keywords] of Object.entries(PROJECT_INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          intent: intent as IntentType,
          confidence: 0.85,
        };
      }
    }
  }

  return null;
}

/**
 * AI-powered intent classification using LLM
 */
export async function classifyProjectIntentAI(
  message: string,
): Promise<IntentClassification> {
  const systemPrompt = `You are an intent classifier for a project management AI assistant.
Classify the user message into ONE of these categories:

PROJECT MANAGEMENT INTENTS:
- PROJECT_STATUS: Questions about project health, progress, or updates
- PROJECT_CREATE: Requests to create a new project
- TASK_STATUS: Questions about tasks (overdue, blocked, assigned, in progress)
- TASK_CREATE: Requests to create or assign tasks
- MILESTONE_STATUS: Questions about milestones or deadlines
- TEAM_QUERY: Questions about team members or assignments
- SCHEDULE_QUERY: Questions about timelines, due dates, upcoming work
- REPORT_REQUEST: Requests for status reports or summaries

- GENERAL: Anything else that doesn't fit above categories

Also extract any entities mentioned:
- projectName: Name of a specific project
- taskName: Name of a specific task
- milestoneName: Name of a milestone
- userName: Name of a team member
- dateReference: Any date or time reference

Return JSON only:
{
  "intent": "CATEGORY",
  "confidence": 0.0-1.0,
  "entities": {
    "projectName": "...",
    "taskName": "...",
    "milestoneName": "...",
    "userName": "...",
    "dateReference": "..."
  }
}`;

  try {
    const response = await llmService.complete(
      `${systemPrompt}\n\nUser message: "${message}"`,
      {
        maxTokens: 200,
        temperature: 0.1,
      },
    );

    const parsed = JSON.parse(response.content);
    return {
      intent: parsed.intent as IntentType,
      confidence: parsed.confidence || 0.8,
      entities: parsed.entities,
    };
  } catch (_error) {
    // Fall back to rule-based classification
    const ruleBased = classifyProjectIntentRuleBased(message);
    return ruleBased || { intent: 'GENERAL' as IntentType, confidence: 0.5 };
  }
}

/**
 * Main classification function - tries rule-based first, falls back to AI
 */
export async function classifyProjectIntent(
  message: string,
  useAI: boolean = true,
): Promise<IntentClassification> {
  // Try rule-based first for speed
  const ruleBased = classifyProjectIntentRuleBased(message);

  if (ruleBased && ruleBased.confidence >= 0.85) {
    return ruleBased;
  }

  // Use AI classification if enabled and rule-based didn't match
  if (useAI) {
    return classifyProjectIntentAI(message);
  }

  return ruleBased || { intent: 'GENERAL' as IntentType, confidence: 0.5 };
}

/**
 * Check if an intent is a project-related intent
 */
export function isProjectIntent(intent: IntentType): boolean {
  const projectIntents: IntentType[] = [
    'PROJECT_STATUS',
    'PROJECT_CREATE',
    'TASK_STATUS',
    'TASK_CREATE',
    'MILESTONE_STATUS',
    'TEAM_QUERY',
    'SCHEDULE_QUERY',
    'REPORT_REQUEST',
  ];
  return projectIntents.includes(intent);
}
