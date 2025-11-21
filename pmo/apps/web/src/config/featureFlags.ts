/**
 * Feature Flags Configuration
 *
 * Centralized configuration for feature flags using environment variables.
 * Feature flags allow enabling/disabling features without code changes.
 */

/**
 * Check if login/authentication is enabled
 * When disabled, authentication is bypassed and all routes are accessible
 * @returns true if login is enabled, false otherwise
 */
export const isLoginEnabled = (): boolean => {
  const enableLogin = import.meta.env.VITE_ENABLE_LOGIN;

  // Default to true if not set (secure by default)
  if (enableLogin === undefined || enableLogin === null || enableLogin === '') {
    return true;
  }

  // Handle string boolean values
  if (typeof enableLogin === 'string') {
    return enableLogin.toLowerCase() === 'true';
  }

  return Boolean(enableLogin);
};

/**
 * Feature flags object for easy access
 */
export const featureFlags = {
  login: isLoginEnabled(),
} as const;
