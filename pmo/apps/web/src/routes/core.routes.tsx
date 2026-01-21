/**
 * Core Routes
 *
 * Routes that are always available (core module):
 * - Dashboard
 * - Tasks
 * - Projects
 * - Meetings
 * - Legacy redirects
 */

import { lazy } from 'react';
import { Navigate, Route } from 'react-router';
import { LazyPage } from './components';

// Core pages (always loaded - no lazy loading for primary navigation)
import DashboardPage from '../pages/DashboardPage';
import MyTasksPage from '../pages/MyTasksPage';
import ProjectsPage from '../pages/ProjectsPage';
import ProjectSetupPage from '../pages/ProjectSetupPage';
import ProjectDashboardPage from '../pages/ProjectDashboardPage';
import MeetingDetailPage from '../features/meetings/MeetingDetailPage';

// Assets module (toggleable, lazy-loaded)
const AssetsPage = lazy(() => import('../pages/AssetsPage'));

interface CoreRoutesProps {
  isModuleEnabled: (moduleId: string) => boolean;
}

/**
 * Core application routes
 */
export function coreRoutes({ isModuleEnabled }: CoreRoutesProps): JSX.Element {
  return (
    <>
      {/* Dashboard */}
      <Route path="/" element={<DashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* Tasks */}
      <Route path="/tasks" element={<MyTasksPage />} />

      {/* Legacy /clients redirects to CRM Accounts */}
      <Route
        path="/clients"
        element={<Navigate to="/crm/accounts" replace />}
      />
      <Route
        path="/clients/:clientId"
        element={<Navigate to="/crm/accounts" replace />}
      />
      <Route
        path="/client-intake"
        element={<Navigate to="/crm/accounts" replace />}
      />

      {/* Projects */}
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/new" element={<ProjectSetupPage />} />
      <Route path="/projects/:id" element={<ProjectDashboardPage />} />

      {/* Meetings */}
      <Route path="/meetings/:id" element={<MeetingDetailPage />} />

      {/* Assets module (toggleable) */}
      {isModuleEnabled('assets') && (
        <Route
          path="/assets"
          element={
            <LazyPage>
              <AssetsPage />
            </LazyPage>
          }
        />
      )}
    </>
  );
}
