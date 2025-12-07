/**
 * MCP Server Service
 *
 * Internal MCP server that exposes CRM data as tools and resources.
 * This service provides the MCP protocol interface for the CRM data.
 */

import { allTools, executeTool, getTool } from './tools';
import type { MCPTool, MCPToolResult, MCPResource } from './types';

/**
 * Internal CRM MCP Server
 *
 * Provides MCP-compatible interface for CRM data operations
 */
class CRMMCPServer {
  private serverInfo = {
    name: 'crm-mcp-server',
    version: '1.0.0',
  };

  /**
   * Get server information
   */
  getServerInfo() {
    return this.serverInfo;
  }

  /**
   * List all available tools
   */
  listTools(): MCPTool[] {
    return allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPTool | undefined {
    const tool = getTool(name);
    if (!tool) return undefined;

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    };
  }

  /**
   * Execute a tool
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const result = await executeTool(name, args);
    return {
      content: result.content,
      isError: result.isError,
    };
  }

  /**
   * List available resources
   */
  listResources(): MCPResource[] {
    return [
      {
        uri: 'crm://clients',
        name: 'All Clients',
        description: 'List of all clients in the CRM',
        mimeType: 'application/json',
      },
      {
        uri: 'crm://projects',
        name: 'All Projects',
        description: 'List of all projects',
        mimeType: 'application/json',
      },
      {
        uri: 'crm://projects/at-risk',
        name: 'At-Risk Projects',
        description: 'Projects with AT_RISK or OFF_TRACK health status',
        mimeType: 'application/json',
      },
      {
        uri: 'crm://meetings/recent',
        name: 'Recent Meetings',
        description: 'Meetings from the last 7 days',
        mimeType: 'application/json',
      },
      {
        uri: 'crm://tasks/blocked',
        name: 'Blocked Tasks',
        description: 'All tasks with BLOCKED status',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Read a resource by URI
   */
  async readResource(
    uri: string,
  ): Promise<{ content: string; mimeType: string }> {
    // Parse the URI and execute appropriate queries
    if (uri === 'crm://clients') {
      const result = await executeTool('query_clients', { limit: 100 });
      return {
        content: result.content[0]?.text || '[]',
        mimeType: 'application/json',
      };
    }

    if (uri === 'crm://projects') {
      const result = await executeTool('query_projects', { limit: 100 });
      return {
        content: result.content[0]?.text || '[]',
        mimeType: 'application/json',
      };
    }

    if (uri === 'crm://projects/at-risk') {
      const result = await executeTool('get_at_risk_projects', { limit: 20 });
      return {
        content: result.content[0]?.text || '[]',
        mimeType: 'application/json',
      };
    }

    if (uri === 'crm://meetings/recent') {
      const result = await executeTool('get_recent_meetings', {
        days: 7,
        limit: 20,
      });
      return {
        content: result.content[0]?.text || '[]',
        mimeType: 'application/json',
      };
    }

    if (uri === 'crm://tasks/blocked') {
      const result = await executeTool('query_tasks', {
        status: 'BLOCKED',
        limit: 50,
      });
      return {
        content: result.content[0]?.text || '[]',
        mimeType: 'application/json',
      };
    }

    // Handle parameterized URIs
    const clientMatch = uri.match(/^crm:\/\/clients\/(\d+)$/);
    if (clientMatch) {
      const result = await executeTool('get_client', {
        clientId: parseInt(clientMatch[1], 10),
      });
      return {
        content: result.content[0]?.text || '{}',
        mimeType: 'application/json',
      };
    }

    const projectMatch = uri.match(/^crm:\/\/projects\/(\d+)$/);
    if (projectMatch) {
      const result = await executeTool('get_project', {
        projectId: parseInt(projectMatch[1], 10),
      });
      return {
        content: result.content[0]?.text || '{}',
        mimeType: 'application/json',
      };
    }

    const meetingMatch = uri.match(/^crm:\/\/meetings\/(\d+)$/);
    if (meetingMatch) {
      const result = await executeTool('get_meeting', {
        meetingId: parseInt(meetingMatch[1], 10),
      });
      return {
        content: result.content[0]?.text || '{}',
        mimeType: 'application/json',
      };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  }
}

// Singleton instance
export const crmMCPServer = new CRMMCPServer();

export default crmMCPServer;
