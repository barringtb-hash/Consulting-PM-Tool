import { getStoredToken } from './token-storage';

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
}

/**
 * Build fetch options with authentication support.
 *
 * Includes Authorization header with stored token for Safari ITP fallback.
 * Safari's ITP blocks cross-origin cookies even with partitioned attribute,
 * so we include the token via Authorization header as a fallback mechanism.
 * The server accepts both cookies (preferred) and Authorization header.
 */
export function buildOptions(options?: RequestInit): RequestInit {
  const storedToken = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  // Add Authorization header for Safari ITP fallback
  // Server will use cookie if present, otherwise falls back to this header
  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  return {
    credentials: 'include',
    ...options,
    headers,
  };
}

export async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const { message, error } = (payload as Record<string, unknown>) || {};
    const fallbackMessage =
      typeof payload === 'string' && payload ? payload : 'Request failed';

    const apiError = new Error(
      (message as string) || (error as string) || fallbackMessage,
    ) as ApiError;

    apiError.status = response.status;
    apiError.details = payload;

    throw apiError;
  }

  return (payload as T) ?? (null as T);
}
