/**
 * Shared utility for checking project access permissions.
 *
 * Used across multiple services to determine if a user can access a project.
 * Access is granted if the user is the project owner OR if the project
 * is shared with all users in the tenant (isSharedWithTenant: true).
 */

/**
 * Check if a user has access to a project.
 *
 * @param project - Project with ownerId and isSharedWithTenant fields
 * @param userId - The ID of the user requesting access
 * @returns true if user has access (is owner or project is shared with tenant)
 */
export const hasProjectAccess = (
  project: { ownerId: number; isSharedWithTenant: boolean },
  userId: number,
): boolean => {
  return project.ownerId === userId || project.isSharedWithTenant;
};
