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

test('collector session survives page refresh',async({page})=>{
 await signIn(page,'BUYER');
 const id=await page.evaluate(()=>currentUser.id);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>currentUser?.id),{timeout:20000}).toBe(id);
});

test('staging search recovers after offline interruption',async({page,context})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#search')).toBeVisible();
 await context.setOffline(true);
 try{
  await page.locator('#search').fill('offline test');
  await expect(page.locator('#search')).toHaveValue('offline test');
 }finally{await context.setOffline(false)}
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#search')).toBeVisible();
});

test('buyer cannot reopen a reserved listing after accepted offer',async({page,browser})=>{
 test.setTimeout(120000);
 const {seedListing,cleanup,marker}=require('../helpers/staging.cjs');
 const title=marker();
 await signIn(page,'SELLER');
 const id=await seedListing(page,title);
 const ctx=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD}});
 const buyer=await ctx.newPage();
 try{
  await signIn(buyer,'BUYER');
  const offer=await buyer.evaluate(async id=>{const {data,error}=await supabaseClient.rpc('submit_price_offer',{p_listing_id:id,p_amount:20});if(error)throw Error(error.message);return data},id);
  await page.evaluate(async offer=>{const {error}=await supabaseClient.rpc('respond_price_offer',{p_offer_id:offer,p_action:'accept',p_amount:null});if(error)throw Error(error.message)},offer);
  const result=await buyer.evaluate(async id=>{const {data,error}=await supabaseClient.rpc('submit_price_offer',{p_listing_id:id,p_amount:21});return {data,error:error?.message||null}},id);
  expect(result.error,'Reserved listing must reject a new buyer offer').toBeTruthy();
  const status=await page.evaluate(async id=>{const {data,error}=await supabaseClient.from('listings').select('status').eq('id',id).single();if(error)throw Error(error.message);return data.status},id);
  expect(status).toBe('reserved');
 }finally{try{await cleanup(page,title)}finally{await ctx.close()}}
});

test('signed-out visitor can browse but cannot create a price offer',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#search')).toBeVisible();
 const result=await page.evaluate(async()=>{const {data,error}=await supabaseClient.rpc('submit_price_offer',{p_listing_id:'00000000-0000-0000-0000-000000000000',p_amount:20});return {data,error:error?.message||null}});
 expect(result.error,'Anonymous offers must be refused').toBeTruthy();
});

test('anonymous visitor cannot create a private collector message',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{const {data,error}=await supabaseClient.from('collector_messages').insert({sender_id:'00000000-0000-0000-0000-000000000000',recipient_id:'00000000-0000-0000-0000-000000000000',body:'TEST ONLY anonymous denied'}).select('id');return {data,error:error?.message||null}});
 expect(result.data||[],'No anonymous messages should be created').toHaveLength(0);
 expect(result.error,'Anonymous messages should fail authorization').toBeTruthy();
});

test('anonymous visitor cannot change another collector profile',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{const {data,error}=await supabaseClient.from('profiles').update({bio:'TEST ONLY unauthorized edit'}).eq('id','00000000-0000-0000-0000-000000000000').select('id');return {data,error:error?.message||null}});
 expect(result.data||[],'Signed-out visitor must not modify profiles').toHaveLength(0);
});

test('signed-out visitor cannot create a simulated checkout order',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{const {data,error}=await supabaseClient.from('demo_orders').insert({creator_id:'00000000-0000-0000-0000-000000000000',creator_role:'buyer',item_name:'TEST ONLY unauthorized demo order',item_price:25,shipping_price:5}).select('id');return {data,error:error?.message||null}});
 expect(result.data||[],'Anonymous visitor must not create demo orders').toHaveLength(0);
});

test('signed-out shopper opens a real synthetic seller profile and following requests sign-in',async({page,browser})=>{
 test.setTimeout(90000);const title=marker();await signIn(page,'SELLER');
 const context=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,viewport:page.viewportSize(),httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE});
 try{
  const id=await seedListing(page,title);const seller=await page.evaluate(async()=>{const {data,error}=await supabaseClient.from('profiles').select('id,username').eq('id',currentUser.id).single();if(error)throw Error(error.message);return data});const sellerId=seller.id;
  const guest=await context.newPage();await guest.goto('/',{waitUntil:'domcontentloaded'});
  await guest.locator('[data-cat="Trading Cards"]').first().click();await guest.locator('#search').fill(title);
  await guest.locator('[data-view="'+id+'"]').click();await guest.locator('[data-profile-id="'+sellerId+'"]').click();
  await expect(guest.locator('#publicProfileTitle')).toHaveText('@'+seller.username,{timeout:15000});
  await guest.locator('[data-follow-profile="'+sellerId+'"]').click();await expect(guest.locator('#authModal')).toHaveClass(/open/);
  expect(await guest.evaluate(()=>currentUser)).toBeNull();
 }finally{try{await cleanup(page,title)}finally{await context.close()}}
});

test('ordinary collector cannot open private Command Center reports',async({page})=>{
 await signIn(page,'BUYER');
 const queueRequests=[];page.on('request',request=>{if(request.url().includes('/rpc/moderation_report_queue'))queueRequests.push(request.url())});
 await page.goto('/moderation.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#state')).toContainText(/MFA required|Access restricted/,{timeout:15000});
 await expect(page.locator('#reports')).toBeEmpty();
 expect(queueRequests,'Ordinary password-only collector must not request private reports').toEqual([]);
});
