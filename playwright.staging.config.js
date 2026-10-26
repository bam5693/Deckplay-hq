const { defineConfig, devices } = require('@playwright/test');
const baseURL = process.env.DECKPLAY_STAGING_URL;
if (!baseURL) throw new Error('DECKPLAY_STAGING_URL is required');
const host = new URL(baseURL);
if (host.protocol !== 'https:' || !/staging|preview|test/i.test(host.hostname)) {
  throw new Error('Refusing non-staging host');
}
module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: ['accounts.spec.js', 'staging-smoke.spec.js'],
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/staging-junit.xml' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'staging-chromium', use: devices['Desktop Chrome'] }]
});
