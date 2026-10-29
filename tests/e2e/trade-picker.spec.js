const {test,expect}=require('@playwright/test');
test('trade picker includes inventory beyond 100 items and discards a switched account response',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'inventory-owner'};window.pickerRanges=[];
  supabaseClient.from=()=>{
   const q={};for(const key of ['select','eq','order'])q[key]=()=>q;
   q.range=async(start,end)=>{pickerRanges.push([start,end]);return {data:Array.from({length:Math.min(100,121-start)},(_,i)=>({id:'item-'+(start+i),title:'Collector item '+(start+i)})),error:null}};return q;
  };
  document.getElementById('detailContent').innerHTML='<button data-trade-id="target" data-trade-seller="other">Trade</button>';
  document.querySelector('[data-trade-id]').click();
 });
 await expect(page.locator('#tradeOfferedListing option')).toHaveCount(122);
 await page.locator('#tradeOfferedListing').selectOption('item-120');
 await expect(page.locator('#tradeOfferedListing')).toHaveValue('item-120');
 expect(await page.evaluate(()=>pickerRanges)).toEqual([[0,99],[100,199]]);
 await page.evaluate(()=>{
  supabaseClient.from=()=>{const q={};for(const key of ['select','eq','order'])q[key]=()=>q;q.range=()=>new Promise(resolve=>window.finishPicker=resolve);return q};
  document.querySelector('[data-trade-id]').click();currentUser={id:'different-account'};
  finishPicker({data:[{id:'private-item',title:'Private inventory'}],error:null});
 });
 await expect(page.locator('#tradeOfferedListing option[value="private-item"]')).toHaveCount(0);
});

async function composeFixture(page){
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'buyer-fixture'};tradeTargetId='target-fixture';tradeRecipientId='seller-fixture';window.tradeWrites=[];
  supabaseClient.from=()=>{const q={select:()=>q,single:()=>new Promise((resolve,reject)=>{window.finishTrade=resolve;window.failTrade=reject})};q.insert=value=>{tradeWrites.push(value);return q};return q};
  sendCollectorEmailForSource=async()=>{};openModal('tradeComposeModal');
 });
 await page.locator('#tradeOfferNote').fill('My original trade proposal');
}
test('repeated trade submission sends once and a connection error preserves the draft for retry',async({page})=>{
 await composeFixture(page);await page.locator('#tradeComposeForm button[type="submit"]').click();
 await page.locator('#tradeComposeForm').dispatchEvent('submit');
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(1);
 await page.evaluate(()=>failTrade(Error('Connection lost')));
 await expect(page.locator('#tradeOfferStatus')).toContainText('Connection lost');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('My original trade proposal');
 await expect(page.locator('#tradeComposeForm button[type="submit"]')).toBeEnabled();
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(2);
 await page.locator('#tradeOfferNote').fill('A newer trade draft');
 await page.evaluate(()=>finishTrade({data:{id:'sent-trade'},error:null}));
 await expect(page.locator('#tradeOfferStatus')).toContainText('new draft is ready');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('A newer trade draft');
 await expect(page.locator('#tradeComposeModal')).toHaveClass(/open/);
});
test('finishing a trade after an account switch cannot reset or close the new account draft',async({page})=>{
 await composeFixture(page);await page.locator('#tradeComposeForm button[type="submit"]').click();
 await page.evaluate(()=>{currentUser={id:'other-fixture'};tradeTargetId='different-target';tradeRecipientId='different-seller'});
 await page.locator('#tradeOfferNote').fill('Other account private draft');
 await page.evaluate(()=>finishTrade({data:{id:'old-trade'},error:null}));
 await expect(page.locator('#tradeComposeForm button[type="submit"]')).toBeEnabled();
 await expect(page.locator('#tradeOfferNote')).toHaveValue('Other account private draft');
 await expect(page.locator('#tradeComposeModal')).toHaveClass(/open/);
 expect(await page.evaluate(()=>tradeWrites[0])).toMatchObject({sender_id:'buyer-fixture',recipient_id:'seller-fixture',listing_id:'target-fixture'});
});

