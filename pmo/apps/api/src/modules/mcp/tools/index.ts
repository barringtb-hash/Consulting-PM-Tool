/**
 * MCP Tools Index
 *
 * Aggregates all CRM MCP tools
 */

import { accountTools, executeAccountTool } from './accounts.tools';
import { projectTools, executeProjectTool } from './projects.tools';
import { meetingTools, executeMeetingTool } from './meetings.tools';

/**
 * All available CRM MCP tools
 */
export const allTools = [...accountTools, ...projectTools, ...meetingTools];

/**
 * Tool name to executor mapping
 */
const accountToolNames = new Set(accountTools.map((t) => t.name));
const projectToolNames = new Set(projectTools.map((t) => t.name));
const meetingToolNames = new Set(meetingTools.map((t) => t.name));

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  if (accountToolNames.has(toolName)) {
    return executeAccountTool(toolName, args);
  }

  if (projectToolNames.has(toolName)) {
    return executeProjectTool(toolName, args);
  }

  if (meetingToolNames.has(toolName)) {
    return executeMeetingTool(toolName, args);
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
    isError: true,
  };
}

/**
 * Get tool definition by name
 */
export function getTool(toolName: string) {
  return allTools.find((t) => t.name === toolName);
}

export { accountTools, projectTools, meetingTools };
