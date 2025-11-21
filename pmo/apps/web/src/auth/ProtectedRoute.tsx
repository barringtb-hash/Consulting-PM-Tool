import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { featureFlags } from '../config/featureFlags';

function ProtectedRoute(): JSX.Element {
  const { status, isLoading } = useAuth();
  const location = useLocation();

  // If login is disabled via feature flag, allow all routes
  if (!featureFlags.login) {
    return <Outlet />;
  }

  if (isLoading) {
    return <p>Loading authentication status...</p>;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
