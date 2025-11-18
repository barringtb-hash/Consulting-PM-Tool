import { api } from '../lib/apiClient';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

const AUTH_BASE_PATH = '/auth';

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await api.post<{ user: AuthUser }>(`${AUTH_BASE_PATH}/login`, {
    email,
    password,
  });
  return data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const data = await api.get<{ user: AuthUser | null }>(`${AUTH_BASE_PATH}/me`);
  return data.user ?? null;
}

export async function logout(): Promise<void> {
  await api.post(`${AUTH_BASE_PATH}/logout`, {});
}
