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
