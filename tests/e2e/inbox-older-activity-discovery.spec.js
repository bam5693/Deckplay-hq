const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
});

// Synthetic rows only: reproduces a message-only conversation where older
// negotiations have fallen out of the global 200-offer/700-event windows.
test('message-only Inbox thread can recover missing parent offer and trade history',async({page})=>{
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-buyer'};syncInboxDraftUser();
  const stamp='2026-10-29T10:00:00.123456Z';
  window.historyQueries=[];
  const parents={
   price:{id:'price-parent-1',buyer_id:'fixture-buyer',seller_id:'fixture-seller',amount:22,status:'countered',last_actor_id:'fixture-seller',updated_at:stamp},
   trade:{id:'trade-parent-1',listing_id:'listing-1',offered_listing_id:null,offered_listing_ids:[],item_snapshots:[],initial_terms:{},sender_id:'fixture-buyer',recipient_id:'fixture-seller',status:'pending',cash_amount:0,cash_direction:'sender_pays',offer_note:'Old traded collectible',created_at:stamp}
  };
  supabaseClient.from=table=>{
   const state={scoped:false,ids:null};
   const q={
    select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,
    in:(_field,ids)=>{state.ids=ids;return q},
    or:filter=>{state.scoped=true;historyQueries.push({table,filter});return q},
    then:(resolve,reject)=>{
     let data=[];
     if(table==='collector_messages')data=[{id:'message-only',sender_id:'fixture-buyer',recipient_id:'fixture-seller',body:'Is your older trade still available?',created_at:stamp,read_at:stamp}];
     if(table==='profiles')data=[{id:'fixture-seller',username:'Seller'},{id:'fixture-buyer',username:'Buyer'}];
     if(table==='price_offers'&&state.ids?.includes(parents.price.id))data=[parents.price];
     if(table==='trade_offers'&&state.ids?.includes(parents.trade.id))data=[parents.trade];
     if(table==='price_offer_history'&&state.scoped)data=[{id:'price-event-1',offer_id:parents.price.id,buyer_id:'fixture-buyer',seller_id:'fixture-seller',actor_id:'fixture-seller',action:'counter',amount:22,created_at:stamp}];
     if(table==='trade_counteroffers'&&state.scoped)data=[{id:'trade-event-1',trade_offer_id:parents.trade.id,proposer_id:'fixture-seller',recipient_id:'fixture-buyer',cash_amount:5,cash_direction:'sender_pays',offer_note:'Synthetic counter',status:'pending',created_at:stamp}];
     if(table==='listings'&&state.ids)data=[{id:'listing-1',title:'Synthetic collectible',description:'TEST ONLY',image_urls:[],price:25}];
     return Promise.resolve({data,error:null}).then(resolve,reject);
    }
   };
   return q;
  };
  await showInboxPage('fixture-seller');
 });
 await expect(page.locator('.conversation-bubbles')).toContainText('Is your older trade still available?');
 await expect(page.locator('.conversation-bubbles .inbox-offer')).toHaveCount(0);
 const button=page.locator('[data-inbox-older-negotiations]');
 await expect(button).toHaveText('Check earlier offers & trades');
 await button.click();
 await expect(page.locator('.conversation-bubbles')).toContainText('22.00');
 await expect(page.locator('.conversation-bubbles')).toContainText('Synthetic counter');
 const state=await page.evaluate(()=>({
  price:inboxOlderPriceOffers.has('price-parent-1'),
  trade:inboxOlderTradeOffers.has('trade-parent-1'),
  priceEvents:inboxNegotiationPages.get('fixture-seller')?.prices.length,
  tradeEvents:inboxNegotiationPages.get('fixture-seller')?.trades.length,
  scoped:historyQueries.filter(x=>['price_offer_history','trade_counteroffers'].includes(x.table)).every(x=>x.filter.includes('fixture-buyer')&&x.filter.includes('fixture-seller'))
 }));
 expect(state).toEqual({price:true,trade:true,priceEvents:1,tradeEvents:1,scoped:true});
 await expect(page.getByText('All available negotiation history loaded.')).toBeVisible();
 await page.evaluate(()=>{currentUser={id:'new-account'};syncInboxDraftUser()});
 expect(await page.evaluate(()=>[inboxOlderPriceOffers.size,inboxOlderTradeOffers.size,inboxNegotiationPages.size])).toEqual([0,0,0]);
});

test('no older events: action reports completion rather than inventing offers',async({page})=>{
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-buyer'};syncInboxDraftUser();
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,in:()=>q,or:()=>q,order:()=>q,limit:()=>q,then:(resolve,reject)=>{
    const data=table==='collector_messages'?[{id:'m1',sender_id:'fixture-buyer',recipient_id:'fixture-seller',body:'Hello!',read_at:'2026-10-29T10:00:00Z',created_at:'2026-10-29T10:00:00Z'}]:
     table==='profiles'?[{id:'fixture-seller',username:'Seller'}]:[];
    return Promise.resolve({data,error:null}).then(resolve,reject);
   }};return q;
  };
  await showInboxPage('fixture-seller');
 });
 await page.locator('[data-inbox-older-negotiations]').click();
 await expect(page.getByText('All available negotiation history loaded.')).toBeVisible();
 await expect(page.locator('.conversation-bubbles .inbox-offer')).toHaveCount(0);
});
