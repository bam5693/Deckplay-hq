const {test,expect}=require('@playwright/test');
async function fixture(page,selected=false){
 await page.route('https://**/*',r=>r.abort());await page.goto('/');await page.evaluate(async selected=>{
  await supabaseClient.auth.getSession();currentUser={id:'first-buyer'};syncInboxDraftUser();saved.clear();if(selected)saved.add('favorite-item');window.favoriteWrites=[];window.favoriteToasts=[];toast=message=>favoriteToasts.push(message);
  supabaseClient.from=()=>{const wait=()=>new Promise((resolve,reject)=>{favoriteWrites.push(true);window.finishFavorite=resolve;window.failFavorite=reject});const q={eq:()=>q,insert:wait,delete:()=>q,then:(a,b)=>wait().then(a,b)};return q};
  items=[{id:'favorite-item',databaseId:'favorite-item',n:'TEST ONLY game',c:'Video Games',p:25,s:'seller',sellerId:'seller',cond:'Used',imageUrls:[]}];cat='All';filter='All';game='All';query='';onlyMyListings=false;onlySavedListings=false;showMainMarketplace();render();
 },selected);
}
test('repeated favorite taps submit once and show a busy control until the request finishes',async({page})=>{
 await fixture(page);await page.locator('[data-heart]').click();await expect(page.locator('[data-heart]')).toBeDisabled();await page.locator('[data-heart]').evaluate(b=>b.click());expect(await page.evaluate(()=>favoriteWrites.length)).toBe(1);await page.evaluate(()=>finishFavorite({error:null}));await expect(page.locator('[data-heart]')).toBeEnabled();await expect(page.locator('[data-heart]')).toHaveText('♥');
});
test('a rejected favorite removal from the previous account cannot populate the new account saved items',async({page})=>{
 await fixture(page,true);await page.locator('[data-heart]').click();await page.evaluate(()=>{currentUser={id:'second-buyer'};syncInboxDraftUser();saved.clear();render();finishFavorite({error:{message:'Old account request failed'}})});await expect.poll(()=>page.evaluate(()=>[...saved])).toEqual([]);expect(await page.evaluate(()=>favoriteToasts)).toEqual([]);
});
test('transport failure preserves the earlier favorite state and permits a safe retry',async({page})=>{
 await fixture(page);await page.locator('[data-heart]').click();await page.evaluate(()=>failFavorite(Error('Network unavailable')));await expect(page.locator('[data-heart]')).toBeEnabled();await expect(page.locator('[data-heart]')).toHaveText('♡');await page.locator('[data-heart]').click();await expect.poll(()=>page.evaluate(()=>favoriteWrites.length)).toBe(2);await page.evaluate(()=>finishFavorite({error:{code:'23505',message:'Already saved'}}));await expect(page.locator('[data-heart]')).toHaveText('♥');
});

test('saved-item refresh keeps the same account favorites on failure and reconciles on retry',async({page})=>{
 await fixture(page,true);
 await page.evaluate(()=>{
  resetSavedListingsForAccount('first-buyer');saved.add('favorite-item');
  window.savedReadQueue=[];
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({error:{message:'Offline'}}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 expect(await page.evaluate(()=>[...saved])).toEqual(['favorite-item']);
 await page.evaluate(()=>{window.savedRetryDone=false;loadSavedListings().then(()=>savedRetryDone=true)});
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[{listing_id:'other-saved-item'}],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRetryDone)).toBe(true);
 expect(await page.evaluate(()=>[...saved])).toEqual(['other-saved-item']);
});
test('account switch immediately clears prior saves despite a pending refresh and slow block lookup',async({page})=>{
 await fixture(page,true);
 await page.evaluate(()=>{
  resetSavedListingsForAccount('first-buyer');saved.add('favorite-item');
  window.savedReadQueue=[];
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.oldSavedRefresh=loadSavedListings();
  loadBlockedCollectors=()=>new Promise(()=>{}); // Simulate delayed privacy preflight.
  applyDeckplayAuthSession('SIGNED_IN',{user:{id:'second-buyer',user_metadata:{}}});
 });
 expect(await page.evaluate(()=>[...saved])).toEqual([]);
 await page.evaluate(()=>savedReadQueue.shift()({data:[{listing_id:'favorite-item'}],error:null}));
 await expect.poll(()=>page.evaluate(()=>[...saved])).toEqual([]);
});

test('a saved-items refresh cannot erase an optimistic favorite while its write is pending',async({page})=>{
 await fixture(page);
 await page.locator('[data-heart]').click();
 await page.evaluate(()=>{
  window.savedReadQueue=[];readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 await expect(page.locator('[data-heart]')).toHaveText('♥');
 await page.evaluate(()=>finishFavorite({error:null}));
 await expect(page.locator('[data-heart]')).toBeEnabled();
 await expect(page.locator('[data-heart]')).toHaveText('♥');
});

test('a stale saved-items read cannot undo a confirmed save after its write completes',async({page})=>{
 await fixture(page);
 await page.locator('[data-heart]').click();
 await page.evaluate(()=>{
  window.savedReadQueue=[];readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>finishFavorite({error:null}));
 await expect(page.locator('[data-heart]')).toBeEnabled();
 await page.evaluate(()=>savedReadQueue.shift()({data:[],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 await expect(page.locator('[data-heart]')).toHaveText('♥');
});

test('a saved-items refresh does not resurrect an item being unsaved',async({page})=>{
 await fixture(page,true);
 await page.locator('[data-heart]').click();
 await page.evaluate(()=>{
  window.savedReadQueue=[];readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[{listing_id:'favorite-item'}],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 await expect(page.locator('[data-heart]')).toHaveText('♡');
 await page.evaluate(()=>finishFavorite({error:null}));
 await expect(page.locator('[data-heart]')).toBeEnabled();
 await expect(page.locator('[data-heart]')).toHaveText('♡');
});
