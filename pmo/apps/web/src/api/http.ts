export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
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
