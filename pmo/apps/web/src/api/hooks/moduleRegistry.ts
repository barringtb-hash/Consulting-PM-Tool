/**
 * Module Registry - Module Awareness System
 *
 * This module provides a centralized registry for all React Query hook modules.
 * It enables:
 * - Formal module boundaries and dependencies
 * - Cross-module cache invalidation rules
 * - Module metadata for discovery and documentation
 * - Type-safe module composition
 *
 * @module moduleRegistry
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Module dependency type - defines how one module depends on another
 */
export type ModuleDependencyType =
  | 'parent' // Changes to parent invalidate this module's cache
  | 'child' // Changes to this module should NOT invalidate parent
  | 'sibling'; // Bidirectional relationship for related modules

/**
 * Module dependency configuration
 */
export interface ModuleDependency {
  /** The module this module depends on */
  module: ModuleName;
  /** Type of dependency relationship */
  type: ModuleDependencyType;
  /** Description of why this dependency exists */
  reason: string;
}

/**
 * Invalidation rule - defines when to invalidate related module caches
 */
export interface InvalidationRule {
  /** Source module that triggers the invalidation */
  source: ModuleName;
  /** Target module(s) to invalidate */
  targets: ModuleName[];
  /** When to trigger: on any mutation or specific operations */
  trigger: 'create' | 'update' | 'delete' | 'archive' | 'all';
  /** Optional: specific entity relationship (e.g., 'byProject', 'byClient') */
  relationship?: string;
}

/**
 * Module metadata configuration
 */
export interface ModuleConfig {
  /** Unique module name */
  name: ModuleName;
  /** Human-readable description */
  description: string;
  /** Query key prefix owned by this module */
  queryKeyPrefix: string;
  /** Modules this module depends on */
  dependencies: ModuleDependency[];
  /** Public hooks exported by this module */
  publicHooks: string[];
  /** Whether this module is enabled (for feature flagging) */
  enabled: boolean;
}

/**
 * All available module names
 */
export type ModuleName =
  | 'clients'
  | 'contacts'
  | 'projects'
  | 'tasks'
  | 'milestones'
  | 'meetings'
  | 'documents'
  | 'assets'
  | 'leads'
  | 'marketing'
  | 'campaigns'
  | 'brandProfiles'
  | 'publishing';

// ============================================================================
// Module Configurations
// ============================================================================

/**
 * Module configuration definitions for all 13 domain modules
 */
