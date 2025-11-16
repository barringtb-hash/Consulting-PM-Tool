/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';

import { comparePassword, hashPassword } from '../src/auth/password';

describe('password utilities', () => {
  it('hashes and verifies a password', async () => {
    const password = 'StrongPassword123!';

    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);
  });

  it('fails verification when passwords do not match', async () => {
    const password = 'correct-horse';
    const hash = await hashPassword(password);

    expect(await comparePassword('wrong-battery', hash)).toBe(false);
  });
});
