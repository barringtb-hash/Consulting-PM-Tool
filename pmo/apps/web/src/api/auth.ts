import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

const AUTH_BASE_PATH = buildApiUrl('/auth', { useApiPrefix: false });

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

  const data = await handleResponse<{ user: AuthUser }>(response);
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

  await handleResponse<void>(response);
}
