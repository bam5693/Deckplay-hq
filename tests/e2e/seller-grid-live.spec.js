const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

// Trusted private staging ONLY. Every database row is a dedicated seller-owned
// TEST ONLY BOT UUID fixture and is guarded by the existing cleanup helper.
test('signed seller rejects stale Mark sold, then confirms real sale and delete',async({page,browser})=>{
 test.setTimeout(170000);
 await signIn(page,'SELLER');
 const titles=[],ids=[];
 page.on('dialog',dialog=>dialog.accept());
 const owner=await page.evaluate(()=>currentUser?.id);
 const openOwnedMarketplace=()=>page.evaluate(async()=>{
  showMainMarketplace();onlyMyListings=true;onlySavedListings=false;
  cat='All';filter='All';game='All';query='';
  await loadListings();render();
 });
 const status=async id=>page.evaluate(async id=>{
  const {data,error}=await supabaseClient.from('listings').select('status').eq('id',id).eq('seller_id',currentUser.id).maybeSingle();
  if(error)throw Error(error.message);return data?.status||null;
 },id);
 try{
  const staleTitle=marker();titles.push(staleTitle);
  const staleId=await seedListing(page,staleTitle,{category:'video_games',product_type:'game',description:'TEST ONLY seller stale-state safety.'});
  ids.push(staleId);await openOwnedMarketplace();
  const staleButton=page.locator('#grid [data-sold="'+staleId+'"]');
  await expect(staleButton).toBeVisible();
  // A second owner session could have paused the listing after this card loaded.
  const changed=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('listings').update({status:'paused'})
    .eq('id',id).eq('seller_id',currentUser.id).eq('status','active').select('id').maybeSingle();
   if(error)throw Error(error.message);return !!data;
  },staleId);
  expect(changed).toBe(true);
  await staleButton.click();
  await expect(page.locator('#toast')).toContainText('This listing changed, was reserved, or is no longer active');
  await expect(staleButton).toBeEnabled();
  expect(await status(staleId)).toBe('paused');

  const restored=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('listings').update({status:'active'})
    .eq('id',id).eq('seller_id',currentUser.id).eq('status','paused').select('id').maybeSingle();
   if(error)throw Error(error.message);return !!data;
  },staleId);
  expect(restored).toBe(true);
  await openOwnedMarketplace();
  await page.locator('#grid [data-sold="'+staleId+'"]').click();
  await expect(page.locator('#toast')).toContainText('Listing marked sold');
  expect(await status(staleId)).toBe('sold');

  const deleteTitle=marker();titles.push(deleteTitle);
  const deleteId=await seedListing(page,deleteTitle,{category:'collectibles',product_type:'figure',description:'TEST ONLY guarded delete.'});
  ids.push(deleteId);await openOwnedMarketplace();
  const deleteButton=page.locator('#grid [data-delete-listing="'+deleteId+'"]');
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await expect(page.locator('#toast')).toContainText('Listing deleted');
  expect(await status(deleteId)).toBeNull();

  // Confirm the sold and deleted fixtures are not in the buyer's active catalog.
  const buyerContext=await browser.newContext({
   baseURL:process.env.DECKPLAY_STAGING_URL,
   httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD}
  });
  try{
   const buyer=await buyerContext.newPage();await signIn(buyer,'BUYER');
   const visible=await buyer.evaluate(async ids=>{
    await loadListings();
    return ids.filter(id=>items.some(item=>item.id===id));
   },ids);
   expect(visible).toEqual([]);
  }finally{await buyerContext.close();}
 }finally{
  for(const title of titles)await cleanup(page,title);
  const residue=await page.evaluate(async titles=>{
   const {data,error}=await supabaseClient.from('listings').select('title').in('title',titles).eq('seller_id',currentUser.id);
   if(error)throw Error(error.message);return data?.length||0;
  },titles);
  expect(residue).toBe(0);
 }
});
