const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

async function openListing(page,title,id){
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-cat="Trading Cards"]').first().click();await page.locator('#search').fill(title);
 await page.locator('[data-view="'+id+'"]').click();await expect(page.locator('#detailTitle')).toHaveText(title);
}
async function openProfile(page,sellerId){
 await page.locator('[data-profile-id="'+sellerId+'"]').click();
 await expect(page.locator('[data-follow-profile="'+sellerId+'"]')).toBeVisible();
}

test('Kyle follows and unfollows Charles; listing and wanted-match alerts open the correct item',async({page,browser})=>{
 test.setTimeout(180000);
 const titles=[marker(),marker(),marker()];let priorFollow,priorWanted;
 await signIn(page,'SELLER');const sellerId=await page.evaluate(()=>currentUser.id);
 const context=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,viewport:page.viewportSize(),httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE});
 const buyer=await context.newPage();
 try{
  await signIn(buyer,'BUYER');
  const original=await buyer.evaluate(async sellerId=>{
   const follow=await supabaseClient.from('seller_follows').select('seller_id').eq('follower_id',currentUser.id).eq('seller_id',sellerId).maybeSingle();
   const prefs=await supabaseClient.from('notification_preferences').select('wanted_matches').eq('user_id',currentUser.id).maybeSingle();
   if(follow.error||prefs.error)throw Error((follow.error||prefs.error).message);
   return {following:!!follow.data,wanted:prefs.data?.wanted_matches};
  },sellerId);priorFollow=original.following;priorWanted=original.wanted;
  await buyer.evaluate(async sellerId=>{const {error}=await supabaseClient.from('seller_follows').delete().eq('follower_id',currentUser.id).eq('seller_id',sellerId);if(error)throw Error(error.message)},sellerId);
  const initial=await seedListing(page,titles[0]);
  await test.step('Kyle follows Charles through the seller profile and refreshes',async()=>{
   await openListing(buyer,titles[0],initial);await openProfile(buyer,sellerId);
   const follow=buyer.locator('[data-follow-profile="'+sellerId+'"]');await expect(follow).toHaveText('Follow seller');await follow.click();await expect(follow).toHaveText('Following ✓');
   await openListing(buyer,titles[0],initial);await openProfile(buyer,sellerId);await expect(follow).toHaveText('Following ✓');
  });
  await buyer.evaluate(async title=>{
   const {error}=await supabaseClient.from('wanted_posts').insert({user_id:currentUser.id,title,game:'one_piece',budget:30,details:title});if(error)throw Error(error.message);
   const prefs=await supabaseClient.from('notification_preferences').update({wanted_matches:true}).eq('user_id',currentUser.id);if(prefs.error)throw Error(prefs.error.message);
  },titles[1]);
  const matched=await seedListing(page,titles[1]);
  await test.step('Kyle opens each discovery alert at its listing, not the inbox',async()=>{
   await buyer.reload({waitUntil:'domcontentloaded'});
   for(const kind of ['followed_seller_listing','wanted_match']){
    await buyer.locator('#notificationBell').click();
    const alert=buyer.locator('#notificationList [data-notification-kind="'+kind+'"][data-notification-source="'+matched+'"]');
    await expect(alert).toHaveCount(1);await alert.click();await expect(buyer.locator('#detailTitle')).toHaveText(titles[1]);
    await expect(buyer.locator('#inboxPage')).toBeHidden();
    const read=await buyer.evaluate(async({kind,id})=>{const {data,error}=await supabaseClient.from('collector_notifications').select('read_at').eq('user_id',currentUser.id).eq('kind',kind).eq('source_id',id).single();if(error)throw Error(error.message);return data.read_at},{kind,id:matched});expect(read).toBeTruthy();
    await buyer.locator('[data-close="detailModal"]').click();
   }
  });
  await test.step('Kyle unfollows; a later Charles listing creates no follow alert',async()=>{
   await openListing(buyer,titles[1],matched);await openProfile(buyer,sellerId);
   const follow=buyer.locator('[data-follow-profile="'+sellerId+'"]');await follow.click();await expect(follow).toHaveText('Follow seller');
   const later=await seedListing(page,titles[2]);await buyer.reload({waitUntil:'domcontentloaded'});await buyer.locator('#notificationBell').click();
   await expect(buyer.locator('#notificationList')).not.toContainText('Loading notifications');
   await expect(buyer.locator('[data-notification-kind="followed_seller_listing"][data-notification-source="'+later+'"]')).toHaveCount(0);
   const rows=await buyer.evaluate(async id=>{const {data,error}=await supabaseClient.from('collector_notifications').select('id').eq('user_id',currentUser.id).eq('kind','followed_seller_listing').eq('source_id',id);if(error)throw Error(error.message);return data},later);expect(rows).toHaveLength(0);
  });
 }finally{
  const errors=[];
  if(typeof priorFollow==='boolean')try{await buyer.evaluate(async({sellerId,priorFollow,priorWanted})=>{
   const removed=await supabaseClient.from('seller_follows').delete().eq('follower_id',currentUser.id).eq('seller_id',sellerId);if(removed.error)throw Error(removed.error.message);
   if(priorFollow){const restored=await supabaseClient.from('seller_follows').insert({follower_id:currentUser.id,seller_id:sellerId});if(restored.error)throw Error(restored.error.message)}
   if(typeof priorWanted==='boolean'){const restored=await supabaseClient.from('notification_preferences').update({wanted_matches:priorWanted}).eq('user_id',currentUser.id);if(restored.error)throw Error(restored.error.message)}
  },{sellerId,priorFollow,priorWanted})}catch(error){errors.push(error)}
  for(const title of titles)try{await cleanup(page,title)}catch(error){errors.push(error)}
  await context.close();if(errors.length)throw new AggregateError(errors,'Discovery fixture/state cleanup failed');
 }
});
