const rawBase = import.meta.env.VITE_API_BASE_URL ?? '';
const API_BASE = rawBase.replace(/\/$/, '');

if (!API_BASE && import.meta.env.PROD) {
  // Avoid silent 404s when the production deployment forgets to set the base URL.
  console.error(
    '[API config] VITE_API_BASE_URL is missing in production. Set it to your Render API base (e.g., https://<render-app>.onrender.com/api) so requests reach the backend.',
  );
}

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
