import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist/client', emptyOutDir: true, sourcemap: false, target: 'es2022' },
  server: { proxy: { '/api': 'http://localhost:8080' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.jsx'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['**/*.{js,jsx}'],
      exclude: ['test/**', 'main.jsx', 'theme.js', 'types.js'],
      thresholds: { lines: 90, functions: 85, branches: 80, statements: 90 },
    },
  },
});
