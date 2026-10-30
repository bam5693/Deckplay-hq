const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

test('real staging seller can pause/resume and buyer cannot read or alter paused inventory',async({page,browser})=>{
 test.setTimeout(110000);
 const title=marker();
 await signIn(page,'SELLER');
 const owner=await page.evaluate(()=>currentUser.id);
 let buyerContext;
 try{
  const id=await seedListing(page,title,{category:'video_games',product_type:'game',description:'TEST ONLY synthetic console game listing; pause/resume lifecycle.'});
  await page.evaluate(()=>showCollectorPage('listings'));
  await expect(page.locator('[data-page-pause="'+id+'"]')).toBeVisible({timeout:20000});
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('[data-page-pause="'+id+'"]').click();
  await expect(page.locator('[data-page-resume="'+id+'"]')).toBeVisible({timeout:20000});
  const paused=await page.evaluate(async id=>{const r=await supabaseClient.from('listings').select('id,status').eq('id',id).eq('seller_id',currentUser.id).single();if(r.error)throw Error(r.error.message);return r.data},id);
  expect(paused.status).toBe('paused');

  buyerContext=await browser.newContext({
   baseURL:process.env.DECKPLAY_STAGING_URL,
   viewport:page.viewportSize(),
   httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
   ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
  });
  const buyer=await buyerContext.newPage();await signIn(buyer,'BUYER');
  const buyerCannotSee=await buyer.evaluate(async id=>{
   const result=await supabaseClient.from('listings').select('id,status').eq('id',id).maybeSingle();
   if(result.error)throw Error(result.error.message);return result.data;
  },id);
  expect(buyerCannotSee).toBeNull();
  const unauthorized=await buyer.evaluate(async id=>{
   const result=await supabaseClient.from('listings').update({status:'active'}).eq('id',id).eq('status','paused').select('id').maybeSingle();
   return {data:result.data,error:result.error?.message||null};
  },id);
  expect(unauthorized.data).toBeNull();

  await page.locator('[data-page-resume="'+id+'"]').click();
  await expect(page.locator('[data-page-pause="'+id+'"]')).toBeVisible({timeout:20000});
  const restored=await buyer.evaluate(async id=>{
   const result=await supabaseClient.from('listings').select('id,status').eq('id',id).maybeSingle();
   if(result.error)throw Error(result.error.message);return result.data;
  },id);
  expect(restored).toMatchObject({id,status:'active'});

  // Even the owner cannot force a reserved state via the public Data API.
  const invalid=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('listings').update({status:'reserved'}).eq('id',id).eq('seller_id',currentUser.id).eq('status','active').select('id').maybeSingle();
   return {data,denied:!!error};
  },id);
  expect(invalid.data).toBeNull();expect(invalid.denied).toBe(true);
  const final=await page.evaluate(async id=>(await supabaseClient.from('listings').select('status').eq('id',id).single()).data.status,id);
  expect(final).toBe('active');
  expect(await page.evaluate(()=>currentUser.id)).toBe(owner);
 }finally{
  await buyerContext?.close();
  await cleanup(page,title);
 }
});
