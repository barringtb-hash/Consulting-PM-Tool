/**
 * Contacts Module - React Query Hooks
 *
 * This module provides all React Query hooks for contact management.
 * Contacts are associated with clients.
 */

import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import {
  archiveContact,
  createContact,
  deleteContact,
  fetchContacts,
  updateContact,
  type Contact,
  type ContactFilters,
  type ContactPayload,
} from '../../contacts';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch contacts for a specific client
 */
export function useContacts(
  clientId?: number,
  filters?: ContactFilters,
): UseQueryResult<Contact[], Error> {
  const queryFilters = useMemo<ContactFilters | undefined>(() => {
    if (!clientId) {
      return filters;
    }

    return { ...filters, clientId };
  }, [clientId, filters]);

  return useQuery({
    queryKey: queryKeys.contacts.byClient(clientId),
    enabled: Boolean(clientId),
    queryFn: () => fetchContacts(queryFilters),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new contact
 */
export function useCreateContact(): UseMutationResult<
  Contact,
  Error,
  ContactPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ContactPayload) => createContact(payload),
    onSuccess: (contact) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.byClient(contact.clientId),
      });
    },
  });
}

/**
 * Update an existing contact
 */
export function useUpdateContact(clientId: number): UseMutationResult<
  Contact,
  Error,
  {
    contactId: number;
    payload: Partial<Omit<ContactPayload, 'clientId'>> & { clientId?: number };
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      contactId: number;
      payload: Partial<Omit<ContactPayload, 'clientId'>> & {
        clientId?: number;
      };
    }) => updateContact(variables.contactId, variables.payload),
    onSuccess: (contact, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.byClient(clientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(clientId),
      });
      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts.byClient(clientId),
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

/**
 * Archive a contact (soft delete)
 */
export function useArchiveContact(
  clientId: number,
): UseMutationResult<Contact, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: number) => archiveContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.byClient(clientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(clientId),
      });
    },
  });
}

/**
 * Delete a contact permanently
 */
export function useDeleteContact(
  clientId: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: number) => deleteContact(contactId),
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.byClient(clientId),
      });
      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts.byClient(clientId),
        (data) =>
          data ? data.filter((contact) => contact.id !== contactId) : data,
      );
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type { Contact, ContactFilters, ContactPayload } from '../../contacts';
