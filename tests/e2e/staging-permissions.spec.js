const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');
// Real staging-only authorization check; never use production data.
test('buyer cannot modify another collector listing',async({page,browser})=>{
 test.setTimeout(90000);const title=marker();
 await signIn(page,'SELLER');const listingId=await seedListing(page,title);
 const context=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,viewport:page.viewportSize(),httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE});
 const buyer=await context.newPage();
 try{
  await signIn(buyer,'BUYER');
  const attempt=await buyer.evaluate(async({id,title})=>{
   const {data,error}=await supabaseClient.from('listings').update({title:title+' UNAUTHORIZED'}).eq('id',id).select('id,title');
   return {rows:data||[],error:error?.message||null};
  },{id:listingId,title});
  expect(attempt.rows,'Unauthorized buyer must not update seller listing').toHaveLength(0);
  const original=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('listings').select('title').eq('id',id).single();
   if(error)throw Error(error.message);return data.title;
  },listingId);
  expect(original,'Listing must remain unchanged').toBe(title);
 }finally{try{await cleanup(page,title)}finally{await context.close()}}
});
