import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function ProtectedRoute(): JSX.Element {
  const { status, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p>Loading authentication status...</p>;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
