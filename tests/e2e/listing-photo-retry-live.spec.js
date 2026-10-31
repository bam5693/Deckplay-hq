const {test,expect}=require('@playwright/test');
const jpeg=require('jpeg-js');
const {signIn,cleanup,marker}=require('../helpers/staging.cjs');

// One synthetic owner, one real image-upload retry. Confined to private staging
// and the dedicated bot account; no production, payments or broad inventory sweep.
test('seller retries a failed second photo and publishes both real photos',async({page,browser})=>{
 test.setTimeout(150000);
 await signIn(page,'SELLER');
 const title=marker();
 const owner=await page.evaluate(()=>currentUser.id);
 const photo=jpeg.encode({data:Buffer.alloc(16*16*4,255),width:16,height:16},80).data;
 const pictures=[
  {name:'test-only-cover.jpg',mimeType:'image/jpeg',buffer:photo},
  {name:'test-only-detail.jpg',mimeType:'image/jpeg',buffer:photo}
 ];
 let buyerContext;
 try{
  await page.evaluate(title=>{
   if(location.hostname!=='deckplay-hq-staging.cstivers56.workers.dev'||currentUser?.email!=='deckplay-seller@deckplay.test')throw Error('Dedicated private staging seller required');
   openModal('sellModal');
   document.getElementById('listingType').value='game';
   document.getElementById('listingType').dispatchEvent(new Event('change',{bubbles:true}));
   document.getElementById('category').value='video_games';
   document.getElementById('category').dispatchEvent(new Event('change',{bubbles:true}));
   document.getElementById('gamePlatform').value='PlayStation 5';
   document.getElementById('item').value=title;
   document.getElementById('description').value='TEST ONLY real photo upload, failure recovery and full listing price.';
   document.getElementById('price').value='24.75';
  },title);
  await page.locator('#photos').setInputFiles(pictures);
  await expect(page.locator('#listingPhotoPreview img')).toHaveCount(2);

  // Make only the second request fail. The first is a real Storage upload;
  // rollback must remove it before the seller retries.
  await page.evaluate(()=>{
   window.__photoRetryStorageFrom=supabaseClient.storage.from.bind(supabaseClient.storage);
   window.__photoRetryUploads=[];
   let count=0;
   supabaseClient.storage.from=bucket=>{
    const api=window.__photoRetryStorageFrom(bucket);
    if(bucket!=='listing-images')return api;
    return {
     upload:async(path,file,opts)=>{
      ++count;window.__photoRetryUploads.push(path);
      if(count===2)return {error:new Error('Synthetic second photo connection failure')};
      return api.upload(path,file,opts);
     },
     remove:paths=>api.remove(paths),
     getPublicUrl:path=>api.getPublicUrl(path)
    };
   };
  });
  await page.locator('#listingForm').evaluate(form=>form.requestSubmit());
  await expect(page.locator('#listingStatus')).toContainText('Synthetic second photo connection failure',{timeout:30000});
  await expect(page.locator('#listingPhotoPreview img')).toHaveCount(2);
  const firstPath=await page.evaluate(()=>{
   const paths=window.__photoRetryUploads;
   supabaseClient.storage.from=window.__photoRetryStorageFrom;
   delete window.__photoRetryStorageFrom;
   if(paths.length!==2||!paths.every(path=>path.startsWith(currentUser.id+'/')))throw Error('Photo retry did not track expected owner files');
   return paths[0];
  });
  const abandonedUrl='https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/'+firstPath;
  const abandoned=await page.request.get(abandonedUrl);
  expect(abandoned.status(),'Failed first-attempt image should be removed').not.toBe(200);

  // Retry using the actual seller form and authenticated Storage, not mocks.
  await expect(page.locator('#publishButton')).toBeEnabled();
  await page.locator('#listingForm').evaluate(form=>form.requestSubmit());
  await expect(page.locator('#sellModal')).not.toHaveClass(/open/,{timeout:30000});
  const created=await page.evaluate(async title=>{
   const {data,error}=await supabaseClient.from('listings').select('id,title,category,product_type,price,image_urls,status,seller_id')
    .eq('title',title).eq('seller_id',currentUser.id).single();
   if(error)throw Error(error.message);return data;
  },title);
  expect(created.seller_id).toBe(owner);
  expect(created.category).toBe('video_games');
  expect(created.product_type).toBe('game');
  expect(Number(created.price)).toBe(24.75);
  expect(created.status).toBe('active');
  expect(created.image_urls).toHaveLength(2);
  for(const url of created.image_urls)expect((await page.request.get(url)).ok()).toBe(true);

  buyerContext=await browser.newContext({
   baseURL:process.env.DECKPLAY_STAGING_URL,
   httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD}
  });
  const buyer=await buyerContext.newPage();
  await signIn(buyer,'BUYER');
  await buyer.evaluate(async()=>{showMainMarketplace();await loadListings()});
  await buyer.locator('#search').fill(title);
  const view=buyer.locator('#grid [data-view="'+created.id+'"]');
  await expect(view).toBeVisible();
  await view.click();
  await expect(buyer.locator('#detailTitle')).toHaveText(title);
  await expect(buyer.locator('#detailGalleryMain')).toBeVisible();
 }finally{
  if(buyerContext)await buyerContext.close();
  await page.evaluate(()=>{
   if(window.__photoRetryStorageFrom){
    supabaseClient.storage.from=window.__photoRetryStorageFrom;
    delete window.__photoRetryStorageFrom;
   }
  }).catch(()=>{});
  await cleanup(page,title);
 }
});
