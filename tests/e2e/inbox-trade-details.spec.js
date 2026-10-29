const {test,expect}=require('@playwright/test');
async function fixture(page,failed=false){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async failed=>{
  await supabaseClient.auth.getSession();currentUser={id:'jayden'};syncInboxDraftUser();
  const now=new Date().toISOString();window.decisionWrites=[];
  const rows={trade_offers:[{id:'trade-1',sender_id:'jayden',recipient_id:'tanner',listing_id:'sports',offered_listing_id:'tcg',status:'pending',offer_note:'Two collectors exchange',cash_amount:3,cash_direction:'recipient_pays',created_at:now}],trade_counteroffers:[{id:'counter-1',trade_offer_id:'trade-1',proposer_id:'tanner',recipient_id:'jayden',status:'pending',offer_note:'Please include the foil printing',cash_amount:7,cash_direction:'sender_pays',created_at:now}],listings:[{id:'sports',title:'Tanner PSA sports card',description:'PSA 9 · cert 123'},{id:'tcg',title:'Jayden One Piece foil',description:'Japanese stamped variant'}],profiles:[{id:'tanner',username:'Tanner'}]};
  supabaseClient.from=table=>{const q={then:(a,b)=>Promise.resolve({data:rows[table]||[],error:failed&&table==='trade_counteroffers'?{message:'Unavailable'}:null}).then(a,b)};for(const key of ['select','order','limit','in','eq'])q[key]=()=>q;return q};
  supabaseClient.rpc=(name,args)=>new Promise(resolve=>{decisionWrites.push({name,args});window.finishDecision=resolve});
  await showInboxPage('tanner');
 },failed);
}
test('Jayden sees exact items and counter terms in Tanner conversation and replies once',async({page})=>{
 await fixture(page);
 const thread=page.locator('#conversationThread');
 await expect(thread).toContainText('You give');await expect(thread).toContainText('Jayden One Piece foil');
 await expect(thread).toContainText('You receive');await expect(thread).toContainText('Tanner PSA sports card');
 await expect(thread).toContainText('Please include the foil printing');await expect(thread).toContainText('You pay $7.00');
 await expect(thread.locator('[data-inbox-trade="accepted"]')).toHaveCount(0);
 page.on('dialog',d=>d.accept());
 await thread.locator('[data-inbox-counter="accept"]').click();
 await expect(thread.locator('[data-inbox-counter="decline"]')).toBeDisabled();
 await thread.locator('[data-inbox-counter="decline"]').evaluate(b=>b.click());
 expect(await page.evaluate(()=>decisionWrites)).toEqual([{name:'respond_trade_counter',args:{p_counter:'counter-1',p_accept:true}}]);
 await page.evaluate(()=>finishDecision({error:{message:'Temporary outage'}}));
 await expect(page.locator('[data-inbox-counter="accept"]')).toBeEnabled();
});
test('unavailable counter terms fail closed instead of offering stale acceptance',async({page})=>{
 await fixture(page,true);
 await expect(page.locator('#conversationThread')).toContainText('Trade terms could not load');
 await expect(page.locator('#conversationThread [data-inbox-trade],#conversationThread [data-inbox-counter]')).toHaveCount(0);
});

test('trade dialog locks competing decisions and releases them after transport failure',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{document.getElementById('tradeOffersList').innerHTML='<article class="trade-offer-card"><button data-counter-response="accept" data-counter-id="c" data-parent-offer="t">Accept counter</button><button data-counter-response="decline" data-counter-id="c" data-parent-offer="t">Decline counter</button></article>';openModal('tradesModal')});
 page.on('dialog',d=>d.accept());
 await page.locator('#tradeOffersList [data-counter-response="accept"]').click();
 await expect(page.locator('#tradeOffersList [data-counter-response="decline"]')).toBeDisabled();
 await page.locator('#tradeOffersList [data-counter-response="decline"]').evaluate(b=>b.click());
 expect(await page.evaluate(()=>decisionWrites.length)).toBe(1);
 await page.evaluate(()=>finishDecision(Promise.reject(Error('Network failed'))));
 await expect(page.locator('#tradeOffersList [data-counter-response="accept"]')).toBeEnabled();
 await expect(page.locator('#tradeOffersList [data-counter-response="decline"]')).toBeEnabled();
});

