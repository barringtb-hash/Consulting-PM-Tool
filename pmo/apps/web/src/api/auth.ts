import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';
import { storeToken, clearStoredToken } from './token-storage';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
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

  const data = await handleResponse<{ user: AuthUser; token?: string }>(response);

  // Store token for Safari ITP fallback
  // Safari may block cookies even with partitioned attribute,
  // so we store the token in localStorage and send via Authorization header
  if (data.token) {
    storeToken(data.token);
  }

  return data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/me`,
    buildOptions({
      method: 'GET',
    }),
  );

  const data = await handleResponse<{ user: AuthUser | null }>(response);
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
