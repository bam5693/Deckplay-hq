const {test,expect}=require('@playwright/test');const crypto=require('node:crypto');
const {categoryCatalog}=require('../helpers/category-catalog.cjs');
for(const persona of ['Charles','Kyle','Tanner','Jayden'])test(persona+' discovers every persistent synthetic category fixture on deployed staging',async({page},info)=>{
 test.setTimeout(90000);await page.goto('/');
 await page.waitForFunction(()=>typeof supabaseClient!=='undefined');
 const catalog=await page.evaluate(categoryCatalog);
 const ids=catalog.rows.map(row=>crypto.createHash('md5').update('deckplay-category-v1/'+row.key).digest('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5'));
 const result=await page.evaluate(async ids=>{
  const {data,error}=await supabaseClient.from('listings').select('*').in('id',ids);if(error)throw Error(error.message);await loadListings();return data;
 },ids);
 expect(result).toHaveLength(ids.length);
 const rows=[];
 for(let i=0;i<catalog.rows.length;i++){
  const row=catalog.rows[i],saved=result.find(x=>x.id===ids[i]);expect(saved.title).toMatch(/^TEST ONLY CATALOG /);expect(saved.category).toBe(row.fields.category);expect(saved.product_type).toBe(row.fields.listingType);expect(saved.status).toBe('active');
  const observed=await page.evaluate(saved=>{
   onlySavedListings=false;onlyMyListings=false;cat=databaseCategory(saved.category);filter='All';game=saved.tcg_game||'All';query=saved.title;
   document.getElementById('marketMaxPrice').value='';document.getElementById('marketCollectibleSubcategory').value=saved.collectible_subcategory||'All';render();
   return !!document.querySelector('[data-view="'+saved.id+'"]');
  },saved);
  expect(observed,row.key).toBe(true);rows.push({key:row.key,checks:{inventory:'passed',section_search_filter:'passed'},persona,project:info.project.name});
 }
 const photo=await page.request.get('/test-inventory-placeholder.svg');expect(photo.ok()).toBe(true);expect(await photo.text()).toContain('TEST ONLY INVENTORY');
 await info.attach('live-category-inventory',{body:JSON.stringify({scope:'deployed read-only discovery; does not certify per-category writes or transactions',rows}),contentType:'application/json'});
});