test('a failed trade from the previous account cannot show its error on a new account draft',async({page})=>{
 await composeFixture(page);
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 await page.evaluate(()=>{
  currentUser={id:'other-fixture'};
  tradeTargetId='different-target';
  tradeRecipientId='different-seller';
 });
 await page.locator('#tradeOfferNote').fill('Other account private draft');
 await page.evaluate(()=>failTrade(Error('Former account trade failure')));
 await expect(page.locator('#tradeOfferNote')).toHaveValue('Other account private draft');
 await expect(page.locator('#tradeComposeForm button[type="submit"]')).toBeEnabled();
 await expect(page.locator('#tradeOfferStatus')).not.toContainText('Former account trade failure');
 await expect(page.locator('#tradeComposeModal')).toHaveClass(/open/);
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(1);
});

test('signing out during trade submission cannot display the former account error',async({page})=>{
 await composeFixture(page);
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 await page.evaluate(()=>{currentUser=null;tradeTargetId=null;tradeRecipientId=null});
 await page.evaluate(()=>failTrade(Error('Private trade submission failed')));
 await expect(page.locator('#tradeOfferStatus')).not.toContainText('Private trade submission failed');
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(1);
});

test('a stale successful trade cannot replace a draft after sign-out',async({page})=>{
 await composeFixture(page);
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 await page.evaluate(()=>{currentUser=null;tradeTargetId=null;tradeRecipientId=null});
 await page.locator('#tradeOfferNote').fill('New private draft after sign-out');
 await page.evaluate(()=>finishTrade({data:{id:'old-account-trade'},error:null}));
 await expect(page.locator('#tradeOfferNote')).toHaveValue('New private draft after sign-out');
 await expect(page.locator('#tradeComposeModal')).toHaveClass(/open/);
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(1);
});

