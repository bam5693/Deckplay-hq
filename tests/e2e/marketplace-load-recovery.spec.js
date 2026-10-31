const {test,expect}=require('@playwright/test');
// Isolated local buyer catalog regressions; never use production credentials or real writes.
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
});
test('buyer sees fresh active listings before slow profile-name lookup completes',async({page})=>{
 await page.evaluate(()=>{
  window.marketTestLoadCount=0;window.completeProfileLookup=null;
  const row={id:'fresh-test-card',seller_id:'synthetic-seller',title:'Fresh One Piece test listing',category:'trading_cards',
   tcg_game:'one_piece',price:25,condition:'like_new',description:'Seller trade ready',accepts_trades:true,
   accepts_price_offers:true,image_urls:[],created_at:'2026-10-30T00:00:00Z'};
  const builder=promise=>{const q={then:(resolve,reject)=>promise().then(resolve,reject)};
   for(const name of ['select','eq','order','in','abortSignal'])q[name]=()=>q;return q};
  supabaseClient.from=table=>table==='listings'?builder(()=>{
   marketTestLoadCount++;
   return Promise.resolve({data:[row],error:null});
  }):table==='profiles'?builder(()=>new Promise(resolve=>{completeProfileLookup=resolve})):builder(()=>Promise.resolve({data:[],error:null}));
  document.getElementById('search').value='Fresh One Piece';
  document.getElementById('search').dispatchEvent(new Event('input',{bubbles:true}));
  void loadListings();
 });
 await expect(page.locator('[data-view="fresh-test-card"]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>listingSource)).toBe('live');
 await expect(page.locator('#grid')).toContainText('DeckPlay seller');
 expect(await page.evaluate(()=>marketTestLoadCount)).toBe(1);
 await page.evaluate(()=>completeProfileLookup({data:[{id:'synthetic-seller',username:'Example Collector'}],error:null}));
 await expect(page.locator('#grid')).toContainText('@Example Collector');
});
test('buyer can refresh an empty search without losing typed filters',async({page})=>{
 await page.evaluate(()=>{
  window.marketTestRefreshes=0;
  const row={id:'newest-seller-item',seller_id:'synthetic-seller',title:'Latest sealed card',
   category:'trading_cards',tcg_game:'pokemon',price:18,condition:'new',description:'Fresh listing',
   accepts_trades:true,accepts_price_offers:false,image_urls:[],created_at:'2026-10-30T00:00:00Z'};
  const builder=promise=>{const q={then:(resolve,reject)=>promise().then(resolve,reject)};
   for(const name of ['select','eq','order','in','abortSignal'])q[name]=()=>q;return q};
  supabaseClient.from=table=>table==='listings'?builder(()=>{
   marketTestRefreshes++;return Promise.resolve({data:marketTestRefreshes===1?[]:[row],error:null});
  }):builder(()=>Promise.resolve({data:[],error:null}));
  document.getElementById('search').value='Latest sealed card';
  document.getElementById('search').dispatchEvent(new Event('input',{bubbles:true}));
  void loadListings();
 });
 await expect(page.locator('[data-refresh-marketplace]')).toBeVisible();
 await page.locator('[data-refresh-marketplace]').click();
 await expect(page.locator('[data-view="newest-seller-item"]')).toBeVisible();
 await expect(page.locator('#search')).toHaveValue('Latest sealed card');
 expect(await page.evaluate(()=>marketTestRefreshes)).toBe(2);
});


test('network request deadline rejects even when an adapter ignores AbortSignal',async({page})=>{
 const result=await page.evaluate(async()=>{
  const started=performance.now();
  try{await readMarketplaceRequest(new Promise(()=>{}),45);return {timedOut:false}}
  catch(error){return {timedOut:/timed out/i.test(error.message),elapsed:performance.now()-started}}
 });
 expect(result.timedOut).toBe(true);
 expect(result.elapsed).toBeLessThan(1000);
});
test('seller block preflight fails closed when network adapter never resolves',async({page})=>{
 const result=await page.evaluate(async()=>{
  const previousUser=currentUser,originalFrom=supabaseClient.from,originalRead=readMarketplaceRequest;
  currentUser={id:'synthetic-block-owner'};
  const q={then:()=>new Promise(()=>{})};
  q.select=()=>q;q.eq=()=>q;q.abortSignal=()=>q;
  supabaseClient.from=table=>table==='user_blocks'?q:originalFrom.call(supabaseClient,table);
  readMarketplaceRequest=(req,ms)=>originalRead(req,45);
  try{
   const started=performance.now(),ready=await loadBlockedCollectors();
   return {ready,elapsed:performance.now()-started};
  }finally{
   readMarketplaceRequest=originalRead;supabaseClient.from=originalFrom;
   currentUser=previousUser;
  }
 });
 expect(result.ready).toBe(false);
 expect(result.elapsed).toBeLessThan(1000);
});

test('account bootstrap survives deferred seller and listing helper modules',async({page})=>{
 const state=await page.evaluate(()=>{
  const old=currentUser,editor=window.listingEditor,overview=window.sellerOverview,photos=window.privateMessagePhotos;
  try{
   window.listingEditor={};
   window.sellerOverview={};
   window.privateMessagePhotos={};
   currentUser={id:'synthetic-account-with-deferred-scripts'};
   syncInboxDraftUser();
   return {matched:inboxDraftUser===currentUser.id,version:messageAccountVersion};
  }finally{
   window.listingEditor=editor;window.sellerOverview=overview;window.privateMessagePhotos=photos;
   currentUser=old;syncInboxDraftUser();
  }
 });
 expect(state.matched).toBe(true);
 expect(state.version).toBeGreaterThan(0);
});
