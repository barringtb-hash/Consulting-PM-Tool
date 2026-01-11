/**
 * MCP API
 *
 * API functions for MCP integration and AI-powered queries
 */

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

// ============================================================================
// TYPES
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  resources: MCPResource[];
  error?: string;
}

export interface AIQueryRequest {
  query: string;
  context?: {
    clientId?: number;
    projectId?: number;
  };
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIQueryResponse {
  response: string;
  toolCalls?: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
  sources?: Array<{
    type: 'client' | 'project' | 'meeting' | 'task';
    id: number;
    name: string;
  }>;
}

export interface ExecuteToolRequest {
  tool: string;
  arguments: Record<string, unknown>;
  serverId?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const MCP_BASE_PATH = buildApiUrl('/mcp');

/**
 * Send an AI-powered query
 */
export async function sendAIQuery(
  request: AIQueryRequest,
): Promise<AIQueryResponse> {
  const response = await fetch(
    `${MCP_BASE_PATH}/query`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(request),
    }),
  );

  return handleResponse<AIQueryResponse>(response);
}

/**
 * Execute an MCP tool directly
 */
export async function executeTool(
  request: ExecuteToolRequest,
): Promise<{ result: unknown }> {
  const response = await fetch(
    `${MCP_BASE_PATH}/execute`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(request),
    }),
  );

  return handleResponse<{ result: unknown }>(response);
}

/**
 * Get all available MCP tools
 */
export async function fetchTools(serverId?: string): Promise<MCPTool[]> {
  const params = serverId ? `?serverId=${serverId}` : '';
  const response = await fetch(
    `${MCP_BASE_PATH}/tools${params}`,
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ tools: MCPTool[] }>(response);
  return data.tools;
}

/**
 * Get all available MCP resources
 */
export async function fetchResources(
  serverId?: string,
): Promise<MCPResource[]> {
  const params = serverId ? `?serverId=${serverId}` : '';
  const response = await fetch(
    `${MCP_BASE_PATH}/resources${params}`,
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ resources: MCPResource[] }>(response);
  return data.resources;
}

/**
 * Get all connected MCP servers
 */
export async function fetchServers(): Promise<MCPServerInfo[]> {
  const response = await fetch(
    `${MCP_BASE_PATH}/servers`,
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ servers: MCPServerInfo[] }>(response);
  return data.servers;
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

export interface AtRiskProject {
  id: number;
  name: string;
  healthStatus: string;
  status: string;
  client: { id: number; name: string };
  blockedTasks: Array<{ id: number; title: string; priority: string }>;
  taskCount: number;
  milestoneCount: number;
}

export interface RecentMeeting {
  id: number;
  title: string;
  date: string;
  category: string;
  project: {
    id: number;
    name: string;
    client: { id: number; name: string };
  };
  notesSummary?: string;
  decisions?: string;
}

export interface MeetingBrief {
  client: {
    id: number;
    name: string;
    industry?: string;
    aiMaturity?: string;
    notes?: string;
  };
  contacts: Array<{
    id: number;
    name: string;
    email?: string;
    role?: string;
  }>;
  activeProjects: Array<{
    id: number;
    name: string;
    status: string;
    healthStatus: string;
    taskCount: number;
  }>;
  priorityTasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    project: string;
  }>;
  recentMeetings: Array<{
    id: number;
    title: string;
    date: string;
    keyDecisions?: string;
    openRisks?: string;
  }>;
}

/**
 * Get at-risk projects
 */
export async function fetchAtRiskProjects(): Promise<{
  count: number;
  projects: AtRiskProject[];
}> {
  const response = await fetch(
    `${MCP_BASE_PATH}/quick/at-risk`,
    buildOptions({ method: 'GET' }),
  );

  return handleResponse<{ count: number; projects: AtRiskProject[] }>(response);
}

/**
 * Get recent meetings
 */
export async function fetchRecentMeetings(
  days: number = 7,
): Promise<{ count: number; meetings: RecentMeeting[] }> {
  const response = await fetch(
    `${MCP_BASE_PATH}/quick/recent-meetings?days=${days}`,
    buildOptions({ method: 'GET' }),
  );

  return handleResponse<{ count: number; meetings: RecentMeeting[] }>(response);
}

/**
 * Get meeting brief for a client
 */
export async function fetchMeetingBrief(
  clientId: number,
): Promise<MeetingBrief> {
  const response = await fetch(
    `${MCP_BASE_PATH}/quick/meeting-brief/${clientId}`,
    buildOptions({ method: 'GET' }),
  );

  return handleResponse<MeetingBrief>(response);
}
