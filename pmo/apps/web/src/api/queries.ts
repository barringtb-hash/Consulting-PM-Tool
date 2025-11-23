import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  archiveClient,
  createClient,
  deleteClient,
  fetchClientById,
  fetchClients,
  updateClient,
  type Client,
  type ClientFilters,
  type ClientPayload,
} from './clients';
import {
  archiveContact,
  createContact,
  deleteContact,
  fetchContacts,
  updateContact,
  type Contact,
  type ContactFilters,
  type ContactPayload,
} from './contacts';
import {
  createProject,
  deleteProject,
  fetchProjectById,
  fetchProjects,
  fetchProjectStatus,
  generateStatusSummary,
  updateProject,
  updateProjectHealthStatus,
  type Project,
  type ProjectFilters,
  type ProjectPayload,
  type StatusSummaryRequest,
  type UpdateHealthStatusPayload,
} from './projects';
import {
  deleteDocument,
  fetchDocuments,
  generateDocument,
  type Document,
  type DocumentFilters,
  type DocumentPayload,
} from './documents';
import {
  archiveAsset,
  createAsset,
  fetchAssetById,
  fetchAssets,
  fetchProjectAssets,
  linkAssetToProject,
  unlinkAssetFromProject,
  updateAsset,
  type Asset,
  type AssetFilters,
  type AssetPayload,
  type ProjectAssetLink,
} from './assets';
import {
  convertLead,
  createLead,
  deleteLead,
  fetchLeadById,
  fetchLeads,
  updateLead,
  type LeadConversionPayload,
  type LeadFilters,
  type LeadPayload,
  type LeadUpdatePayload,
} from './leads';

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

export function useClients(filters?: ClientFilters) {
  return useQuery({
    queryKey: queryKeys.clients(filters),
    queryFn: () => fetchClients(filters),
  });
}

export function useClient(clientId?: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: clientId ? queryKeys.client(clientId) : ['client'],
    enabled: Boolean(clientId),
    queryFn: () => fetchClientById(clientId as number, true),
    initialData: () => {
      if (!clientId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Client[]>({
        queryKey: queryKeys.clients(),
        type: 'active',
      });

      for (const [, clients] of cachedLists) {
        const match = clients?.find((entry) => entry.id === clientId);
        if (match) {
          return match;
        }
      }

      return undefined;
    },
  });
}

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: queryKeys.projects(filters),
    queryFn: () => fetchProjects(filters),
  });
}

export function useProject(projectId?: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ['project'],
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectById(projectId as number),
    initialData: () => {
      if (!projectId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Project[]>({
        queryKey: queryKeys.projects(),
        type: 'active',
      });

      for (const [, projects] of cachedLists) {
        const match = projects?.find((entry) => entry.id === projectId);
        if (match) {
          return match;
        }
      }

      return undefined;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectPayload) => createProject(payload),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      queryClient.setQueryData(queryKeys.project(project.id), project);
    },
  });
}

export function useUpdateProject(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ProjectPayload>) =>
      updateProject(projectId, payload),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      queryClient.setQueryData(queryKeys.project(projectId), project);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.removeQueries({ queryKey: queryKeys.projectStatus(projectId) });
    },
  });
}

// M7 - Status & Reporting Hooks

export function useProjectStatus(projectId?: number, rangeDays = 7) {
  return useQuery({
    queryKey: projectId
      ? queryKeys.projectStatus(projectId, rangeDays)
      : ['project-status'],
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectStatus(projectId as number, rangeDays),
  });
}

export function useUpdateProjectHealthStatus(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateHealthStatusPayload) =>
      updateProjectHealthStatus(projectId, payload),
    onSuccess: () => {
      // Invalidate both the project and project status queries
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatus(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}

export function useGenerateStatusSummary(projectId: number) {
  return useMutation({
    mutationFn: (request: StatusSummaryRequest) =>
      generateStatusSummary(projectId, request),
  });
}

export function useDocuments(filters?: DocumentFilters) {
  const queryFilters = useMemo<DocumentFilters | undefined>(() => {
    if (!filters) {
      return undefined;
    }

    return {
      clientId: filters.clientId,
      projectId: filters.projectId,
    };
  }, [filters]);

  return useQuery({
    queryKey: queryKeys.documents(queryFilters),
    enabled: Boolean(queryFilters),
    queryFn: () => fetchDocuments(queryFilters),
  });
}

export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DocumentPayload) => generateDocument(payload),
    onSuccess: (document, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents() });

      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.project(variables.projectId),
        });
      }

      queryClient.setQueryData<Document[]>(
        queryKeys.documents({
          clientId: variables.clientId,
          projectId: variables.projectId,
        }),
        (current) => (current ? [document, ...current] : [document]),
      );
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: number) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents() });
    },
  });
}

export function useAssets(filters?: AssetFilters) {
  return useQuery({
    queryKey: queryKeys.assets(filters),
    queryFn: () => fetchAssets(filters),
  });
}

export function useAsset(assetId?: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: assetId ? queryKeys.asset(assetId) : ['asset'],
    enabled: Boolean(assetId),
    queryFn: () => fetchAssetById(assetId as number),
    initialData: () => {
      if (!assetId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Asset[]>({
        queryKey: queryKeys.assets(),
        type: 'active',
      });

      for (const [, assets] of cachedLists) {
        const match = assets?.find((entry) => entry.id === assetId);
        if (match) {
          return match;
        }
      }

      const projectAssets = queryClient.getQueriesData<ProjectAssetLink[]>({
        predicate: (query) => query.queryKey[0] === 'project-assets',
        type: 'active',
      });

      for (const [, links] of projectAssets) {
        const match = links?.find((link) => link.asset.id === assetId);
        if (match) {
          return match.asset;
        }
      }

      return undefined;
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssetPayload) => createAsset(payload),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets() });
      queryClient.setQueryData(queryKeys.asset(asset.id), asset);
    },
  });
}

