import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  MILESTONE_STATUSES,
  createMilestone,
  deleteMilestone,
  fetchMilestone,
  fetchProjectMilestones,
  updateMilestone,
  type Milestone,
  type MilestonePayload,
  type MilestoneUpdatePayload,
} from '../api/milestones';
import { taskQueryKeys } from './tasks';

export const milestoneQueryKeys = {
  projectMilestones: (projectId?: number) =>
    ['projects', projectId, 'milestones'] as const,
  milestone: (milestoneId?: number) => ['milestone', milestoneId] as const,
};

export function useProjectMilestones(
  projectId?: number,
): UseQueryResult<Milestone[], Error> {
  return useQuery({
    queryKey: milestoneQueryKeys.projectMilestones(projectId),
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectMilestones(projectId as number),
  });
}

export function useMilestone(
  milestoneId?: number,
): UseQueryResult<Milestone, Error> {
  return useQuery({
    queryKey: milestoneId
      ? milestoneQueryKeys.milestone(milestoneId)
      : ['milestone'],
    enabled: Boolean(milestoneId),
    queryFn: () => fetchMilestone(milestoneId as number),
  });
}

export function useCreateMilestone(): UseMutationResult<
  Milestone,
  Error,
  MilestonePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createMilestone(payload),
    onSuccess: (milestone) => {
      queryClient.invalidateQueries({
        queryKey: milestoneQueryKeys.projectMilestones(milestone.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: taskQueryKeys.projectTasks(milestone.projectId),
      });
    },
  });
}

export function useUpdateMilestone(
  projectId?: number,
): UseMutationResult<
  Milestone,
  Error,
  { milestoneId: number; payload: MilestoneUpdatePayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ milestoneId, payload }) =>
      updateMilestone(milestoneId, payload),
    onSuccess: (milestone) => {
      const targetProjectId = projectId ?? milestone.projectId;
      queryClient.invalidateQueries({
        queryKey: milestoneQueryKeys.projectMilestones(targetProjectId),
      });
      queryClient.invalidateQueries({
        queryKey: taskQueryKeys.projectTasks(targetProjectId),
      });
      queryClient.setQueryData<Milestone[]>(
        milestoneQueryKeys.projectMilestones(targetProjectId),
        (current) =>
          current?.map((entry) =>
            entry.id === milestone.id ? { ...entry, ...milestone } : entry,
          ) ?? current,
      );
    },
  });
}

export function useDeleteMilestone(
  projectId?: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestoneId: number) => deleteMilestone(milestoneId),
    onSuccess: (_, milestoneId) => {
      queryClient.invalidateQueries({
        queryKey: milestoneQueryKeys.projectMilestones(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: taskQueryKeys.projectTasks(projectId),
      });
      queryClient.setQueryData<Milestone[]>(
        milestoneQueryKeys.projectMilestones(projectId),
        (current) =>
          current?.filter((entry) => entry.id !== milestoneId) ?? current,
      );
    },
  });
}

export { MILESTONE_STATUSES };
