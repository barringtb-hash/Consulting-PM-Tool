const rawBase = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_BASE_URL = rawBase.replace(/\/$/, '');

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const { message, error } = (payload as Record<string, unknown>) || {};
    const fallbackMessage =
      typeof payload === 'string' && payload
        ? payload
        : `API error ${response.status}`;

    const errorMessage =
      (typeof message === 'string' && message) ||
      (typeof error === 'string' && error) ||
      fallbackMessage;

    const apiError = Object.assign(new Error(errorMessage), {
      status: response.status,
      details: payload,
    }) as ApiError;

    throw apiError;
  }

  return (payload as T) ?? (null as T);
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : options?.body,
    }),
  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : options?.body,
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : options?.body,
    }),
  delete: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
