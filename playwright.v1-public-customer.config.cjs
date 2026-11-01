const base=require('./playwright.local.config.js');
module.exports={...base,testMatch:['v1-public-customer-audit.spec.js'],workers:1,reporter:'list'};
