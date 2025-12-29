/**
 * AI Prompt Generation Service
 *
 * Generates well-structured prompts from bug tracking issues
 * for AI coders to implement fixes or features.
 */

import { prisma } from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import {
  IssueType,
  IssuePriority,
  IssueStatus,
  IssueSource,
} from '@prisma/client';

// Type for issue with all included relations
interface IssueWithRelations {
  id: number;
  tenantId: string | null;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  source: IssueSource;
  stackTrace: string | null;
  browserInfo: Record<string, unknown> | null;
  requestInfo: Record<string, unknown> | null;
  environment: string | null;
  appVersion: string | null;
  url: string | null;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
  reportedBy: { id: number; name: string; email: string } | null;
  assignedTo: { id: number; name: string; email: string } | null;
  labels: Array<{ id: number; name: string; color: string; description: string | null }>;
  project: { id: number; name: string } | null;
  account: { id: number; name: string } | null;
  comments?: Array<{
    id: number;
    content: string;
    createdAt: Date;
    user: { id: number; name: string } | null;
  }>;
  errorLogs?: Array<{
    id: number;
    message: string;
    stackTrace: string | null;
    source: IssueSource;
    level: string;
    url: string | null;
    createdAt: Date;
  }>;
}

interface IssueLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

interface IssueComment {
  id: number;
  content: string;
  createdAt: Date;
  user: { id: number; name: string } | null;
}

// ============================================================================
// TYPES
// ============================================================================

export interface AIPromptOptions {
  /** Include stack trace in prompt */
  includeStackTrace?: boolean;
  /** Include browser/request info */
  includeEnvironmentInfo?: boolean;
  /** Include recent error logs */
  includeErrorLogs?: boolean;
  /** Maximum number of error logs to include */
  errorLogLimit?: number;
  /** Include comments/discussion */
  includeComments?: boolean;
  /** Include suggested files to investigate */
  includeSuggestedFiles?: boolean;
  /** Custom instructions to append */
  customInstructions?: string;
  /** Output format */
  format?: 'markdown' | 'plain' | 'json';
}

export interface AIPromptResult {
  prompt: string;
  issueId: number;
  issueTitle: string;
  format: string;
  generatedAt: string;
  metadata: {
    type: IssueType;
    priority: IssuePriority;
    status: IssueStatus;
    source: IssueSource;
    errorCount: number;
    commentCount: number;
    labels: string[];
  };
}

