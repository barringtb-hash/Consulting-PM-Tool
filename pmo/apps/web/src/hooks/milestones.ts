/**
 * Legacy Milestones Hooks - Re-exports from Module-Aware Hooks
 *
 * This file maintains backwards compatibility for existing imports.
 * New code should import directly from '../api/hooks/milestones'.
 *
 * @deprecated Import from '../api/hooks/milestones' instead
 */

// Re-export everything from the new module structure
export {
  useProjectMilestones,
  useMilestone,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  MILESTONE_STATUSES,
} from '../api/hooks/milestones';

export type {
  Milestone,
  MilestonePayload,
  MilestoneUpdatePayload,
} from '../api/hooks/milestones';

// Legacy query keys for backwards compatibility
// New code should use queryKeys from '../api/hooks/queryKeys'
/**
 * @deprecated Use queryKeys from '../api/hooks/queryKeys' instead
 */
export const milestoneQueryKeys = {
  projectMilestones: (projectId?: number) =>
    ['projects', projectId, 'milestones'] as const,
  milestone: (milestoneId?: number) => ['milestone', milestoneId] as const,
};
