import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: path.resolve(__dirname, 'test/globalSetup.ts'),
    setupFiles: path.resolve(__dirname, 'test/setup.ts'),
  },
});
