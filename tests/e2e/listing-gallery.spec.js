const {test,expect}=require('@playwright/test');
async function openFixture(page,item){
 // Keep existing navigation checks independent of remote image servers.
 // A separate test below deliberately aborts one photo to verify recovery.
 await page.route('https://**/*',route=>route.request().resourceType()==='image'
  ?route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')})
  :route.abort());
 await page.goto('/');
 await page.evaluate(value=>showDetails(value),item);
}
test('Tanner: sports-card listing photo controls, USD price and keyboard zoom work',async({page})=>{
 const photos=['https://example.test/front.jpg','https://example.test/back.jpg','https://example.test/grade.jpg'];
 await openFixture(page,{n:'Synthetic graded sports card',p:24.5,c:'Sports Cards',cond:'Graded',imageUrls:photos});
 await expect(page.locator('.detail-price')).toHaveText('$24.50');
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 1 of 3');
 await expect(page.locator('[data-detail-photo="0"]')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Next listing photo'}).click();
 await expect(page.locator('#detailGalleryMain')).toHaveAttribute('src',photos[1]);
 await expect(page.locator('#detailGalleryMain')).toHaveAttribute('alt','Synthetic graded sports card — photo 2 of 3');
 await expect(page.locator('[data-detail-photo="1"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-detail-photo="0"]')).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Previous listing photo'}).click();
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 1 of 3');
 await page.locator('[data-detail-photo="2"]').click();
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 3 of 3');
 await page.getByRole('button',{name:'Next listing photo'}).click();
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 1 of 3');
 await page.getByRole('button',{name:'Enlarge listing photo'}).click();
 await expect(page.locator('#detailPhotoZoom')).toBeVisible();
 await expect(page.locator('#detailPhotoZoom button')).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(page.locator('#detailPhotoZoom button')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.locator('#detailPhotoZoom')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Enlarge listing photo'})).toBeFocused();
 await expect(page.locator('#detailModal')).toHaveClass(/open/);
 await page.getByRole('button',{name:'Enlarge listing photo'}).click();
 await page.evaluate(()=>closeModal('detailModal'));
 await expect(page.locator('#detailPhotoZoom')).toHaveCount(0);
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
});
test('Jayden: TCG and game listing details handle single or missing photos without navigation clutter',async({page})=>{
 await openFixture(page,{n:'Synthetic TCG deck',p:38,c:'Trading Cards',imageUrls:['https://example.test/deck.jpg']});
 await expect(page.locator('.detail-price')).toHaveText('$38.00');
 await expect(page.locator('[data-detail-step]')).toHaveCount(0);
 await expect(page.locator('#detailGalleryMain')).toHaveAttribute('alt','Synthetic TCG deck — photo 1 of 1');
 await page.evaluate(()=>showDetails({n:'Synthetic video game',p:12.75,c:'Video Games',imageUrls:[]}));
 await expect(page.locator('.detail-price')).toHaveText('$12.75');
 await expect(page.locator('.detail-photo-placeholder')).toBeVisible();
 await expect(page.locator('[data-detail-photo]')).toHaveCount(0);
});


test('T1.5 unavailable buyer photo has visible recovery and another photo still opens',async({page})=>{
 await openFixture(page,{n:'Synthetic photo recovery',p:15,c:'Trading Cards',imageUrls:[]});
 await page.route('https://example.test/broken.jpg',route=>route.abort());
 await page.evaluate(()=>showDetails({n:'Synthetic photo recovery',p:15,c:'Trading Cards',imageUrls:['https://example.test/broken.jpg','https://example.test/good.jpg']}));
 await expect(page.locator('.detail-photo-load-status')).toContainText('This photo could not load');
 await expect(page.locator('#detailZoomButton')).toBeHidden();
 await page.getByRole('button',{name:'Next listing photo'}).click();
 await expect(page.locator('#detailGalleryMain')).toHaveAttribute('src','https://example.test/good.jpg');
 await expect(page.locator('.detail-photo-load-status')).toBeHidden();
 await expect(page.locator('#detailZoomButton')).toBeVisible();
 await page.getByRole('button',{name:'Enlarge listing photo'}).click();
 await expect(page.locator('#detailPhotoZoom')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#detailPhotoZoom')).toHaveCount(0);
 await page.getByRole('button',{name:'Previous listing photo'}).click();
 await expect(page.locator('.detail-photo-load-status')).toContainText('This photo could not load');
 await expect(page.locator('#detailZoomButton')).toBeHidden();
});

test('T1.5 blocked collector profile links fail closed on stale cache, lookup errors and in-flight blocks',async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/');
 for(const mode of ['blocked','lookup-error','blocked-during-load']){
  const outcome=await page.evaluate(async mode=>{
   const originalFrom=supabaseClient.from,originalUser=currentUser,originalBlocks=[...blockedCollectorIds];
   const sellerId='fixture-private-seller';let releaseProfile;
   try{
    currentUser={id:'fixture-profile-viewer'};blockedCollectorIds.clear();
    supabaseClient.from=function(table){
     const q={
      select(){return this},eq(){return this},order(){return this},
      limit(){return Promise.resolve({data:[]})},
      maybeSingle(){
       if(table==='profiles'){
        if(mode==='blocked-during-load')return new Promise(resolve=>{releaseProfile=resolve});
        return Promise.resolve({data:{username:'SECRET_SELLER',bio:'SECRET_BIO',collection_links:['SECRET_LINK']}});
       }
       if(table==='user_blocks')return Promise.resolve(mode==='lookup-error'?{data:null,error:{message:'Offline'}}:{data:mode==='blocked'?{blocked_id:sellerId}:null,error:null});
       return Promise.resolve({data:null,error:null});
      }
     };
     return q;
    };
    const pending=showPublicProfile(sellerId);
    if(mode==='blocked-during-load'){
     blockedCollectorIds.add(sellerId);
     releaseProfile({data:{username:'SECRET_SELLER',bio:'SECRET_BIO',collection_links:['SECRET_LINK']},error:null});
    }
    await pending;
    const content=document.getElementById('publicProfileContent');
    return {text:content.textContent,html:content.innerHTML};
   }finally{
    supabaseClient.from=originalFrom;currentUser=originalUser;
    blockedCollectorIds.clear();originalBlocks.forEach(id=>blockedCollectorIds.add(id));
    closeModal('publicProfileModal');
   }
  },mode);
  expect(outcome.html).not.toContain('SECRET_SELLER');
  expect(outcome.html).not.toContain('SECRET_BIO');
  expect(outcome.html).not.toContain('SECRET_LINK');
  if(mode==='blocked')expect(outcome.text).toContain('This collector is blocked');
  if(mode==='lookup-error')expect(outcome.text).toContain('Could not verify collector privacy');
 }
});