export const moduleConfigs: Record<ModuleName, ModuleConfig> = {
  // ---------------------------------------------------------------------------
  // Core CRM Modules
  // ---------------------------------------------------------------------------
  clients: {
    name: 'clients',
    description:
      'Client management - companies being served by the consultancy',
    queryKeyPrefix: 'clients',
    dependencies: [],
    publicHooks: [
      'useClients',
      'useClient',
      'useCreateClient',
      'useUpdateClient',
      'useArchiveClient',
      'useDeleteClient',
    ],
    enabled: true,
  },

  contacts: {
    name: 'contacts',
    description: 'Contact management - individuals at client companies',
    queryKeyPrefix: 'contacts',
    dependencies: [
      {
        module: 'clients',
        type: 'parent',
        reason: 'Contacts belong to clients',
      },
    ],
    publicHooks: [
      'useContacts',
      'useCreateContact',
      'useUpdateContact',
      'useArchiveContact',
      'useDeleteContact',
    ],
    enabled: true,
  },

  leads: {
    name: 'leads',
    description: 'Lead management - potential clients in the sales pipeline',
    queryKeyPrefix: 'leads',
    dependencies: [
      {
        module: 'clients',
        type: 'sibling',
        reason: 'Leads can be converted to clients',
      },
    ],
    publicHooks: [
      'useLeads',
      'useLead',
      'useCreateLead',
      'useUpdateLead',
      'useConvertLead',
      'useDeleteLead',
    ],
    enabled: true,
  },

  // ---------------------------------------------------------------------------
  // Project Management Modules
  // ---------------------------------------------------------------------------
  projects: {
    name: 'projects',
    description: 'Project management - client engagements and work',
    queryKeyPrefix: 'projects',
    dependencies: [
      {
        module: 'clients',
        type: 'parent',
        reason: 'Projects belong to clients',
      },
    ],
    publicHooks: [
      'useProjects',
      'useProject',
      'useProjectStatus',
      'useCreateProject',
      'useUpdateProject',
      'useDeleteProject',
      'useUpdateProjectHealthStatus',
      'useGenerateStatusSummary',
    ],
    enabled: true,
  },

  tasks: {
    name: 'tasks',
    description: 'Task management - work items within projects',
    queryKeyPrefix: 'tasks',
    dependencies: [
      {
        module: 'projects',
        type: 'parent',
        reason: 'Tasks belong to projects',
      },
      {
        module: 'milestones',
        type: 'sibling',
        reason: 'Tasks can be linked to milestones',
      },
    ],
    publicHooks: [
      'useProjectTasks',
      'useMyTasks',
      'useCreateTask',
      'useUpdateTask',
      'useMoveTask',
      'useDeleteTask',
    ],
    enabled: true,
  },

  milestones: {
    name: 'milestones',
    description: 'Milestone management - project checkpoints and deliverables',
    queryKeyPrefix: 'milestones',
    dependencies: [
      {
        module: 'projects',
        type: 'parent',
        reason: 'Milestones belong to projects',
      },
    ],
    publicHooks: [
      'useProjectMilestones',
      'useMilestone',
      'useCreateMilestone',
      'useUpdateMilestone',
      'useDeleteMilestone',
    ],
    enabled: true,
  },

  meetings: {
    name: 'meetings',
    description: 'Meeting management - notes, decisions, and action items',
    queryKeyPrefix: 'meetings',
    dependencies: [
      {
        module: 'projects',
        type: 'parent',
        reason: 'Meetings belong to projects',
      },
      {
        module: 'tasks',
        type: 'sibling',
        reason: 'Tasks can be created from meeting notes',
      },
    ],
    publicHooks: [
      'useProjectMeetings',
      'useMeeting',
      'useCreateMeeting',
      'useUpdateMeeting',
      'useDeleteMeeting',
      'useCreateTaskFromSelection',
    ],
    enabled: true,
  },

  // ---------------------------------------------------------------------------
  // Asset Management Modules
  // ---------------------------------------------------------------------------
  documents: {
    name: 'documents',
    description: 'Document management - generated and uploaded documents',
    queryKeyPrefix: 'documents',
    dependencies: [
      {
        module: 'projects',
        type: 'parent',
        reason: 'Documents belong to projects',
      },
    ],
    publicHooks: ['useDocuments', 'useGenerateDocument', 'useDeleteDocument'],
    enabled: true,
  },

  assets: {
    name: 'assets',
    description: 'AI asset management - prompts, workflows, datasets',
    queryKeyPrefix: 'assets',
    dependencies: [
      {
        module: 'projects',
        type: 'sibling',
        reason: 'Assets can be linked to projects',
      },
    ],
    publicHooks: [
      'useAssets',
      'useAsset',
      'useProjectAssets',
      'useCreateAsset',
      'useUpdateAsset',
      'useArchiveAsset',
      'useLinkAssetToProject',
      'useUnlinkAssetFromProject',
    ],
    enabled: true,
  },

  // ---------------------------------------------------------------------------
  // Marketing Modules
  // ---------------------------------------------------------------------------
  marketing: {
    name: 'marketing',
    description: 'Marketing content management - AI-generated content',
    queryKeyPrefix: 'marketing',
    dependencies: [
      {
        module: 'projects',
        type: 'parent',
        reason: 'Marketing content can belong to projects',
      },
      {
        module: 'campaigns',
        type: 'sibling',
        reason: 'Marketing content can be part of campaigns',
      },
      {
        module: 'brandProfiles',
        type: 'sibling',
        reason: 'Marketing content uses brand guidelines',
      },
    ],
    publicHooks: [
      'useMarketingContents',
      'useMarketingContent',
      'useProjectMarketingContents',
      'useCreateMarketingContent',
      'useUpdateMarketingContent',
      'useArchiveMarketingContent',
      'useGenerateMarketingContent',
      'useGenerateMarketingContentFromProject',
      'useGenerateMarketingContentFromMeeting',
      'useRepurposeMarketingContent',
      'useLintMarketingContent',
    ],
    enabled: true,
  },

  campaigns: {
    name: 'campaigns',
    description: 'Campaign management - group marketing content into campaigns',
    queryKeyPrefix: 'campaigns',
    dependencies: [
      {
        module: 'clients',
        type: 'parent',
        reason: 'Campaigns belong to clients',
      },
      {
        module: 'projects',
        type: 'sibling',
        reason: 'Campaigns can be linked to projects',
      },
      {
        module: 'marketing',
        type: 'child',
        reason: 'Campaigns contain marketing content',
      },
    ],
    publicHooks: [
      'useCampaigns',
      'useCampaign',
      'useCreateCampaign',
      'useUpdateCampaign',
      'useArchiveCampaign',
    ],
    enabled: true,
  },

  brandProfiles: {
    name: 'brandProfiles',
    description: 'Brand profile management - client brand guidelines',
    queryKeyPrefix: 'brandProfiles',
    dependencies: [
      {
        module: 'clients',
        type: 'parent',
        reason: 'Brand profiles belong to clients (one per client)',
      },
    ],
    publicHooks: [
      'useBrandProfile',
      'useBrandAssets',
      'useCreateBrandProfile',
      'useUpdateBrandProfile',
      'useCreateBrandAsset',
      'useUpdateBrandAsset',
      'useArchiveBrandAsset',
    ],
    enabled: true,
  },

  publishing: {
    name: 'publishing',
    description: 'Publishing connections - social media platform integrations',
    queryKeyPrefix: 'publishing',
    dependencies: [
      {
        module: 'clients',
        type: 'parent',
        reason: 'Publishing connections belong to clients',
      },
      {
        module: 'marketing',
        type: 'sibling',
        reason: 'Publishing is used to publish marketing content',
      },
    ],
    publicHooks: [
      'usePublishingConnections',
      'useCreatePublishingConnection',
      'useUpdatePublishingConnection',
      'useDeletePublishingConnection',
      'usePublishContent',
    ],
    enabled: true,
  },
};

