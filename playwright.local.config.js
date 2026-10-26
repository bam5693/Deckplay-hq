const { defineConfig, devices } = require('@playwright/test');
// Local, read-only UI simulations: no production website deployment and no test account logins.
// The selected tests only manipulate browser UI and the built-in checkout preview.
module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: ['every-option.spec.js', 'selling-category-matrix.spec.js', 'checkout-simulation.spec.js'],
  use: { baseURL: 'http://127.0.0.1:8765' },
  projects: [
    { name: 'local-mobile', use: devices['Pixel 7'] },
    { name: 'local-desktop', use: devices['Desktop Chrome'] }
  ],
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
