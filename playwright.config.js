import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  // The real server and the real built client, with the Google services replaced by fixed fake data.
  webServer: {
    command: 'node e2e/server.mjs',
    url: `http://localhost:${PORT}/health`,
    env: { E2E_PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
  },
});