test('saved multi-item details remain visible when live listings are missing or edited',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  const offer={id:'saved',sender_id:'jayden',recipient_id:'tanner',listing_id:'sports',offered_listing_id:'foil',offered_listing_ids:['foil','game'],status:'accepted',offer_note:'Counter agreement',cash_amount:10,cash_direction:'sender_pays',initial_terms:{note:'Original bundle',cash_amount:0,cash_direction:'none'},created_at:new Date().toISOString(),item_snapshots:[{listing_id:'sports',owner_id:'tanner',title:'PSA 9 original',description:'Original certification'},{listing_id:'foil',owner_id:'jayden',title:'Japanese stamped foil',description:'Variant saved exactly'},{listing_id:'game',owner_id:'jayden',title:'Complete game',description:'Original case included'}]};
  document.getElementById('conversationThread').innerHTML=inboxTradeHtml(offer,new Map([['foil',{title:'Edited live title'}]]),[],null);
 });
 await expect(page.locator('#conversationThread')).toContainText('Japanese stamped foil');await expect(page.locator('#conversationThread')).toContainText('Complete game');await expect(page.locator('#conversationThread')).toContainText('PSA 9 original');await expect(page.locator('#conversationThread')).not.toContainText('Edited live title');await expect(page.locator('#conversationThread')).toContainText('Original bundle');await expect(page.locator('#conversationThread')).toContainText('saved when this proposal was sent');
});

test('Tanner blocked by Jayden cannot receive trade decisions in the trade dialog',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{blockedCollectorIds.add('tanner');await loadTradeOffers()});
 const card=page.locator('#tradeOffersList [data-trade-offer-id="trade-1"]');
 await expect(card).toContainText('You blocked this collector');
 await expect(card).toHaveAttribute('data-trade-counterparty','tanner');
 await expect(card.locator('[data-counter-response],[data-trade-action],[data-counter-start]')).toHaveCount(0);
});

test('blocking Tanner after trade dialog renders prevents stale counter acceptance',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{openModal('tradesModal');await loadTradeOffers()});
 const accept=page.locator('#tradeOffersList [data-counter-response="accept"]');
 await expect(accept).toBeVisible();
 await page.evaluate(()=>blockedCollectorIds.add('tanner'));
 await accept.click();
 expect(await page.evaluate(()=>decisionWrites)).toEqual([]);
});

test('counteroffer draft is retained if the recipient is blocked after composer opens',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{activeCounterOffer='trade-1';activeCounterpartyId='tanner';openModal('counterModal');blockedCollectorIds.add('tanner')});
 await page.locator('#counterNote').fill('Keep this exact printing in the exchange');
 await page.locator('#counterForm button[type="submit"]').click();
 await expect(page.locator('#counterStatus')).toContainText('Unblock this collector');
 await expect(page.locator('#counterNote')).toHaveValue('Keep this exact printing in the exchange');
 expect(await page.evaluate(()=>decisionWrites)).toEqual([]);
});

test('successful counteroffer with failed refresh never tells Jayden the send failed',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  activeCounterOffer='trade-1';activeCounterpartyId='tanner';
  window.refreshNotices=[];
  toast=message=>refreshNotices.push(message);
  loadTradeOffers=async()=>{throw Error('Refresh offline')};
  openModal('counterModal');
 });
 await page.locator('#counterNote').fill('Trade the exact foil printing');
 await page.locator('#counterForm button[type="submit"]').click();
 await expect.poll(()=>page.evaluate(()=>decisionWrites.length)).toBe(1);
 await page.evaluate(()=>finishDecision({error:null}));
 await expect.poll(()=>page.evaluate(()=>refreshNotices.some(s=>s.includes('Counteroffer sent, but the screen could not refresh')))).toBe(true);
 expect(await page.evaluate(()=>decisionWrites.map(x=>x.name))).toEqual(['create_trade_counter']);
 expect(await page.locator('#counterStatus').textContent()).not.toContain('Could not send counteroffer');
});
