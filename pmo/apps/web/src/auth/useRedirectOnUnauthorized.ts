import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isApiError } from '../api/http';
import { featureFlags } from '../config/featureFlags';

function useRedirectOnUnauthorized(error: unknown): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect to login if the login feature is disabled
    if (!featureFlags.login) {
      return;
    }

    if (isApiError(error) && error.status === 401) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [error, location, navigate]);
}

export default useRedirectOnUnauthorized;
