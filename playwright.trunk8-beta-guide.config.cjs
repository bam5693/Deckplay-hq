const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/e2e',
 testMatch:['support-center.spec.js'],
 grep:/T8\.3 staff queue supports oldest waiting first/,
 reporter:'list',workers:1,retries:0,
 use:{...devices['Pixel 7'],trace:'off',screenshot:'only-on-failure'},
});
