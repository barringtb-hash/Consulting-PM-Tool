/**
 * MCP Client Service
 *
 * Manages connections to MCP servers (internal and external).
 * Provides a unified interface for tool discovery and execution.
 */

import { crmMCPServer } from './mcp-server.service';
import type {
  MCPServerConfig,
  MCPServerInfo,
  MCPTool,
  MCPToolResult,
  MCPResource,
} from './types';

/**
 * MCP Client Manager
 *
 * Manages connections to multiple MCP servers and provides
 * a unified interface for tool execution.
 */
class MCPClientManager {
  private servers: Map<string, MCPServerConfig> = new Map();
  private connected: Set<string> = new Set();

  constructor() {
    // Register the internal CRM server by default
    this.registerServer({
      id: 'internal-crm',
      name: 'CRM MCP Server',
      transport: 'stdio',
      isInternal: true,
    });
    this.connected.add('internal-crm');
  }

  /**
   * Register an MCP server configuration
   */
  registerServer(config: MCPServerConfig): void {
    this.servers.set(config.id, config);
  }

  /**
   * Connect to an MCP server
   *
   * For the internal CRM server, this is a no-op.
   * For external servers, this would establish the connection.
   */
  async connect(serverId: string): Promise<void> {
    const config = this.servers.get(serverId);
    if (!config) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (config.isInternal) {
      // Internal server is always connected
      this.connected.add(serverId);
      return;
    }

    // For external servers, we would establish the connection here
    // using the MCP SDK. For now, just mark as connected.
    // TODO: Implement external server connections
    this.connected.add(serverId);
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const config = this.servers.get(serverId);
    if (!config) return;

    if (config.isInternal) {
      // Can't disconnect internal server
      return;
    }

    this.connected.delete(serverId);
  }

  /**
   * Get all registered servers with their status
   */
  async getServers(): Promise<MCPServerInfo[]> {
    const result: MCPServerInfo[] = [];

    for (const [id, config] of this.servers) {
      const isConnected = this.connected.has(id);

      if (config.isInternal) {
        result.push({
          id,
          name: config.name,
          status: 'connected',
          tools: crmMCPServer.listTools(),
          resources: crmMCPServer.listResources(),
        });
      } else {
        result.push({
          id,
          name: config.name,
          status: isConnected ? 'connected' : 'disconnected',
          tools: [],
          resources: [],
        });
      }
    }

    return result;
  }

  /**
   * List all available tools across all connected servers
   */
  async listTools(serverId?: string): Promise<MCPTool[]> {
    if (serverId) {
      const config = this.servers.get(serverId);
      if (!config) {
        throw new Error(`Server not found: ${serverId}`);
      }

      if (config.isInternal) {
        return crmMCPServer.listTools();
      }

      // For external servers, we would query the server
      return [];
    }

    // Return tools from all connected servers
    const allTools: MCPTool[] = [];

    for (const [id, config] of this.servers) {
      if (!this.connected.has(id)) continue;

      if (config.isInternal) {
        allTools.push(...crmMCPServer.listTools());
      }
      // TODO: Add tools from external servers
    }

    return allTools;
  }

  /**
   * List all available resources across all connected servers
   */
  async listResources(serverId?: string): Promise<MCPResource[]> {
    if (serverId) {
      const config = this.servers.get(serverId);
      if (!config) {
        throw new Error(`Server not found: ${serverId}`);
      }

      if (config.isInternal) {
        return crmMCPServer.listResources();
      }

      return [];
    }

    // Return resources from all connected servers
    const allResources: MCPResource[] = [];

    for (const [id, config] of this.servers) {
      if (!this.connected.has(id)) continue;

      if (config.isInternal) {
        allResources.push(...crmMCPServer.listResources());
      }
    }

    return allResources;
  }

  /**
   * Execute a tool
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    serverId?: string,
  ): Promise<MCPToolResult> {
    // Default to internal server
    const targetServerId = serverId || 'internal-crm';
    const config = this.servers.get(targetServerId);

    if (!config) {
      throw new Error(`Server not found: ${targetServerId}`);
    }

    if (!this.connected.has(targetServerId)) {
      throw new Error(`Server not connected: ${targetServerId}`);
    }

    if (config.isInternal) {
      return crmMCPServer.callTool(toolName, args);
    }

    // For external servers, we would call the server
    throw new Error('External server tool execution not yet implemented');
  }

  /**
   * Read a resource
   */
  async readResource(
    uri: string,
    serverId?: string,
  ): Promise<{ content: string; mimeType: string }> {
    const targetServerId = serverId || 'internal-crm';
    const config = this.servers.get(targetServerId);

    if (!config) {
      throw new Error(`Server not found: ${targetServerId}`);
    }

    if (!this.connected.has(targetServerId)) {
      throw new Error(`Server not connected: ${targetServerId}`);
    }

    if (config.isInternal) {
      return crmMCPServer.readResource(uri);
    }

    throw new Error('External server resource reading not yet implemented');
  }

  /**
   * Find tool across all servers
   */
  findTool(toolName: string): { serverId: string; tool: MCPTool } | undefined {
    for (const [id, config] of this.servers) {
      if (!this.connected.has(id)) continue;

      if (config.isInternal) {
        const tool = crmMCPServer.getTool(toolName);
        if (tool) {
          return { serverId: id, tool };
        }
      }
    }

    return undefined;
  }
}

// Singleton instance
export const mcpClient = new MCPClientManager();

export default mcpClient;
