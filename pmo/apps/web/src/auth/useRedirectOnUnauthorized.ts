import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isApiError } from '../api/http';

function useRedirectOnUnauthorized(error: unknown): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isApiError(error) && error.status === 401) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [error, location, navigate]);
}

export default useRedirectOnUnauthorized;
