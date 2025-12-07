/**
 * MCP Module - React Query Hooks
 *
 * This module provides all React Query hooks for MCP integration.
 * Includes queries for AI-powered queries, tool execution, and quick actions.
 *
 * @module mcp
 */

import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import {
  sendAIQuery,
  executeTool,
  fetchTools,
  fetchResources,
  fetchServers,
  fetchAtRiskProjects,
  fetchRecentMeetings,
  fetchMeetingBrief,
  type AIQueryRequest,
  type AIQueryResponse,
  type ExecuteToolRequest,
  type MCPTool,
  type MCPResource,
  type MCPServerInfo,
  type AtRiskProject,
  type RecentMeeting,
  type MeetingBrief,
} from '../../mcp';

// ============================================================================
// AI Query Hooks
// ============================================================================

/**
 * Send an AI-powered query
 */
export function useAIQuery(): UseMutationResult<
  AIQueryResponse,
  Error,
  AIQueryRequest
> {
  return useMutation({
    mutationFn: (request: AIQueryRequest) => sendAIQuery(request),
  });
}

/**
 * Execute an MCP tool directly
 */
export function useExecuteTool(): UseMutationResult<
  { result: unknown },
  Error,
  ExecuteToolRequest
> {
  return useMutation({
    mutationFn: (request: ExecuteToolRequest) => executeTool(request),
  });
}

// ============================================================================
// Server & Tool Queries
// ============================================================================

/**
 * Fetch all available MCP tools
 */
export function useMCPTools(
  serverId?: string,
): UseQueryResult<MCPTool[], Error> {
  return useQuery({
    queryKey: queryKeys.mcp.tools(),
    queryFn: () => fetchTools(serverId),
  });
}

/**
 * Fetch all available MCP resources
 */
export function useMCPResources(
  serverId?: string,
): UseQueryResult<MCPResource[], Error> {
  return useQuery({
    queryKey: queryKeys.mcp.resources(),
    queryFn: () => fetchResources(serverId),
  });
}

/**
 * Fetch all connected MCP servers
 */
export function useMCPServers(): UseQueryResult<MCPServerInfo[], Error> {
  return useQuery({
    queryKey: queryKeys.mcp.servers(),
    queryFn: () => fetchServers(),
  });
}

// ============================================================================
// Quick Action Queries
// ============================================================================

/**
 * Fetch at-risk projects
 */
export function useAtRiskProjects(): UseQueryResult<
  { count: number; projects: AtRiskProject[] },
  Error
> {
  return useQuery({
    queryKey: queryKeys.mcp.atRiskProjects(),
    queryFn: () => fetchAtRiskProjects(),
  });
}

/**
 * Fetch recent meetings
 */
export function useRecentMeetings(
  days: number = 7,
): UseQueryResult<{ count: number; meetings: RecentMeeting[] }, Error> {
  return useQuery({
    queryKey: queryKeys.mcp.recentMeetings(days),
    queryFn: () => fetchRecentMeetings(days),
  });
}

/**
 * Fetch meeting brief for a client
 */
export function useMeetingBrief(
  clientId: number,
  options?: { enabled?: boolean },
): UseQueryResult<MeetingBrief, Error> {
  return useQuery({
    queryKey: queryKeys.mcp.meetingBrief(clientId),
    queryFn: () => fetchMeetingBrief(clientId),
    enabled: options?.enabled ?? true,
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  AIQueryRequest,
  AIQueryResponse,
  ExecuteToolRequest,
  MCPTool,
  MCPResource,
  MCPServerInfo,
  AtRiskProject,
  RecentMeeting,
  MeetingBrief,
} from '../../mcp';
