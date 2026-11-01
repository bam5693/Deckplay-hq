const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'./tests/e2e',
  testMatch:['owner-preview-navigation.spec.js'],
  reporter:'list',
  workers:2,
  timeout:30000,
  use:{baseURL:'http://127.0.0.1:8768',trace:'off',screenshot:'off',video:'off'},
  projects:[
    {name:'owner-preview-desktop',use:devices['Desktop Chrome']},
    {name:'owner-preview-mobile',use:devices['Pixel 7']}
  ],
  webServer:{
    command:'node scripts/release-preflight.cjs && python3 -m http.server 8768 --bind 127.0.0.1 --directory dist-release',
    url:'http://127.0.0.1:8768/',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  }
});
