/**
 * AI Query Service
 *
 * Uses OpenAI to process natural language queries and execute
 * appropriate MCP tools to gather context and generate responses.
 */

import { env } from '../../config/env';
import { mcpClient } from './mcp-client.service';
import type { AIQueryRequest, AIQueryResponse } from './types';

/**
 * System prompt for the AI assistant
 */
const SYSTEM_PROMPT = `You are an AI assistant for a consulting CRM tool. You help users manage their clients, projects, tasks, and meetings.

You have access to the following tools to query and update CRM data:

CLIENT TOOLS:
- query_clients: Search and filter clients by name, industry, company size, or AI maturity
- get_client: Get detailed information about a specific client
- create_client: Create a new client
- update_client: Update client information

PROJECT TOOLS:
- query_projects: Search projects by client, status, or health status
- get_project: Get detailed project information with tasks and milestones
- query_tasks: Search tasks across projects
- create_task: Create a new task for a project
- update_task: Update task status, priority, or assignee
- get_at_risk_projects: Get all projects that need attention

MEETING TOOLS:
- query_meetings: Search meetings by project, client, or date range
- get_meeting: Get meeting details including notes and decisions
- create_meeting: Create a new meeting
- update_meeting: Update meeting notes, decisions, or risks
- get_recent_meetings: Get meetings from the last few days
- prepare_meeting_brief: Generate a comprehensive brief for a client meeting

When answering questions:
1. Use the appropriate tools to gather information
2. Synthesize the data into a clear, helpful response
3. Provide specific details and actionable insights
4. If creating or updating data, confirm the action was successful

Be concise but thorough. Focus on providing value to busy consultants.`;

/**
 * Convert MCP tools to OpenAI function format
 */
function toolsToFunctions() {
  const tools = mcpClient.listTools();
  return tools.then((toolList) =>
    toolList.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    })),
  );
}

/**
 * Process a natural language query using OpenAI and MCP tools
 */
export async function processAIQuery(
  request: AIQueryRequest,
): Promise<AIQueryResponse> {
  // If no API key, return a helpful error
  if (!env.openaiApiKey) {
    return {
      response:
        'AI query processing requires an OpenAI API key. Please configure OPENAI_API_KEY in your environment.',
      toolCalls: [],
      sources: [],
    };
  }

  const tools = await toolsToFunctions();
  const toolCalls: AIQueryResponse['toolCalls'] = [];
  const sources: AIQueryResponse['sources'] = [];

  // Build conversation messages
  const messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  }> = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Add conversation history if provided
  if (request.history) {
    for (const msg of request.history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add the current query with context hints
  let userMessage = request.query;
  if (request.context?.clientId) {
    userMessage += `\n\n[Context: Working with client ID ${request.context.clientId}]`;
  }
  if (request.context?.projectId) {
    userMessage += `\n\n[Context: Working with project ID ${request.context.projectId}]`;
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    // Initial API call
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return {
        response: 'Sorry, I encountered an error processing your request.',
        toolCalls: [],
        sources: [],
      };
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;

    // Process tool calls in a loop (max 5 iterations)
    let iterations = 0;
    const maxIterations = 5;

    while (assistantMessage.tool_calls && iterations < maxIterations) {
      iterations++;

      // Add assistant message with tool calls
      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        // Inject userId for ownership filtering if provided
        if (request.userId) {
          functionArgs._userId = request.userId;
        }

        // Execute the tool
        const result = await mcpClient.callTool(functionName, functionArgs);

        // Track the tool call
        toolCalls.push({
          tool: functionName,
          arguments: functionArgs,
          result: JSON.parse(result.content[0]?.text || '{}'),
        });

        // Extract sources from results
        extractSources(functionName, functionArgs, result, sources);

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.content[0]?.text || '',
        });
      }

      // Call OpenAI again with tool results
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API error:', error);
        break;
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    return {
      response:
        assistantMessage.content || 'I was unable to generate a response.',
      toolCalls,
      sources,
    };
  } catch (error) {
    console.error('AI Query error:', error);
    return {
      response: 'Sorry, I encountered an error processing your request.',
      toolCalls: [],
      sources: [],
    };
  }
}

/**
 * Extract source references from tool results
 */
function extractSources(
  toolName: string,
  args: Record<string, unknown>,
  result: { content: Array<{ text?: string }> },
  sources: AIQueryResponse['sources'],
): void {
  try {
    const data = JSON.parse(result.content[0]?.text || '{}');

    // Extract client sources
    if (toolName === 'get_client' && data.id) {
      sources?.push({
        type: 'client',
        id: data.id,
        name: data.name || `Client ${data.id}`,
      });
    }

    if (toolName === 'query_clients' && data.clients) {
      for (const client of data.clients.slice(0, 5)) {
        sources?.push({
          type: 'client',
          id: client.id,
          name: client.name,
        });
      }
    }

    // Extract project sources
    if (toolName === 'get_project' && data.id) {
      sources?.push({
        type: 'project',
        id: data.id,
        name: data.name || `Project ${data.id}`,
      });
    }

    if (
      (toolName === 'query_projects' || toolName === 'get_at_risk_projects') &&
      data.projects
    ) {
      for (const project of data.projects.slice(0, 5)) {
        sources?.push({
          type: 'project',
          id: project.id,
          name: project.name,
        });
      }
    }

    // Extract meeting sources
    if (toolName === 'get_meeting' && data.id) {
      sources?.push({
        type: 'meeting',
        id: data.id,
        name: data.title || `Meeting ${data.id}`,
      });
    }

    if (
      (toolName === 'query_meetings' || toolName === 'get_recent_meetings') &&
      data.meetings
    ) {
      for (const meeting of data.meetings.slice(0, 5)) {
        sources?.push({
          type: 'meeting',
          id: meeting.id,
          name: meeting.title,
        });
      }
    }

    // Extract task sources
    if (toolName === 'query_tasks' && data.tasks) {
      for (const task of data.tasks.slice(0, 5)) {
        sources?.push({
          type: 'task',
          id: task.id,
          name: task.title,
        });
      }
    }
  } catch {
    // Ignore parsing errors
  }
}

/**
 * Simple query execution without AI - directly executes a tool
 */
export async function executeDirectQuery(
  toolName: string,
  args: Record<string, unknown>,
  userId?: number,
): Promise<unknown> {
  // Inject userId for ownership filtering if provided
  const argsWithUser = userId ? { ...args, _userId: userId } : args;
  const result = await mcpClient.callTool(toolName, argsWithUser);

  if (result.isError) {
    throw new Error(result.content[0]?.text || 'Tool execution failed');
  }

  try {
    return JSON.parse(result.content[0]?.text || '{}');
  } catch {
    return result.content[0]?.text;
  }
}
