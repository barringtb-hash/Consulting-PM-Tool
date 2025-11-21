import React, { useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import ClientsPage from './pages/ClientsPage';
import ClientDetailsPage from './pages/ClientDetailsPage';
import ClientIntakePage from './pages/ClientIntakePage';
import DashboardPage from './pages/DashboardPage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import LoginPage from './pages/LoginPage';
import { ClientProjectProvider } from './pages/ClientProjectContext';
import MyTasksPage from './pages/MyTasksPage';
import MeetingDetailPage from './features/meetings/MeetingDetailPage';
import AssetsPage from './pages/AssetsPage';
import { AdminCreateUserPage } from './pages/AdminCreateUserPage';

function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const { user, status, logout, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to logout';
      setError(message);
    }
  };

  return (
    <div className="app-shell">
      <header>
        <div>
          <Link to="/">
            <strong>AI Consulting PMO</strong>
          </Link>
        </div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/tasks">My tasks</Link>
          <Link to="/assets">Assets</Link>
          <Link to="/clients">Clients</Link>
          <Link to="/client-intake">Client intake</Link>
          <Link to="/projects/new">New project</Link>
          <Link to="/admin/users/new">Create user</Link>
        </nav>
        <div>
          {status === 'authenticated' && user ? (
            <div>
              <span>
                Signed in as <strong>{user.name || user.email}</strong>
              </span>
              <button type="button" onClick={handleLogout} disabled={isLoading}>
                Logout
              </button>
              {error && <p role="alert">{error}</p>}
            </div>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>
      <section>{children}</section>
    </div>
  );
}

function App(): JSX.Element {
  return (
    <ClientProjectProvider>
      <AppLayout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<MyTasksPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
            <Route path="/client-intake" element={<ClientIntakePage />} />
            <Route path="/projects/new" element={<ProjectSetupPage />} />
            <Route path="/projects/:id" element={<ProjectDashboardPage />} />
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/admin/users/new" element={<AdminCreateUserPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </ClientProjectProvider>
  );
}

export default App;
