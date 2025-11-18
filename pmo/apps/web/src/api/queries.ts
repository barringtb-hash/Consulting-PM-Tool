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
  fetchProjectById,
  fetchProjects,
  updateProject,
  type Project,
  type ProjectFilters,
  type ProjectPayload,
} from './projects';
import {
  fetchDocuments,
  generateDocument,
  type Document,
  type DocumentFilters,
  type DocumentPayload,
} from './documents';

export const queryKeys = {
  clients: (filters?: ClientFilters) => ['clients', filters] as const,
  client: (id: number) => ['client', id] as const,
  contacts: (clientId?: number) => ['contacts', clientId] as const,
  projects: (filters?: ProjectFilters) => ['projects', filters] as const,
  project: (id: number) => ['project', id] as const,
  documents: (filters?: DocumentFilters) => ['documents', filters] as const,
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
