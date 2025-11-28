/**
 * User Preferences Service
 *
 * Manages user preferences including dashboard panel settings,
 * theme preferences, and other user-specific configurations.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface DashboardPanelPreferences {
  /** List of enabled panel IDs */
  enabledPanels: string[];
  /** Panel order (priority) overrides */
  panelOrder?: Record<string, number>;
  /** Collapsed panels */
  collapsedPanels?: string[];
}

export interface UserPreferences {
  /** Dashboard panel preferences */
  dashboardPanels?: DashboardPanelPreferences;
  /** UI theme */
  theme?: 'light' | 'dark' | 'system';
  /** Sidebar collapsed state */
  sidebarCollapsed?: boolean;
  /** Notification preferences */
  notifications?: {
    email?: boolean;
    push?: boolean;
    taskReminders?: boolean;
    weeklyDigest?: boolean;
  };
  /** Any other custom preferences */
  [key: string]: unknown;
}

export type UpdateUserPreferencesInput = Partial<UserPreferences>;

// ============================================================================
// User Preferences CRUD
// ============================================================================

/**
 * Get user preferences
 */
export async function getUserPreferences(
  userId: number,
): Promise<UserPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return (user.preferences as UserPreferences) || {};
}

/**
 * Update user preferences (merge with existing)
 */
export async function updateUserPreferences(
  userId: number,
  preferences: UpdateUserPreferencesInput,
): Promise<UserPreferences> {
  const currentPrefs = await getUserPreferences(userId);

  // Deep merge preferences
  const mergedPrefs = deepMerge(currentPrefs, preferences);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { preferences: mergedPrefs as Prisma.InputJsonValue },
    select: { preferences: true },
  });

  return (updatedUser.preferences as UserPreferences) || {};
}

/**
 * Replace user preferences entirely
 */
export async function setUserPreferences(
  userId: number,
  preferences: UserPreferences,
): Promise<UserPreferences> {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { preferences: preferences as Prisma.InputJsonValue },
    select: { preferences: true },
  });

  return (updatedUser.preferences as UserPreferences) || {};
}

/**
 * Delete user preferences (reset to defaults)
 */
export async function deleteUserPreferences(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: Prisma.JsonNull },
  });
}

// ============================================================================
// Dashboard Panel Preferences
// ============================================================================

/**
 * Get dashboard panel preferences
 */
export async function getDashboardPanelPreferences(
  userId: number,
): Promise<DashboardPanelPreferences | null> {
  const prefs = await getUserPreferences(userId);
  return prefs.dashboardPanels || null;
}

/**
 * Update dashboard panel preferences
 */
export async function updateDashboardPanelPreferences(
  userId: number,
  dashboardPanels: Partial<DashboardPanelPreferences>,
): Promise<DashboardPanelPreferences> {
  const currentPrefs = await getUserPreferences(userId);
  const currentDashboardPrefs = currentPrefs.dashboardPanels || {
    enabledPanels: [],
  };

  const mergedDashboardPrefs: DashboardPanelPreferences = {
    ...currentDashboardPrefs,
    ...dashboardPanels,
  };

  await updateUserPreferences(userId, {
    dashboardPanels: mergedDashboardPrefs,
  });

  return mergedDashboardPrefs;
}

/**
 * Set enabled dashboard panels
 */
export async function setEnabledDashboardPanels(
  userId: number,
  enabledPanels: string[],
): Promise<DashboardPanelPreferences> {
  return updateDashboardPanelPreferences(userId, { enabledPanels });
}

/**
 * Toggle a dashboard panel
 */
export async function toggleDashboardPanel(
  userId: number,
  panelId: string,
): Promise<DashboardPanelPreferences> {
  const currentPrefs = await getDashboardPanelPreferences(userId);
  const enabledPanels = currentPrefs?.enabledPanels || [];

  const isCurrentlyEnabled = enabledPanels.includes(panelId);
  const newEnabledPanels = isCurrentlyEnabled
    ? enabledPanels.filter((id) => id !== panelId)
    : [...enabledPanels, panelId];

  return updateDashboardPanelPreferences(userId, {
    enabledPanels: newEnabledPanels,
  });
}

/**
 * Set dashboard panel order
 */
export async function setDashboardPanelOrder(
  userId: number,
  panelOrder: Record<string, number>,
): Promise<DashboardPanelPreferences> {
  return updateDashboardPanelPreferences(userId, { panelOrder });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        isObject(sourceValue) &&
        isObject(targetValue) &&
        !Array.isArray(sourceValue)
      ) {
        output[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else {
        output[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return output;
}

function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}
