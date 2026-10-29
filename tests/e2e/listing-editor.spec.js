const {test,expect}=require('@playwright/test');
async function fixture(page){
 await page.route('https://**/*',r=>r.abort());await page.goto('/');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'edit-owner'};syncInboxDraftUser();
  window.editWrites=[];window.editFilters=[];window.editedReloads=0;loadListings=async()=>{editedReloads++};
  window.editRow={id:'edit-item',seller_id:'edit-owner',title:'TEST ONLY original',description:'Set: custom\nCorner damage disclosed',price:24.75,accepts_trades:true,accepts_price_offers:true,status:'active',updated_at:'2026-10-28T00:00:00Z'};
  supabaseClient.from=()=>{let write=false;const q={select:()=>q,eq:(key,value)=>{if(write)editFilters.push([key,value]);return q},update:changes=>{write=true;editWrites.push(changes);return q},maybeSingle:()=>write?new Promise((resolve,reject)=>{window.finishEdit=resolve;window.failEdit=reject}):Promise.resolve({data:editRow,error:null})};return q};
  items=[marketplaceItemFromRow({...editRow,category:'trading_cards',condition:'used',tcg_game:'magic'},null)];onlyMyListings=true;cat='All';game='All';filter='All';query='';render();showMainMarketplace();
 });await page.locator('[data-edit-listing]').click();await expect(page.locator('#editListingTitle')).toHaveValue('TEST ONLY original');
}
test('seller edits retain exact disclosures and use owner, active-state and version guards',async({page})=>{
 await fixture(page);await expect(page.locator('#editListingDescription')).toHaveValue('Set: custom\nCorner damage disclosed');await page.locator('#editListingTitle').fill('Updated Magic lot');await page.locator('#editListingPrice').fill('19.50');await page.locator('#editListingForm').evaluate(f=>f.requestSubmit());await page.locator('#editListingForm').evaluate(f=>f.requestSubmit());
 expect(await page.evaluate(()=>editWrites)).toMatchObject([{title:'Updated Magic lot',description:'Set: custom\nCorner damage disclosed',price:19.5,accepts_trades:true,accepts_price_offers:true}]);
 expect(await page.evaluate(()=>editFilters)).toEqual([['id','edit-item'],['seller_id','edit-owner'],['status','active'],['updated_at','2026-10-28T00:00:00Z'],['title','TEST ONLY original'],['description','Set: custom\nCorner damage disclosed'],['price',24.75],['accepts_price_offers',true],['accepts_trades',true]]);await page.evaluate(()=>finishEdit({data:{id:'edit-item'},error:null}));await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);expect(await page.evaluate(()=>editedReloads)).toBe(1);
});
test('failed saves and concurrent reservation keep the exact seller draft',async({page})=>{
 await fixture(page);await page.locator('#editListingDescription').fill('New exact disclosure');await page.locator('#saveListingEdits').click();await page.evaluate(()=>finishEdit({data:null,error:null}));await expect(page.locator('#editListingStatus')).toContainText('changed or was reserved');await expect(page.locator('#editListingDescription')).toHaveValue('New exact disclosure');await expect(page.locator('#saveListingEdits')).toBeEnabled();
 await page.locator('#saveListingEdits').click();await page.evaluate(()=>failEdit(Error('Network unavailable')));await expect(page.locator('#editListingStatus')).toContainText('Network unavailable');await expect(page.locator('#editListingDescription')).toHaveValue('New exact disclosure');
});
test('account changes clear the private editor and reject a late successful save',async({page})=>{
 await fixture(page);await page.locator('#saveListingEdits').click();await page.evaluate(()=>{currentUser={id:'other-owner'};syncInboxDraftUser();finishEdit({data:{id:'edit-item'},error:null})});await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);await expect(page.locator('#editListingTitle')).toHaveValue('');expect(await page.evaluate(()=>editedReloads)).toBe(0);
});
test('late editor loads cannot reveal the old owner draft in a new account',async({page})=>{
 await fixture(page);await page.evaluate(()=>{listingEditor.reset();supabaseClient.from=()=>{const q={select:()=>q,eq:()=>q,maybeSingle:()=>new Promise(r=>window.finishEditLoad=r)};return q};void listingEditor.open('edit-item');currentUser={id:'other-owner'};syncInboxDraftUser();finishEditLoad({data:editRow,error:null})});await expect(page.locator('#editListingTitle')).toHaveValue('');await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);
});

