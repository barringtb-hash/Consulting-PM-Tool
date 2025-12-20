import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';
import { storeToken, clearStoredToken, getStoredToken } from './token-storage';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
}

const AUTH_BASE_PATH = buildApiUrl('/auth');

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/login`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  );

  const data = await handleResponse<{ user: AuthUser; token?: string }>(
    response,
  );

  // Store token for Safari ITP fallback
  // Safari may block cookies even with partitioned attribute,
  // so we store the token in localStorage and send via Authorization header
  if (data.token) {
    storeToken(data.token);
  }

  return data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const hadStoredToken = !!getStoredToken();

  const response = await fetch(
    `${AUTH_BASE_PATH}/me`,
    buildOptions({
      method: 'GET',
    }),
  );

  const data = await handleResponse<{ user: AuthUser | null; token?: string }>(
    response,
  );

  // Store token for Safari ITP fallback.
  // This ensures users who logged in before the Safari localStorage fallback
  // was implemented will get their tokens stored on subsequent page loads.
  if (data.token) {
    storeToken(data.token);
  } else if (hadStoredToken && !data.user) {
    // If we had a stored token but the response indicates no authenticated user,
    // the token was invalid or expired - clear it to avoid sending stale tokens.
    clearStoredToken();
  }

  return data.user ?? null;
}

export async function logout(): Promise<void> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/logout`,
    buildOptions({
      method: 'POST',
    }),
  );

  // Clear stored token for Safari ITP fallback
  clearStoredToken();

  await handleResponse<void>(response);
}
