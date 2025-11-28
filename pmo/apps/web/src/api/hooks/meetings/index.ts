/**
 * Meetings Module - React Query Hooks
 *
 * This module provides all React Query hooks for meeting management.
 * Meetings belong to projects and can be used to generate tasks.
 *
 * @module meetings
 * @see moduleRegistry for module dependencies and invalidation rules
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { invalidateRelatedModules } from '../moduleRegistry';
import {
  createMeeting,
  createTaskFromSelection,
  deleteMeeting,
  fetchMeeting,
  fetchProjectMeetings,
  updateMeeting,
  type CreateTaskFromSelectionPayload,
  type MeetingUpdatePayload,
} from '../../meetings';
import type {
  CreateMeetingInput,
  Meeting,
} from '../../../../packages/types/meeting';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all meetings for a project
 */
export function useProjectMeetings(
  projectId?: number,
): UseQueryResult<Meeting[], Error> {
  return useQuery({
    queryKey: queryKeys.meetings.byProject(projectId),
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectMeetings(projectId as number),
  });
}

/**
 * Fetch a single meeting by ID
 */
export function useMeeting(meetingId?: number): UseQueryResult<Meeting, Error> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: meetingId
      ? queryKeys.meetings.detail(meetingId)
      : queryKeys.meetings.all,
    enabled: Boolean(meetingId),
    queryFn: () => fetchMeeting(meetingId as number),
    initialData: () => {
      if (!meetingId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Meeting[]>({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'meetings' &&
          query.queryKey[1] === 'project',
        type: 'active',
      });

      for (const [, meetings] of cachedLists) {
        const match = meetings?.find((entry) => entry.id === meetingId);
        if (match) {
          return match;
        }
      }

      return undefined;
    },
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new meeting
 */
export function useCreateMeeting(): UseMutationResult<
  Meeting,
  Error,
  CreateMeetingInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createMeeting(payload),
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.byProject(meeting.projectId),
      });
      queryClient.setQueryData(queryKeys.meetings.detail(meeting.id), meeting);
    },
  });
}

/**
 * Update an existing meeting
 */
export function useUpdateMeeting(
  meetingId: number,
): UseMutationResult<Meeting, Error, MeetingUpdatePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateMeeting(meetingId, payload),
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.byProject(meeting.projectId),
      });
      queryClient.setQueryData(queryKeys.meetings.detail(meeting.id), meeting);
    },
  });
}

/**
 * Delete a meeting
 */
export function useDeleteMeeting(
  projectId?: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: number) => deleteMeeting(meetingId),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.detail(meetingId),
      });
    },
  });
}

/**
 * Create a task from selected meeting text
 *
 * This mutation uses module-aware invalidation to update tasks module
 */
export function useCreateTaskFromSelection(): UseMutationResult<
  unknown,
  Error,
  CreateTaskFromSelectionPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createTaskFromSelection(payload),
    onSuccess: (task, payload) => {
      // Invalidate meetings module caches
      queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.byProject(payload.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.detail(payload.meetingId),
      });

      // Invalidate tasks module (direct invalidation since this is a specific cross-module action)
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.myTasks() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byProject(payload.projectId),
      });

      // Cross-module invalidation via registry for any additional rules
      invalidateRelatedModules(queryClient, {
        sourceModule: 'meetings',
        trigger: 'create',
      });

      return task;
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  CreateTaskFromSelectionPayload,
  MeetingUpdatePayload,
} from '../../meetings';
export type {
  CreateMeetingInput,
  Meeting,
} from '../../../../packages/types/meeting';
