const rawBase = import.meta.env.VITE_API_BASE_URL ?? '';
const API_BASE = rawBase.replace(/\/$/, '');

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function removeApiPrefix(path: string): string {
  return path.replace(/^\/api/, '') || '/';
}

export function buildApiUrl(path: string): string {
  const normalizedPath = ensureLeadingSlash(path);
  const pathWithoutApiPrefix = removeApiPrefix(normalizedPath);

  if (API_BASE) {
    return `${API_BASE}${pathWithoutApiPrefix}`;
  }

  return `/api${pathWithoutApiPrefix}`;
}
