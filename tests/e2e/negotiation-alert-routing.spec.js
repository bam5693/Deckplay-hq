const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'buyer-jayden'};syncInboxDraftUser();
  window.__routed=[];
  window.__routingRows={
   price_offers:{id:'price-1',buyer_id:'buyer-jayden',seller_id:'seller-tanner'},
   trade_offers:{id:'trade-1',sender_id:'buyer-jayden',recipient_id:'seller-tanner'}
  };
  window.__routingPending=null;
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,maybeSingle:()=>window.__routingPending?
    new Promise(resolve=>window.__routingPending=resolve):
    Promise.resolve({data:window.__routingRows[table]||null,error:null})};
   return q;
  };
  showInboxPage=async id=>{window.__routed.push(id)};
  toast=(message)=>{window.__routingToast=message};
 });
});
test('source price offer routes to the real seller instead of stale actor',async({page})=>{
 await page.evaluate(()=>navigateDeckplayNotification('price_counter','unrelated-actor','price-1'));
 expect(await page.evaluate(()=>window.__routed)).toEqual(['seller-tanner']);
});
test('source trade offer routes to participant and skips unrelated actor',async({page})=>{
 await page.evaluate(()=>navigateDeckplayNotification('trade_update','unrelated-actor','trade-1'));
 expect(await page.evaluate(()=>window.__routed)).toEqual(['seller-tanner']);
});
test('nonparticipant source and blocked counterparties never open private conversation',async({page})=>{
 await page.evaluate(async()=>{
  window.__routingRows.price_offers={id:'price-1',buyer_id:'someone-else',seller_id:'seller-tanner'};
  await navigateDeckplayNotification('price_update','seller-tanner','price-1');
  window.__routingRows.price_offers={id:'price-1',buyer_id:'buyer-jayden',seller_id:'seller-tanner'};
  blockedCollectorIds.add('seller-tanner');
  await navigateDeckplayNotification('price_update','seller-tanner','price-1');
 });
 expect(await page.evaluate(()=>window.__routed)).toEqual([]);
});
test('an account switch during a source lookup discards stale negotiation navigation',async({page})=>{
 await page.evaluate(()=>{
  window.__routingPending=()=>{};
  window.__oldNav=navigateDeckplayNotification('trade_offer','seller-tanner','trade-1');
 });
 await expect.poll(()=>page.evaluate(()=>typeof window.__routingPending)).toBe('function');
 await page.evaluate(async()=>{
  currentUser={id:'new-collector'};syncInboxDraftUser();
  window.__routingPending({data:window.__routingRows.trade_offers,error:null});
  await window.__oldNav;
 });
 expect(await page.evaluate(()=>window.__routed)).toEqual([]);
});
