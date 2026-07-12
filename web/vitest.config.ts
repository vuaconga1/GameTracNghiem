import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  oxc: false,
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: { environment: 'node', passWithNoTests: true },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
