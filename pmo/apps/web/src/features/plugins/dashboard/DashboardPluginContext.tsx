/**
 * Dashboard Plugin Context
 *
 * Provides shared data and functionality to all dashboard plugins through
 * React Context. Handles data fetching, caching, and error states.
 */

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import { useClients, useProjects } from '../../../api/queries';
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
  const clientsQuery = useClients({ includeArchived: false });
  const projectsQuery = useProjects();
  const tasksQuery = useMyTasks(ownerId);

  // Process clients data
  const clientsData = useMemo(() => {
    const clients = clientsQuery.data ?? [];
    return {
      total: clients.length,
      active: clients.filter((c) => !c.archived).length,
      isLoading: clientsQuery.isLoading,
      error: clientsQuery.error as Error | undefined,
      refetch: clientsQuery.refetch,
    };
  }, [
    clientsQuery.data,
    clientsQuery.isLoading,
    clientsQuery.error,
    clientsQuery.refetch,
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
      clients: clientsData,
      projects: projectsData,
      tasks: tasksData,
    }),
    [clientsData, projectsData, tasksData],
  );

  // Apply preferences if provided
  useMemo(() => {
    if (preferences?.enabledPlugins) {
      dashboardPluginRegistry.applyPreferences(preferences.enabledPlugins);
    }
  }, [preferences?.enabledPlugins]);

  // Get plugins by position
  const getPluginsByPosition = useCallback(
    (position: DashboardPanelPosition) => {
      return dashboardPluginRegistry.getByPosition(position, true);
    },
    [],
  );

  // Get all plugins grouped by position
  const getPluginsGrouped = useCallback(() => {
    return dashboardPluginRegistry.getGroupedByPosition();
  }, []);

  // Refetch all data
  const refetchAll = useCallback(() => {
    clientsQuery.refetch();
    projectsQuery.refetch();
    tasksQuery.refetch();
  }, [clientsQuery, projectsQuery, tasksQuery]);

  // Check loading and error states
  const isLoading =
    clientsQuery.isLoading || projectsQuery.isLoading || tasksQuery.isLoading;

  const hasError = !!(
    clientsQuery.error ||
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
