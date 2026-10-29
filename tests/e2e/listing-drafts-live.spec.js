const {test,expect}=require('@playwright/test');const {signIn,marker}=require('../helpers/staging.cjs');
test('collector saves a private listing draft and resumes it after clearing tab storage',async({page})=>{
 test.setTimeout(100000);await signIn(page,'BUYER');const title=marker();let original=null,owner=null;
 try{
  const initial=await page.evaluate(async()=>{const user=await supabaseClient.auth.getUser();if(user.error||user.data?.user?.email!=='deckplay-buyer@deckplay.test')throw Error('Dedicated staging buyer required');const {data,error}=await supabaseClient.from('listing_drafts').select('*').eq('user_id',user.data.user.id).maybeSingle();if(error)throw Error(error.message);return {owner:user.data.user.id,draft:data}});owner=initial.owner;original=initial.draft;
  await page.evaluate(()=>openSell());await page.locator('#item').fill(title);await page.locator('#description').fill('Exact language, printing and corner disclosure');await page.locator('#price').fill('37.50');
  await page.locator('.listing-cloud-draft summary').click();await page.locator('[data-cloud-draft="save"]').click();await expect(page.locator('#listingCloudDraftStatus')).toContainText('Private draft saved',{timeout:15000});
  await page.evaluate(()=>sessionStorage.removeItem(listingDraftKey(currentUser.id)));await page.reload({waitUntil:'domcontentloaded'});await expect.poll(()=>page.evaluate(()=>currentUser?.id),{timeout:20000}).toBe(owner);
  await page.evaluate(()=>openSell());await expect(page.locator('#item')).toHaveValue('');await page.locator('.listing-cloud-draft summary').click();await page.locator('[data-cloud-draft="load"]').click();
  await expect(page.locator('#item')).toHaveValue(title,{timeout:15000});await expect(page.locator('#description')).toHaveValue('Exact language, printing and corner disclosure');await expect(page.locator('#price')).toHaveValue('37.50');expect(await page.evaluate(()=>listingSelectedPhotos.length)).toBe(0);
 }finally{
  if(owner)await page.evaluate(async({owner,original})=>{const user=await supabaseClient.auth.getUser();if(user.error||user.data?.user?.id!==owner||user.data.user.email!=='deckplay-buyer@deckplay.test')throw Error('Refusing draft cleanup for another account');const result=original?await supabaseClient.from('listing_drafts').upsert(original,{onConflict:'user_id'}):await supabaseClient.from('listing_drafts').delete().eq('user_id',owner);if(result.error)throw Error(result.error.message)},{owner,original});
 }
});
