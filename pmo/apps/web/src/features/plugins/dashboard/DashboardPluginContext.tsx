/**
 * Dashboard Plugin Context
 *
 * Provides shared data and functionality to all dashboard plugins through
 * React Context. Handles data fetching, caching, and error states.
 *
 * Note: Plugin enabled state is tracked locally in this context, not by
 * mutating the global registry. This prevents state leakage across sessions.
 */

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../auth/AuthContext';
import { useProjects } from '../../../api/queries';
import { useAccountStats } from '../../../api/hooks/crm';
import { useMyTasks } from '../../../hooks/tasks';
import type {
  DashboardPluginContext as PluginContextType,
  DashboardData,
  DashboardPreferences,
  RegisteredPlugin,
  DashboardPanelPosition,
} from './types';
import { dashboardPluginRegistry } from './registry';

/**
 * Extended context value with additional utilities
 */
interface DashboardPluginContextValue extends PluginContextType {
  /** Navigate to a route */
  navigate: (path: string) => void;
  /** Get plugins for a specific position */
  getPluginsByPosition: (
    position: DashboardPanelPosition,
  ) => RegisteredPlugin[];
  /** Get all plugins grouped by position */
  getPluginsGrouped: () => Record<DashboardPanelPosition, RegisteredPlugin[]>;
  /** Refetch all dashboard data */
  refetchAll: () => void;
  /** Check if any data is loading */
  isLoading: boolean;
  /** Check if any data has errors */
  hasError: boolean;
}

const DashboardPluginContext =
  createContext<DashboardPluginContextValue | null>(null);

/**
 * Props for the DashboardPluginProvider
 */
interface DashboardPluginProviderProps {
  children: ReactNode;
  /** Optional user preferences override */
  preferences?: DashboardPreferences;
}

/**
 * Helper to check if a date is overdue
 */
function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Provider component that supplies dashboard plugin context
 */
