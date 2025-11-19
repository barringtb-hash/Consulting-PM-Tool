import { describe, expect, it } from 'vitest';

import { buildTestDatabaseUrl } from './buildTestDatabaseUrl';

describe('buildTestDatabaseUrl', () => {
  it('adds schema when there are no query params', () => {
    const base = 'postgresql://user:pass@localhost:5432/db';
    const url = new URL(buildTestDatabaseUrl(base, 'test_1'));

    expect(url.searchParams.get('schema')).toBe('test_1');
  });

  it('replaces existing schema param and preserves others', () => {
    const base =
      'postgresql://user:pass@localhost:5432/db?schema=public&sslmode=require';

    const url = new URL(buildTestDatabaseUrl(base, 'test_2'));

    expect(url.searchParams.get('schema')).toBe('test_2');
    expect(url.searchParams.get('sslmode')).toBe('require');
  });
});
