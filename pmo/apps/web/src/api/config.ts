const rawBase = import.meta.env.VITE_API_BASE_URL ?? '';
const API_BASE = rawBase.replace(/\/$/, '');

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function removeApiPrefix(path: string): string {
  return path.replace(/^\/api/, '') || '/';
}

function removeApiSuffix(base: string): string {
  return base.replace(/\/api$/, '');
}

export function buildApiUrl(
  path: string,
  options?: { useApiPrefix?: boolean },
): string {
  const useApiPrefix = options?.useApiPrefix ?? true;
  const normalizedPath = ensureLeadingSlash(path);
  const pathWithoutApiPrefix = removeApiPrefix(normalizedPath);

  if (API_BASE) {
    const base = useApiPrefix ? API_BASE : removeApiSuffix(API_BASE);
    return `${base}${useApiPrefix ? pathWithoutApiPrefix : normalizedPath}`;
  }

  return useApiPrefix ? `/api${pathWithoutApiPrefix}` : normalizedPath;
}
