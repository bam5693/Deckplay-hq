const {test,expect}=require('@playwright/test');
test('signed-out buyer can inspect a seller profile and following asks for sign-in',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 const error=await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser=null;
  supabaseClient.from=table=>{const q={then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};for(const key of ['select','eq','order','limit'])q[key]=()=>q;q.maybeSingle=async()=>({data:table==='profiles'?{username:'fixture-seller',bio:'Sports and TCG collector'}:null,error:null});return q};
  try{await showPublicProfile('fixture-seller');return null}catch(error){return error.message}
 });
 expect(error,'Public seller profile must load without an authenticated user').toBeNull();
 await expect(page.locator('#publicProfileTitle')).toHaveText('@fixture-seller');
 await page.locator('[data-follow-profile="fixture-seller"]').click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
});

test('a newly arrived discovery alert opens an item absent from the loaded marketplace',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-buyer'};items=[];
  supabaseClient.from=table=>{const q={};for(const key of ['select','eq'])q[key]=()=>q;q.maybeSingle=async()=>({data:table==='listings'?{id:'fresh-item',title:'Fresh One Piece listing',seller_id:'fixture-seller',price:25,category:'trading_cards',tcg_game:'one_piece',condition:'like_new',accepts_trades:true,image_urls:[]}: {username:'fixture-seller'},error:null});return q};
  await navigateDeckplayNotification('followed_seller_listing','fixture-seller','fresh-item');
 });
 await expect(page.locator('#detailModal')).toHaveClass(/open/);
 await expect(page.locator('#detailTitle')).toHaveText('Fresh One Piece listing');
});

test('blocked sellers stay hidden when discovery alerts use cached or newly fetched items',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-buyer'};blockedCollectorIds.add('blocked-seller');
  items=[{id:'cached-blocked',sellerId:'blocked-seller',n:'Hidden cached item'}];
  await navigateDeckplayNotification('wanted_match','blocked-seller','cached-blocked');
  items=[];window.discoveryQueries=[];
  supabaseClient.from=table=>{discoveryQueries.push(table);const q={};for(const key of ['select','eq'])q[key]=()=>q;q.maybeSingle=async()=>({data:{id:'uncached-blocked',title:'Hidden fresh item',seller_id:'blocked-seller'},error:null});return q};
  await navigateDeckplayNotification('followed_seller_listing','blocked-seller','uncached-blocked');
 });
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>discoveryQueries)).toEqual(['listings']);
 expect(await page.evaluate(()=>items)).toEqual([]);
});

test('a delayed discovery listing response cannot open in a different account',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'first-account'};items=[];
  supabaseClient.from=()=>{const q={};for(const key of ['select','eq'])q[key]=()=>q;q.maybeSingle=()=>new Promise(resolve=>window.finishDiscovery=resolve);return q};
  window.pendingDiscovery=navigateDeckplayNotification('wanted_match','seller','delayed-item');
  currentUser={id:'second-account'};
  finishDiscovery({data:{id:'delayed-item',title:'First account item',seller_id:'seller'},error:null});await pendingDiscovery;
 });
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>items)).toEqual([]);
});

test('a collector can close an alert listing and open the next activity alert',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-buyer'};showMainMarketplace();
  items=[{id:'cached-item',databaseId:'cached-item',sellerId:'fixture-seller',n:'Alert item',p:25,c:'Trading Cards',s:'@seller',imageUrls:[],trades:true}];
  markNotificationRead=async()=>{};
  loadNotificationCenter=async()=>{document.getElementById('notificationList').innerHTML=['followed_seller_listing','wanted_match'].map(kind=>'<button data-open-notification="note" data-notification-kind="'+kind+'" data-notification-source="cached-item" data-notification-actor="fixture-seller">'+kind+'</button>').join('')};
  document.getElementById('notificationBell').hidden=false;
 });
 for(const kind of ['followed_seller_listing','wanted_match']){
  await page.locator('#notificationBell').click({timeout:5000});
  await page.locator('[data-notification-kind="'+kind+'"]').click();
  await expect(page.locator('#detailModal')).toHaveClass(/open/);
  await expect(page.locator('#detailTitle')).toHaveText('Alert item');
  await page.locator('[data-close="detailModal"]').click({timeout:5000});
  await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 }
});
