const {test,expect}=require('@playwright/test');
const fs=require('node:fs');const {categoryCatalog,features}=require('../helpers/category-catalog.cjs');
for(const persona of ['Charles','Kyle','Tanner','Jayden'])test(persona+' rotates through the complete derived listing catalog',async({page},testInfo)=>{
 test.setTimeout(120000);
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 const catalog=await page.evaluate(categoryCatalog);
 expect(catalog).toEqual(require('../fixtures/category-catalog.json'));
 expect(catalog.controls.marketGame.filter(o=>o.value!=='All').map(o=>o.value)).toEqual(catalog.controls.tcgGame.map(o=>o.value));
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'category-test-owner'};syncInboxDraftUser();
  window.categoryWrites=[];window.categoryDraft=null;window.categoryUploads=0;
  ensureProfile=async()=>{};uploadPhotos=async()=>{categoryUploads++;return ['https://example.test/test-only.jpg']};loadListings=async()=>{};
  supabaseClient.from=table=>{let editing=false;const q={select:()=>q,eq:()=>q,is:()=>q,insert:async row=>{categoryWrites.push(row);return {error:null}},upsert:async row=>{categoryDraft=row;return {error:null}},update:changes=>{editing=true;window.categoryEditChanges=changes;return q},maybeSingle:async()=>({data:editing?{id:'category-edit-item'}:window.categoryEditRow,error:null})};return q};
 });
 const results=[];
 for(const row of catalog.rows){
  const outcome={key:row.key,persona,project:testInfo.project.name,checks:Object.fromEntries(features.map(f=>[f,'unverified']))};results.push(outcome);
  try{
   const saved=await page.evaluate(async row=>{
    const select=(id,value)=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));if(e.value!==value)throw Error('Unselectable '+id+'='+value)};
    document.getElementById('listingForm').reset();select('listingType',row.fields.listingType);
    for(const [id,value] of Object.entries(row.fields))if(id!=='listingType')select(id,value);
    for(const [id,value] of Object.entries({item:'TEST ONLY '+row.label,price:'24.75',description:'TEST ONLY synthetic inventory. No real item or transaction.',consoleModel:'Synthetic model',deckLeader:'Synthetic deck',deckCardCount:'2',deckList:'2x Synthetic card'}))document.getElementById(id).value=value;
    document.getElementById('sportsBrand').value='Topps';document.getElementById('cardCondition').value='lightly_played';
    document.getElementById('acceptsTrades').checked=true;document.getElementById('acceptsPriceOffers').checked=true;
    document.getElementById('sellModal').classList.add('open');
    listingSelectedPhotos=[new File(['synthetic'],'test-only.jpg',{type:'image/jpeg'})];renderListingPhotos();
    if(!document.getElementById('listingForm').checkValidity())throw Error('Required form choices invalid: '+[...document.querySelectorAll('#listingForm :invalid')].map(e=>e.id));
    document.querySelector('[data-cloud-draft="save"]').click();
    await new Promise(r=>setTimeout(r,0));
    const draft=categoryDraft;if(!draft||draft.content.fields.category!==row.fields.category)throw Error('Draft category lost');
    // Exercise restoration in the same dependency order used by account drafts.
    applyListingDraftValues(draft.content.fields);
    for(const [id,value] of Object.entries(row.fields))if(document.getElementById(id).value!==value)throw Error('Draft field lost: '+id);
    document.getElementById('listingForm').requestSubmit();
    await new Promise(r=>setTimeout(r,0));
    const saved=categoryWrites.at(-1);if(!saved||saved.title!=='TEST ONLY '+row.label)throw Error('Listing was not published: '+document.getElementById('listingStatus').textContent);
    return saved;
   },row);
   expect(saved.category,row.key).toBe(row.fields.category);expect(saved.product_type).toBe(row.fields.listingType);
   if(row.fields.tcgGame)expect(saved.tcg_game).toBe(row.fields.tcgGame);
   if(row.fields.collectibleSubcategory)expect(saved.collectible_subcategory).toBe(row.fields.collectibleSubcategory);
   if(row.fields.gamePlatform)expect(saved.description).toContain(row.fields.gamePlatform);
   if(row.fields.consoleBrand)expect(saved.description).toContain(row.fields.consoleBrand);
   expect(saved.price).toBe(24.75);expect(saved.image_urls).toHaveLength(1);
   for(const f of ['category','create','draft','condition_price','publish'])outcome.checks[f]='passed';
   outcome.checks.subcategory=Object.keys(row.fields).length>2?'passed':'not-applicable';
   const edit=await page.evaluate(async saved=>{
    window.categoryEditRow={...saved,id:'category-edit-item',updated_at:'2026-10-28T00:00:00Z'};await listingEditor.open('category-edit-item');
    document.getElementById('editClassificationEnabled').checked=true;document.getElementById('editClassificationEnabled').dispatchEvent(new Event('change'));
    for(const [id,value]of Object.entries(saved.__fields||{})){const el=document.getElementById('editAttribute_'+id);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))}
    for(const [id,value]of Object.entries({consoleModel:'Synthetic model',sportsBrand:'Topps',deckLeader:'Synthetic deck',deckCardCount:'2',deckList:'2x Synthetic card'}))document.getElementById('editAttribute_'+id).value=value;
    document.getElementById('editListingPrice').value='19.75';document.getElementById('editListingForm').requestSubmit();await new Promise(r=>setTimeout(r,0));return window.categoryEditChanges;
   },{...saved,__fields:row.fields});
   expect(edit.price).toBe(19.75);expect(edit.title).toBe(saved.title);expect(edit.description).toContain(saved.description);expect(edit.category).toBe(saved.category);expect(edit.product_type).toBe(row.fields.listingType);expect(edit).not.toHaveProperty('image_urls');outcome.checks.edit='passed';
   // Upload is deliberately mocked; image preparation/storage are not certified here.
   const discovery=await page.evaluate(saved=>{
    const row={...saved,id:'matrix-item',created_at:new Date().toISOString()};items=[marketplaceItemFromRow(row,{username:'test-only-seller'})];
    blockedCollectorIds.clear();onlyMyListings=false;onlySavedListings=false;filter='All';query='';game='All';cat=databaseCategory(saved.category);
    document.getElementById('marketCollectibleSubcategory').value='All';document.getElementById('marketMaxPrice').value='';
    render();const section=document.querySelectorAll('#grid h3').length;
    query=saved.title;render();const search=document.querySelectorAll('#grid h3').length;
    query='';if(saved.tcg_game)game=saved.tcg_game;if(saved.collectible_subcategory)document.getElementById('marketCollectibleSubcategory').value=saved.collectible_subcategory;
    const second={...items[0],id:'matrix-cheaper',p:10};items.push(second);
    const sorts={};for(const sort of [...document.getElementById('marketSort').options].map(o=>o.value)){document.getElementById('marketSort').value=sort;render();sorts[sort]=[...document.querySelectorAll('#grid .price')].map(e=>e.textContent)}
    document.getElementById('marketMaxPrice').value='5';render();const empty=document.querySelectorAll('#grid h3').length;
    return {section,search,sorts,empty};
   },saved);
   expect(discovery.section).toBe(1);expect(discovery.search).toBe(1);expect(discovery.empty).toBe(0);
   expect(discovery.sorts.low).toEqual(['$10.00','$24.75']);expect(discovery.sorts.high).toEqual(['$24.75','$10.00']);
   for(const f of ['section','search','filters_sort'])outcome.checks[f]='passed';
  }catch(error){outcome.failure=error.message;outcome.checks.create='failed';throw error}
  finally{fs.writeFileSync(testInfo.outputPath('category-coverage.json'),JSON.stringify({scope:'local mocked persistence; not live API, uploads or physical-device certification',catalog,results},null,2))}
 }
 await testInfo.attach('category-coverage',{path:testInfo.outputPath('category-coverage.json'),contentType:'application/json'});
});

test('every dependent catalog choice can be selected, including eras, sets, variants and grading',async({page})=>{
 await page.route('https://**/*',r=>r.abort());await page.goto('/');
 const checked=await page.evaluate(categoryCatalog);
 await page.evaluate(catalog=>{
  const choose=(id,value)=>{const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));if(el.value!==value)throw Error('Unavailable catalog choice '+id+':'+value)};
  for(const game of catalog.dependent){choose('listingType','single');choose('tcgGame',game.game);for(const era of game.sets){choose('tcgEra',era.era);for(const set of era.options)choose('tcgSet',set.value)}for(const variant of game.variants)choose('tcgVariant',variant.value)}
  choose('listingType','single');choose('tcgGame','sports_cards');for(const option of catalog.controls.sportsBrand)choose('sportsBrand',option.value);
  for(const option of catalog.controls.cardCondition)choose('cardCondition',option.value);
  choose('cardCondition','graded');for(const option of catalog.controls.gradingCompany)choose('gradingCompany',option.value);for(const option of catalog.controls.gradingScore)choose('gradingScore',option.value);
  choose('listingType','game');for(const option of catalog.controls.condition)choose('condition',option.value);
 },checked);
});
