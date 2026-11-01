const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/e2e',
 testMatch:['support-center.spec.js'],
 grep:/T8\.3: (private reply length indicator follows draft and resets after send|staff sees what a ticket status means before saving|changing accounts clears previous staff status guidance)/,
 reporter:'list',workers:1,retries:0,
 use:{...devices['Pixel 7'],trace:'off',screenshot:'only-on-failure'},
});
