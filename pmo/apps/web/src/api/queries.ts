/**
 * Legacy Queries File - Re-exports from Module-Aware Hooks
 *
 * This file maintains backwards compatibility for existing imports.
 * New code should import directly from './hooks' or specific module folders.
 *
 * @deprecated Import from './hooks' or specific module folders instead
 */

import { QueryClient } from '@tanstack/react-query';

import type { ClientFilters } from './clients';
import type { LeadFilters } from './leads';
import type { ProjectFilters } from './projects';
import type { DocumentFilters } from './documents';
import type { AssetFilters } from './assets';

// ============================================================================
// Re-export all hooks from the new module structure
// ============================================================================

// Clients
export {
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
  useArchiveClient,
  useDeleteClient,
} from './hooks/clients';

// Contacts
export {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useArchiveContact,
  useDeleteContact,
} from './hooks/contacts';

// Projects
export {
  useProjects,
  useProject,
  useProjectStatus,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useUpdateProjectHealthStatus,
  useGenerateStatusSummary,
} from './hooks/projects';

// Documents
export {
  useDocuments,
  useGenerateDocument,
  useDeleteDocument,
} from './hooks/documents';

// Assets
export {
  useAssets,
  useAsset,
  useProjectAssets,
  useCreateAsset,
  useUpdateAsset,
  useArchiveAsset,
  useLinkAssetToProject,
  useUnlinkAssetFromProject,
} from './hooks/assets';

// Leads
export {
  useLeads,
  useLead,
  useCreateLead,
  useUpdateLead,
  useConvertLead,
  useDeleteLead,
} from './hooks/leads';

// ============================================================================
// Legacy Query Keys (kept for backwards compatibility)
// New code should use queryKeys from './hooks/queryKeys'
// ============================================================================

/**
 * @deprecated Use queryKeys from './hooks/queryKeys' instead
 */
export const queryKeys = {
  clients: (filters?: ClientFilters) => ['clients', filters] as const,
  client: (id: number) => ['client', id] as const,
  contacts: (clientId?: number) => ['contacts', clientId] as const,
  leads: (filters?: LeadFilters) => ['leads', filters] as const,
  lead: (id: number) => ['lead', id] as const,
  projects: (filters?: ProjectFilters) => ['projects', filters] as const,
  project: (id: number) => ['project', id] as const,
  projectStatus: (id: number, rangeDays?: number) =>
    ['project-status', id, rangeDays] as const,
  documents: (filters?: DocumentFilters) => ['documents', filters] as const,
  assets: (filters?: AssetFilters) => ['assets', filters] as const,
  asset: (id: number) => ['asset', id] as const,
  projectAssets: (projectId: number, includeArchived?: boolean) =>
    ['project-assets', projectId, includeArchived] as const,
};

// ============================================================================
// Query Client Configuration
// ============================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
