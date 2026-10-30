const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
});
async function setup(page){
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-seller'};syncInboxDraftUser();
  const stamp='2026-10-29T10:00:00.123456Z';
  window.negotiationRequests=[];window.failHistoryOnce=false;
  window.priceHistory=Array.from({length:51},(_,i)=>({
   id:'event-'+String(51-i).padStart(4,'0'),offer_id:'offer-sports',buyer_id:'buyer-tanner',seller_id:'fixture-seller',
   actor_id:'buyer-tanner',action:'counter',amount:20+i,created_at:stamp
  }));
  window.tradeHistory=[{id:'trade-counter-1',trade_offer_id:'trade-1',proposer_id:'buyer-tanner',
   recipient_id:'fixture-seller',cash_amount:0,cash_direction:'sender_pays',
   offer_note:'Swap the graded sports card',status:'pending',created_at:stamp}];
  supabaseClient.from=table=>{
   let scoped=false,filter='',limit=0;
   const q={
    then:(resolve,reject)=>{
     let data=[];
     if(table==='price_offers')data=[{id:'offer-sports',buyer_id:'buyer-tanner',seller_id:'fixture-seller',amount:24,status:'countered',last_actor_id:'fixture-seller',updated_at:stamp}];
     if(table==='trade_offers')data=[{id:'trade-1',listing_id:'listing-1',offered_listing_id:null,offered_listing_ids:[],item_snapshots:[],initial_terms:{},sender_id:'buyer-tanner',recipient_id:'fixture-seller',status:'pending',offer_note:'Sports lot',cash_amount:0,cash_direction:'sender_pays',created_at:stamp}];
     if(table==='profiles')data=[{id:'buyer-tanner',username:'Tanner'}];
     if(table==='listings')data=[{id:'listing-1',title:'Graded sports card',description:'Sports lot',price:24,image_urls:[]}];
     if(scoped)negotiationRequests.push({table,filter,limit});
     if(scoped&&table==='price_offer_history'){
      const page=negotiationRequests.filter(r=>r.table===table).length;
      data=page===1?priceHistory.slice(0,50):page===2?priceHistory.slice(50):[];
      if(failHistoryOnce){failHistoryOnce=false;return Promise.resolve({data:null,error:{message:'Offline'}}).then(resolve,reject)}
     }
     if(scoped&&table==='trade_counteroffers')data=tradeHistory;
     return Promise.resolve({data,error:null}).then(resolve,reject);
    }
   };
   for(const method of ['select','order','in','eq','is'])q[method]=()=>q;
   q.limit=value=>{limit=value;return q};
   q.or=value=>{scoped=true;filter=value;return q};
   return q;
  };
  await showInboxPage('buyer-tanner');
 });
}
test('Tanner loads per-thread sports negotiation pages with tied timestamps and preserves draft',async({page})=>{
 await setup(page);
 await page.locator('#chatInput').fill('Do you have the card back photo?');
 await expect(page.locator('[data-inbox-older-negotiations]')).toBeVisible();
 await page.locator('[data-inbox-older-negotiations]').click();
 await expect(page.locator('.conversation-bubbles')).toContainText('Swap the graded sports card');
 await expect(page.locator('[data-inbox-older-negotiations]')).toBeVisible();
 await page.locator('[data-inbox-older-negotiations]').click();
 await expect(page.getByText('All available negotiation history loaded.')).toBeVisible();
 await expect(page.locator('#chatInput')).toHaveValue('Do you have the card back photo?');
 const result=await page.evaluate(()=>({
  count:document.querySelectorAll('.conversation-bubbles .inbox-offer').length,
  requests:negotiationRequests,
  rows:inboxNegotiationPages.get('buyer-tanner')?.prices.length
 }));
 expect(result.rows).toBe(51);
 expect(result.requests.filter(r=>r.table==='trade_counteroffers')).toHaveLength(1);
 expect(result.requests.filter(r=>r.table==='price_offer_history')).toHaveLength(2);
 expect(result.requests[0].filter).toContain('buyer_id.eq.fixture-seller,seller_id.eq.buyer-tanner');
 expect(result.requests[0].filter).toContain('buyer_id.eq.buyer-tanner,seller_id.eq.fixture-seller');
 expect(result.requests[2].filter).toContain('created_at.eq.2026-10-29T10:00:00.123456Z,id.lt.event-0002');
 expect(result.requests.every(r=>r.limit===50)).toBe(true);
});
test('Kyle sees recoverable negotiation errors without losing the thread or draft',async({page})=>{
 await setup(page);
 await page.locator('#chatInput').fill('Keep this trade draft');
 await page.evaluate(()=>{failHistoryOnce=true});
 await page.locator('[data-inbox-older-negotiations]').click();
 await expect(page.locator('[data-inbox-negotiation-status]')).toContainText('Try again');
 await expect(page.locator('[data-inbox-older-negotiations]')).toBeEnabled();
 await expect(page.locator('#chatInput')).toHaveValue('Keep this trade draft');
 await page.locator('[data-inbox-older-negotiations]').click();
 await expect(page.locator('.conversation-bubbles')).toContainText('Swap the graded sports card');
 await expect(page.locator('#chatInput')).toHaveValue('Keep this trade draft');
 await page.evaluate(()=>{currentUser={id:'different-owner'};syncInboxDraftUser()});
 expect(await page.evaluate(()=>inboxNegotiationPages.size)).toBe(0);
 await expect(page.locator('#messageInbox')).not.toContainText('Swap the graded sports card');
});