// ============================================================================
// Cross-Module Invalidation Rules
// ============================================================================

/**
 * Declarative cross-module cache invalidation rules
 * These rules define how changes in one module affect other modules' caches
 */
export const invalidationRules: InvalidationRule[] = [
  // Client deletions cascade to all client-owned entities
  {
    source: 'clients',
    targets: [
      'contacts',
      'projects',
      'campaigns',
      'brandProfiles',
      'publishing',
    ],
    trigger: 'delete',
    relationship: 'byClient',
  },

  // Project deletions cascade to project-owned entities
  {
    source: 'projects',
    targets: ['tasks', 'milestones', 'meetings', 'documents', 'marketing'],
    trigger: 'delete',
    relationship: 'byProject',
  },

  // Lead conversion creates a new client
  {
    source: 'leads',
    targets: ['clients'],
    trigger: 'update', // Conversion is an update operation
  },

  // Campaign changes should refresh marketing content lists
  {
    source: 'campaigns',
    targets: ['marketing'],
    trigger: 'all',
  },

  // Marketing content changes may affect campaign summaries
  {
    source: 'marketing',
    targets: ['campaigns'],
    trigger: 'all',
  },

  // Brand profile changes may affect marketing content generation
  {
    source: 'brandProfiles',
    targets: ['marketing'],
    trigger: 'update',
  },

  // Meeting task creation affects tasks module
  {
    source: 'meetings',
    targets: ['tasks'],
    trigger: 'create',
  },
];

// ============================================================================
// Module Registry Class
// ============================================================================

/**
 * Module Registry - manages module metadata and cross-module operations
 */
class ModuleRegistry {
  private modules: Map<ModuleName, ModuleConfig> = new Map();
  private rules: InvalidationRule[] = [];

  constructor() {
    // Register all modules
    Object.values(moduleConfigs).forEach((config) => {
      this.modules.set(config.name, config);
    });
    this.rules = invalidationRules;
  }

  /**
   * Get a module configuration by name
   */
  getModule(name: ModuleName): ModuleConfig | undefined {
    return this.modules.get(name);
  }

