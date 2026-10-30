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
  // Alert navigation validates active listing state rather than trusting cached cards.
  const originalFrom=supabaseClient.from;
  supabaseClient.from=table=>{
   if(table!=='listings'&&table!=='profiles')return originalFrom(table);
   const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='listings'?{id:'cached-item',title:'Alert item',seller_id:'fixture-seller',price:25,category:'trading_cards',status:'active',image_urls:[],accepts_trades:true}: {username:'seller'},error:null})};
   return q;
  };
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

test('seller storefront listing preserves exact disclosures, category and offer eligibility',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser=null;
  window.storefrontSelection='';
  const row={id:'custom-printing',seller_id:'fixture-seller',title:'Custom collectible',description:'Set: Japanese promo\nVariant: Stamped foil\nCorner crease disclosed.',price:12,category:'trading_cards',condition:'used',tcg_game:'other_tcg',accepts_trades:true,accepts_price_offers:true,image_urls:[]};
  supabaseClient.from=table=>{
   const q={then:resolve=>Promise.resolve({data:table==='listings'?[row]:[],error:null}).then(resolve)};
   q.select=columns=>{if(table==='listings')storefrontSelection=columns;return q};
   for(const key of ['eq','order','limit'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:table==='profiles'?{username:'fixture-seller'}:null,error:null});return q;
  };
  await showPublicProfile('fixture-seller');
 });
 await page.locator('[data-public-listing="custom-printing"]').click();
 await expect(page.locator('.detail-description')).toHaveText('Set: Japanese promo\nVariant: Stamped foil\nCorner crease disclosed.');
 await expect(page.locator('.detail-facts')).toContainText('Trading Cards');
 await expect(page.locator('[data-price-offer-id="custom-printing"]')).toBeVisible();
 expect(await page.evaluate(()=>storefrontSelection.split(','))).toContain('description');
 expect(await page.evaluate(()=>storefrontSelection.split(','))).toContain('accepts_price_offers');
});


test('public seller inventory searches, filters and sorts all seven marketplace categories',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser=null;
  const categories=['trading_cards','video_games','consoles','controllers','accessories','collectibles','other'];
  const titles=['One Piece Manga Rare','Nintendo Mario Kart','Game console','Retro controller','Pokemon accessory','Sports memorabilia','Vintage collectible'];
  window.storefrontFixture=categories.map((category,i)=>({
   id:'store-item-'+i,seller_id:'store-seller',title:titles[i],description:'Fixture listing',price:12+i*10,
   category,tcg_game:i===0?'one_piece':null,image_urls:[],created_at:new Date(Date.UTC(2026,9,29-i)).toISOString(),
   status:'active',condition:'like_new'
  }));
  supabaseClient.from=table=>{
   const q={};
   for(const method of ['select','eq','order','limit'])q[method]=()=>q;
   q.then=resolve=>Promise.resolve({data:table==='listings'?storefrontFixture:[],error:null}).then(resolve);
   q.maybeSingle=async()=>({data:table==='profiles'?{username:'store-seller',bio:'Sports, TCG and games'}:null,error:null});
   return q;
  };
  await showPublicProfile('store-seller');
 });
 await expect(page.locator('#publicProfileTitle')).toHaveText('@store-seller');
 await expect(page.locator('#publicProfileResults .profile-item')).toHaveCount(7);
 await expect(page.locator('#publicStorefrontSummary')).toHaveText('7 of 7 displayed');
 await expect(page.locator('#publicStorefrontCategory option')).toHaveCount(8);
 await page.locator('#publicStorefrontCategory').selectOption('collectibles');
 await expect(page.locator('#publicProfileResults .profile-item')).toHaveCount(1);
 await expect(page.locator('#publicProfileResults')).toContainText('Sports memorabilia');
 await page.locator('#publicStorefrontCategory').selectOption('all');
 await page.locator('#publicStorefrontSearch').fill('manga');
 await expect(page.locator('#publicProfileResults .profile-item')).toHaveCount(1);
 await expect(page.locator('#publicProfileResults')).toContainText('One Piece Manga Rare');
 await page.locator('#publicStorefrontSearch').fill('not-a-listed-item');
 await expect(page.locator('#publicProfileResults')).toContainText('No listings match');
 await page.locator('#publicStorefrontSearch').fill('');
 await page.locator('#publicStorefrontSort').selectOption('price_high');
 await expect(page.locator('#publicProfileResults .profile-item').first()).toContainText('Vintage collectible');
 await page.locator('#publicStorefrontSort').selectOption('name');
 await expect(page.locator('#publicProfileResults .profile-item').first()).toContainText('Game console');
 await page.locator('[data-public-tab="wanted"]').click();
 await expect(page.locator('#publicStorefrontTools')).toBeHidden();
 await page.locator('[data-public-tab="listings"]').click();
 await expect(page.locator('#publicStorefrontSearch')).toBeVisible();
 await expect(page.locator('#publicStorefrontSort')).toHaveValue('name');
 await page.locator('[data-public-listing="store-item-5"]').click();
 await expect(page.locator('#detailModal')).toHaveClass(/open/);
 await expect(page.locator('#detailTitle')).toHaveText('Sports memorabilia');
});

