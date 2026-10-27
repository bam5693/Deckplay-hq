const { defineConfig, devices } = require('@playwright/test');
const baseURL = process.env.DECKPLAY_STAGING_URL;
if (!baseURL) throw new Error('DECKPLAY_STAGING_URL is required');
const host = new URL(baseURL);
if (host.origin !== 'https://deckplay-hq-staging.cstivers56.workers.dev') {
  throw new Error('Refusing non-staging host');
}
module.exports = defineConfig({
  testDir: './tests/e2e',
  outputDir:'test-results/staging',
  testMatch: ['accounts.spec.js', 'staging-smoke.spec.js', 'buyer-seller.spec.js', 'community.spec.js', 'trading.spec.js', 'staging-permissions.spec.js'],
  workers: 1,
  timeout: 45000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never',outputFolder:'playwright-report/staging' }], ['junit', { outputFile: 'test-results/staging-junit.xml' }]],
  use: { baseURL,
    ...(process.env.HTTPS_PROXY ? {launchOptions:{proxy:{server:process.env.HTTPS_PROXY}},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE} : {}),
    httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD||''}, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'staging-desktop', use: devices['Desktop Chrome'] },{name:'staging-mobile',use:devices['Pixel 7']}]
});
