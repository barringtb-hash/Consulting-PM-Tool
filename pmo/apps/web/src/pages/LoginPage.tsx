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
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <section className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md border border-neutral-200 px-8 py-10">
          <h1 className="text-center mb-2">Sign in</h1>
          <p className="text-center text-neutral-600 mb-8">
            Access the AI Consulting PMO workspace.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 mb-2"
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
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 mb-2"
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
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>
            {authError && (
              <p
                role="alert"
                className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2"
              >
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-sm text-neutral-600 mt-6">
            Need an account? <Link to="/">Contact your administrator.</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