  /**
   * Get all registered modules
   */
  getAllModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get enabled modules only
   */
  getEnabledModules(): ModuleConfig[] {
    return this.getAllModules().filter((m) => m.enabled);
  }

  /**
   * Check if a module is enabled
   */
  isModuleEnabled(name: ModuleName): boolean {
    return this.modules.get(name)?.enabled ?? false;
  }

  /**
   * Get modules that depend on a given module
   */
  getDependentModules(name: ModuleName): ModuleConfig[] {
    return this.getAllModules().filter((m) =>
      m.dependencies.some((d) => d.module === name),
    );
  }

  /**
   * Get a module's parent modules (modules it depends on with 'parent' type)
   */
  getParentModules(name: ModuleName): ModuleName[] {
    const config = this.modules.get(name);
    if (!config) return [];
    return config.dependencies
      .filter((d) => d.type === 'parent')
      .map((d) => d.module);
  }

  /**
   * Get invalidation rules that apply when a source module changes
   */
  getInvalidationRules(
    source: ModuleName,
    trigger?: InvalidationRule['trigger'],
  ): InvalidationRule[] {
    return this.rules.filter(
      (r) =>
        r.source === source && (trigger === undefined || r.trigger === trigger),
    );
  }

  /**
   * Get all target modules that should be invalidated when source changes
   */
  getInvalidationTargets(
    source: ModuleName,
    trigger?: InvalidationRule['trigger'],
  ): ModuleName[] {
    const rules = this.getInvalidationRules(source, trigger);
    const targets = new Set<ModuleName>();
    rules.forEach((r) => r.targets.forEach((t) => targets.add(t)));
    return Array.from(targets);
  }
}

// Export singleton instance
export const moduleRegistry = new ModuleRegistry();

// ============================================================================
// Query Key Utilities
// ============================================================================

/**
 * Get the root query key for a module
 */
export function getModuleQueryKey(moduleName: ModuleName): QueryKey {
  const keyMap: Record<ModuleName, QueryKey> = {
    clients: queryKeys.clients.all,
    contacts: queryKeys.contacts.all,
    projects: queryKeys.projects.all,
    tasks: queryKeys.tasks.all,
    milestones: queryKeys.milestones.all,
    meetings: queryKeys.meetings.all,
    documents: queryKeys.documents.all,
    assets: queryKeys.assets.all,
    leads: queryKeys.leads.all,
    marketing: queryKeys.marketing.all,
    campaigns: queryKeys.campaigns.all,
    brandProfiles: queryKeys.brandProfiles.all,
    publishing: queryKeys.publishing.all,
  };
  return keyMap[moduleName];
}

/**
 * Get entity-scoped query keys for cross-module invalidation
 */
export function getEntityScopedQueryKey(
  moduleName: ModuleName,
  relationship: string,
  entityId: number,
): QueryKey | null {
  // Map relationship names to query key functions
  if (relationship === 'byClient') {
    switch (moduleName) {
      case 'contacts':
        return queryKeys.contacts.byClient(entityId);
      case 'brandProfiles':
        return queryKeys.brandProfiles.byClient(entityId);
      case 'publishing':
        return queryKeys.publishing.connections(entityId);
      default:
        return null;
    }
  }

  if (relationship === 'byProject') {
    switch (moduleName) {
      case 'tasks':
        return queryKeys.tasks.byProject(entityId);
      case 'milestones':
        return queryKeys.milestones.byProject(entityId);
      case 'meetings':
        return queryKeys.meetings.byProject(entityId);
      case 'marketing':
        return queryKeys.marketing.byProject(entityId);
      default:
        return null;
    }
  }

  return null;
}

// ============================================================================
// Cross-Module Invalidation Utilities
// ============================================================================

/**
 * Options for cross-module invalidation
 */
export interface CrossModuleInvalidationOptions {
  /** The module that triggered the change */
  sourceModule: ModuleName;
  /** The type of operation that triggered the change */
  trigger: InvalidationRule['trigger'];
  /** Optional entity ID for scoped invalidation */
  entityId?: number;
  /** Optional: only invalidate specific target modules */
  targetModules?: ModuleName[];
}

