export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface ApiError {
  error?: string;
  message?: string;
}

const AUTH_BASE_PATH = '/api/auth';

function buildOptions(options?: RequestInit): RequestInit {
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
  };

  return {
    credentials: 'include',
    ...options,
    headers,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const { message, error } = (payload as ApiError) || {};
    const fallbackMessage =
      typeof payload === 'string' && payload ? payload : 'Request failed';

    throw new Error(message || error || fallbackMessage);
  }

  return (payload as T) ?? (null as T);
}

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
