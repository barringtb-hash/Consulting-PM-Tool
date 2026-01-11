/**
 * Token storage for Safari ITP fallback.
 *
 * Safari's Intelligent Tracking Prevention (ITP) blocks cross-origin cookies
 * even when using the 'partitioned' attribute (CHIPS). This module provides
 * localStorage-based token storage as a fallback mechanism.
 *
 * Authentication flow with Safari fallback:
 * 1. On login, server sets HttpOnly cookie (primary method)
 * 2. Server also returns token in response body
 * 3. Frontend stores token in localStorage
 * 4. On subsequent requests, if cookie isn't sent (Safari ITP), the
 *    Authorization header is included with the stored token
 */

const TOKEN_KEY = 'auth_token';

/**
 * Store authentication token in localStorage.
 * Called after successful login to enable Safari ITP fallback.
 */
export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage may be unavailable in some contexts (private browsing, etc.)
    console.warn('Failed to store auth token in localStorage');
  }
}

/**
 * Retrieve stored authentication token.
 * Used to add Authorization header for Safari ITP fallback.
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove stored authentication token.
 * Called on logout to clear Safari fallback token.
 */
export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore errors when clearing
  }
}
