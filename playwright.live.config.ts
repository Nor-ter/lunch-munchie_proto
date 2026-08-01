import { defineConfig, devices } from 'playwright/test';
import { harnessConfig, isCI } from './e2e-harness/config';

// Drives an already-running deployed/local app. Unlike the old mock suite, this
// config never starts Vite and never injects authentication tokens.
export default defineConfig({
  testDir: './e2e-harness/tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['list'], ['junit', { outputFile: 'test-results/e2e-live.xml' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: harnessConfig.baseUrl,
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure',
    actionTimeout: 20_000, navigationTimeout: 30_000,
    ...devices['Desktop Chrome'],
  },
});
