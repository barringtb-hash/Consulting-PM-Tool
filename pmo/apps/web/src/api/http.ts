import { getStoredToken } from './token-storage';
import { getStoredTenantId } from './tenant-storage';
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
 *
 * Also includes X-Tenant-ID header for multi-tenant support.
 * This allows the server to resolve the correct tenant context for the request.
 */
export function buildOptions(options?: FetchOptions): RequestInit {
  const storedToken = getStoredToken();
  const storedTenantId = getStoredTenantId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  // Add Authorization header for Safari ITP fallback
  // Server will use cookie if present, otherwise falls back to this header
  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  // Add X-Tenant-ID header for multi-tenant support
  // Server uses this to resolve tenant context for the request
  if (storedTenantId) {
    headers['X-Tenant-ID'] = storedTenantId;
  }

  return {
    credentials: 'include',
    ...options,
    headers,
  };
}

/**
 * Combine multiple AbortSignals into one that aborts when any of them abort.
 * Uses AbortSignal.any() if available (modern browsers), otherwise falls back
 * to manual event listener approach.
 */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  // Filter out undefined/null signals
  const validSignals = signals.filter(Boolean);
  if (validSignals.length === 0) {
    return new AbortController().signal;
  }
  if (validSignals.length === 1) {
    return validSignals[0];
  }

  // Use AbortSignal.any() if available (Chrome 116+, Firefox 124+, Safari 17.4+)
  if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(validSignals);
  }

  // Fallback for older browsers: create a combined controller
  const controller = new AbortController();
  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}

/**
 * Create a fetch with timeout and abort support
 * OPTIMIZED: Supports cancellation to prevent unnecessary network calls
 * and automatic cleanup on component unmount.
 *
 * Properly combines external abort signal with timeout signal so that
 * either can cancel the request.
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

  // Create timeout abort controller
  const timeoutController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // Set up timeout
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      timeoutController.abort(new Error('Request timeout'));
    }, timeout);
  }

  // Combine external signal with timeout signal so either can abort the request
  const signalsToCombine: AbortSignal[] = [timeoutController.signal];
  if (externalSignal) {
    signalsToCombine.push(externalSignal);
  }
  const combinedSignal = combineSignals(signalsToCombine);

  try {
    const response = await fetch(url, {
      ...buildOptions(fetchOptions),
      signal: combinedSignal,
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
