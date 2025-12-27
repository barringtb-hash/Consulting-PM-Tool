/**
 * Deletion Tracker
 *
 * Tracks entity IDs that are currently being deleted to prevent
 * React Query from triggering refetches for deleted entities.
 *
 * This solves the race condition where:
 * 1. User deletes an entity
 * 2. Navigation is triggered but component hasn't unmounted yet
 * 3. React Query detects empty cache and tries to refetch
 * 4. Refetch hits the server after entity is deleted → 404
 *
 * By tracking which entities are being deleted, we can disable
 * queries for those entities until the component unmounts.
 */

// Track projects being deleted
const deletingProjects = new Set<number>();

// Track clients being deleted
const deletingClients = new Set<number>();

/**
 * Mark a project as being deleted.
 * Queries for this project will be disabled until unmarked.
 */
export function markProjectDeleting(projectId: number): void {
  deletingProjects.add(projectId);
}

/**
 * Unmark a project as being deleted.
 * Should be called after deletion completes (success or error).
 */
export function unmarkProjectDeleting(projectId: number): void {
  deletingProjects.delete(projectId);
}

/**
 * Check if a project is currently being deleted.
 * Use this in query hooks to disable fetching.
 */
export function isProjectDeleting(projectId: number | undefined): boolean {
  if (!projectId) return false;
  return deletingProjects.has(projectId);
}

/**
 * Mark a client as being deleted.
 */
export function markClientDeleting(clientId: number): void {
  deletingClients.add(clientId);
}

/**
 * Unmark a client as being deleted.
 */
export function unmarkClientDeleting(clientId: number): void {
  deletingClients.delete(clientId);
}

/**
 * Check if a client is currently being deleted.
 */
export function isClientDeleting(clientId: number | undefined): boolean {
  if (!clientId) return false;
  return deletingClients.has(clientId);
}
