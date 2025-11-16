import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthUser,
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '../api/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const currentUser = await fetchCurrentUser();

        if (!isMounted) {
          return;
        }

        if (currentUser) {
          setUser(currentUser);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      } catch (err) {
        console.error('Failed to fetch current user', err);

        if (!isMounted) {
          return;
        }

        setUser(null);
        setStatus('unauthenticated');
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setStatus('loading');

    try {
      const authenticatedUser = await loginRequest(email, password);
      setUser(authenticatedUser);
      setStatus('authenticated');
      return authenticatedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      setStatus('unauthenticated');
      throw err instanceof Error ? err : new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    setStatus('loading');

    try {
      await logoutRequest();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      error,
      login,
      logout,
    }),
    [user, status, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
