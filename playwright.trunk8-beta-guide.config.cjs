const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/e2e',
 testMatch:['support-center.spec.js'],
 grep:/(collector creates, reads and replies to private ticket, account switch clears view|T8\.3: buyer and staff filter open\/resolved tickets server-side without losing account isolation|T8\.3: stale reply from another account cannot unlock the current reply)/,
 reporter:'list',workers:1,retries:0,
 use:{...devices['Pixel 7'],trace:'off',screenshot:'only-on-failure'},
});