const DEFAULT_OPTIONS: AIPromptOptions = {
  includeStackTrace: true,
  includeEnvironmentInfo: true,
  includeErrorLogs: true,
  errorLogLimit: 5,
  includeComments: true,
  includeSuggestedFiles: true,
  format: 'markdown',
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate an AI-ready prompt from an issue
 */
export async function generateAIPrompt(
  issueId: number,
  options: AIPromptOptions = {}
): Promise<AIPromptResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tenantId = hasTenantContext() ? getTenantId() : null;

  // Fetch the issue with all related data
  const issue = await prisma.issue.findFirst({
    where: tenantId ? { id: issueId, tenantId } : { id: issueId },
    include: {
      reportedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      labels: true,
      project: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      comments: opts.includeComments
        ? {
            where: { isSystem: false },
            include: {
              user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 10,
          }
        : false,
      errorLogs: opts.includeErrorLogs
        ? {
            orderBy: { createdAt: 'desc' },
            take: opts.errorLogLimit,
          }
        : false,
    },
  });

  if (!issue) {
    throw new Error('Issue not found');
  }

  // Generate prompt based on format
  let prompt: string;
  switch (opts.format) {
    case 'json':
      prompt = generateJsonPrompt(issue, opts);
      break;
    case 'plain':
      prompt = generatePlainPrompt(issue, opts);
      break;
    case 'markdown':
    default:
      prompt = generateMarkdownPrompt(issue, opts);
  }

  return {
    prompt,
    issueId: issue.id,
    issueTitle: issue.title,
    format: opts.format || 'markdown',
    generatedAt: new Date().toISOString(),
    metadata: {
      type: issue.type,
      priority: issue.priority,
      status: issue.status,
      source: issue.source,
      errorCount: issue.errorCount,
      commentCount: issue.comments?.length || 0,
      labels: issue.labels.map((l) => l.name),
    },
  };
}

// ============================================================================
// PROMPT GENERATORS
// ============================================================================

function generateMarkdownPrompt(
  issue: IssueWithRelations,
  opts: AIPromptOptions,
): string {
  const sections: string[] = [];

  // Header
  const taskType = getTaskTypeLabel(issue.type);
  sections.push(`## Task: ${taskType} #${issue.id}`);
  sections.push('');

  // Metadata
  sections.push(`**Title:** ${issue.title}`);
  sections.push(`**Type:** ${formatEnum(issue.type)}`);
  sections.push(`**Priority:** ${formatEnum(issue.priority)}`);
  sections.push(`**Status:** ${formatEnum(issue.status)}`);

  if (issue.labels.length > 0) {
    sections.push(
      `**Labels:** ${issue.labels.map((l: IssueLabel) => l.name).join(', ')}`,
    );
  }

  if (issue.project) {
    sections.push(`**Project:** ${issue.project.name}`);
  }

  if (issue.source !== 'MANUAL') {
    sections.push(`**Source:** ${formatEnum(issue.source)} (auto-detected)`);
  }

  sections.push('');

  // Description
  sections.push('### Description');
  sections.push('');
  sections.push(issue.description || '_No description provided._');
  sections.push('');

  // Stack trace
  if (opts.includeStackTrace && issue.stackTrace) {
    sections.push('### Stack Trace');
    sections.push('');
    sections.push('```');
    sections.push(issue.stackTrace);
    sections.push('```');
    sections.push('');
  }

  // Environment info
  if (opts.includeEnvironmentInfo) {
    const envInfo: string[] = [];

    if (issue.environment) {
      envInfo.push(`- **Environment:** ${issue.environment}`);
    }
    if (issue.appVersion) {
      envInfo.push(`- **App Version:** ${issue.appVersion}`);
    }
    if (issue.url) {
      envInfo.push(`- **URL:** ${issue.url}`);
    }
    if (issue.browserInfo) {
      const bi = issue.browserInfo as Record<string, unknown>;
      if (bi.browser) {
        envInfo.push(`- **Browser:** ${bi.browser} ${bi.version || ''}`);
      }
      if (bi.os) {
        envInfo.push(`- **OS:** ${bi.os}`);
      }
      if (bi.device) {
        envInfo.push(`- **Device:** ${bi.device}`);
      }
    }
    if (issue.requestInfo) {
      const ri = issue.requestInfo as Record<string, unknown>;
      if (ri.method && ri.url) {
        envInfo.push(`- **Request:** ${ri.method} ${ri.url}`);
      }
      if (ri.statusCode) {
        envInfo.push(`- **Status Code:** ${ri.statusCode}`);
      }
    }

    if (envInfo.length > 0) {
      sections.push('### Environment');
      sections.push('');
      sections.push(...envInfo);
      sections.push('');
    }
  }

  // Error statistics
  if (issue.errorCount > 1) {
    sections.push('### Error Frequency');
    sections.push('');
    sections.push(`This error has occurred **${issue.errorCount} times**.`);
    sections.push('');
  }

  // Recent error logs
  if (opts.includeErrorLogs && issue.errorLogs && issue.errorLogs.length > 0) {
    sections.push('### Recent Error Occurrences');
    sections.push('');

    for (const log of issue.errorLogs.slice(0, 3)) {
      const timestamp = new Date(log.createdAt).toISOString();
      sections.push(`**${timestamp}**`);
      if (log.url) {
        sections.push(`- URL: ${log.url}`);
      }
      if (log.statusCode) {
        sections.push(`- Status: ${log.statusCode}`);
      }
      sections.push('');
    }
  }

  // Suggested files
  if (opts.includeSuggestedFiles) {
    const suggestedFiles = extractSuggestedFiles(issue);
    if (suggestedFiles.length > 0) {
      sections.push('### Files to Investigate');
      sections.push('');
      for (const file of suggestedFiles) {
        sections.push(`- \`${file}\``);
      }
      sections.push('');
    }
  }

  // Comments/Discussion
  if (opts.includeComments && issue.comments && issue.comments.length > 0) {
    sections.push('### Discussion');
    sections.push('');
    for (const comment of issue.comments) {
      const author = comment.user?.name || 'Unknown';
      const date = new Date(comment.createdAt).toLocaleDateString();
      sections.push(`**${author}** (${date}):`);
      sections.push(`> ${comment.content.replace(/\n/g, '\n> ')}`);
      sections.push('');
    }
  }

  // Acceptance criteria
  sections.push('### Acceptance Criteria');
  sections.push('');
  sections.push(generateAcceptanceCriteria(issue));
  sections.push('');

  // Custom instructions
  if (opts.customInstructions) {
    sections.push('### Additional Instructions');
    sections.push('');
    sections.push(opts.customInstructions);
    sections.push('');
  }

  // Implementation guidelines
  sections.push('### Implementation Guidelines');
  sections.push('');
  sections.push('1. Read and understand the issue thoroughly before making changes');
  sections.push('2. Check existing code patterns in the codebase');
  sections.push('3. Write tests for your changes');
  sections.push('4. Ensure no regressions are introduced');
  sections.push('5. Follow the project\'s coding conventions');
  sections.push('');

  return sections.join('\n');
}

function generatePlainPrompt(
  issue: IssueWithRelations,
  opts: AIPromptOptions,
): string {
  const lines: string[] = [];

  const taskType = getTaskTypeLabel(issue.type);
  lines.push(`TASK: ${taskType} #${issue.id}`);
  lines.push(`Title: ${issue.title}`);
  lines.push(`Type: ${formatEnum(issue.type)}`);
  lines.push(`Priority: ${formatEnum(issue.priority)}`);
  lines.push('');
  lines.push('DESCRIPTION:');
  lines.push(issue.description || 'No description provided.');
  lines.push('');

  if (opts.includeStackTrace && issue.stackTrace) {
    lines.push('STACK TRACE:');
    lines.push(issue.stackTrace);
    lines.push('');
  }

  if (issue.labels.length > 0) {
    lines.push(
      `Labels: ${issue.labels.map((l: IssueLabel) => l.name).join(', ')}`,
    );
  }

  if (issue.errorCount > 1) {
    lines.push(`Error occurred ${issue.errorCount} times`);
  }

  lines.push('');
  lines.push('ACCEPTANCE CRITERIA:');
  lines.push(generateAcceptanceCriteria(issue));

  return lines.join('\n');
}

function generateJsonPrompt(
  issue: IssueWithRelations,
  opts: AIPromptOptions,
): string {
  const prompt = {
    task: {
      id: issue.id,
      title: issue.title,
      type: issue.type,
      priority: issue.priority,
      status: issue.status,
      source: issue.source,
    },
    description: issue.description,
    labels: issue.labels.map((l: IssueLabel) => l.name),
    project: issue.project?.name || null,
    environment: {
      env: issue.environment,
      appVersion: issue.appVersion,
      url: issue.url,
      browser: issue.browserInfo,
      request: issue.requestInfo,
    },
    stackTrace: opts.includeStackTrace ? issue.stackTrace : undefined,
    errorCount: issue.errorCount,
    suggestedFiles: opts.includeSuggestedFiles ? extractSuggestedFiles(issue) : [],
    acceptanceCriteria: generateAcceptanceCriteria(issue).split('\n'),
    comments: opts.includeComments
      ? issue.comments?.map((c: IssueComment) => ({
          author: c.user?.name || 'Unknown',
          content: c.content,
          date: c.createdAt,
        }))
      : [],
  };

  return JSON.stringify(prompt, null, 2);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTaskTypeLabel(type: IssueType): string {
  switch (type) {
    case 'BUG':
      return 'Fix Bug';
    case 'FEATURE_REQUEST':
      return 'Implement Feature';
    case 'IMPROVEMENT':
      return 'Improve';
    case 'ISSUE':
      return 'Resolve Issue';
    case 'TASK':
      return 'Complete Task';
    default:
      return 'Address';
  }
}

function formatEnum(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function extractSuggestedFiles(issue: IssueWithRelations): string[] {
  const files: Set<string> = new Set();

  // Extract files from stack trace
  if (issue.stackTrace) {
    const fileMatches = issue.stackTrace.match(/(?:at\s+)?[\w./\\-]+\.(ts|tsx|js|jsx):\d+/g);
    if (fileMatches) {
      for (const match of fileMatches) {
        // Clean up the path
        const cleanPath = match
          .replace(/^at\s+/, '')
          .replace(/:\d+.*$/, '');

        // Only include project files (not node_modules)
        if (!cleanPath.includes('node_modules')) {
          files.add(cleanPath);
        }
      }
    }
  }

  // Extract from component stack
  if (issue.componentStack) {
    const componentMatches = issue.componentStack.match(/[\w./\\-]+\.(tsx|jsx)/g);
    if (componentMatches) {
      componentMatches.forEach((m: string) => files.add(m));
    }
  }

  // Add URL-based suggestions
  if (issue.url) {
    const urlPath = new URL(issue.url, 'http://localhost').pathname;
    if (urlPath.startsWith('/api/')) {
      // Suggest route files
      const routePart = urlPath.replace('/api/', '').split('/')[0];
      files.add(`pmo/apps/api/src/routes/${routePart}.routes.ts`);
      files.add(`pmo/apps/api/src/services/${routePart}.service.ts`);
    } else if (urlPath !== '/') {
      // Suggest page files
      const pagePart = urlPath.replace(/^\//, '').split('/')[0];
      files.add(`pmo/apps/web/src/pages/${pagePart}/*.tsx`);
    }
  }

  return Array.from(files).slice(0, 10);
}

function generateAcceptanceCriteria(issue: IssueWithRelations): string {
  const criteria: string[] = [];

  switch (issue.type) {
    case 'BUG':
      criteria.push('- [ ] Root cause identified and documented');
      criteria.push('- [ ] Fix implemented and tested locally');
      criteria.push('- [ ] No regressions introduced');
      criteria.push('- [ ] Unit/integration tests added for the fix');
      if (issue.errorCount > 10) {
        criteria.push('- [ ] Verified fix prevents recurrence at scale');
      }
      break;

    case 'FEATURE_REQUEST':
      criteria.push('- [ ] Feature implemented as described');
      criteria.push('- [ ] UI/UX matches existing patterns');
      criteria.push('- [ ] API endpoints documented');
      criteria.push('- [ ] Tests cover happy path and edge cases');
      criteria.push('- [ ] Feature is accessible and responsive');
      break;

    case 'IMPROVEMENT':
      criteria.push('- [ ] Improvement implemented');
      criteria.push('- [ ] Performance/quality measurably better');
      criteria.push('- [ ] Backward compatible');
      criteria.push('- [ ] Tests updated as needed');
      break;

    case 'TASK':
      criteria.push('- [ ] Task completed as specified');
      criteria.push('- [ ] Changes reviewed and tested');
      break;

    default:
      criteria.push('- [ ] Issue resolved');
      criteria.push('- [ ] Changes tested');
      criteria.push('- [ ] No regressions');
  }

  // Add label-specific criteria
  const labelNames = issue.labels.map((l: IssueLabel) => l.name.toLowerCase());

  if (labelNames.includes('security')) {
    criteria.push('- [ ] Security implications reviewed');
    criteria.push('- [ ] No new vulnerabilities introduced');
  }

  if (labelNames.includes('performance')) {
    criteria.push('- [ ] Performance benchmarks run');
    criteria.push('- [ ] No performance regressions');
  }

  if (labelNames.includes('api')) {
    criteria.push('- [ ] API changes backward compatible');
    criteria.push('- [ ] API documentation updated');
  }

  if (labelNames.includes('database') || labelNames.includes('db')) {
    criteria.push('- [ ] Database migrations created if needed');
    criteria.push('- [ ] Migration tested with existing data');
  }

  return criteria.join('\n');
}

// ============================================================================
// BATCH GENERATION
// ============================================================================

/**
 * Generate prompts for multiple issues (e.g., for a sprint)
 */
export async function generateBatchPrompts(
  issueIds: number[],
  options: AIPromptOptions = {}
): Promise<AIPromptResult[]> {
  const results: AIPromptResult[] = [];

  for (const id of issueIds) {
    try {
      const result = await generateAIPrompt(id, options);
      results.push(result);
    } catch (error) {
      // Skip issues that can't be found
      console.warn(`Failed to generate prompt for issue ${id}:`, error);
    }
  }

  return results;
}

/**
 * Generate a combined prompt for related issues
 */
export async function generateCombinedPrompt(
  issueIds: number[],
  options: AIPromptOptions = {}
): Promise<string> {
  const prompts = await generateBatchPrompts(issueIds, options);

  if (prompts.length === 0) {
    throw new Error('No issues found');
  }

  const sections: string[] = [];
  sections.push('# Implementation Tasks');
  sections.push('');
  sections.push(`This document contains ${prompts.length} related tasks to implement.`);
  sections.push('');
  sections.push('---');
  sections.push('');

  for (const prompt of prompts) {
    sections.push(prompt.prompt);
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  return sections.join('\n');
}
