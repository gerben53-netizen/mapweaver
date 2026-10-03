import { defineConfig } from '@playwright/test'

// Keep Vite in a separate terminal: automatic server teardown stalls on this Windows host.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180000,
  expect: { timeout: 10000 },
  workers: 1,
  retries: 0,
  outputDir: '.audit.local/playwright-results',
  reporter: [['list'], ['json', { outputFile: '.audit.local/e2e-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5180',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 15000,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox', launchOptions: { timeout: 15000 } }, testMatch: /smoke.spec.mjs/ },
  ],
})
