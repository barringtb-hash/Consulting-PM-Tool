import React, { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function LoginPage(): JSX.Element {
  const { login, status, user, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = useMemo(() => {
    const fromState = location.state as { from?: Location } | undefined;
    return fromState?.from?.pathname || '/dashboard';
  }, [location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply system dark mode preference on login page
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Apply initial theme
    applySystemTheme(mediaQuery);

    // Listen for system theme changes
    mediaQuery.addEventListener('change', applySystemTheme);
    return () => mediaQuery.removeEventListener('change', applySystemTheme);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, status, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Navigation is handled by useEffect when status changes to 'authenticated'
    } catch {
      // Error is already handled and set by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4 py-12 transition-colors">
      <section className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800/80 rounded-lg shadow-md dark:shadow-dark-lg border border-neutral-200 dark:border-neutral-700/80 dark:ring-1 dark:ring-white/5 px-8 py-10">
          <h1 className="text-center mb-2 text-neutral-900 dark:text-neutral-100">
            Sign in
          </h1>
          <p className="text-center text-neutral-600 dark:text-neutral-400 mb-8">
            Access the AI Consulting PMO workspace.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
              />
            </div>
            {authError && (
              <p
                role="alert"
                className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-700 rounded-lg px-3 py-2"
              >
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 dark:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-6">
            Need an account? <Link to="/">Contact your administrator.</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
