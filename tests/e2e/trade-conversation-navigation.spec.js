const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
});
async function ready(page,blocked=false){
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async blocked=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};syncInboxDraftUser();
  if(blocked)blockedCollectorIds.add('buyer-tanner');
  window.tradeRpcCalls=0;supabaseClient.rpc=async()=>{tradeRpcCalls++;return {data:null,error:null}};
  const stamp='2026-10-29T10:00:00Z';
  supabaseClient.from=table=>{
   const data=table==='trade_offers'?[{id:'trade-sports',listing_id:'sports-card',offered_listing_id:null,offered_listing_ids:[],item_snapshots:[],initial_terms:{},sender_id:'buyer-tanner',recipient_id:'fixture-seller',status:'pending',offer_note:'Trade this graded card?',cash_amount:0,cash_direction:'sender_pays',created_at:stamp}]:
    table==='profiles'?[{id:'buyer-tanner',username:'Tanner'}]:
    table==='listings'?[{id:'sports-card',title:'1980s graded baseball card',price:60,description:'Vintage sports',image_urls:[]}]:[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const m of ['select','order','limit','in','eq','is','or'])q[m]=()=>q;
   return q;
  };
  openModal('tradesModal');await loadTradeOffers();
 },blocked);
}
test('Tanner trade offer links directly to the exact Inbox thread without submitting a trade',async({page})=>{
 await ready(page);
 await expect(page.locator('#tradesModal')).toHaveClass(/open/);
 await page.evaluate(()=>{
  window.navTrace=[];
  const oldMarket=showMainMarketplace;
  showMainMarketplace=function(){navTrace.push('market:'+new Error().stack);return oldMarket.apply(this,arguments)};
 });
 await page.getByRole('button',{name:'Open conversation with @Tanner'}).click();
 console.log('TRADE_NAV_DIAG',JSON.stringify(await page.evaluate(()=>({user:currentUser?.id,selected:selectedInboxCollector,hidden:document.getElementById('inboxPage').hidden,classes:document.getElementById('inboxPage').className,body:document.body.className,trace:window.navTrace}))));
 await expect(page.locator('#tradesModal')).not.toHaveClass(/open/);
 await expect(page.locator('.chat-person h3')).toHaveText('@Tanner');
 await expect(page.locator('#inboxPage')).toHaveClass(/thread-open/);
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-tanner');
 expect(await page.evaluate(()=>tradeRpcCalls)).toBe(0);
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