const editPhoto={name:'test-only.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX3cAAAAASUVORK5CYII=','base64')};
async function photoFixture(page){
 await fixture(page);await page.evaluate(async()=>{
  editRow.image_urls=['https://example.test/original.jpg'];await listingEditor.open('edit-item');
  window.editUploadCalls=[];window.editUploadFailure=false;prepareListingPhoto=async file=>file;
  supabaseClient.storage.from=bucket=>({upload:async(path,file)=>{editUploadCalls.push({bucket,path,name:file.name});if(editUploadFailure){editUploadFailure=false;return {error:{message:'Photo connection failed'}}}return {error:null}},getPublicUrl:path=>({data:{publicUrl:'https://example.test/'+path}})});
 });
}
test('owner can replace, add and reorder listing photos without changing the create-listing draft',async({page})=>{
 await photoFixture(page);await page.evaluate(()=>document.getElementById('item').value='Unrelated saved creation draft');
 await page.locator('[data-edit-photo="replace"]').click();await page.locator('#editListingReplaceInput').setInputFiles(editPhoto);
 await page.locator('#editListingPhotoInput').setInputFiles({...editPhoto,name:'back.png'});
 await expect(page.locator('[data-edit-photo-previews] img')).toHaveCount(2);await page.locator('[data-edit-photo="cover"]').nth(1).click();
 await page.locator('#saveListingEdits').click();await expect.poll(()=>page.evaluate(()=>editWrites.length)).toBe(1);
 const changes=await page.evaluate(()=>editWrites[0]);expect(changes.image_urls).toHaveLength(2);expect(await page.evaluate(()=>editUploadCalls.map(x=>x.name))).toEqual(['back.png','test-only.png']);expect(await page.evaluate(()=>editUploadCalls.every(x=>x.bucket==='listing-images'))).toBe(true);
 expect(await page.evaluate(()=>editFilters)).toContainEqual(['image_urls','{"https://example.test/original.jpg"}']);await page.evaluate(()=>finishEdit({data:{id:'edit-item'},error:null}));await expect(page.locator('#item')).toHaveValue('Unrelated saved creation draft');
});
test('failed photo uploads keep selected files and retry reuses uploads that already succeeded',async({page})=>{
 await photoFixture(page);await page.locator('#editListingPhotoInput').setInputFiles([editPhoto,{...editPhoto,name:'second.png'}]);
 await page.evaluate(()=>{supabaseClient.storage.from=bucket=>({upload:async(path,file)=>{editUploadCalls.push(file.name);return file.name==='second.png'&&editUploadCalls.length===2?{error:{message:'Second photo failed'}}:{error:null}},getPublicUrl:path=>({data:{publicUrl:'https://example.test/'+path}})})});
 await page.locator('#saveListingEdits').click();await expect(page.locator('#editListingStatus')).toContainText('Second photo failed');await expect(page.locator('[data-edit-photo-previews] img')).toHaveCount(3);expect(await page.evaluate(()=>editWrites)).toEqual([]);
 await page.locator('#saveListingEdits').click();await expect.poll(()=>page.evaluate(()=>editWrites.length)).toBe(1);expect(await page.evaluate(()=>editUploadCalls)).toEqual(['test-only.png','second.png','second.png']);await page.evaluate(()=>finishEdit({data:{id:'edit-item'},error:null}));
});
test('removing every listing photo fails clearly and leaves the persisted listing untouched',async({page})=>{
 await photoFixture(page);await page.locator('[data-edit-photo="remove"]').click();await page.locator('#saveListingEdits').click();await expect(page.locator('#editListingStatus')).toContainText('at least one photo');expect(await page.evaluate(()=>editWrites)).toEqual([]);await expect(page.locator('#editListingTitle')).toHaveValue('TEST ONLY original');
});
test('an upload with a lost response reuses its exact unique object only after verifying bytes',async({page})=>{
 await photoFixture(page);await page.locator('#editListingPhotoInput').setInputFiles(editPhoto);
 await page.evaluate(()=>{window.uploadedBlob=null;supabaseClient.storage.from=()=>({upload:async(path,blob)=>{editUploadCalls.push(path);uploadedBlob=blob;return {error:editUploadCalls.length===1?{message:'Response lost'}:{statusCode:'409',message:'Already exists'}}},download:async()=>({data:uploadedBlob,error:null}),getPublicUrl:path=>({data:{publicUrl:'https://example.test/'+path}})})});
 await page.locator('#saveListingEdits').click();await expect(page.locator('#editListingStatus')).toContainText('Response lost');await page.locator('#saveListingEdits').click();await expect.poll(()=>page.evaluate(()=>editWrites.length)).toBe(1);const paths=await page.evaluate(()=>editUploadCalls);expect(paths[0]).toBe(paths[1]);await page.evaluate(()=>finishEdit({data:{id:'edit-item'},error:null}));
});
test('account changes during editor photo preparation cannot start a storage upload',async({page})=>{
 await photoFixture(page);await page.locator('#editListingPhotoInput').setInputFiles(editPhoto);await page.evaluate(()=>prepareListingPhoto=()=>new Promise(r=>window.completeEditPhoto=r));await page.locator('#saveListingEdits').click();
 await page.evaluate(()=>{currentUser={id:'other-owner'};syncInboxDraftUser();completeEditPhoto(new File(['x'],'x.png',{type:'image/png'}))});expect(await page.evaluate(()=>editUploadCalls)).toEqual([]);expect(await page.evaluate(()=>editWrites)).toEqual([]);await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);
});

