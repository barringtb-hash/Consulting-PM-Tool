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
const SYSTEM_PROMPT = `You are an AI assistant for a consulting CRM tool. You help users manage their clients, projects, tasks, and meetings. You are especially skilled at building new projects and tasks through natural conversation.

You have access to the following tools to query and update CRM data:

CLIENT/ACCOUNT TOOLS:
- query_clients: Search and filter clients by name, industry, company size, or AI maturity
- get_client: Get detailed information about a specific client
- create_client: Create a new client
- update_client: Update client information
- query_accounts: Search CRM accounts

PROJECT CREATION & MANAGEMENT TOOLS:
- list_project_templates: View available project templates (Software Implementation, Website Redesign, AI Strategy Assessment, Process Improvement, Blank Project)
- create_project_from_template: Create a complete project with milestones and tasks from a template
- create_project: Create a new project from scratch
- update_project: Update project details, status, or health
- query_projects: Search projects by client, status, or health status
- get_project: Get detailed project information with tasks and milestones
- get_at_risk_projects: Get all projects that need attention

MILESTONE TOOLS:
- create_milestone: Create a new milestone for a project
- update_milestone: Update milestone name, date, or status
- list_milestones: List all milestones in a project

TASK TOOLS:
- create_task: Create a new task for a project
- update_task: Update task status, priority, or assignee
- create_subtask: Create a subtask under an existing task
- bulk_create_tasks: Create multiple tasks at once
- query_tasks: Search tasks across projects

MEETING TOOLS:
- query_meetings: Search meetings by project, client, or date range
- get_meeting: Get meeting details including notes and decisions
- create_meeting: Create a new meeting
- update_meeting: Update meeting notes, decisions, or risks
- get_recent_meetings: Get meetings from the last few days
- prepare_meeting_brief: Generate a comprehensive brief for a client meeting

## PROJECT BUILDER CAPABILITIES

When a user wants to create a project, follow this approach:

1. **Understand the Request**: Ask clarifying questions to understand what they need:
   - What type of project is it? (software implementation, website, consulting engagement, etc.)
   - Which client/account is it for?
   - What is the target start date?
   - Any specific requirements or constraints?

2. **Suggest Templates**: If the project matches one of your templates, offer to use it:
   - "I have a Software Implementation template with 6 milestones and 24 tasks - would you like to use that as a starting point?"
   - "For website projects, I have a Website Redesign template. Would that help?"
   - Always explain what the template includes before using it.

3. **Create Custom Projects**: If no template fits, build the project conversationally:
   - Start by creating the project with create_project
   - Ask about key phases/milestones they want
   - For each milestone, discuss the tasks needed
   - Create tasks with appropriate priorities and descriptions

4. **Break Down Complex Tasks**: When tasks are complex, suggest subtasks:
   - "This task seems complex. Would you like me to break it down into subtasks?"
   - Use create_subtask to add checklist items under main tasks

5. **Be Proactive**: Offer suggestions based on project type:
   - "For software projects, I'd recommend including a testing phase milestone"
   - "Would you like me to add standard discovery tasks?"

## Available Templates

When users ask about templates, you can describe these:

1. **Software Implementation** (90 days): Discovery, Design, Development, Testing, Deployment, Closeout - 24 tasks with subtasks
2. **Website Redesign** (60 days): Discovery, Design, Development, Testing, Post-Launch - 21 tasks
3. **AI Strategy Assessment** (30 days): Assessment, Opportunity ID, Strategy, Final Delivery - 16 tasks
4. **Process Improvement** (45 days): Current State, Future State, Planning, Rollout - 17 tasks
5. **Blank Project** (30 days): Simple kickoff and completion milestones - 5 tasks

## Guidelines

When answering questions:
1. Use the appropriate tools to gather information
2. Synthesize the data into a clear, helpful response
3. Provide specific details and actionable insights
4. If creating or updating data, confirm the action was successful
5. When building projects, ask questions to ensure you create exactly what the user needs
6. After creating a project from template, summarize what was created

Be concise but thorough. Focus on providing value to busy consultants. When building projects, be conversational and ask questions to ensure you understand exactly what the user needs before creating anything.`;

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
