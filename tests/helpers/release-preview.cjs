// Release preview ONLY. Same strict synthetic identity, session and UUID cleanup checks.
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
  await page.locator('[data-dock="inbox"]').click({timeout:10000});
  await page.locator('[data-inbox-offers="trade"]').click({timeout:10000});
  await expect(page.locator('#tradesModal')).toHaveClass(/open/);return;
 }
 const account=page.locator('#accountButton');
 await expect(account).toBeVisible({timeout:10000});
 const accountMenu=page.locator('#accountMenu');
 if(await accountMenu.isHidden()) await account.click({timeout:10000});
 const action=page.locator('#'+id);
 await expect(action).toBeVisible({timeout:10000});
 await action.click({timeout:10000});
}
async function seedListing(page,title,details={}){
 return page.evaluate(async ({title,details})=>{const {data,error}=await supabaseClient.from('listings').insert({price:25,category:'trading_cards',condition:'like_new',image_urls:['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],accepts_trades:true,accepts_price_offers:true,...details,seller_id:currentUser.id,title,tcg_game:(!details.category||details.category==='trading_cards')?(details.tcg_game||'one_piece'):null}).select('id').single();if(error)throw Error(error.message);return data.id},{title,details});
}
async function cleanup(page,title){
 if(typeof title!=='string'||!/^TEST ONLY BOT [a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(title))throw Error('Exact synthetic fixture marker required');
 await page.evaluate(async title=>{
  const origin='https://prrrzeelltmyugssqnzk.supabase.co';
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  if(location.origin!=='https://deckplay-hq-release-preview.cstivers56.workers.dev'||SUPABASE_URL!==origin)throw Error('Refusing cleanup outside private staging');
  const user=currentUser;
  if(!user||!uuid.test(user.id)||!['deckplay-seller@deckplay.test','deckplay-buyer@deckplay.test'].includes(user.email))throw Error('Dedicated staging bot required for cleanup');
  const unchanged=()=>{if(currentUser?.id!==user.id)throw Error('Cleanup account changed');};
  const signal=AbortSignal.timeout(20000);
  const {data,error}=await supabaseClient.from('listings').select('id,title,seller_id,image_urls').eq('title',title).eq('seller_id',user.id).abortSignal(signal);
  if(error)throw Error(error.message);
  unchanged();
  // Confirm the actual Supabase session, not just the browser's cached currentUser.
  // This also protects the no-photo path before its destructive cleanup RPC.
  const verifiedSession=async()=>{
   const {data,error:sessionError}=await supabaseClient.auth.getSession();
   if(sessionError||data?.session?.user?.id!==user.id||data?.session?.user?.email!==user.email)throw Error('Cleanup session changed');
   unchanged();
   return data.session;
  };
  await verifiedSession();
  const prefix=origin+'/storage/v1/object/public/listing-images/';
  const paths=[];
  for(const row of data||[]){
   if(!uuid.test(row.id)||row.title!==title||row.seller_id!==user.id)throw Error('Unverified fixture listing');
   for(const image of row.image_urls||[]){
    if(typeof image!=='string'||!image.startsWith(prefix+user.id+'/'))continue;
    const path=image.slice(prefix.length),file=path.slice(user.id.length+1);
    if(!/^[a-f0-9-]{36}\.[a-z0-9]+$/.test(file)||!uuid.test(file.split('.')[0]))throw Error('Unverified fixture photo path');
    paths.push(path);
   }
  }
  if(paths.length){
   // Use fetch so a stalled storage request has a real abort deadline.
   const session=await verifiedSession();
   const response=await fetch(origin+'/storage/v1/object/listing-images',{method:'DELETE',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[...new Set(paths)]}),signal});
   if(!response.ok)throw Error('Fixture photo cleanup failed: HTTP '+response.status);
   // A session change while the storage request was pending must not delete rows.
   await verifiedSession();
  }
  unchanged();
  const result=await supabaseClient.rpc('cleanup_staging_fixture',{p_marker:title}).abortSignal(signal);
  if(result.error)throw Error(result.error.message);
 },title);
}
module.exports={signIn,menu,seedListing,cleanup,marker};