test('seller inventory fetch errors never masquerade as an empty storefront',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser=null;
  supabaseClient.from=table=>{
   const q={};
   for(const method of ['select','eq','order','limit'])q[method]=()=>q;
   q.then=resolve=>Promise.resolve({data:[],error:table==='listings'?{message:'Temporary network failure'}:null}).then(resolve);
   q.maybeSingle=async()=>({data:table==='profiles'?{username:'store-seller'}:null,error:null});
   return q;
  };
  await showPublicProfile('store-seller');
 });
 await expect(page.locator('#publicProfileResults')).toContainText('Could not load this seller');
 await expect(page.locator('#publicProfileResults')).not.toContainText('No active listings yet');
 await expect(page.locator('#publicStorefrontTools')).toBeHidden();
 await expect(page.locator('#publicProfileContent')).toContainText('Listings unavailable');
});


test('seller storefront loads older inventory beyond 60, retries failure and reveals new categories',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser=null;
  window.storefrontPageRequests=[];
  window.failOlderInventory=true;
  const rows=Array.from({length:62},(_,i)=>({
   id:'store-page-'+i,seller_id:'fixture-paging',title:i===61?'Rare video game':i===60?'Sports collection':'TCG listing '+i,
   description:'Staging fixture',price:i+1,category:i===61?'video_games':i===60?'collectibles':'trading_cards',
   image_urls:[],status:'active',created_at:new Date(Date.UTC(2026,9,29,0,0,0)-i*1000).toISOString()
  }));
  supabaseClient.from=table=>{
   let range=null;
   const q={};
   for(const method of ['select','eq','order','limit'])q[method]=()=>q;
   q.range=(start,end)=>{range={start,end};return q};
   q.then=resolve=>{
    if(table!=='listings')return Promise.resolve({data:[],error:null}).then(resolve);
    if(range){storefrontPageRequests.push(range);
     if(failOlderInventory){failOlderInventory=false;return Promise.resolve({data:null,error:{message:'Temporary network failure'}}).then(resolve)}
     return Promise.resolve({data:rows.slice(range.start,range.end+1),error:null}).then(resolve);
    }
    return Promise.resolve({data:rows.slice(0,61),error:null}).then(resolve);
   };
   q.maybeSingle=async()=>({data:table==='profiles'?{username:'fixture-paging'}:null,error:null});
   return q;
  };
  await showPublicProfile('fixture-paging');
 });
 await expect(page.locator('#publicProfileResults .profile-item')).toHaveCount(60);
 await expect(page.locator('#publicProfileContent')).toContainText('60+ active listings');
 await expect(page.locator('[data-storefront-more]')).toBeVisible();
 await page.locator('[data-storefront-more]').click();
 await expect(page.locator('#publicProfileResults [role="alert"]')).toContainText('Try again');
 await expect(page.locator('#publicProfileResults .profile-item')).toHaveCount(60);
 await page.locator('[data-storefront-more]').click();
 await expect(page.locator('#publicProfileResults .profile-item')).toHaveCount(62);
 await expect(page.locator('[data-storefront-more]')).toHaveCount(0);
 await expect(page.locator('#publicStorefrontCategory option')).toHaveCount(4);
 await page.locator('#publicStorefrontCategory').selectOption('video_games');
 await expect(page.locator('#publicProfileResults .profile-item')).toHaveCount(1);
 await expect(page.locator('#publicProfileResults')).toContainText('Rare video game');
 expect(await page.evaluate(()=>storefrontPageRequests)).toEqual([{start:60,end:120},{start:60,end:120}]);
});
