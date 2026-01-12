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
import type { AccountFilters } from '../accounts';
import type { OpportunityFilters } from '../opportunities';

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
  // Legacy Contacts Module (linked to Clients)
  // ---------------------------------------------------------------------------
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    byClient: (clientId?: number) =>
      [...queryKeys.contacts.all, 'client', clientId] as const,
  },

  // ---------------------------------------------------------------------------
  // CRM Contacts Module (linked to Accounts)
  // ---------------------------------------------------------------------------
  crmContacts: {
    all: ['crmContacts'] as const,
    lists: () => [...queryKeys.crmContacts.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.crmContacts.lists(), filters] as const,
    details: () => [...queryKeys.crmContacts.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.crmContacts.details(), id] as const,
    byAccount: (accountId: number) =>
      [...queryKeys.crmContacts.all, 'account', accountId] as const,
    stats: () => [...queryKeys.crmContacts.all, 'stats'] as const,
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
    members: (id: number) =>
      [...queryKeys.projects.detail(id), 'members'] as const,
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
  // Project Documents Module (Templates)
  // ---------------------------------------------------------------------------
  projectDocuments: {
    all: ['projectDocuments'] as const,
    templates: () => [...queryKeys.projectDocuments.all, 'templates'] as const,
    template: (type: string) =>
      [...queryKeys.projectDocuments.templates(), type] as const,
    byProject: (projectId: number) =>
      [...queryKeys.projectDocuments.all, 'project', projectId] as const,
    list: (projectId: number, filters?: Record<string, unknown>) =>
      [
        ...queryKeys.projectDocuments.byProject(projectId),
        'list',
        filters,
      ] as const,
    stats: (projectId: number) =>
      [...queryKeys.projectDocuments.byProject(projectId), 'stats'] as const,
    details: () => [...queryKeys.projectDocuments.all, 'detail'] as const,
    detail: (id: number) =>
      [...queryKeys.projectDocuments.details(), id] as const,
    versions: (id: number) =>
      [...queryKeys.projectDocuments.detail(id), 'versions'] as const,
    version: (id: number, version: number) =>
      [...queryKeys.projectDocuments.versions(id), version] as const,
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
  // CRM Accounts Module
  // ---------------------------------------------------------------------------
  accounts: {
    all: ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all, 'list'] as const,
    list: (filters?: AccountFilters) =>
      [...queryKeys.accounts.lists(), filters] as const,
    details: () => [...queryKeys.accounts.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.accounts.details(), id] as const,
    stats: () => [...queryKeys.accounts.all, 'stats'] as const,
    // Account Health Score
    health: (id: number) =>
      [...queryKeys.accounts.detail(id), 'health'] as const,
    healthHistory: (id: number, days?: number) =>
      [...queryKeys.accounts.health(id), 'history', days] as const,
    portfolioHealth: () =>
      [...queryKeys.accounts.all, 'portfolio', 'health'] as const,
    accountsByHealth: (params?: Record<string, unknown>) =>
      [...queryKeys.accounts.portfolioHealth(), 'accounts', params] as const,
    // Account CTAs
    ctas: (id: number) => [...queryKeys.accounts.detail(id), 'ctas'] as const,
    ctaList: (id: number, params?: Record<string, unknown>) =>
      [...queryKeys.accounts.ctas(id), 'list', params] as const,
    ctaDetail: (id: number, ctaId: number) =>
      [...queryKeys.accounts.ctas(id), ctaId] as const,
    ctaSummary: (id: number) =>
      [...queryKeys.accounts.ctas(id), 'summary'] as const,
    portfolioCTAs: (params?: Record<string, unknown>) =>
      [...queryKeys.accounts.all, 'portfolio', 'ctas', params] as const,
    ctaCockpit: () =>
      [...queryKeys.accounts.all, 'portfolio', 'ctas', 'cockpit'] as const,
    portfolioCTASummary: (all?: boolean) =>
      [...queryKeys.accounts.all, 'portfolio', 'ctas', 'summary', all] as const,
    // Account Success Plans
    successPlans: (id: number) =>
      [...queryKeys.accounts.detail(id), 'success-plans'] as const,
    successPlanList: (id: number, params?: Record<string, unknown>) =>
      [...queryKeys.accounts.successPlans(id), 'list', params] as const,
    successPlanDetail: (id: number, planId: number) =>
      [...queryKeys.accounts.successPlans(id), planId] as const,
    portfolioSuccessPlans: (params?: Record<string, unknown>) =>
      [
        ...queryKeys.accounts.all,
        'portfolio',
        'success-plans',
        params,
      ] as const,
  },

  // ---------------------------------------------------------------------------
  // CRM Playbooks Module
  // ---------------------------------------------------------------------------
  playbooks: {
    all: ['playbooks'] as const,
    lists: () => [...queryKeys.playbooks.all, 'list'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.playbooks.lists(), params] as const,
    details: () => [...queryKeys.playbooks.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.playbooks.details(), id] as const,
    categories: () => [...queryKeys.playbooks.all, 'categories'] as const,
    popular: (limit?: number) =>
      [...queryKeys.playbooks.all, 'popular', limit] as const,
  },

  // ---------------------------------------------------------------------------
  // CRM Opportunities Module
  // ---------------------------------------------------------------------------
  opportunities: {
    all: ['opportunities'] as const,
    lists: () => [...queryKeys.opportunities.all, 'list'] as const,
    list: (filters?: OpportunityFilters) =>
      [...queryKeys.opportunities.lists(), filters] as const,
    details: () => [...queryKeys.opportunities.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.opportunities.details(), id] as const,
    pipelineStats: (pipelineId?: number) =>
      [...queryKeys.opportunities.all, 'pipeline-stats', pipelineId] as const,
    pipelineStages: (pipelineId?: number) =>
      [...queryKeys.opportunities.all, 'stages', pipelineId] as const,
    closingSoon: (days?: number) =>
      [...queryKeys.opportunities.all, 'closing-soon', days] as const,
    byAccount: (accountId: number) =>
      [...queryKeys.opportunities.all, 'account', accountId] as const,
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

  // ---------------------------------------------------------------------------
  // System Admin - Tenant Management
  // ---------------------------------------------------------------------------
  tenantAdmin: {
    all: ['tenantAdmin'] as const,
    lists: () => [...queryKeys.tenantAdmin.all, 'list'] as const,
    list: (filters?: {
      page?: number;
      limit?: number;
      search?: string;
      plan?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    }) => [...queryKeys.tenantAdmin.lists(), filters] as const,
    details: () => [...queryKeys.tenantAdmin.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tenantAdmin.details(), id] as const,
    stats: () => [...queryKeys.tenantAdmin.all, 'stats'] as const,
    users: (tenantId: string) =>
      [...queryKeys.tenantAdmin.all, 'users', tenantId] as const,
  },

  // ---------------------------------------------------------------------------
  // Lead ML Module
  // ---------------------------------------------------------------------------
  leadML: {
    all: ['leadML'] as const,
    // Predictions
    predictions: {
      all: () => [...queryKeys.leadML.all, 'predictions'] as const,
      lead: (leadId: number, type?: string) =>
        [...queryKeys.leadML.predictions.all(), 'lead', leadId, type] as const,
      bulk: (configId: number) =>
        [...queryKeys.leadML.predictions.all(), 'bulk', configId] as const,
    },
    // Features
    features: {
      all: () => [...queryKeys.leadML.all, 'features'] as const,
      lead: (leadId: number) =>
        [...queryKeys.leadML.features.all(), 'lead', leadId] as const,
      importance: (configId: number) =>
        [...queryKeys.leadML.features.all(), 'importance', configId] as const,
    },
    // Rankings
    rankings: {
      all: () => [...queryKeys.leadML.all, 'rankings'] as const,
      ranked: (configId: number, options?: Record<string, unknown>) =>
        [
          ...queryKeys.leadML.rankings.all(),
          'ranked',
          configId,
          options,
        ] as const,
      top: (configId: number, n?: number) =>
        [...queryKeys.leadML.rankings.all(), 'top', configId, n] as const,
      byTier: (configId: number, tier: string) =>
        [...queryKeys.leadML.rankings.all(), 'tier', configId, tier] as const,
    },
    // Accuracy & Performance
    accuracy: {
      all: () => [...queryKeys.leadML.all, 'accuracy'] as const,
      config: (configId: number, options?: Record<string, unknown>) =>
        [...queryKeys.leadML.accuracy.all(), configId, options] as const,
    },
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type QueryKeys = typeof queryKeys;
