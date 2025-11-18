import React, { useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailsPage from './pages/ClientDetailsPage';

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
          <Link to="/clients">Clients</Link>
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
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
