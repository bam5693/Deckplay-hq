const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({ testDir: './tests/e2e', use: { baseURL: 'https://deckplayhq.com' }, projects: [{ name: 'mobile', use: devices['Pixel 7'] }, { name: 'desktop', use: devices['Desktop Chrome'] }] });
