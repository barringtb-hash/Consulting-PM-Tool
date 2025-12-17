import { getStoredToken } from './token-storage';
import { buildApiUrl } from './config';

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
  isAborted?: boolean;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
}

/**
 * Check if an error is an abort error (request was cancelled)
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Default request timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Extended fetch options with abort and timeout support
 */
export interface FetchOptions extends RequestInit {
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Build fetch options with authentication support.
 *
 * Includes Authorization header with stored token for Safari ITP fallback.
 * Safari's ITP blocks cross-origin cookies even with partitioned attribute,
 * so we include the token via Authorization header as a fallback mechanism.
 * The server accepts both cookies (preferred) and Authorization header.
 */
export function buildOptions(options?: FetchOptions): RequestInit {
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

/**
 * Create a fetch with timeout and abort support
 * OPTIMIZED: Supports cancellation to prevent unnecessary network calls
 * and automatic cleanup on component unmount
 */
async function fetchWithAbort(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  // Create internal abort controller for timeout
  const timeoutController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // If external signal provided, use it; otherwise use timeout signal
  // If external signal aborts, abort the timeout controller too
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => timeoutController.abort());
  }

  // Set up timeout
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, timeout);
  }

  try {
    const response = await fetch(url, {
      ...buildOptions(fetchOptions),
      signal: timeoutController.signal,
    });
    return response;
  } catch (error) {
    // Enhance abort errors with more context
    if (error instanceof Error && error.name === 'AbortError') {
      const apiError = new Error('Request was cancelled') as ApiError;
      apiError.isAborted = true;
      throw apiError;
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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

/**
 * Request options for http methods
 */
export interface HttpRequestOptions {
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * HTTP utility object for making API requests.
 * OPTIMIZED: Now supports AbortController for request cancellation
 *
 * Usage with abort:
 * ```typescript
 * const controller = new AbortController();
 * http.get('/api/data', { signal: controller.signal });
 * // Later, to cancel:
 * controller.abort();
 * ```
 */
export const http = {
  async get<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    const response = await fetchWithAbort(buildApiUrl(path), {
      method: 'GET',
      ...options,
    });
    return handleResponse<T>(response);
  },

  async post<T>(
    path: string,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const response = await fetchWithAbort(buildApiUrl(path), {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    return handleResponse<T>(response);
  },

  async put<T>(
    path: string,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const response = await fetchWithAbort(buildApiUrl(path), {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(
    path: string,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const response = await fetchWithAbort(buildApiUrl(path), {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    const response = await fetchWithAbort(buildApiUrl(path), {
      method: 'DELETE',
      ...options,
    });
    return handleResponse<T>(response);
  },
};

/**
 * Create an AbortController with automatic cleanup
 * Useful for component lifecycle management
 *
 * Usage in React:
 * ```typescript
 * useEffect(() => {
 *   const controller = createAbortController();
 *   http.get('/api/data', { signal: controller.signal });
 *   return () => controller.abort();
 * }, []);
 * ```
 */
export function createAbortController(): AbortController {
  return new AbortController();
}
