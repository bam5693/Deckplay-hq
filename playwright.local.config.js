const { defineConfig, devices } = require('@playwright/test');
// Local, read-only UI simulations: no production website deployment and no test account logins.
// The selected tests only manipulate browser UI and the built-in checkout preview.
module.exports = defineConfig({
  testDir: './tests/e2e',
  outputDir:'test-results/local',
  workers: 2,
  reporter: [['list'], ['html',{open:'never',outputFolder:'playwright-report/local'}], ['junit',{outputFile:'test-results/local-junit.xml'}]],
  testMatch: ['trade-conversation-navigation.spec.js', 'inbox-negotiation-history.spec.js', 'inbox-price-withdrawal.spec.js', 'listing-contents-preview.spec.js', 'inbox-conversations.spec.js', 'inbox-activity-history.spec.js', 'seller-inventory.spec.js', 'inbox-history.spec.js', 'favorites-recovery.spec.js', 'listing-editor.spec.js', 'category-coverage.spec.js', 'every-option.spec.js', 'selling-category-matrix.spec.js', 'checkout-simulation.spec.js', 'marketplace-safety.spec.js', 'flows.spec.js', 'wanted-matches.spec.js', 'smoke.spec.js', 'regressions.spec.js', 'auth-errors.spec.js', 'inbox-recovery.spec.js', 'private-message-photos.spec.js', 'seller-overview.spec.js', 'inbox-request-order.spec.js', 'auth-recovery.spec.js', 'account-boundaries.spec.js', 'profile-edit.spec.js', 'trade-picker.spec.js', 'inbox-trade-details.spec.js', 'collection-sharing.spec.js', 'marketplace-filter-boundaries.spec.js', 'tcg-sets.spec.js', 'discovery-profiles.spec.js', 'price-offer-recovery.spec.js', 'listing-description.spec.js', 'listing-publication.spec.js', 'moderation-security.spec.js', 'moderator-access.spec.js', 'collection-inquiry-auth.spec.js', 'notification-prices.spec.js'],
  use: { baseURL: 'http://127.0.0.1:8765', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'local-mobile', use: devices['Pixel 7'] },
    { name: 'local-desktop', use: devices['Desktop Chrome'] }
  ],
  webServer: {
    command: 'node scripts/build-staging.cjs && python3 -m http.server 8765 --bind 127.0.0.1 --directory dist-staging',
    env: {DECKPLAY_STAGING_SUPABASE_URL:'https://prrrzeelltmyugssqnzk.supabase.co', DECKPLAY_STAGING_SUPABASE_KEY:'sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh', DECKPLAY_STAGING_SUPABASE_ANON_KEY:'sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh'},
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});

