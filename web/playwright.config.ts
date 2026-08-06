import { defineConfig, devices } from '@playwright/test';

const explicitBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
const baseURL = explicitBaseUrl || 'http://127.0.0.1:3000';

if (explicitBaseUrl) {
  const url = new URL(explicitBaseUrl);
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
  if (
    !localHosts.has(url.hostname) &&
    process.env.PLAYWRIGHT_ALLOW_REMOTE !== 'true'
  ) {
    throw new Error(
      'Remote Playwright targets are disabled by default. Set ' +
        'PLAYWRIGHT_ALLOW_REMOTE=true only for an isolated non-production test deployment.',
    );
  }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['microphone'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
          ],
        },
      },
    },
  ],
  outputDir: 'test-results/playwright',
});
