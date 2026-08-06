import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  oxc: false,
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