export function DashboardPluginProvider({
  children,
  preferences,
}: DashboardPluginProviderProps): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ownerId = user ? Number(user.id) : undefined;

  // Fetch dashboard data
  const accountStatsQuery = useAccountStats();
  const projectsQuery = useProjects();
  const tasksQuery = useMyTasks(ownerId);

  // Process accounts data (using CRM Account Stats API)
  const accountsData = useMemo(() => {
    const stats = accountStatsQuery.data;
    return {
      total: stats?.total ?? 0,
      // Active accounts = total (stats API excludes archived accounts)
      active: stats?.total ?? 0,
      isLoading: accountStatsQuery.isLoading,
      error: accountStatsQuery.error as Error | undefined,
      refetch: accountStatsQuery.refetch,
    };
  }, [
    accountStatsQuery.data,
    accountStatsQuery.isLoading,
    accountStatsQuery.error,
    accountStatsQuery.refetch,
  ]);

  // Process projects data
  const projectsData = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const active = projects.filter((p) => p.status === 'IN_PROGRESS').length;
    const recent = [...projects]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        healthStatus: p.healthStatus ?? undefined,
        statusSummary: p.statusSummary ?? undefined,
        updatedAt: p.updatedAt,
      }));

    return {
      total: projects.length,
      active,
      recent,
      isLoading: projectsQuery.isLoading,
      error: projectsQuery.error as Error | undefined,
      refetch: projectsQuery.refetch,
    };
  }, [
    projectsQuery.data,
    projectsQuery.isLoading,
    projectsQuery.error,
    projectsQuery.refetch,
  ]);

  // Process tasks data
  const tasksData = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const openTasks = tasks.filter((t) => t.status !== 'DONE');
    const overdueTasks = openTasks.filter((t) => isOverdue(t.dueDate));
    const upcoming = openTasks
      .filter((t) => t.dueDate)
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      )
      .slice(0, 7)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority ?? undefined,
        dueDate: t.dueDate ?? undefined,
        projectId: t.projectId,
        projectName: t.projectName ?? undefined,
      }));

    return {
      total: tasks.length,
      open: openTasks.length,
      overdue: overdueTasks.length,
      upcoming,
      isLoading: tasksQuery.isLoading,
      error: tasksQuery.error as Error | undefined,
      refetch: tasksQuery.refetch,
    };
  }, [
    tasksQuery.data,
    tasksQuery.isLoading,
    tasksQuery.error,
    tasksQuery.refetch,
  ]);

  // Combine all dashboard data
  const dashboardData: DashboardData = useMemo(
    () => ({
      accounts: accountsData,
      projects: projectsData,
      tasks: tasksData,
    }),
    [accountsData, projectsData, tasksData],
  );

  // Compute enabled plugin IDs locally based on preferences
  // This avoids mutating the global registry singleton
  const enabledPluginIds = useMemo(() => {
    if (preferences?.enabledPlugins) {
      return new Set(preferences.enabledPlugins);
    }
    // Default: use each plugin's defaultEnabled setting
    return new Set(
      dashboardPluginRegistry
        .getAll()
        .filter((entry) => entry.plugin.config.defaultEnabled !== false)
        .map((entry) => entry.plugin.config.id),
    );
  }, [preferences?.enabledPlugins]);

  // Get plugins by position, filtering by local enabled state
  const getPluginsByPosition = useCallback(
    (position: DashboardPanelPosition) => {
      return dashboardPluginRegistry
        .getByPosition(position, false) // Get all, ignore registry enabled state
        .filter((entry) => enabledPluginIds.has(entry.plugin.config.id))
        .sort((a, b) => a.order - b.order);
    },
    [enabledPluginIds],
  );

  // Get all plugins grouped by position, filtering by local enabled state
  const getPluginsGrouped = useCallback(() => {
    const grouped: Record<DashboardPanelPosition, RegisteredPlugin[]> = {
      'summary-cards': [],
      'main-left': [],
      'main-right': [],
      'full-width': [],
    };

    for (const entry of dashboardPluginRegistry.getAll()) {
      if (enabledPluginIds.has(entry.plugin.config.id)) {
        grouped[entry.plugin.config.position].push(entry);
      }
    }

    // Sort each group by priority
    for (const position of Object.keys(grouped) as DashboardPanelPosition[]) {
      grouped[position].sort((a, b) => a.order - b.order);
    }

    return grouped;
  }, [enabledPluginIds]);

  // Refetch all data
  const refetchAll = useCallback(() => {
    accountStatsQuery.refetch();
    projectsQuery.refetch();
    tasksQuery.refetch();
  }, [accountStatsQuery, projectsQuery, tasksQuery]);

  // Check loading and error states
  const isLoading =
    accountStatsQuery.isLoading ||
    projectsQuery.isLoading ||
    tasksQuery.isLoading;

  const hasError = !!(
    accountStatsQuery.error ||
    projectsQuery.error ||
    tasksQuery.error
  );

  // Build context value
  const contextValue: DashboardPluginContextValue = useMemo(
    () => ({
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
          }
        : undefined,
      preferences,
      data: dashboardData,
      navigate,
      getPluginsByPosition,
      getPluginsGrouped,
      refetchAll,
      isLoading,
      hasError,
    }),
    [
      user,
      preferences,
      dashboardData,
      navigate,
      getPluginsByPosition,
      getPluginsGrouped,
      refetchAll,
      isLoading,
      hasError,
    ],
  );

  return (
    <DashboardPluginContext.Provider value={contextValue}>
      {children}
    </DashboardPluginContext.Provider>
  );
}

/**
 * Hook to access dashboard plugin context
 * @throws Error if used outside of DashboardPluginProvider
 */
export function useDashboardPluginContext(): DashboardPluginContextValue {
  const context = useContext(DashboardPluginContext);
  if (!context) {
    throw new Error(
      'useDashboardPluginContext must be used within a DashboardPluginProvider',
    );
  }
  return context;
}

/**
 * Hook to access only the dashboard data
 */
export function useDashboardData(): DashboardData | undefined {
  const context = useContext(DashboardPluginContext);
  return context?.data;
}

/**
 * Hook to access navigation function
 */
export function useDashboardNavigate(): (path: string) => void {
  const context = useDashboardPluginContext();
  return context.navigate;
}
