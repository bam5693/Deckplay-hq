const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/e2e',
 testMatch:['support-center.spec.js'],
 grep:/T8\.6 (private beta access and issue follow-up|ticket next-step guidance)/,
 reporter:'list',workers:1,retries:0,
 use:{...devices['Pixel 7'],trace:'off',screenshot:'only-on-failure'},
});
