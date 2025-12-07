/**
 * MCP Module Types
 *
 * TypeScript types for MCP integration
 */

/**
 * MCP Server connection configuration
 */
export interface MCPServerConfig {
  /** Unique identifier for the server */
  id: string;
  /** Display name */
  name: string;
  /** Transport type */
  transport: 'stdio' | 'http';
  /** For stdio: command to run */
  command?: string;
  /** For stdio: command arguments */
  args?: string[];
  /** For http: server URL */
  url?: string;
  /** Whether this is the internal CRM server */
  isInternal?: boolean;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP Tool execution result
 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * AI Query request
 */
export interface AIQueryRequest {
  /** Natural language query */
  query: string;
  /** Optional context filters */
  context?: {
    clientId?: number;
    projectId?: number;
  };
  /** Conversation history for multi-turn */
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * AI Query response
 */
export interface AIQueryResponse {
  /** AI-generated response */
  response: string;
  /** Tools that were called */
  toolCalls?: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
  /** Sources/references used */
  sources?: Array<{
    type: 'client' | 'project' | 'meeting' | 'task';
    id: number;
    name: string;
  }>;
}

/**
 * MCP Execute tool request
 */
export interface MCPExecuteRequest {
  /** Tool name to execute */
  tool: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
  /** Optional server ID (defaults to internal) */
  serverId?: string;
}

/**
 * Connected MCP server info
 */
export interface MCPServerInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  resources: MCPResource[];
  error?: string;
}
