const {test,expect}=require('@playwright/test');
async function ready(page,phase){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async phase=>{
  await supabaseClient.auth.getSession();currentUser={id:'publish-owner'};window.realUploadPhotos=uploadPhotos;
  window.publishWrites=[];window.photoUploads=[];window.profileUsers=[];
  const pause=()=>new Promise((resolve,reject)=>{window.finishPublishPhase=resolve;window.failPublishPhase=reject});
  ensureProfile=async user=>{profileUsers.push(user.id);if(phase==='profile')await pause()};
  uploadPhotos=async(files,userId)=>{photoUploads.push({userId,names:files.map(f=>f.name)});if(phase==='upload')await pause();return ['https://example.test/original.png']};
  supabaseClient.from=()=>({insert:async listing=>{publishWrites.push(listing);if(phase==='insert')await pause();return {error:null}}});
  loadListings=async()=>{};
  listingSelectedPhotos=[new File(['synthetic'],'original.png',{type:'image/png'})];renderListingPhotos();openModal('sellModal');
 },phase);
 await page.locator('#item').fill('Original listing');await page.locator('#tcgGame').selectOption('one_piece');await page.locator('#price').fill('25');await page.locator('#description').fill('Original details');
}
const submit=page=>page.evaluate(()=>document.getElementById('listingForm').requestSubmit());
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
test('account switching during profile preparation cannot upload or publish under the new account',async({page})=>{
 await ready(page,'profile');await submit(page);
 await page.evaluate(()=>{currentUser={id:'second-owner'};document.getElementById('item').value='Second owner draft';finishPublishPhase()});await settle(page);
 expect(await page.evaluate(()=>({uploads:photoUploads,writes:publishWrites}))).toEqual({uploads:[],writes:[]});
 await expect(page.locator('#item')).toHaveValue('Second owner draft');await expect(page.locator('#publishButton')).toBeEnabled();
});
test('account switching during photo upload prevents inserting a listing or clearing a new draft',async({page})=>{
 await ready(page,'upload');await submit(page);await expect.poll(()=>page.evaluate(()=>photoUploads.length)).toBe(1);
 await page.evaluate(()=>{currentUser={id:'second-owner'};document.getElementById('item').value='Second owner draft';finishPublishPhase()});await settle(page);
 expect(await page.evaluate(()=>publishWrites)).toEqual([]);await expect(page.locator('#item')).toHaveValue('Second owner draft');await expect(page.locator('#publishButton')).toBeEnabled();
});
test('edits during uploads cannot change the submitted listing and survive successful publication',async({page})=>{
 await ready(page,'upload');await submit(page);await expect.poll(()=>page.evaluate(()=>photoUploads.length)).toBe(1);
 await page.locator('#item').fill('Newer draft');await page.locator('#price').fill('45');await page.locator('#description').fill('Newer details');await page.evaluate(()=>{const input=document.getElementById('acceptsTrades');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}))});
 await page.evaluate(()=>finishPublishPhase());await expect.poll(()=>page.evaluate(()=>publishWrites.length)).toBe(1);
 const saved=await page.evaluate(()=>publishWrites[0]);expect(saved.title).toBe('Original listing');expect(saved.price).toBe(25);expect(saved.description).toContain('Original details');expect(saved.accepts_trades).toBe(false);
 await expect(page.locator('#item')).toHaveValue('Newer draft');await expect(page.locator('#sellModal')).toHaveClass(/open/);await expect(page.locator('#listingStatus')).toContainText('newer');
});
test('a late successful insert preserves edits and replacement photos made while posting',async({page})=>{
 await ready(page,'insert');await submit(page);await expect.poll(()=>page.evaluate(()=>publishWrites.length)).toBe(1);
 await page.locator('#item').fill('Next listing');await page.evaluate(()=>{listingSelectedPhotos=[new File(['new'],'new.png',{type:'image/png'})];renderListingPhotos();finishPublishPhase()});await settle(page);
 await expect(page.locator('#item')).toHaveValue('Next listing');expect(await page.evaluate(()=>listingSelectedPhotos.map(f=>f.name))).toEqual(['new.png']);await expect(page.locator('#sellModal')).toHaveClass(/open/);
});
test('upload exceptions preserve the draft and photos and release duplicate-submit protection',async({page})=>{
 await ready(page,'upload');await submit(page);await submit(page);await expect.poll(()=>page.evaluate(()=>photoUploads.length)).toBe(1);
 await page.evaluate(()=>failPublishPhase(Error('Upload connection failed')));
 await expect(page.locator('#listingStatus')).toContainText('Upload connection failed');await expect(page.locator('#publishButton')).toBeEnabled();await expect(page.locator('#item')).toHaveValue('Original listing');
 expect(await page.evaluate(()=>listingSelectedPhotos.length)).toBe(1);await submit(page);await expect.poll(()=>page.evaluate(()=>photoUploads.length)).toBe(2);
 await page.evaluate(()=>finishPublishPhase());await expect(page.locator('#sellModal')).not.toHaveClass(/open/);expect(await page.evaluate(()=>publishWrites.length)).toBe(1);
});
test('photo preparation ending after an account switch cannot start a storage upload',async({page})=>{
 await ready(page,'none');
 await page.evaluate(()=>{
  window.storageWrites=0;prepareListingPhoto=()=>new Promise(r=>window.finishPhotoPreparation=r);
  supabaseClient.storage.from=()=>({upload:async()=>{storageWrites++;return {error:null}},getPublicUrl:()=>({data:{publicUrl:'https://example.test/photo.png'}})});
  window.photoResult=realUploadPhotos(listingSelectedPhotos,'publish-owner').then(()=>({ok:true}),error=>({error:error.message}));
  currentUser={id:'second-owner'};finishPhotoPreparation(listingSelectedPhotos[0]);
 });
 expect(await page.evaluate(()=>photoResult)).toHaveProperty('error');expect(await page.evaluate(()=>storageWrites)).toBe(0);
});

