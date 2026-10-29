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
