import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';
import {
  type CreateMeetingInput,
  type CreateTaskFromSelectionInput,
  type Meeting,
  type UpdateMeetingInput,
} from '../../../packages/types/meeting';
import { taskQueryKeys } from '../hooks/tasks';

interface MeetingResponse
  extends Omit<Meeting, 'date' | 'createdAt' | 'updatedAt'> {
  date: string;
  createdAt: string;
  updatedAt: string;
  attendees?: string[] | null;
  notes?: string | null;
  decisions?: string | null;
  risks?: string | null;
}

const mapMeeting = (payload: MeetingResponse): Meeting => ({
  ...payload,
  attendees: payload.attendees ?? [],
  notes: payload.notes ?? undefined,
  decisions: payload.decisions ?? undefined,
  risks: payload.risks ?? undefined,
  date: new Date(payload.date),
  createdAt: new Date(payload.createdAt),
  updatedAt: new Date(payload.updatedAt),
});

const normalizeDateInput = (value?: string | Date): Date | undefined => {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
};

const normalizeNullableDate = (value?: string | Date | null) => {
  if (value === null) {
    return null;
  }

  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
};

export const meetingQueryKeys = {
  projectMeetings: (projectId?: number) =>
    ['projects', projectId, 'meetings'] as const,
  meeting: (meetingId?: number) => ['meeting', meetingId] as const,
};

export async function fetchProjectMeetings(
  projectId: number,
): Promise<Meeting[]> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/meetings`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ meetings: MeetingResponse[] }>(response);
  return data.meetings.map(mapMeeting);
}

export async function fetchMeeting(meetingId: number): Promise<Meeting> {
  const response = await fetch(
    buildApiUrl(`/meetings/${meetingId}`),
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ meeting: MeetingResponse }>(response);
  return mapMeeting(data.meeting);
}

export async function createMeeting(
  payload: CreateMeetingInput,
): Promise<Meeting> {
  const response = await fetch(
    buildApiUrl(`/projects/${payload.projectId}/meetings`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        date: normalizeDateInput(payload.date),
      }),
    }),
  );
  const data = await handleResponse<{ meeting: MeetingResponse }>(response);
  return mapMeeting(data.meeting);
}

export type MeetingUpdatePayload = Omit<UpdateMeetingInput, 'date'> & {
  date?: string | Date;
};

export async function updateMeeting(
  meetingId: number,
  payload: MeetingUpdatePayload,
): Promise<Meeting> {
  const response = await fetch(
    buildApiUrl(`/meetings/${meetingId}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        date: normalizeDateInput(payload.date),
      }),
    }),
  );
  const data = await handleResponse<{ meeting: MeetingResponse }>(response);
  return mapMeeting(data.meeting);
}

export async function deleteMeeting(meetingId: number): Promise<void> {
  await fetch(
    buildApiUrl(`/meetings/${meetingId}`),
    buildOptions({ method: 'DELETE' }),
  );
}

export type CreateTaskFromSelectionPayload = Omit<
  CreateTaskFromSelectionInput,
  'meetingId'
> & { meetingId: number };

export async function createTaskFromSelection(
  payload: CreateTaskFromSelectionPayload,
) {
  const response = await fetch(
    buildApiUrl(`/meetings/${payload.meetingId}/tasks/from-selection`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        dueDate: normalizeNullableDate(payload.dueDate),
      }),
    }),
  );
  const data = await handleResponse<{ task: unknown }>(response);
  return data.task;
}

export function useProjectMeetings(
  projectId?: number,
): UseQueryResult<Meeting[], Error> {
  return useQuery({
    queryKey: meetingQueryKeys.projectMeetings(projectId),
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectMeetings(projectId as number),
  });
}

export function useMeeting(meetingId?: number): UseQueryResult<Meeting, Error> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: meetingQueryKeys.meeting(meetingId),
    enabled: Boolean(meetingId),
    queryFn: () => fetchMeeting(meetingId as number),
    initialData: () => {
      if (!meetingId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Meeting[]>({
        queryKey: ['projects'],
        type: 'active',
      });

      for (const [queryKey, meetings] of cachedLists) {
        if (!Array.isArray(queryKey) || queryKey[2] !== 'meetings') {
          continue;
        }

        const match = meetings?.find((entry) => entry.id === meetingId);
        if (match) {
          return match;
        }
      }

      return undefined;
    },
  });
}

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
        queryKey: meetingQueryKeys.projectMeetings(meeting.projectId),
      });
      queryClient.setQueryData(meetingQueryKeys.meeting(meeting.id), meeting);
    },
  });
}

export function useUpdateMeeting(
  meetingId: number,
): UseMutationResult<Meeting, Error, MeetingUpdatePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateMeeting(meetingId, payload),
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({
        queryKey: meetingQueryKeys.projectMeetings(meeting.projectId),
      });
      queryClient.setQueryData(meetingQueryKeys.meeting(meeting.id), meeting);
    },
  });
}

export function useDeleteMeeting(
  projectId?: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: number) => deleteMeeting(meetingId),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({
        queryKey: meetingQueryKeys.projectMeetings(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: meetingQueryKeys.meeting(meetingId),
      });
    },
  });
}

export function useCreateTaskFromSelection(): UseMutationResult<
  unknown,
  Error,
  CreateTaskFromSelectionPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createTaskFromSelection(payload),
    onSuccess: (task, payload) => {
      queryClient.invalidateQueries({
        queryKey: meetingQueryKeys.projectMeetings(payload.projectId),
      });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.myTasks });
      queryClient.invalidateQueries({
        queryKey: taskQueryKeys.projectTasks(payload.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: meetingQueryKeys.meeting(payload.meetingId),
      });
      return task;
    },
  });
}
