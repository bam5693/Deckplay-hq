const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
});
async function ready(page,blocked=false,mode='trade'){
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async ({blocked,mode})=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};syncInboxDraftUser();
  if(blocked)blockedCollectorIds.add('buyer-tanner');
  window.tradeRpcCalls=0;supabaseClient.rpc=async()=>{tradeRpcCalls++;return {data:null,error:null}};
  const stamp='2026-10-29T10:00:00Z';
  supabaseClient.from=table=>{
   const data=table==='price_offers'?[{id:'price-sports',listing_id:'sports-card',buyer_id:'buyer-tanner',seller_id:'fixture-seller',amount:55,status:'pending',last_actor_id:'buyer-tanner',created_at:stamp,updated_at:stamp}]:
    table==='trade_offers'?[{id:'trade-sports',listing_id:'sports-card',offered_listing_id:null,offered_listing_ids:[],item_snapshots:[],initial_terms:{},sender_id:'buyer-tanner',recipient_id:'fixture-seller',status:'pending',offer_note:'Trade this graded card?',cash_amount:0,cash_direction:'sender_pays',created_at:stamp}]:
    table==='profiles'?[{id:'buyer-tanner',username:'Tanner'}]:
    table==='listings'?[{id:'sports-card',title:'1980s graded baseball card',price:60,description:'Vintage sports',image_urls:[]}]:[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const m of ['select','order','limit','in','eq','is','or'])q[m]=()=>q;
   return q;
  };
  if(mode==='price'){openModal('priceOffersModal');await loadPriceOffers()}
  else {openModal('tradesModal');await loadTradeOffers()}
 },{blocked,mode});
}
test('Tanner trade offer links directly to the exact Inbox thread without submitting a trade',async({page})=>{
 await ready(page);
 await expect(page.locator('#tradesModal')).toHaveClass(/open/);
 await page.getByRole('button',{name:'Open conversation with @Tanner'}).click();
 await expect(page.locator('#tradesModal')).not.toHaveClass(/open/);
 await expect(page.locator('.chat-person h3')).toHaveText('@Tanner');
 await expect(page.locator('#inboxPage')).toHaveClass(/thread-open/);
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-tanner');
 expect(await page.evaluate(()=>tradeRpcCalls)).toBe(0);
 await page.evaluate(()=>history.back());
 await expect(page.locator('#inboxPage')).not.toHaveClass(/thread-open/);
 await expect(page.locator('#inboxPage')).toBeVisible();
});
test('blocked collector trade history stays readable but messaging remains disabled',async({page})=>{
 await ready(page,true);
 await page.getByRole('button',{name:'Open conversation with @Tanner'}).click();
 await expect(page.locator('.chat-person h3')).toHaveText('@Tanner');
 await expect(page.locator('.conversation-bubbles')).toContainText('Trade proposal');
 await expect(page.getByText('You blocked this collector. Past messages remain visible',{exact:false})).toBeVisible();
 await expect(page.locator('#chatInput')).toBeDisabled();
 expect(await page.evaluate(()=>tradeRpcCalls)).toBe(0);
});

test('price offer conversation opens immediately and Android Back returns to Inbox list',async({page})=>{
 await ready(page,false,'price');
 await page.getByRole('button',{name:'💬 Open conversation'}).click();
 await expect(page.locator('#priceOffersModal')).not.toHaveClass(/open/);
 await expect(page.locator('#inboxPage')).toBeVisible();
 await expect(page.locator('#inboxPage')).toHaveClass(/thread-open/);
 await expect(page.locator('.chat-person h3')).toHaveText('@Tanner');
 expect(await page.evaluate(()=>tradeRpcCalls)).toBe(0);
 await page.evaluate(()=>history.back());
 await expect(page.locator('#inboxPage')).not.toHaveClass(/thread-open/);
 await expect(page.locator('#inboxPage')).toBeVisible();
});
