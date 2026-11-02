// Focused Trunk 1 seller UX tests. Inherit local-only server and browser settings;
// the shared local config intentionally allowlists other specs.
const local = require('./playwright.local.config');
module.exports = {
  ...local,
  testMatch: ['trunk1-seller-ux.spec.js'],
  reporter: [['list']],
  workers: 1
};
