const {test,expect}=require('@playwright/test');const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');
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

const realPhoto={name:'synthetic-front.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX3cAAAAASUVORK5CYII=','base64')};
test('representative categories publish real photos and safely add, replace, reorder and remove them',async({page},info)=>{
 test.setTimeout(180000);await signIn(page,'SELLER');const title=marker(),uploadedUrls=new Set();
 const catalog=require('../fixtures/category-catalog.json'),scenarios=[...new Map(catalog.rows.map(row=>[row.fields.category,row])).values()];
 try{for(const [index,row] of scenarios.entries()){
  info.annotations.push({type:'persona',description:['Charles','Kyle','Tanner','Jayden'][index%4]+' reviews real listing photos for '+row.fields.category});
  await page.evaluate(({fields,title})=>{
   openModal('sellModal');const select=(id,v)=>{document.getElementById(id).value=v;document.getElementById(id).dispatchEvent(new Event('change',{bubbles:true}))};select('listingType',fields.listingType);for(const [id,v]of Object.entries(fields))if(id!=='listingType')select(id,v);
   for(const [id,v]of Object.entries({item:title,description:'TEST ONLY synthetic photo journey. Original condition disclosure.',price:'25.75',consoleModel:'Synthetic model',deckLeader:'Synthetic deck',deckCardCount:'2',deckList:'2x Synthetic card',sportsBrand:'Topps'}))document.getElementById(id).value=v;
  },{fields:row.fields,title});
  await page.locator('#photos').setInputFiles(realPhoto);await page.locator('#listingForm').evaluate(f=>f.requestSubmit());await expect(page.locator('#sellModal')).not.toHaveClass(/open/,{timeout:25000});
  const saved=await page.evaluate(async({title,category})=>{const {data,error}=await supabaseClient.from('listings').select('*').eq('title',title).eq('category',category).eq('seller_id',currentUser.id).single();if(error)throw Error(error.message);return data},{title,category:row.fields.category});
  expect(saved.image_urls).toHaveLength(1);const before=saved.image_urls[0];uploadedUrls.add(before);expect((await page.request.get(before)).ok()).toBe(true);
  await page.evaluate(id=>listingEditor.open(id),saved.id);await expect(page.locator('[data-edit-photo-previews] img')).toHaveCount(1);
  await page.locator('#editListingPhotoInput').setInputFiles({...realPhoto,name:'synthetic-back.png'});await page.locator('[data-edit-photo="cover"]').nth(1).click();
  await page.locator('[data-edit-photo="replace"]').nth(1).click();await page.locator('#editListingReplaceInput').setInputFiles({...realPhoto,name:'synthetic-condition.png'});
  await page.locator('#saveListingEdits').click();await expect(page.locator('#editListingModal')).not.toHaveClass(/open/,{timeout:25000});
  const after=await page.evaluate(async id=>(await supabaseClient.from('listings').select('*').eq('id',id).single()).data,saved.id);
  expect(after.image_urls).toHaveLength(2);expect(after.image_urls).not.toContain(before);expect(after.description).toBe(saved.description);expect(after.category).toBe(saved.category);
  for(const url of after.image_urls){uploadedUrls.add(url);expect((await page.request.get(url)).ok()).toBe(true)}
  await page.evaluate(id=>listingEditor.open(id),saved.id);await expect(page.locator('[data-edit-photo-previews] img')).toHaveCount(2);await page.locator('[data-edit-photo="remove"]').nth(1).click();await page.locator('#saveListingEdits').click();await expect(page.locator('#editListingModal')).not.toHaveClass(/open/,{timeout:25000});
 }}finally{await page.evaluate(()=>listingEditor.reset());await cleanup(page,title);await page.evaluate(async urls=>{
   if(SUPABASE_URL!=='https://prrrzeelltmyugssqnzk.supabase.co'||currentUser?.email!=='deckplay-seller@deckplay.test')throw Error('Synthetic staging owner required');
   const prefix=SUPABASE_URL+'/storage/v1/object/public/listing-images/'+currentUser.id+'/';const paths=urls.map(url=>{if(!url.startsWith(prefix))throw Error('Unexpected fixture image owner');const file=url.slice(prefix.length);if(!/^[a-f0-9-]{36}\.[a-z0-9]+$/.test(file))throw Error('Unexpected fixture photo');return currentUser.id+'/'+file});
   if(paths.length){const {error}=await supabaseClient.storage.from('listing-images').remove(paths);if(error)throw Error(error.message)}
  },[...uploadedUrls])}
});
