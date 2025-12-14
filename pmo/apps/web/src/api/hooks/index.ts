/**
 * React Query Hooks - Module-Aware Barrel Export
 *
 * This file re-exports all React Query hooks from their respective modules.
 * Import hooks from this file for convenience, or import directly from
 * the module folder for more explicit imports.
 *
 * Example usage:
 *   import { useClients, useCreateClient } from '@/api/hooks';
 *   // or
 *   import { useClients, useCreateClient } from '@/api/hooks/clients';
 *
 * For module awareness features:
 *   import { moduleRegistry, invalidateRelatedModules } from '@/api/hooks';
 */

// ============================================================================
// Query Keys
// ============================================================================

export { queryKeys } from './queryKeys';
export type { QueryKeys } from './queryKeys';

// ============================================================================
// Module Registry - Module Awareness System
// ============================================================================

export {
  // Module registry singleton
  moduleRegistry,
  // Module configurations
  moduleConfigs,
  // Invalidation rules
  invalidationRules,
  // Query key utilities
  getModuleQueryKey,
  getEntityScopedQueryKey,
  // Cross-module invalidation utilities
  invalidateRelatedModules,
  createCrossModuleInvalidationHandler,
  // Validation utilities
  assertModuleEnabled,
  validateModuleDependencies,
} from './moduleRegistry';

export type {
  ModuleName,
  ModuleConfig,
  ModuleDependency,
  ModuleDependencyType,
  InvalidationRule,
  CrossModuleInvalidationOptions,
} from './moduleRegistry';

// ============================================================================
// Clients Module
// ============================================================================

export {
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
  useArchiveClient,
  useDeleteClient,
} from './clients';
export type { Client, ClientFilters, ClientPayload } from './clients';

// ============================================================================
// Contacts Module
// ============================================================================

export {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useArchiveContact,
  useDeleteContact,
} from './contacts';
export type { Contact, ContactFilters, ContactPayload } from './contacts';

// ============================================================================
// Projects Module
// ============================================================================

export {
  useProjects,
  useProject,
  useProjectStatus,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useUpdateProjectHealthStatus,
  useGenerateStatusSummary,
} from './projects';
export type {
  Project,
  ProjectFilters,
  ProjectPayload,
  ProjectStatusSnapshot,
  StatusSummaryRequest,
  StatusSummaryResponse,
  UpdateHealthStatusPayload,
} from './projects';

// ============================================================================
// Tasks Module
// ============================================================================

export {
  useProjectTasks,
  useMyTasks,
  useCreateTask,
  useUpdateTask,
  useMoveTask,
  useDeleteTask,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from './tasks';
export type {
  Task,
  TaskMovePayload,
  TaskPayload,
  TaskUpdatePayload,
  TaskWithProject,
} from './tasks';

// ============================================================================
// Milestones Module
// ============================================================================

export {
  useProjectMilestones,
  useMilestone,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  MILESTONE_STATUSES,
} from './milestones';
export type {
  Milestone,
  MilestonePayload,
  MilestoneUpdatePayload,
} from './milestones';

// ============================================================================
// Meetings Module
// ============================================================================

export {
  useProjectMeetings,
  useMeeting,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useCreateTaskFromSelection,
} from './meetings';
export type {
  CreateTaskFromSelectionPayload,
  MeetingUpdatePayload,
  CreateMeetingInput,
  Meeting,
} from './meetings';

// ============================================================================
// Documents Module
// ============================================================================

export {
  useDocuments,
  useGenerateDocument,
  useDeleteDocument,
} from './documents';
export type { Document, DocumentFilters, DocumentPayload } from './documents';

// ============================================================================
// Assets Module
// ============================================================================

export {
  useAssets,
  useAsset,
  useProjectAssets,
  useCreateAsset,
  useUpdateAsset,
  useArchiveAsset,
  useLinkAssetToProject,
  useUnlinkAssetFromProject,
} from './assets';
export type {
  Asset,
  AssetFilters,
  AssetPayload,
  ProjectAssetLink,
} from './assets';

// ============================================================================
// Leads Module
// ============================================================================

export {
  useLeads,
  useLead,
  useCreateLead,
  useUpdateLead,
  useConvertLead,
  useDeleteLead,
} from './leads';
export type {
  Lead,
  LeadConversionPayload,
  LeadConversionResult,
  LeadFilters,
  LeadPayload,
  LeadUpdatePayload,
} from './leads';

// ============================================================================
// Marketing Module
// ============================================================================

export {
  useMarketingContents,
  useMarketingContent,
  useProjectMarketingContents,
  useCreateMarketingContent,
  useUpdateMarketingContent,
  useArchiveMarketingContent,
  useGenerateMarketingContent,
  useGenerateMarketingContentFromProject,
  useGenerateMarketingContentFromMeeting,
  useRepurposeMarketingContent,
  useLintMarketingContent,
} from './marketing';
export type {
  ContentLintResult,
  CreateMarketingContentInput,
  GenerateContentInput,
  GeneratedContent,
  LintContentInput,
  MarketingContent,
  MarketingContentListQuery,
  RepurposeContentInput,
  UpdateMarketingContentInput,
} from './marketing';

// ============================================================================
// Campaigns Module
// ============================================================================

export {
  useCampaigns,
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useArchiveCampaign,
} from './campaigns';
export type {
  Campaign,
  CampaignFilters,
  CreateCampaignInput,
  UpdateCampaignInput,
} from './campaigns';

// ============================================================================
// Brand Profiles Module
// ============================================================================

export {
  useBrandProfile,
  useBrandAssets,
  useCreateBrandProfile,
  useUpdateBrandProfile,
  useCreateBrandAsset,
  useUpdateBrandAsset,
  useArchiveBrandAsset,
} from './brand-profiles';
export type {
  BrandAsset,
  BrandProfile,
  CreateBrandAssetInput,
  CreateBrandProfileInput,
  UpdateBrandAssetInput,
  UpdateBrandProfileInput,
} from './brand-profiles';

// ============================================================================
// Publishing Module
// ============================================================================

export {
  usePublishingConnections,
  useCreatePublishingConnection,
  useUpdatePublishingConnection,
  useDeletePublishingConnection,
  usePublishContent,
} from './publishing';
export type {
  CreatePublishingConnectionInput,
  PublishingConnection,
  UpdatePublishingConnectionInput,
} from './publishing';

// ============================================================================
// MCP Module
// ============================================================================

export {
  useAIQuery,
  useExecuteTool,
  useMCPTools,
  useMCPResources,
  useMCPServers,
  useAtRiskProjects,
  useRecentMeetings,
  useMeetingBrief,
} from './mcp';
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
} from './mcp';

// ============================================================================
// System Admin - Tenant Management
// ============================================================================

export {
  useTenants,
  useTenantStats,
  useTenant,
  useTenantUsers,
  useCreateTenant,
  useUpdateTenant,
  useSuspendTenant,
  useActivateTenant,
  useCancelTenant,
  useAddTenantUser,
  useUpdateTenantUserRole,
  useRemoveTenantUser,
  useConfigureTenantModule,
  useUpdateTenantBranding,
} from './useTenantAdmin';