export function useUpdateAsset(assetId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<AssetPayload>) =>
      updateAsset(assetId, payload),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets() });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'project-assets',
      });
      queryClient.setQueryData(queryKeys.asset(assetId), asset);
    },
  });
}

export function useArchiveAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: number) => archiveAsset(assetId),
    onSuccess: (_, assetId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets() });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'project-assets',
      });
      queryClient.removeQueries({ queryKey: queryKeys.asset(assetId) });
    },
  });
}

export function useProjectAssets(
  projectId?: number,
  includeArchived?: boolean,
) {
  return useQuery({
    queryKey: queryKeys.projectAssets(projectId ?? 0, includeArchived),
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectAssets(projectId as number, includeArchived),
  });
}

export function useLinkAssetToProject(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, notes }: { assetId: number; notes?: string }) =>
      linkAssetToProject(projectId, assetId, { notes }),
    onSuccess: (link) => {
      const projectAssetQueries = queryClient.getQueriesData<
        ProjectAssetLink[]
      >({
        predicate: (query) =>
          query.queryKey[0] === 'project-assets' &&
          query.queryKey[1] === projectId,
        type: 'active',
      });

      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'project-assets' &&
          query.queryKey[1] === projectId,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets() });

      for (const [queryKey, current] of projectAssetQueries) {
        queryClient.setQueryData<ProjectAssetLink[] | undefined>(
          queryKey,
          () => {
            if (!current) {
              return [link];
            }

            const filtered = current.filter(
              (existing) => existing.assetId !== link.assetId,
            );
            return [link, ...filtered];
          },
        );
      }
    },
  });
}

export function useUnlinkAssetFromProject(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: number) => unlinkAssetFromProject(projectId, assetId),
    onSuccess: (_, assetId) => {
      const projectAssetQueries = queryClient.getQueriesData<
        ProjectAssetLink[]
      >({
        predicate: (query) =>
          query.queryKey[0] === 'project-assets' &&
          query.queryKey[1] === projectId,
        type: 'active',
      });

      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'project-assets' &&
          query.queryKey[1] === projectId,
      });

      for (const [queryKey, current] of projectAssetQueries) {
        queryClient.setQueryData<ProjectAssetLink[] | undefined>(
          queryKey,
          (currentLinks) =>
            (currentLinks ?? current)?.filter(
              (link) => link.assetId !== assetId,
            ) ??
            currentLinks ??
            current,
        );
      }
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClientPayload) => createClient(payload),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.setQueryData(queryKeys.client(client.id), client);
    },
  });
}

export function useUpdateClient(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ClientPayload>) =>
      updateClient(clientId, payload),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.setQueryData(queryKeys.client(clientId), client);
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number) => archiveClient(clientId),
    onSuccess: (client, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.setQueryData(queryKeys.client(clientId), client);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number) => deleteClient(clientId),
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.removeQueries({ queryKey: queryKeys.client(clientId) });
    },
  });
}

export function useContacts(clientId?: number, filters?: ContactFilters) {
  const queryFilters = useMemo<ContactFilters | undefined>(() => {
    if (!clientId) {
      return filters;
    }

    return { ...filters, clientId };
  }, [clientId, filters]);

  return useQuery({
    queryKey: queryKeys.contacts(clientId),
    enabled: Boolean(clientId),
    queryFn: () => fetchContacts(queryFilters),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ContactPayload) => createContact(payload),
    onSuccess: (contact) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts(contact.clientId),
      });
    },
  });
}

export function useUpdateContact(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      contactId: number;
      payload: Partial<Omit<ContactPayload, 'clientId'>> & {
        clientId?: number;
      };
    }) => updateContact(variables.contactId, variables.payload),
    onSuccess: (contact, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.client(clientId) });
      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts(clientId),
        (data) =>
          data
            ? data.map((item) =>
                item.id === variables.contactId
                  ? { ...item, ...contact }
                  : item,
              )
            : data,
      );
    },
  });
}

export function useArchiveContact(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: number) => archiveContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.client(clientId) });
    },
  });
}

export function useDeleteContact(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: number) => deleteContact(contactId),
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(clientId) });
      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts(clientId),
        (data) =>
          data ? data.filter((contact) => contact.id !== contactId) : data,
      );
    },
  });
}

// Lead hooks
export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads(filters),
    queryFn: () => fetchLeads(filters),
  });
}

export function useLead(leadId?: number) {
  return useQuery({
    queryKey: leadId ? queryKeys.lead(leadId) : ['lead'],
    enabled: Boolean(leadId),
    queryFn: () => fetchLeadById(leadId as number),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LeadPayload) => createLead(payload),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.setQueryData(queryKeys.lead(lead.id), lead);
    },
  });
}

export function useUpdateLead(leadId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LeadUpdatePayload) => updateLead(leadId, payload),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.setQueryData(queryKeys.lead(leadId), lead);
    },
  });
}

export function useConvertLead(leadId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LeadConversionPayload) =>
      convertLead(leadId, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (result.clientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.client(result.clientId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts(result.clientId),
        });
      }
      queryClient.setQueryData(queryKeys.lead(leadId), result.lead);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: number) => deleteLead(leadId),
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.removeQueries({ queryKey: queryKeys.lead(leadId) });
    },
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