/**
 * Invalidate related module caches based on cross-module rules
 *
 * @param queryClient - React Query client instance
 * @param options - Invalidation options
 *
 * @example
 * ```typescript
 * // When deleting a project, invalidate all child module caches
 * invalidateRelatedModules(queryClient, {
 *   sourceModule: 'projects',
 *   trigger: 'delete',
 *   entityId: projectId,
 * });
 * ```
 */
export function invalidateRelatedModules(
  queryClient: QueryClient,
  options: CrossModuleInvalidationOptions,
): void {
  const { sourceModule, trigger, entityId, targetModules } = options;

  // Get applicable rules
  const rules = moduleRegistry.getInvalidationRules(sourceModule, trigger);

  rules.forEach((rule) => {
    rule.targets.forEach((target) => {
      // Skip if targetModules specified and this target isn't in the list
      if (targetModules && !targetModules.includes(target)) {
        return;
      }

      // Check if module is enabled
      if (!moduleRegistry.isModuleEnabled(target)) {
        return;
      }

      // Determine the query key to invalidate
      let queryKey: QueryKey;

      if (entityId && rule.relationship) {
        // Try to get entity-scoped query key
        const scopedKey = getEntityScopedQueryKey(
          target,
          rule.relationship,
          entityId,
        );
        queryKey = scopedKey || getModuleQueryKey(target);
      } else {
        // Invalidate entire module
        queryKey = getModuleQueryKey(target);
      }

      queryClient.invalidateQueries({ queryKey });
    });
  });
}

/**
 * Create a mutation onSuccess handler that includes cross-module invalidation
 *
 * @param sourceModule - The module the mutation belongs to
 * @param trigger - The type of operation
 * @param getEntityId - Optional function to extract entity ID from mutation result
 *
 * @example
 * ```typescript
 * const mutation = useMutation({
 *   mutationFn: deleteProject,
 *   onSuccess: createCrossModuleInvalidationHandler(
 *     queryClient,
 *     'projects',
 *     'delete',
 *     (_, projectId) => projectId,
 *   ),
 * });
 * ```
 */
export function createCrossModuleInvalidationHandler<TData, TVariables>(
  queryClient: QueryClient,
  sourceModule: ModuleName,
  trigger: InvalidationRule['trigger'],
  getEntityId?: (data: TData, variables: TVariables) => number | undefined,
): (data: TData, variables: TVariables) => void {
  return (data: TData, variables: TVariables) => {
    const entityId = getEntityId?.(data, variables);
    invalidateRelatedModules(queryClient, {
      sourceModule,
      trigger,
      entityId,
    });
  };
}

// ============================================================================
// Module Validation Utilities
// ============================================================================

/**
 * Validate that a hook is being called from an enabled module
 * Useful for feature-flagged modules
 */
export function assertModuleEnabled(moduleName: ModuleName): void {
  if (!moduleRegistry.isModuleEnabled(moduleName)) {
    throw new Error(
      `Module "${moduleName}" is not enabled. Cannot use hooks from disabled modules.`,
    );
  }
}

/**
 * Check for circular dependencies in module configuration (development utility)
 */
export function validateModuleDependencies(): string[] {
  const errors: string[] = [];
  const visited = new Set<ModuleName>();
  const recursionStack = new Set<ModuleName>();

  function detectCycle(moduleName: ModuleName, path: ModuleName[]): boolean {
    if (recursionStack.has(moduleName)) {
      errors.push(
        `Circular dependency detected: ${[...path, moduleName].join(' -> ')}`,
      );
      return true;
    }

    if (visited.has(moduleName)) {
      return false;
    }

    visited.add(moduleName);
    recursionStack.add(moduleName);

    const config = moduleRegistry.getModule(moduleName);
    if (config) {
      for (const dep of config.dependencies) {
        if (dep.type === 'parent') {
          detectCycle(dep.module, [...path, moduleName]);
        }
      }
    }

    recursionStack.delete(moduleName);
    return false;
  }

  moduleRegistry.getAllModules().forEach((m) => {
    detectCycle(m.name, []);
  });

  return errors;
}

// Types are exported inline with their definitions above:
// - ModuleDependencyType
// - ModuleDependency
// - InvalidationRule
// - ModuleConfig
// - ModuleName
// - CrossModuleInvalidationOptions
