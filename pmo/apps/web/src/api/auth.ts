import { api } from '../lib/apiClient';

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  timezone?: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await api.post<{ user: AuthUser }>(`/auth/login`, {
    email,
    password,
  });
  return data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const data = await api.get<{ user: AuthUser | null }>(`/auth/me`);
  return data.user ?? null;
}

export async function logout(): Promise<void> {
  await api.post(`/auth/logout`, {});
}
