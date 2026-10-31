const { defineConfig, devices } = require('@playwright/test');
const baseURL = process.env.DECKPLAY_STAGING_URL;
if (!baseURL) throw new Error('DECKPLAY_STAGING_URL is required');
const host = new URL(baseURL);
if (host.origin !== 'https://deckplay-hq-staging.cstivers56.workers.dev') {
  throw new Error('Refusing non-staging host');
}
const accessPassword=process.env.DECKPLAY_STAGING_ACCESS_PASSWORD;
if(typeof accessPassword!=='string'||!accessPassword.trim()||/[\r\n]/.test(accessPassword))throw new Error('Staging Basic Auth credentials are missing or malformed. Run the trusted staging credential exchange before Playwright; direct browser navigation does not inherit these credentials.');
module.exports = defineConfig({
  testDir: './tests/e2e',
  outputDir:'test-results/staging',
  testMatch: ['price-lifecycle-live.spec.js', 'share-links-live.spec.js', 'feedback-live.spec.js', 'negotiation-history-live.spec.js', 'staging-auth-smoke.spec.js', 'staging-account-readonly.spec.js', 'listing-editor-live.spec.js', 'seller-pause-live.spec.js', 'staging-catalog-auth-live.spec.js', 'category-coverage-live.spec.js', 'accounts.spec.js', 'staging-smoke.spec.js', 'buyer-seller.spec.js', 'deck-listing.spec.js', 'community.spec.js', 'discovery-alerts.spec.js', 'trading.spec.js', 'staging-permissions.spec.js', 'moderator-mfa-live.spec.js', 'listing-drafts-live.spec.js', 'private-message-photos-live.spec.js', 'seller-overview-live.spec.js'],
  workers: 1,
  timeout: 45000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never',outputFolder:'playwright-report/staging' }], ['junit', { outputFile: 'test-results/staging-junit.xml' }]],
  use: { baseURL,
    ...(process.env.HTTPS_PROXY ? {launchOptions:{proxy:{server:process.env.HTTPS_PROXY}},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE} : {}),
    httpCredentials:{origin:host.origin,username:'deckplay',password:accessPassword}, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'staging-desktop', use: devices['Desktop Chrome'] },{name:'staging-mobile',use:devices['Pixel 7']}]
});
