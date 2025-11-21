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
    <main>
      <section>
        <h1>Sign in</h1>
        <p>Access the AI Consulting PMO workspace.</p>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {authError && <p role="alert">{authError}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p>
          Need an account? <Link to="/">Contact your administrator.</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
