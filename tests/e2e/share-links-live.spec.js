const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

// Test a real public listing link on isolated Basic-protected staging, NOT production.
// Only one marker-scoped synthetic listing from the dedicated seller is created.
test('T7.1 signed seller shares an active video game listing with a fresh visitor',async({page,browser})=>{
 test.setTimeout(110000);
 if(process.env.DECKPLAY_STAGING_URL!=='https://deckplay-hq-staging.cstivers56.workers.dev')
  throw Error('Refusing to test a non-staging website');
 await signIn(page,'SELLER');
 const name=marker();
 let visitorContext;
 try{
  const seller=await page.evaluate(()=>({id:currentUser?.id,email:currentUser?.email}));
  expect(seller.email).toBe('deckplay-seller@deckplay.test');
  const id=await seedListing(page,name,{category:'video_games',
   description:'Synthetic video game listing for deep-link acceptance. No actual product for sale.'});
  await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('listings').select('*').eq('id',id).eq('seller_id',currentUser.id).single();
   if(error)throw Error(error.message);
   showDetails(marketplaceItemFromRow(data,{username:'synthetic-seller'}));
  },id);
  await expect(page.locator('#detailModal')).toHaveClass(/open/);
  const button=page.locator('#detailContent [data-copy-kind="listing"]');
  await expect(button).toBeVisible();
  expect(await button.getAttribute('data-copy-id')).toBe(id);
  await button.click();
  const url=await page.evaluate(async()=>{
   const fallback=document.getElementById('deckplayShareFallbackInput');
   if(fallback?.value)return fallback.value;
   try{return await navigator.clipboard.readText()}catch{return null}
  });
  expect(url,'Seller copy action must give a usable share URL').toBeTruthy();
  const parsed=new URL(url);
  expect(parsed.origin).toBe(process.env.DECKPLAY_STAGING_URL);
  expect([...parsed.searchParams.entries()]).toEqual([['listing',id]]);

  visitorContext=await browser.newContext({
   baseURL:process.env.DECKPLAY_STAGING_URL,
   httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
   ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
  });
  const visitor=await visitorContext.newPage();
  await visitor.goto(url,{waitUntil:'domcontentloaded'});
  await expect(visitor.locator('#detailModal')).toHaveClass(/open/,{timeout:20000});
  await expect(visitor.locator('#detailTitle')).toHaveText(name);
  await expect(visitor).toHaveTitle(name+' | DeckPlay HQ');
  await expect(visitor.locator('#detailContent')).toContainText('$25.00');
  await expect(visitor.locator('#detailContent')).not.toContainText('deckplay-seller@deckplay.test');

  // Once a listing is no longer active, the exact same public URL fails closed.
  await page.evaluate(async id=>{
   const {error}=await supabaseClient.from('listings').update({status:'sold'}).eq('id',id).eq('seller_id',currentUser.id);
   if(error)throw Error(error.message);
  },id);
  const stale=await visitorContext.newPage();
  await stale.goto(url,{waitUntil:'domcontentloaded'});
  await expect(stale.locator('#detailModal')).not.toHaveClass(/open/);
  await expect(stale.locator('#toast')).toContainText('no longer available',{timeout:20000});
 }finally{
  if(visitorContext)await visitorContext.close();
  await cleanup(page,name);
 }
});