test('a photo upload completing after an account switch cannot continue to the next file',async({page})=>{
 await ready(page,'none');await page.evaluate(()=>{
  window.storagePaths=[];prepareListingPhoto=async file=>file;
  supabaseClient.storage.from=()=>({upload:async path=>{storagePaths.push(path);return await new Promise(r=>window.finishStorage=r)},getPublicUrl:()=>({data:{publicUrl:'https://example.test/photo.png'}})});
  const photos=[...listingSelectedPhotos,new File(['second'],'second.png',{type:'image/png'})];
  window.photoResult=realUploadPhotos(photos,'publish-owner').then(()=>({ok:true}),error=>({error:error.message}));
 });
 await expect.poll(()=>page.evaluate(()=>storagePaths.length)).toBe(1);
 await page.evaluate(()=>{currentUser={id:'second-owner'};finishStorage({error:null})});
 expect(await page.evaluate(()=>photoResult)).toHaveProperty('error');expect(await page.evaluate(()=>storagePaths.length)).toBe(1);
});
test('switching away and back to the same account invalidates the old pending publication',async({page})=>{
 await ready(page,'profile');await submit(page);
 await page.evaluate(()=>{currentUser={id:'second-owner'};syncInboxDraftUser();currentUser={id:'publish-owner'};syncInboxDraftUser();openModal('sellModal');document.getElementById('item').value='Fresh session draft';finishPublishPhase()});await settle(page);
 expect(await page.evaluate(()=>publishWrites)).toEqual([]);expect(await page.evaluate(()=>photoUploads)).toEqual([]);await expect(page.locator('#item')).toHaveValue('Fresh session draft');
});
test('publishing a deck resets hidden required fields so the next single-item listing is usable',async({page})=>{
 await ready(page,'none');await page.locator('#listingType').selectOption('deck');await page.locator('#deckLeader').fill('Yamato');await page.locator('#deckCardCount').fill('51');await page.locator('#deckList').fill('1x Leader\n50x Cards');
 await submit(page);await expect(page.locator('#sellModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>['deckLeader','deckCardCount','deckList'].map(id=>document.getElementById(id).required))).toEqual([false,false,false]);
});