async function counterFixture(page){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'counter-seller'};activeCounterOffer='offer-1';counterComposeVersion++;
  window.counterWrites=[];window.counterReloads=0;
  supabaseClient.rpc=(name,args)=>{counterWrites.push({name,args});return new Promise((resolve,reject)=>{window.finishCounter=resolve;window.failCounter=reject})};
  loadTradeOffers=async()=>{counterReloads++};refreshTradeAlerts=async()=>{};
  openModal('counterModal');
 });
 await page.locator('#counterDirection').selectOption('sender_pays');
 await page.locator('#counterAmount').fill('5');
 await page.locator('#counterNote').fill('Jayden offers another One Piece card');
}
test('trade counteroffer sends once and preserves cash, note and retry after network failure',async({page})=>{
 await counterFixture(page);
 await page.locator('#counterForm button[type="submit"]').click();
 await page.locator('#counterForm').dispatchEvent('submit');
 expect(await page.evaluate(()=>counterWrites.length)).toBe(1);
 await expect(page.locator('#counterForm button[type="submit"]')).toBeDisabled();
 await page.evaluate(()=>failCounter(Error('Network unavailable')));
 await expect(page.locator('#counterStatus')).toContainText('Network unavailable');
 await expect(page.locator('#counterNote')).toHaveValue('Jayden offers another One Piece card');
 await expect(page.locator('#counterAmount')).toHaveValue('5');
 await expect(page.locator('#counterForm button[type="submit"]')).toBeEnabled();
 await page.locator('#counterForm button[type="submit"]').click();
 expect(await page.evaluate(()=>counterWrites.length)).toBe(2);
 await page.evaluate(()=>finishCounter({error:null}));
 await expect(page.locator('#counterModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>counterReloads)).toBe(1);
});
test('late counteroffer results never close another draft or reveal a prior account error',async({page})=>{
 await counterFixture(page);
 await page.locator('#counterForm button[type="submit"]').click();
 await page.evaluate(()=>{currentUser={id:'another-collector'};activeCounterOffer='offer-2';counterComposeVersion++});
 await page.locator('#counterNote').fill('Different collector private draft');
 await page.evaluate(()=>failCounter(Error('Private prior-account failure')));
 await expect(page.locator('#counterNote')).toHaveValue('Different collector private draft');
 await expect(page.locator('#counterStatus')).not.toContainText('Private prior-account failure');
 await expect(page.locator('#counterForm button[type="submit"]')).toBeEnabled();
 await expect(page.locator('#counterModal')).toHaveClass(/open/);
 expect(await page.evaluate(()=>counterReloads)).toBe(0);
});

test('multi-item trade submits every selected listing once and keeps the bundle after failure',async({page})=>{
 await composeFixture(page);
 await page.evaluate(()=>{document.getElementById('tradeOfferedListing').innerHTML='<option value="">Choose</option><option value="foil">Japanese foil</option><option value="promo">Stamped promo</option><option value="game">Complete game</option>';renderTradeBundle()});
 for(const id of ['foil','promo']){await page.locator('#tradeOfferedListing').selectOption(id);await page.locator('#tradeAddItem').click()}
 await page.locator('#tradeOfferedListing').selectOption('game');
 await expect(page.locator('#tradeBundleCount')).toContainText('3 listed items selected');
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 expect(await page.evaluate(()=>tradeWrites[0])).toMatchObject({offered_listing_id:'foil',offered_listing_ids:['foil','promo','game']});
 await page.evaluate(()=>failTrade(Error('Temporary bundle failure')));
 await expect(page.locator('#tradeBundleItems li')).toHaveCount(2);await expect(page.locator('#tradeOfferedListing')).toHaveValue('game');
 await page.locator('[data-remove-trade-item="promo"]').click();await expect(page.locator('#tradeBundleCount')).toContainText('2 listed items selected');
});

test('selected trade inventory clears across account changes',async({page})=>{
 await composeFixture(page);
 await page.evaluate(()=>{document.getElementById('tradeOfferedListing').innerHTML='<option value="">Choose</option><option value="private">Private card</option>';tradeBundleSelection=['private'];renderTradeBundle();inboxDraftUser=currentUser.id;currentUser={id:'new-account'};syncInboxDraftUser()});
 await expect(page.locator('#tradeBundleItems')).toBeEmpty();expect(await page.evaluate(()=>tradeBundleSelection)).toEqual([]);
});

test('mixed inventory trade confirms a committed proposal after response loss without duplicating it',async({page})=>{
 await composeFixture(page);
 await page.evaluate(()=>{
  window.tradeRow=null;window.tradeReadbackOffline=true;
  supabaseClient.from=()=>{
   const q={insert(value){tradeWrites.push(value);tradeRow={...value,initial_terms:{note:value.offer_note,cash_amount:value.cash_amount,cash_direction:value.cash_direction}};return q},select(){return q},eq(){return q},single:async()=>{throw Error('Connection lost')},maybeSingle:async()=>tradeReadbackOffline?{error:{message:'Read offline'}}:{data:tradeRow,error:null}};
   return q;
  };
  tradeBundleSelection=['sports-card','game','console','deck','figure'];renderTradeBundle();
 });
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 await expect(page.locator('#tradeOfferStatus')).toContainText('Connection lost');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('My original trade proposal');
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(1);
 await page.evaluate(()=>{tradeReadbackOffline=false});
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 await expect(page.locator('#tradeComposeModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(1);
 expect(await page.evaluate(()=>tradeWrites[0].offered_listing_ids)).toEqual(['sports-card','game','console','deck','figure']);
});

test('blocked collector cannot submit a prepared trade and keeps its proposal',async({page})=>{
 await composeFixture(page);
 await page.evaluate(()=>blockedCollectorIds.add('seller-fixture'));
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 await expect(page.locator('#tradeOfferStatus')).toContainText('Unblock this collector');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('My original trade proposal');
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(0);
});
