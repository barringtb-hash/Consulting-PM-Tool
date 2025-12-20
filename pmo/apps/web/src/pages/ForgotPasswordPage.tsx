import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { forgotPassword } from '../api/auth';

function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  // Apply system dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applySystemTheme(mediaQuery);
    mediaQuery.addEventListener('change', applySystemTheme);
    return () => mediaQuery.removeEventListener('change', applySystemTheme);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setDevResetUrl(null);

    try {
      const response = await forgotPassword(email);
      setSuccess(true);
      // In development, show the reset URL for testing
      if (response.resetUrl) {
        setDevResetUrl(response.resetUrl);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4 py-12 transition-colors">
      <section className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800/80 rounded-lg shadow-md dark:shadow-dark-lg border border-neutral-200 dark:border-neutral-700/80 dark:ring-1 dark:ring-white/5 px-8 py-10">
          <h1 className="text-center mb-2 text-neutral-900 dark:text-neutral-100">
            Forgot Password
          </h1>
          <p className="text-center text-neutral-600 dark:text-neutral-400 mb-8">
            Enter your email to receive a password reset link.
          </p>

          {success ? (
            <div className="space-y-6">
              <div className="text-sm text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-700 rounded-lg px-4 py-3">
                <p className="font-medium mb-1">Check your email</p>
                <p>
                  If an account with that email exists, you will receive a
                  password reset link shortly.
                </p>
              </div>

              {devResetUrl && (
                <div className="text-sm text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-700 rounded-lg px-4 py-3">
                  <p className="font-medium mb-1">Development Mode</p>
                  <p className="mb-2">
                    Reset link (would be emailed in production):
                  </p>
                  <a
                    href={devResetUrl}
                    className="text-primary-600 dark:text-primary-400 hover:underline break-all"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}

              <Link
                to="/login"
                className="block w-full text-center bg-primary-600 dark:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
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

              {error && (
                <p
                  role="alert"
                  className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-700 rounded-lg px-3 py-2"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-600 dark:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-6">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
