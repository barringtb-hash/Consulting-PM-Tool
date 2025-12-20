import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { verifyResetToken, resetPassword } from '../api/auth';

function ResetPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

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

  // Verify token on mount
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setError(
          'No reset token provided. Please request a new password reset link.',
        );
        setIsVerifying(false);
        return;
      }

      try {
        const result = await verifyResetToken(token);
        setTokenValid(result.valid);
        if (!result.valid) {
          setError(result.message || 'Invalid or expired token.');
        }
      } catch (_err) {
        setError(
          'Failed to verify token. Please request a new password reset link.',
        );
      } finally {
        setIsVerifying(false);
      }
    }

    checkToken();
  }, [token]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Password must contain a lowercase letter');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain an uppercase letter');
    }
    if (!/\d/.test(pwd)) {
      errors.push('Password must contain a number');
    }
    if (!/[@$!%*?&]/.test(pwd)) {
      errors.push('Password must contain a special character (@$!%*?&)');
    }
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword) {
      setValidationErrors(validatePassword(newPassword));
    } else {
      setValidationErrors([]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate password
    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      setValidationErrors(pwdErrors);
      setIsSubmitting(false);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      await resetPassword(token, password, confirmPassword);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
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

  if (isVerifying) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4 py-12 transition-colors">
        <section className="w-full max-w-md">
          <div className="bg-white dark:bg-neutral-800/80 rounded-lg shadow-md dark:shadow-dark-lg border border-neutral-200 dark:border-neutral-700/80 dark:ring-1 dark:ring-white/5 px-8 py-10">
            <div className="text-center text-neutral-600 dark:text-neutral-400">
              Verifying your reset link...
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4 py-12 transition-colors">
      <section className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800/80 rounded-lg shadow-md dark:shadow-dark-lg border border-neutral-200 dark:border-neutral-700/80 dark:ring-1 dark:ring-white/5 px-8 py-10">
          <h1 className="text-center mb-2 text-neutral-900 dark:text-neutral-100">
            Reset Password
          </h1>
          <p className="text-center text-neutral-600 dark:text-neutral-400 mb-8">
            {tokenValid
              ? 'Enter your new password below.'
              : 'There was an issue with your reset link.'}
          </p>

          {success ? (
            <div className="space-y-6">
              <div className="text-sm text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-700 rounded-lg px-4 py-3">
                <p className="font-medium mb-1">Password Reset Successful</p>
                <p>
                  Your password has been reset. You will be redirected to the
                  login page in a few seconds.
                </p>
              </div>

              <Link
                to="/login"
                className="block w-full text-center bg-primary-600 dark:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          ) : tokenValid ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                />
                {validationErrors.length > 0 && (
                  <ul className="mt-2 text-sm text-danger-600 dark:text-danger-400 list-disc list-inside">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                disabled={isSubmitting || validationErrors.length > 0}
                className="w-full bg-primary-600 dark:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-700 rounded-lg px-4 py-3">
                <p className="font-medium mb-1">Invalid or Expired Link</p>
                <p>{error || 'This password reset link is no longer valid.'}</p>
              </div>

              <Link
                to="/forgot-password"
                className="block w-full text-center bg-primary-600 dark:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 transition-colors"
              >
                Request New Reset Link
              </Link>
            </div>
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

export default ResetPasswordPage;