test('changing categories saves dependent fields without touching a separate creation draft',async({page})=>{
 await fixture(page);await page.evaluate(()=>document.getElementById('tcgCustomSet').value='Unrelated creation draft set');await page.locator('#editListingClassification summary').click();await page.locator('#editClassificationEnabled').check();
 await page.locator('#editAttribute_category').selectOption('video_games');await page.locator('#editAttribute_gamePlatform').selectOption({index:1});await page.locator('#editAttribute_condition').selectOption('used');
 const platform=await page.locator('#editAttribute_gamePlatform').inputValue();await page.locator('#saveListingEdits').click();await expect.poll(()=>page.evaluate(()=>editWrites.length)).toBe(1);
 const data=await page.evaluate(()=>editWrites[0]);expect(data).toMatchObject({category:'video_games',product_type:'game',tcg_game:null,collectible_subcategory:null,condition:'used'});expect(data.description).toContain('Platform: '+platform);expect(data.description).toContain('Corner damage disclosed');await expect(page.locator('#tcgCustomSet')).toHaveValue('Unrelated creation draft set');await page.evaluate(()=>finishEdit({data:{id:'edit-item'},error:null}));
});
test('classification requires dependent choices and preserves existing structured details on later text edits',async({page})=>{
 await fixture(page);await page.locator('#editListingClassification summary').click();await page.locator('#editClassificationEnabled').check();await page.locator('#editAttribute_category').selectOption('consoles');await page.locator('#saveListingEdits').click();expect(await page.evaluate(()=>editWrites)).toEqual([]);
 await page.evaluate(async()=>{editRow.description='[Listing classification]\nPlatform: Nintendo Switch\n[End classification]\n\nOriginal disclosure';await listingEditor.open('edit-item')});await page.locator('#editListingDescription').fill('Updated disclosure');await page.locator('#saveListingEdits').click();await expect.poll(()=>page.evaluate(()=>editWrites.length)).toBe(1);expect(await page.evaluate(()=>editWrites[0].description)).toBe('[Listing classification]\nPlatform: Nintendo Switch\n[End classification]\n\nUpdated disclosure');await page.evaluate(()=>finishEdit({data:{id:'edit-item'},error:null}));
});

test('editing bundle quantities replaces structured contents and keeps seller disclosures',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{editRow={...editRow,category:'video_games',product_type:'game',condition:'used',description:'[Listing contents]\nQuantity included: 2\nUnit: games\nSold together for the listing price.\nContents:\n2x Complete game\n[End listing contents]\n\n[Video Game]\nPlatform: Nintendo Switch\nOriginal damage disclosure'};await listingEditor.open('edit-item')});
 await page.locator('#editListingClassification summary').click();await page.locator('#editClassificationEnabled').check();
 await expect(page.locator('#editAttribute_listingIncludedQuantity')).toHaveValue('2');
 await page.locator('#editAttribute_listingIncludedQuantity').fill('3');await page.locator('#editAttribute_listingContentsList').fill('2x Complete game\n1x Disc-only game');
 await page.locator('#saveListingEdits').click();await expect.poll(()=>page.evaluate(()=>editWrites.length)).toBe(1);
 const description=await page.evaluate(()=>editWrites[0].description);expect(description).toContain('Quantity included: 3');expect(description).toContain('Original damage disclosure');expect(description.match(/\[Listing contents\]/g)).toHaveLength(1);
 await page.evaluate(()=>finishEdit({data:{id:'edit-item'},error:null}));
});
