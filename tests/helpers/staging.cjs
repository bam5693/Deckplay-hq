const {expect}=require('@playwright/test');
const {randomUUID}=require('node:crypto');
const marker=()=> 'TEST ONLY BOT '+randomUUID();
async function signIn(page,role){
 await page.goto('/',{waitUntil:'domcontentloaded'});
 if(await page.locator('#accountButton').isVisible())await page.locator('#accountButton').click();else await page.locator('[data-dock="profile"]').click();
 await page.locator('#authEmail').fill(process.env['DECKPLAY_TEST_'+role+'_EMAIL']);
 await page.locator('#authPassword').fill(process.env['DECKPLAY_TEST_'+role+'_PASSWORD']);
 await page.waitForFunction(()=>typeof signupCaptchaToken!=='undefined'&&!!signupCaptchaToken,{},{timeout:25000});
 await page.locator('#authSubmit').click();await expect(page.locator('#authModal')).not.toHaveClass(/open/,{timeout:25000});
 await expect.poll(()=>page.evaluate(()=>currentUser?.email)).toBe(process.env['DECKPLAY_TEST_'+role+'_EMAIL']);
}
async function menu(page,id){
 const dock=page.locator('[data-dock="profile"]');
 const actions={myProfile:null,profileSettings:'profileSettings',profileEdit:'profileEdit',menuPostWanted:'profileAddWanted'};
 if(id in actions){
  if(await dock.isVisible())await dock.click();
  else if(!await page.locator('#collectorPage').isVisible()){await page.locator('#accountButton').click();await page.locator('#myProfile').click()}
  await expect(page.locator('#collectorPage')).toBeVisible();
  if(actions[id]){await page.locator('#profileMenuToggle').click();await page.locator('[data-profile-action="'+actions[id]+'"]').click()}return;
 }
 if(id==='myTrades'&&await dock.isVisible()){
  await page.locator('[data-dock="alerts"]').click();
  await page.locator('[data-notification-kind="trade_offer"], [data-notification-kind="counteroffer"], [data-notification-kind="trade_update"]').first().click();
  await expect(page.locator('#tradesModal')).toHaveClass(/open/);return;
 }
 await page.locator('#accountButton').click();await page.locator('#'+id).click();
}
async function seedListing(page,title){
 return page.evaluate(async title=>{const {data,error}=await supabaseClient.from('listings').insert({seller_id:currentUser.id,title,price:25,category:'trading_cards',condition:'like_new',image_urls:['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],accepts_trades:true,accepts_price_offers:true,tcg_game:'one_piece'}).select('id').single();if(error)throw Error(error.message);return data.id},title);
}
async function cleanup(page,title){
 const error=await page.evaluate(async title=>{const {error}=await supabaseClient.rpc('cleanup_staging_fixture',{p_marker:title});return error?.message||null},title);expect(error,'Disposable fixture cleanup').toBeNull();
}
module.exports={signIn,menu,seedListing,cleanup,marker};
