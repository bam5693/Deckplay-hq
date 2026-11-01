const base=require('./playwright.local.config.js');
module.exports={...base,testMatch:['v1-mobile-sell-acceptance.spec.js'],workers:1,reporter:'list'};
