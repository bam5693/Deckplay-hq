const { defineConfig, devices } = require('@playwright/test');
// Local, read-only UI simulations: no production website deployment and no test account logins.
// The selected tests only manipulate browser UI and the built-in checkout preview.
module.exports = defineConfig({
  testDir: './tests/e2e',
  outputDir:'test-results/local',
  workers: 2,
  reporter: [['list'], ['html',{open:'never',outputFolder:'playwright-report/local'}], ['junit',{outputFile:'test-results/local-junit.xml'}]],
  testMatch: ['every-option.spec.js', 'selling-category-matrix.spec.js', 'checkout-simulation.spec.js', 'marketplace-safety.spec.js', 'flows.spec.js', 'wanted-matches.spec.js', 'smoke.spec.js', 'regressions.spec.js', 'auth-errors.spec.js', 'inbox-recovery.spec.js', 'auth-recovery.spec.js', 'account-boundaries.spec.js', 'profile-edit.spec.js', 'trade-picker.spec.js', 'marketplace-filter-boundaries.spec.js', 'tcg-sets.spec.js'],
  use: { baseURL: 'http://127.0.0.1:8765', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'local-mobile', use: devices['Pixel 7'] },
    { name: 'local-desktop', use: devices['Desktop Chrome'] }
  ],
  webServer: {
    command: 'node scripts/build-staging.cjs && python3 -m http.server 8765 --bind 127.0.0.1 --directory dist-staging',
    env: {DECKPLAY_STAGING_SUPABASE_URL:'https://prrrzeelltmyugssqnzk.supabase.co', DECKPLAY_STAGING_SUPABASE_KEY:'sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh'},
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
