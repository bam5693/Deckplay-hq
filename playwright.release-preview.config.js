const {defineConfig,devices}=require('@playwright/test');
const origin='https://deckplay-hq-release-preview.cstivers56.workers.dev';
if(process.env.DECKPLAY_STAGING_URL!==origin)throw Error('Only the isolated release preview may be tested');
if(!process.env.DECKPLAY_STAGING_ACCESS_PASSWORD)throw Error('Trusted staging credentials required');
module.exports=defineConfig({
 testDir:'./tests/e2e',testMatch:['release-preview-marketplace.spec.js','release-preview-trades.spec.js','release-preview-listing.spec.js'],
 outputDir:'test-results/release-preview',workers:1,retries:0,timeout:60000,
 reporter:[['list'],['junit',{outputFile:'test-results/release-preview-junit.xml'}]],
 use:{baseURL:origin,httpCredentials:{origin,username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},trace:'off',screenshot:'off',video:'off'},
 projects:[{name:'release-desktop',use:devices['Desktop Chrome']},{name:'release-mobile',use:devices['Pixel 7']}]
});
