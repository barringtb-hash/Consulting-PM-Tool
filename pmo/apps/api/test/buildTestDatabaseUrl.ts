export function buildTestDatabaseUrl(base: string, schema: string): string {
  const url = new URL(base);
  url.searchParams.set('schema', schema);
  return url.toString();
}
