const {test,expect}=require('@playwright/test');const {signIn,seedListing,cleanup,marker}=require('../helpers/release-preview.cjs');
test('owner edits an active listing and a stale editor cannot overwrite newer terms',async({page})=>{
 test.setTimeout(90000);await signIn(page,'SELLER');const title=marker();
 try{
  const id=await seedListing(page,title,{category:'video_games',product_type:'game',description:'TEST ONLY game case wear and region disclosure.'});
  await page.evaluate(id=>listingEditor.open(id),id);await expect(page.locator('#editListingTitle')).toHaveValue(title);
  await page.locator('#editListingPrice').fill('17.25');await page.locator('#editListingDescription').fill('TEST ONLY revised condition disclosure.');await page.locator('#saveListingEdits').click();await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);
  const saved=await page.evaluate(async id=>{const {data,error}=await supabaseClient.from('listings').select('price,description,category,image_urls').eq('id',id).single();if(error)throw Error(error.message);return data},id);
  expect(Number(saved.price)).toBe(17.25);expect(saved.description).toBe('TEST ONLY revised condition disclosure.');expect(saved.category).toBe('video_games');expect(saved.image_urls).toHaveLength(1);
  await page.evaluate(id=>listingEditor.open(id),id);await expect(page.locator('#editListingPrice')).toHaveValue('17.25');
  await page.evaluate(async id=>{const {error}=await supabaseClient.from('listings').update({price:20}).eq('id',id).eq('seller_id',currentUser.id);if(error)throw Error(error.message)},id);
  await page.locator('#editListingPrice').fill('15.25');await page.locator('#saveListingEdits').click();await expect(page.locator('#editListingStatus')).toContainText('changed or was reserved');await expect(page.locator('#editListingPrice')).toHaveValue('15.25');
  const latest=await page.evaluate(async id=>(await supabaseClient.from('listings').select('price').eq('id',id).single()).data.price,id);expect(Number(latest)).toBe(20);
  await page.evaluate(()=>listingEditor.reset());
 }finally{await cleanup(page,title)}
});

