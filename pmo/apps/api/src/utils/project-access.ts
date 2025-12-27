/**
 * Shared utility for checking project access permissions.
 *
 * Used across multiple services to determine if a user can access a project.
 * Access is determined by:
 * 1. User is the project owner (always has ADMIN access)
 * 2. Project visibility: PRIVATE, TEAM, or TENANT
 * 3. User's role in ProjectMember if visibility is TEAM
 */

import { ProjectVisibility, ProjectRole, ProjectMember } from '@prisma/client';

export type ProjectAccessLevel = 'none' | 'view' | 'edit' | 'admin';

export interface ProjectAccessInfo {
  ownerId: number;
  visibility: ProjectVisibility;
  isSharedWithTenant?: boolean; // Legacy field for backward compatibility
  members?: Pick<ProjectMember, 'userId' | 'role'>[];
}

/**
 * Get the access level a user has for a project.
 *
 * @param project - Project with ownership and visibility info
 * @param userId - The ID of the user requesting access
 * @returns The user's access level: 'none', 'view', 'edit', or 'admin'
 */
export const getProjectAccessLevel = (
  project: ProjectAccessInfo,
  userId: number,
): ProjectAccessLevel => {
  // Owner always has admin access
  if (project.ownerId === userId) {
    return 'admin';
  }

  // Handle visibility-based access
  switch (project.visibility) {
    case 'PRIVATE':
      // Only owner can access (handled above)
      // Legacy fallback: check isSharedWithTenant for data that hasn't been migrated
      if (project.isSharedWithTenant) {
        return 'view';
      }
      return 'none';

    case 'TEAM':
      // Check if user is a team member
      if (project.members) {
        const membership = project.members.find((m) => m.userId === userId);
        if (membership) {
          switch (membership.role) {
            case 'ADMIN':
              return 'admin';
            case 'EDIT':
              return 'edit';
            case 'VIEW_ONLY':
              return 'view';
          }
        }
      }
      return 'none';

    case 'TENANT':
      // All tenant users can view
      return 'view';
  }
};

/**
 * Check if a user has access to a project (any level above 'none').
 * This is a backward-compatible function for existing code.
 *
 * @param project - Project with ownerId and visibility fields
 * @param userId - The ID of the user requesting access
 * @returns true if user has any access (view, edit, or admin)
 */
export const hasProjectAccess = (
  project: {
    ownerId: number;
    isSharedWithTenant?: boolean;
    visibility?: ProjectVisibility;
    members?: Pick<ProjectMember, 'userId' | 'role'>[];
  },
  userId: number,
): boolean => {
  const accessLevel = getProjectAccessLevel(
    {
      ownerId: project.ownerId,
      visibility:
        project.visibility ||
        (project.isSharedWithTenant ? 'TENANT' : 'PRIVATE'),
      isSharedWithTenant: project.isSharedWithTenant,
      members: project.members,
    },
    userId,
  );
  return accessLevel !== 'none';
};

/**
 * Check if a user can edit a project (edit or admin level).
 *
 * @param project - Project with access info
 * @param userId - The ID of the user requesting access
 * @returns true if user can edit the project
 */
export const canEditProject = (
  project: ProjectAccessInfo,
  userId: number,
): boolean => {
  const accessLevel = getProjectAccessLevel(project, userId);
  return accessLevel === 'edit' || accessLevel === 'admin';
};

/**
 * Check if a user has admin access to a project.
 *
 * @param project - Project with access info
 * @param userId - The ID of the user requesting access
 * @returns true if user has admin access
 */
export const hasAdminAccess = (
  project: ProjectAccessInfo,
  userId: number,
): boolean => {
  return getProjectAccessLevel(project, userId) === 'admin';
};

/**
 * Convert ProjectRole to access level string.
 */
export const roleToAccessLevel = (role: ProjectRole): ProjectAccessLevel => {
  switch (role) {
    case 'ADMIN':
      return 'admin';
    case 'EDIT':
      return 'edit';
    case 'VIEW_ONLY':
      return 'view';
    default:
      return 'none';
  }
};
