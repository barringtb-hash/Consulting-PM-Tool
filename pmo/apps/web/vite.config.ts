import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  resolve: {
    // Ensure only one React instance is used across all dependencies
    // This prevents "Invalid hook call" errors from multiple React copies
    alias: {
      react: resolve(__dirname, '../../node_modules/react'),
      'react-dom': resolve(__dirname, '../../node_modules/react-dom'),
    },
    // Dedupe React in monorepo setup
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Include React to prevent issues with dependencies
    include: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
