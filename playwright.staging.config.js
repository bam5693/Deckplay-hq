const { defineConfig, devices } = require('@playwright/test');
const baseURL = process.env.DECKPLAY_STAGING_URL;
if (!baseURL) throw new Error('DECKPLAY_STAGING_URL is required');
module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: 'accounts.spec.js',
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'staging-chromium', use: devices['Desktop Chrome'] }]
});
