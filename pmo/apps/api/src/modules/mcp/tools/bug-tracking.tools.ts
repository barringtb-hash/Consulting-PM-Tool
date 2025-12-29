/**
 * MCP Bug Tracking Tools
 *
 * Tools for the AI Assistant to interact with the bug tracking system
 */

import * as bugTrackingService from '../../bug-tracking/bug-tracking.service';
import { IssueType, IssuePriority } from '@prisma/client';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
}

/**
 * Bug tracking tool definitions
 */
export const bugTrackingTools: ToolDefinition[] = [
  {
    name: 'create_bug_report',
    description:
      'Create a new bug report or issue in the bug tracking system. Use this when a user reports a bug, issue, or problem with the application.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            'A clear, concise title for the bug (e.g., "Login button not responding on mobile")',
        },
        description: {
          type: 'string',
          description:
            'Detailed description of the bug including steps to reproduce, expected behavior, and actual behavior',
        },
        type: {
          type: 'string',
          description: 'Type of issue',
          enum: ['BUG', 'ISSUE', 'FEATURE_REQUEST', 'IMPROVEMENT', 'TASK'],
        },
        priority: {
          type: 'string',
          description:
            'Priority level - CRITICAL for blocking issues, HIGH for major problems, MEDIUM for moderate issues, LOW for minor issues',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        browser: {
          type: 'string',
          description:
            "User's browser if provided (e.g., 'Safari 26.2', 'Chrome 120')",
        },
        stepsToReproduce: {
          type: 'string',
          description: 'Steps to reproduce the issue, if provided by the user',
        },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'search_existing_bugs',
    description:
      'Search for existing bug reports to check if an issue has already been reported',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find matching issues',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_bug_status',
    description:
      'Get the current status and details of a specific bug report by ID',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: {
          type: 'string',
          description: 'The ID number of the bug report',
        },
      },
      required: ['issueId'],
    },
  },
];

/**
 * Execute a bug tracking tool
 */
export async function executeBugTrackingTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (toolName) {
      case 'create_bug_report':
        return await createBugReport(args);
      case 'search_existing_bugs':
        return await searchExistingBugs(args);
      case 'get_bug_status':
        return await getBugStatus(args);
      default:
        return {
          content: [
            { type: 'text', text: `Unknown bug tracking tool: ${toolName}` },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${toolName}: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Create a new bug report
 */
async function createBugReport(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const {
    title,
    description,
    type = 'BUG',
    priority = 'MEDIUM',
    browser,
    stepsToReproduce,
  } = args as {
    title: string;
    description: string;
    type?: string;
    priority?: string;
    browser?: string;
    stepsToReproduce?: string;
  };

  // Build full description with additional context
  let fullDescription = description;
  if (stepsToReproduce) {
    fullDescription += `\n\n**Steps to Reproduce:**\n${stepsToReproduce}`;
  }
  if (browser) {
    fullDescription += `\n\n**Browser:** ${browser}`;
  }
  fullDescription += `\n\n*Reported via AI Assistant*`;

  const issue = await bugTrackingService.createIssue({
    title,
    description: fullDescription,
    type: type as IssueType,
    priority: priority as IssuePriority,
    source: 'AI_ASSISTANT',
    browserInfo: browser ? { browser } : undefined,
  });

  return {
    content: [
      {
        type: 'text',
        text: `Successfully created bug report #${issue.id}:
- **Title:** ${issue.title}
- **Type:** ${issue.type}
- **Priority:** ${issue.priority}
- **Status:** ${issue.status}

The issue has been added to the bug tracking system and will be reviewed by the development team.`,
      },
    ],
  };
}

/**
 * Search for existing bugs
 */
async function searchExistingBugs(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { query } = args as { query: string };

  const result = await bugTrackingService.listIssues({
    search: query,
    limit: 5,
    page: 1,
  });

  if (result.data.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No existing bug reports found matching "${query}". This appears to be a new issue.`,
        },
      ],
    };
  }

  const issueList = result.data
    .map(
      (issue) =>
        `- **#${issue.id}:** ${issue.title} (${issue.status}, ${issue.priority})`,
    )
    .join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.data.length} existing bug report(s) matching "${query}":\n\n${issueList}`,
      },
    ],
  };
}

/**
 * Get bug status by ID
 */
async function getBugStatus(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { issueId } = args as { issueId: string };
  const id = parseInt(issueId, 10);

  if (isNaN(id)) {
    return {
      content: [{ type: 'text', text: `Invalid issue ID: ${issueId}` }],
      isError: true,
    };
  }

  try {
    const issue = await bugTrackingService.getIssue(id);

    return {
      content: [
        {
          type: 'text',
          text: `Bug Report #${issue.id}:
- **Title:** ${issue.title}
- **Type:** ${issue.type}
- **Status:** ${issue.status}
- **Priority:** ${issue.priority}
- **Created:** ${new Date(issue.createdAt).toLocaleDateString()}
${issue.assignedTo ? `- **Assigned to:** ${issue.assignedTo.name}` : '- **Assigned to:** Unassigned'}
${issue.description ? `\n**Description:**\n${issue.description}` : ''}`,
        },
      ],
    };
  } catch {
    return {
      content: [{ type: 'text', text: `Bug report #${issueId} not found.` }],
      isError: true,
    };
  }
}
