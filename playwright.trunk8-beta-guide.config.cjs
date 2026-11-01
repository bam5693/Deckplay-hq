const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/e2e',
 testMatch:['support-center.spec.js'],
 grep:/^(verified staff sees queue, responds privately and resolves ticket|T8\.3: collector tickets load while optional staff authorization is pending|T8\.3: changing accounts clears previous staff status guidance)$/,
 reporter:'list',workers:1,retries:0,
 use:{...devices['Pixel 7'],trace:'off',screenshot:'only-on-failure'},
});
