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

async function cloudDraftFixture(page){
 await ready(page);
 await page.evaluate(()=>{syncInboxDraftUser();openModal('sellModal');window.draftPayloads=[];supabaseClient.from=table=>{const q={select:()=>q,eq:()=>q,upsert:async payload=>{draftPayloads.push(payload);return {error:null}},maybeSingle:()=>new Promise(resolve=>window.finishDraftLoad=resolve),delete:()=>q,then:(a,b)=>Promise.resolve({error:null}).then(a,b)};return q}});
 await page.locator('.listing-cloud-draft summary').click();
}
test('private draft saves incomplete text without photos and resumes detailed metadata',async({page})=>{
 await cloudDraftFixture(page);await page.locator('#item').fill('Japanese foil draft');await page.locator('#description').fill('Stamped printing and corner disclosure');await page.locator('#price').fill('25.50');
 await page.locator('[data-cloud-draft="save"]').click();await expect(page.locator('#listingCloudDraftStatus')).toContainText('Private draft saved');
 const payload=await page.evaluate(()=>draftPayloads[0]);expect(payload.user_id).toBe('publish-owner');expect(payload.content.fields.item).toBe('Japanese foil draft');expect(payload.content.fields.photos).toBeUndefined();
 await page.locator('[data-cloud-draft="load"]').click();await page.evaluate(()=>finishDraftLoad({data:{content:{version:1,fields:{item:'Restored card',listingType:'single',category:'trading_cards',tcgGame:'one_piece',description:'Exact saved variant',price:'42.50',acceptsTrades:true}}},error:null}));
 await expect(page.locator('#item')).toHaveValue('Restored card');await expect(page.locator('#description')).toHaveValue('Exact saved variant');await expect(page.locator('#price')).toHaveValue('42.50');await expect(page.locator('#acceptsTrades')).toBeChecked();expect(await page.evaluate(()=>listingSelectedPhotos.length)).toBe(0);
});
test('a late saved draft cannot overwrite new edits or a different account',async({page})=>{
 await cloudDraftFixture(page);await page.locator('[data-cloud-draft="load"]').click();await page.locator('#item').fill('Newer unsaved edits');await page.evaluate(()=>finishDraftLoad({data:{content:{version:1,fields:{item:'Older saved title'}}},error:null}));
 await expect(page.locator('#item')).toHaveValue('Newer unsaved edits');await expect(page.locator('#listingCloudDraftStatus')).toContainText('form changed');
 await page.locator('[data-cloud-draft="load"]').click();await page.evaluate(()=>{currentUser={id:'other-owner'};syncInboxDraftUser();finishDraftLoad({data:{content:{version:1,fields:{item:'Previous owner private draft'}}},error:null})});
 await expect(page.locator('#item')).not.toHaveValue('Previous owner private draft');await expect(page.locator('#listingCloudDraftStatus')).toBeEmpty();
});

test('saved draft restores dependent printing and grading fields regardless of JSON key order',async({page})=>{
 await cloudDraftFixture(page);
 const saved=await page.evaluate(()=>{
  document.getElementById('tcgGame').value='one_piece';document.getElementById('tcgGame').dispatchEvent(new Event('change'));
  const era=document.getElementById('tcgEra');era.value=[...era.options].find(o=>o.value)?.value||'';era.dispatchEvent(new Event('change'));
  const set=document.getElementById('tcgSet');set.value=[...set.options].find(o=>o.value)?.value||'';
  for(const [id,value] of Object.entries({tcgCustomSet:'Japanese event release',tcgCustomVariant:'Stamped alternate foil',tcgRarity:'Promo',tcgEdition:'First printing',tcgLanguage:'Japanese',cardCondition:'graded',gradingCompany:'PSA',gradingScore:'9'}))document.getElementById(id).value=value;
  return {fields:Object.fromEntries(Object.entries(collectListingDraftValues()).reverse()),set:set.value};
 });
 await page.locator('[data-cloud-draft="load"]').click();await page.evaluate(saved=>finishDraftLoad({data:{content:{version:1,fields:saved.fields}},error:null}),saved);
 await expect(page.locator('#tcgGame')).toHaveValue('one_piece');await expect(page.locator('#tcgSet')).toHaveValue(saved.set);await expect(page.locator('#tcgCustomVariant')).toHaveValue('Stamped alternate foil');await expect(page.locator('#tcgLanguage')).toHaveValue('Japanese');await expect(page.locator('#gradingCompany')).toHaveValue('PSA');await expect(page.locator('#gradingScore')).toHaveValue('9');
});

test('failed account draft save preserves the form and releases its controls',async({page})=>{
 await cloudDraftFixture(page);await page.locator('#item').fill('Unfinished seller draft');await page.evaluate(()=>{supabaseClient.from=()=>({upsert:async()=>{throw Error('Draft network down')}})});
 await page.locator('[data-cloud-draft="save"]').click();await expect(page.locator('#listingCloudDraftStatus')).toContainText('Draft network down');await expect(page.locator('#item')).toHaveValue('Unfinished seller draft');await expect(page.locator('[data-cloud-draft="save"]')).toBeEnabled();
});
