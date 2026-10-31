const {test,expect}=require('@playwright/test');
const {signIn}=require('../helpers/staging.cjs');

// Read-only. One signed-in disposable buyer account, no listing creation or
// cleanup, no changes to production or to the isolated staging database.
test('signed-in buyer reload starts catalog and resolves auth privacy preflight',async({page})=>{
 test.setTimeout(40000);
 const pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(String(error.message||error).slice(0,220)));
 await signIn(page,'BUYER');
 await page.reload({waitUntil:'domcontentloaded'});
 const check=()=>page.evaluate(()=>({
  hasAccount:!!currentUser,
  source:listingSource,
  listingRequests:listingsLoadVersion,
  blockRequests:blockedCollectorsLoadVersion,
  count:items.length,
  hasError:!!document.querySelector('[data-retry-marketplace]')
 }));
 try{
  await expect.poll(async()=> (await check()).source,{timeout:17000,intervals:[250,500,1000]}).toBe('live');
 }finally{
  const state=await check();
  console.log('AUTH CATALOG RESULT '+JSON.stringify({...state,pageErrors}));
 }
 await expect(page.locator('#count')).not.toContainText('Loading live listings');
 await expect(page.locator('#market')).toBeAttached();
});
