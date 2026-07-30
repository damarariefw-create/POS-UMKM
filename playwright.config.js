import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['**/e2e_test.spec.js'],
  timeout: 90000,
  use: {
    headless: false,
    viewport: { width: 390, height: 844 },
    screenshot: 'on',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: 300,
    },
  },
  reporter: [['list']],
  outputDir: 'test-results',
});
