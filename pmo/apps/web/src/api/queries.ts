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

export const queryKeys = {
  clients: (filters?: ClientFilters) => ['clients', filters] as const,
  client: (id: number) => ['client', id] as const,
  contacts: (clientId?: number) => ['contacts', clientId] as const,
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
