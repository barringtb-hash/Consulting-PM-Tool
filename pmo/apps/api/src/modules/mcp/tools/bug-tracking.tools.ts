/**
 * MCP Bug Tracking Tools
 *
 * Tools for the AI Assistant to interact with the bug tracking system
 */

import * as bugTrackingService from '../../bug-tracking/bug-tracking.service';
import * as errorService from '../../bug-tracking/error-collector.service';
import { IssueType, IssuePriority, IssueSource } from '@prisma/client';

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
      'Create a new bug report or issue in the bug tracking system. Use this when a user reports a bug, issue, or problem with the application. The report will be automatically marked as reported by the current user. Use the assignToSelf parameter to also assign the issue to them. IMPORTANT: Always ask the user for steps to reproduce, expected behavior, and actual behavior if not provided.',
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
            'Detailed description of the bug. Should include context about what the user was trying to do.',
        },
        stepsToReproduce: {
          type: 'string',
          description:
            'Numbered steps to reproduce the issue (e.g., "1. Go to Settings\\n2. Click Users\\n3. Change role"). Ask the user if not provided.',
        },
        expectedBehavior: {
          type: 'string',
          description:
            'What should happen according to the user (e.g., "Role should update successfully")',
        },
        actualBehavior: {
          type: 'string',
          description:
            'What actually happened (e.g., "Error message appears: member not found")',
        },
        errorMessage: {
          type: 'string',
          description:
            'Any error messages the user saw, copied exactly as displayed',
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
        pageUrl: {
          type: 'string',
          description:
            'The URL/page where the issue occurred (e.g., "/settings/users")',
        },
        workaround: {
          type: 'string',
          description: 'Any workaround the user has found, if applicable',
        },
        assignToSelf: {
          type: 'string',
          description:
            'If "true", automatically assign the issue to the reporting user. Defaults to false.',
          enum: ['true', 'false'],
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
  {
    name: 'get_runtime_errors',
    description:
      'Get recent runtime errors from the application including Vercel, Render, API, and browser errors. Use this to investigate production issues or check for recent problems.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description:
            'Filter by error source. VERCEL_LOG for Vercel edge/serverless, RENDER_LOG for Render backend, API_ERROR for API errors, BROWSER_ERROR for client-side errors',
          enum: [
            'VERCEL_LOG',
            'RENDER_LOG',
            'API_ERROR',
            'BROWSER_ERROR',
            'AI_ASSISTANT',
          ],
        },
        level: {
          type: 'string',
          description:
            'Filter by error level (error, warn, info). Defaults to all levels.',
          enum: ['error', 'warn', 'info'],
        },
        limit: {
          type: 'string',
          description:
            'Maximum number of errors to return (default: 10, max: 50)',
        },
        hoursAgo: {
          type: 'string',
          description:
            'Only show errors from the last N hours (e.g., "24" for last 24 hours)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_error_statistics',
    description:
      'Get error statistics and trends to understand the health of the application. Shows error counts by source, level, and hourly trends.',
    inputSchema: {
      type: 'object',
      properties: {
        hoursAgo: {
          type: 'string',
          description:
            'Time range in hours to analyze (e.g., "24" for last 24 hours, "168" for last week). Defaults to 24 hours.',
        },
      },
      required: [],
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
      case 'get_runtime_errors':
        return await getRuntimeErrors(args);
      case 'get_error_statistics':
        return await getErrorStatistics(args);
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
async function createBugReport(args: Record<string, unknown>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  const {
    title,
    description,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    errorMessage,
    type = 'BUG',
    priority = 'MEDIUM',
    browser,
    pageUrl,
    workaround,
    assignToSelf,
    _userId, // Injected by MCP router
  } = args as {
    title: string;
    description: string;
    stepsToReproduce?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    errorMessage?: string;
    type?: string;
    priority?: string;
    browser?: string;
    pageUrl?: string;
    workaround?: string;
    assignToSelf?: string;
    _userId?: number;
  };

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: A title is required to create a bug report. Please provide a clear, concise title describing the issue.',
        },
      ],
      isError: true,
    };
  }

  if (
    !description ||
    typeof description !== 'string' ||
    description.trim().length === 0
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: A description is required to create a bug report. Please provide details about the issue including what happened and what you expected.',
        },
      ],
      isError: true,
    };
  }

  // Build a well-structured description with all context
  const descriptionParts: string[] = [];

  // Main description
  descriptionParts.push(description);

  // Steps to reproduce
  if (stepsToReproduce) {
    descriptionParts.push('');
    descriptionParts.push('**Steps to Reproduce:**');
    descriptionParts.push(stepsToReproduce);
  }

  // Expected vs Actual behavior
  if (expectedBehavior) {
    descriptionParts.push('');
    descriptionParts.push(`**Expected Behavior:** ${expectedBehavior}`);
  }
  if (actualBehavior) {
    descriptionParts.push(`**Actual Behavior:** ${actualBehavior}`);
  }

  // Error message
  if (errorMessage) {
    descriptionParts.push('');
    descriptionParts.push('**Error Message:**');
    descriptionParts.push('```');
    descriptionParts.push(errorMessage);
    descriptionParts.push('```');
  }

  // Page URL
  if (pageUrl) {
    descriptionParts.push('');
    descriptionParts.push(`**Page/URL:** ${pageUrl}`);
  }

  // Browser info
  if (browser) {
    descriptionParts.push(`**Browser:** ${browser}`);
  }

  // Workaround
  if (workaround) {
    descriptionParts.push('');
    descriptionParts.push(`**Known Workaround:** ${workaround}`);
  }

  // Source attribution
  descriptionParts.push('');
  descriptionParts.push('*Reported via AI Assistant*');

  const fullDescription = descriptionParts.join('\n');

  // Determine if we should assign to the current user
  const shouldAssignToSelf = assignToSelf === 'true' && _userId;

  const issue = await bugTrackingService.createIssue(
    {
      title,
      description: fullDescription,
      type: type as IssueType,
      priority: priority as IssuePriority,
      source: 'AI_ASSISTANT',
      url: pageUrl,
      browserInfo: browser ? { browser } : undefined,
      assignedToId: shouldAssignToSelf ? _userId : undefined,
    },
    _userId, // Set reportedById to the current user
  );

  // Extract user info from the issue response (includes relations)
  const issueWithRelations = issue as typeof issue & {
    assignedTo?: { name: string } | null;
    reportedBy?: { name: string } | null;
  };

  const assignmentInfo = issueWithRelations.assignedTo
    ? `\n- **Assigned to:** ${issueWithRelations.assignedTo.name}`
    : '\n- **Assigned to:** Unassigned';
  const reporterInfo = issueWithRelations.reportedBy
    ? `\n- **Reported by:** ${issueWithRelations.reportedBy.name}`
    : '';

  // Build summary of what info was captured
  const capturedInfo: string[] = [];
  if (stepsToReproduce) capturedInfo.push('steps to reproduce');
  if (expectedBehavior || actualBehavior)
    capturedInfo.push('expected/actual behavior');
  if (errorMessage) capturedInfo.push('error message');
  if (browser) capturedInfo.push('browser info');
  if (pageUrl) capturedInfo.push('page URL');

  const capturedSummary =
    capturedInfo.length > 0
      ? `\n\nCaptured: ${capturedInfo.join(', ')}`
      : '\n\n⚠️ **Tip:** For faster resolution, consider adding steps to reproduce, expected/actual behavior, and any error messages.';

  return {
    content: [
      {
        type: 'text',
        text: `Successfully created bug report #${issue.id}:
- **Title:** ${issue.title}
- **Type:** ${issue.type}
- **Priority:** ${issue.priority}
- **Status:** ${issue.status}${reporterInfo}${assignmentInfo}${capturedSummary}

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

  const result = await bugTrackingService.listIssues(
    { search: query },
    { limit: 5, page: 1 },
  );

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
async function getBugStatus(args: Record<string, unknown>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  const { issueId } = args as { issueId: string };
  const id = parseInt(issueId, 10);

  if (isNaN(id)) {
    return {
      content: [{ type: 'text', text: `Invalid issue ID: ${issueId}` }],
      isError: true,
    };
  }

  try {
    const issue = await bugTrackingService.getIssueById(id);

    if (!issue) {
      return {
        content: [{ type: 'text', text: `Bug report #${issueId} not found.` }],
        isError: true,
      };
    }

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

/**
 * Get recent runtime errors
 */
async function getRuntimeErrors(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { source, level, limit, hoursAgo } = args as {
    source?: string;
    level?: string;
    limit?: string;
    hoursAgo?: string;
  };

  const limitNum = Math.min(parseInt(limit || '10', 10) || 10, 50);
  const since = hoursAgo
    ? new Date(Date.now() - parseInt(hoursAgo, 10) * 60 * 60 * 1000)
    : undefined;

  const errors = await errorService.getRecentErrorLogs({
    source: source as IssueSource | undefined,
    level,
    limit: limitNum,
    since,
  });

  if (errors.length === 0) {
    const timeRange = hoursAgo ? `the last ${hoursAgo} hours` : 'recently';
    const sourceFilter = source ? ` from ${source}` : '';
    return {
      content: [
        {
          type: 'text',
          text: `No runtime errors found${sourceFilter} ${timeRange}. The application appears to be running smoothly.`,
        },
      ],
    };
  }

  const errorList = errors
    .slice(0, 10) // Limit display to 10 for readability
    .map((error) => {
      const timestamp = new Date(error.createdAt).toLocaleString();
      const issueLink = error.issue
        ? ` (Issue #${error.issue.id}: ${error.issue.status})`
        : '';
      return `- **[${error.source}]** ${timestamp}\n  ${error.message}${issueLink}`;
    })
    .join('\n\n');

  const summary = `Found ${errors.length} runtime error(s)${source ? ` from ${source}` : ''}${hoursAgo ? ` in the last ${hoursAgo} hours` : ''}:`;

  return {
    content: [
      {
        type: 'text',
        text: `${summary}\n\n${errorList}${errors.length > 10 ? `\n\n... and ${errors.length - 10} more errors` : ''}`,
      },
    ],
  };
}

/**
 * Get error statistics
 */
async function getErrorStatistics(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { hoursAgo } = args as { hoursAgo?: string };

  const since = hoursAgo
    ? new Date(Date.now() - parseInt(hoursAgo, 10) * 60 * 60 * 1000)
    : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24 hours

  const stats = await errorService.getErrorStats(since);

  const timeRange = hoursAgo || '24';

  if (stats.total === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No errors recorded in the last ${timeRange} hours. The application is running without errors.`,
        },
      ],
    };
  }

  // Format by source
  const sourceBreakdown = Object.entries(stats.bySource)
    .map(([src, count]) => `  - ${src}: ${count}`)
    .join('\n');

  // Format by level
  const levelBreakdown = Object.entries(stats.byLevel)
    .map(([lvl, count]) => `  - ${lvl}: ${count}`)
    .join('\n');

  // Determine health status
  let healthStatus = 'Healthy';
  const errorRate = (stats.byLevel?.error || 0) / stats.total;
  if (errorRate > 0.5) {
    healthStatus = 'Critical - High error rate';
  } else if (errorRate > 0.2) {
    healthStatus = 'Warning - Elevated error rate';
  } else if (stats.total > 100) {
    healthStatus = 'Warning - High volume of issues';
  }

  return {
    content: [
      {
        type: 'text',
        text: `**Error Statistics (Last ${timeRange} hours)**

**Status:** ${healthStatus}
**Total Errors:** ${stats.total}

**By Source:**
${sourceBreakdown || '  No data'}

**By Level:**
${levelBreakdown || '  No data'}

${stats.bySource?.VERCEL_LOG ? `\n**Note:** ${stats.bySource.VERCEL_LOG} errors from Vercel (frontend/edge functions)` : ''}
${stats.bySource?.RENDER_LOG ? `**Note:** ${stats.bySource.RENDER_LOG} errors from Render (API backend)` : ''}
${stats.bySource?.API_ERROR ? `**Note:** ${stats.bySource.API_ERROR} API errors captured by server middleware` : ''}
${stats.bySource?.BROWSER_ERROR ? `**Note:** ${stats.bySource.BROWSER_ERROR} browser/client-side errors` : ''}`,
      },
    ],
  };
}
