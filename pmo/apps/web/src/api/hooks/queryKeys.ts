/**
 * Centralized Query Keys Namespace
 *
 * This module provides a consistent, hierarchical query key pattern for all modules.
 * The pattern follows: [module, scope, ...params]
 *
 * Benefits:
 * - Consistent naming across all modules
 * - Easy invalidation at any level (module, scope, or specific item)
 * - Type-safe query key generation
 * - Clear module ownership
 */

import type { ClientFilters } from '../clients';
import type { ProjectFilters } from '../projects';
import type { DocumentFilters } from '../documents';
import type { AssetFilters } from '../assets';
import type { LeadFilters } from '../leads';
import type { MarketingContentListQuery } from '../../../../../packages/types/marketing';

// ============================================================================
// Query Keys Namespace
// ============================================================================

export const queryKeys = {
  // ---------------------------------------------------------------------------
  // Clients Module
  // ---------------------------------------------------------------------------
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters?: ClientFilters) =>
      [...queryKeys.clients.lists(), filters] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.clients.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Contacts Module
  // ---------------------------------------------------------------------------
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    byClient: (clientId?: number) =>
      [...queryKeys.contacts.all, 'client', clientId] as const,
  },

  // ---------------------------------------------------------------------------
  // Projects Module
  // ---------------------------------------------------------------------------
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: ProjectFilters) =>
      [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.projects.details(), id] as const,
    status: (id: number, rangeDays?: number) =>
      [...queryKeys.projects.detail(id), 'status', rangeDays] as const,
  },

  // ---------------------------------------------------------------------------
  // Tasks Module
  // ---------------------------------------------------------------------------
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    byProject: (projectId?: number) =>
      [...queryKeys.tasks.all, 'project', projectId] as const,
    myTasks: () => [...queryKeys.tasks.all, 'my-tasks'] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id?: number) => [...queryKeys.tasks.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Milestones Module
  // ---------------------------------------------------------------------------
  milestones: {
    all: ['milestones'] as const,
    lists: () => [...queryKeys.milestones.all, 'list'] as const,
    byProject: (projectId?: number) =>
      [...queryKeys.milestones.all, 'project', projectId] as const,
    details: () => [...queryKeys.milestones.all, 'detail'] as const,
    detail: (id?: number) => [...queryKeys.milestones.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Meetings Module
  // ---------------------------------------------------------------------------
  meetings: {
    all: ['meetings'] as const,
    lists: () => [...queryKeys.meetings.all, 'list'] as const,
    byProject: (projectId?: number) =>
      [...queryKeys.meetings.all, 'project', projectId] as const,
    details: () => [...queryKeys.meetings.all, 'detail'] as const,
    detail: (id?: number) => [...queryKeys.meetings.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Documents Module
  // ---------------------------------------------------------------------------
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters?: DocumentFilters) =>
      [...queryKeys.documents.lists(), filters] as const,
  },

  // ---------------------------------------------------------------------------
  // Assets Module
  // ---------------------------------------------------------------------------
  assets: {
    all: ['assets'] as const,
    lists: () => [...queryKeys.assets.all, 'list'] as const,
    list: (filters?: AssetFilters) =>
      [...queryKeys.assets.lists(), filters] as const,
    details: () => [...queryKeys.assets.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.assets.details(), id] as const,
    byProject: (projectId: number, includeArchived?: boolean) =>
      [...queryKeys.assets.all, 'project', projectId, includeArchived] as const,
  },

  // ---------------------------------------------------------------------------
  // Leads Module
  // ---------------------------------------------------------------------------
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (filters?: LeadFilters) =>
      [...queryKeys.leads.lists(), filters] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.leads.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Marketing Module
  // ---------------------------------------------------------------------------
  marketing: {
    all: ['marketing'] as const,
    lists: () => [...queryKeys.marketing.all, 'list'] as const,
    list: (filters?: MarketingContentListQuery) =>
      [...queryKeys.marketing.lists(), filters] as const,
    details: () => [...queryKeys.marketing.all, 'detail'] as const,
    detail: (id?: number) => [...queryKeys.marketing.details(), id] as const,
    byProject: (projectId?: number) =>
      [...queryKeys.marketing.all, 'project', projectId] as const,
  },

  // ---------------------------------------------------------------------------
  // Campaigns Module
  // ---------------------------------------------------------------------------
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...queryKeys.campaigns.all, 'list'] as const,
    list: (filters?: {
      clientId?: number;
      projectId?: number;
      status?: string;
      archived?: boolean;
    }) => [...queryKeys.campaigns.lists(), filters] as const,
    details: () => [...queryKeys.campaigns.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.campaigns.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Brand Profiles Module
  // ---------------------------------------------------------------------------
  brandProfiles: {
    all: ['brandProfiles'] as const,
    byClient: (clientId: number) =>
      [...queryKeys.brandProfiles.all, 'client', clientId] as const,
    assets: (brandProfileId: number) =>
      [...queryKeys.brandProfiles.all, 'assets', brandProfileId] as const,
  },

  // ---------------------------------------------------------------------------
  // Publishing Module
  // ---------------------------------------------------------------------------
  publishing: {
    all: ['publishing'] as const,
    connections: (clientId: number) =>
      [...queryKeys.publishing.all, 'connections', clientId] as const,
  },

  // ---------------------------------------------------------------------------
  // MCP Module
  // ---------------------------------------------------------------------------
  mcp: {
    all: ['mcp'] as const,
    tools: () => [...queryKeys.mcp.all, 'tools'] as const,
    resources: () => [...queryKeys.mcp.all, 'resources'] as const,
    servers: () => [...queryKeys.mcp.all, 'servers'] as const,
    atRiskProjects: () => [...queryKeys.mcp.all, 'at-risk'] as const,
    recentMeetings: (days?: number) =>
      [...queryKeys.mcp.all, 'recent-meetings', days] as const,
    meetingBrief: (clientId: number) =>
      [...queryKeys.mcp.all, 'meeting-brief', clientId] as const,
  },

  // ---------------------------------------------------------------------------
  // Customer Success Module
  // ---------------------------------------------------------------------------
  customerSuccess: {
    all: ['customerSuccess'] as const,
    // Health Scores
    healthScores: {
      all: () => [...queryKeys.customerSuccess.all, 'healthScores'] as const,
      list: (filters?: Record<string, unknown>) =>
        [
          ...queryKeys.customerSuccess.healthScores.all(),
          'list',
          filters,
        ] as const,
      summary: () =>
        [...queryKeys.customerSuccess.healthScores.all(), 'summary'] as const,
      client: (clientId: number, projectId?: number) =>
        [
          ...queryKeys.customerSuccess.healthScores.all(),
          'client',
          clientId,
          projectId,
        ] as const,
      history: (clientId: number, projectId?: number, days?: number) =>
        [
          ...queryKeys.customerSuccess.healthScores.all(),
          'history',
          clientId,
          projectId,
          days,
        ] as const,
    },
    // CTAs
    ctas: {
      all: () => [...queryKeys.customerSuccess.all, 'ctas'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.customerSuccess.ctas.all(), 'list', filters] as const,
      cockpit: () =>
        [...queryKeys.customerSuccess.ctas.all(), 'cockpit'] as const,
      summary: (all?: boolean) =>
        [...queryKeys.customerSuccess.ctas.all(), 'summary', all] as const,
      detail: (id: number) =>
        [...queryKeys.customerSuccess.ctas.all(), 'detail', id] as const,
    },
    // Playbooks
    playbooks: {
      all: () => [...queryKeys.customerSuccess.all, 'playbooks'] as const,
      list: (filters?: Record<string, unknown>) =>
        [
          ...queryKeys.customerSuccess.playbooks.all(),
          'list',
          filters,
        ] as const,
      detail: (id: number) =>
        [...queryKeys.customerSuccess.playbooks.all(), 'detail', id] as const,
      categories: () =>
        [...queryKeys.customerSuccess.playbooks.all(), 'categories'] as const,
      popular: (limit?: number) =>
        [
          ...queryKeys.customerSuccess.playbooks.all(),
          'popular',
          limit,
        ] as const,
    },
    // Success Plans
    successPlans: {
      all: () => [...queryKeys.customerSuccess.all, 'successPlans'] as const,
      list: (filters?: Record<string, unknown>) =>
        [
          ...queryKeys.customerSuccess.successPlans.all(),
          'list',
          filters,
        ] as const,
      detail: (id: number) =>
        [
          ...queryKeys.customerSuccess.successPlans.all(),
          'detail',
          id,
        ] as const,
      summary: (ownerId?: number) =>
        [
          ...queryKeys.customerSuccess.successPlans.all(),
          'summary',
          ownerId,
        ] as const,
    },
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type QueryKeys = typeof queryKeys;
