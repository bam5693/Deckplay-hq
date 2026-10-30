const {test,expect}=require('@playwright/test');
const LISTING='11111111-1111-4111-8111-111111111111';
const SELLER='22222222-2222-4222-8222-222222222222';
const BUYER='33333333-3333-4333-8333-333333333333';
async function ready(page){
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',route=>route.fulfill({json:[]}));
 await page.goto('/');
 await page.waitForLoadState('networkidle');
}
test('Tanner and Jayden: copy/share links work for every supported listing category on mobile and desktop',async({page})=>{
 await ready(page);
 const result=await page.evaluate(async({listing,seller})=>{
  window.copiedLinks=[];window.nativeShares=[];
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async url=>window.copiedLinks.push(url)}});
  Object.defineProperty(navigator,'share',{configurable:true,value:async value=>window.nativeShares.push(value)});
  const categories=['trading_cards','video_games','consoles','controllers','accessories','collectibles','other'];
  for(const [i,category] of categories.entries()){
   showDetails({databaseId:listing,n:'Synthetic '+category,p:15+i,c:databaseCategory(category),imageUrls:[],sellerId:seller,s:'@seller'});
   const report=document.querySelector('#detailContent [data-report-listing]');
   if(!report || report.dataset.reportListing!==listing)throw new Error('Missing listing report action for '+category);
   document.querySelector('#detailContent [data-copy-kind="listing"]').click();
   document.querySelector('#detailContent [data-share-kind="listing"]').click();
  }
  return {categories,links:window.copiedLinks,shares:window.nativeShares};
 },{listing:LISTING,seller:SELLER});
 expect(result.categories).toHaveLength(7);
 expect(result.links).toHaveLength(7);
 expect(result.links.every(url=>new URL(url).searchParams.get('listing')===LISTING)).toBe(true);
 expect(result.shares).toHaveLength(7);
 expect(result.shares.every(value=>new URL(value.url).searchParams.get('listing')===LISTING)).toBe(true);
 await page.evaluate(async seller=>{
  supabaseClient.from=table=>{
   const q={then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};
   for(const key of ['select','eq','order','limit'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:table==='profiles'?{username:'all-category-collector'}:null,error:null});
   return q;
  };
  await showPublicProfile(seller);
 },SELLER);
 await expect(page.locator('[data-copy-kind="collector"]')).toBeVisible();
 await page.locator('[data-copy-kind="collector"]').click();
 await expect.poll(()=>page.evaluate(()=>window.copiedLinks.at(-1))).toContain('collector='+SELLER);
});
test('Kyle: shared listing opens only a current active listing with seller identity',async({page})=>{
 await ready(page);
 await page.evaluate(async({listing,seller})=>{
  history.replaceState({},'','/?listing='+listing);
  supabaseClient.from=table=>{
   const q={};for(const key of ['select','eq'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:table==='listings'?{id:listing,title:'Dragon Ball Tournament — Near Mint',description:'Near mint\n  rare   tournament printing',category:'collectibles',price:45,condition:'used',seller_id:seller,image_urls:[],status:'active'}:{username:'verified-collector'},error:null});
   return q;
  };
  await window.deckplayOpenSharedLinkOnce();
 },{listing:LISTING,seller:SELLER});
 await expect(page.locator('#detailModal')).toHaveClass(/open/);
 await expect(page.locator('#detailTitle')).toHaveText('Dragon Ball Tournament — Near Mint');
 await expect(page).toHaveTitle('Dragon Ball Tournament — Near Mint | DeckPlay HQ');
 await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content','Dragon Ball Tournament — Near Mint | DeckPlay HQ');
 await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content','Near mint rare tournament printing');
 await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content','Near mint rare tournament printing');
 // Private staging is deliberately blocked from search engines even after a share opens.
 await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content',/noindex/);
 await expect(page.locator('.detail-seller')).toContainText('@verified-collector');
 await expect(page.locator('[data-copy-kind="listing"]')).toHaveAttribute('data-copy-id',LISTING);
});
test('Charles: stale or invalid shared listing fails closed, without a demo listing',async({page})=>{
 await ready(page);
 await page.evaluate(async listing=>{
  history.replaceState({},'','/?listing='+listing);
  supabaseClient.from=()=>{
   const q={};for(const key of ['select','eq'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:null,error:null});return q;
  };
  await window.deckplayOpenSharedLinkOnce();
 },LISTING);
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 await expect(page.locator('#toast')).toContainText('no longer available');
});
test('Charles and Kyle: duplicate or mixed shared URL destinations fail closed on mobile and desktop',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',route=>route.fulfill({json:[]}));
 for(const query of [
  'listing='+LISTING+'&listing='+SELLER,
  'collector='+SELLER+'&collector='+LISTING,
  'listing='+LISTING+'&collector=',
  'collector='+SELLER+'&listing='
 ]){
  await page.goto('/?'+query);
  await page.waitForLoadState('networkidle');
  await page.evaluate(()=>window.deckplayOpenSharedLinkOnce());
  await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
  await expect(page.locator('#publicProfileModal')).not.toHaveClass(/open/);
  await expect(page.locator('#toast')).toContainText('shared link is invalid');
 }
});

test('Charles: blocked collector link cannot open private or blocked listing details',async({page})=>{
 await ready(page);
 await page.evaluate(async({listing,seller,buyer})=>{
  currentUser={id:buyer};
  blockedCollectorIds.add(seller);
  history.replaceState({},'','/?listing='+listing);
  supabaseClient.from=table=>{
   const q={};for(const key of ['select','eq'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:table==='listings'?{id:listing,title:'Blocked listing',seller_id:seller,price:99,status:'active'}:null,error:null});
   return q;
  };
  await window.deckplayOpenSharedLinkOnce();
 },{listing:LISTING,seller:SELLER,buyer:BUYER});
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 await expect(page.locator('#toast')).toContainText('blocked');
});

test('Jayden: a shared collector profile resolves for signed-out buyers without private data',async({page})=>{
 await ready(page);
 await page.evaluate(async seller=>{
  history.replaceState({},'','/?collector='+seller);
  supabaseClient.from=table=>{
   const q={then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};
   for(const key of ['select','eq','order','limit'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:table==='profiles'?{username:'game-and-card-collector',bio:'Trading cards, games and memorabilia',location_label:'Arkansas'}:null,error:null});
   return q;
  };
  await window.deckplayOpenSharedLinkOnce();
 },SELLER);
 await expect(page.locator('#publicProfileModal')).toHaveClass(/open/);
 await expect(page.locator('#publicProfileTitle')).toHaveText('@game-and-card-collector');
 await expect(page).toHaveTitle('@game-and-card-collector | DeckPlay HQ');
 await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content','@game-and-card-collector | DeckPlay HQ');
 await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content',/public profile and active collectibles/);
 await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content',/noindex/);
 await expect(page.locator('#publicProfileContent')).toContainText('Trading cards, games and memorabilia');
 await expect(page.locator('[data-copy-kind="collector"]')).toHaveAttribute('data-copy-id',SELLER);
 await expect(page.locator('#publicProfileContent')).not.toContainText('private@example.test');
});
test('Charles: a delayed shared listing lookup cannot open after account switch',async({page})=>{
 await ready(page);
 await page.evaluate(async({listing,seller,buyer})=>{
  currentUser={id:buyer};
  history.replaceState({},'','/?listing='+listing);
  let finish;
  supabaseClient.from=table=>{
   const q={};for(const key of ['select','eq'])q[key]=()=>q;
   q.maybeSingle=()=>table==='listings'?new Promise(resolve=>{finish=resolve}):Promise.resolve({data:null,error:null});
   return q;
  };
  const pending=window.deckplayOpenSharedLinkOnce();
  currentUser={id:seller};
  finish({data:{id:listing,title:'Previous-account listing',seller_id:seller,price:10},error:null});
  await pending;
 },{listing:LISTING,seller:SELLER,buyer:BUYER});
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
});

test('Kyle: a temporary shared-link lookup failure offers a retry and opens the current active listing',async({page})=>{
 await ready(page);
 await page.evaluate(({listing,seller})=>{
  history.replaceState({},'','/?listing='+listing);
  let offline=true;
  window.restoreSharedLookup=()=>{offline=false};
  supabaseClient.from=table=>{
   if(offline)throw new Error('Temporary offline test');
   const q={};
   for(const key of ['select','eq'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:table==='listings'?{
    id:listing,title:'Recovered synthetic game collectible',category:'video_games',
    seller_id:seller,price:22,condition:'used',image_urls:[]
   }:{username:'retry-collector'},error:null});
   return q;
  };
 },{listing:LISTING,seller:SELLER});
 await page.evaluate(()=>window.deckplayOpenSharedLinkOnce());
 await expect(page.locator('#deckplaySharedLinkRetry')).toBeVisible();
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>window.restoreSharedLookup());
 await page.getByRole('button',{name:'Retry shared link'}).click();
 await expect(page.locator('#detailModal')).toHaveClass(/open/);
 await expect(page.locator('#detailTitle')).toHaveText('Recovered synthetic game collectible');
 await expect(page.locator('#deckplaySharedLinkRetry')).toHaveCount(0);
});

test('Kyle: a temporary shared collector lookup offers a usable retry on mobile and desktop',async({page})=>{
 await ready(page);
 await page.evaluate(seller=>{
  history.replaceState({...history.state},'','/?collector='+seller);
  let offline=true;
  window.restoreCollectorLookup=()=>{offline=false};
  supabaseClient.from=table=>{
   const q={then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};
   for(const key of ['select','eq','order','limit'])q[key]=()=>q;
   q.maybeSingle=async()=>table==='profiles'
    ?offline?{data:null,error:{message:'temporary connection loss'}}:{data:{username:'recovered-collector',bio:'Video games and sports collectibles'},error:null}
    :{data:null,error:null};
   return q;
  };
 },SELLER);
 await page.evaluate(()=>window.deckplayOpenSharedLinkOnce());
 await expect(page.locator('#deckplaySharedLinkRetry')).toBeVisible();
 await expect(page.locator('#publicProfileModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>window.restoreCollectorLookup());
 await page.getByRole('button',{name:'Retry shared link'}).click();
 await expect(page.locator('#publicProfileTitle')).toHaveText('@recovered-collector');
 await expect(page.locator('#publicProfileModal')).toHaveClass(/open/);
 await expect(page.locator('#deckplaySharedLinkRetry')).toHaveCount(0);
});

test('Charles: nonexistent shared collector profile fails closed without an endless retry',async({page})=>{
 await ready(page);
 await page.evaluate(seller=>{
  history.replaceState({...history.state},'','/?collector='+seller);
  supabaseClient.from=table=>{
   const q={then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};
   for(const key of ['select','eq','order','limit'])q[key]=()=>q;
   q.maybeSingle=async()=>({data:null,error:null});
   return q;
  };
 },SELLER);
 await page.evaluate(()=>window.deckplayOpenSharedLinkOnce());
 await expect(page.locator('#publicProfileModal')).not.toHaveClass(/open/);
 await expect(page.locator('#deckplaySharedLinkRetry')).toHaveCount(0);
 await expect(page.locator('#toast')).toContainText('collector profile is unavailable');
});

test('T1.4: buyer detail states the asking price covers all included items across seven categories',async({page})=>{
 await ready(page);
 const cases=[
  ['trading_cards','complete decks',3],['video_games','games',4],['consoles','bundled items',2],
  ['controllers','controllers',2],['accessories','accessories',6],
  ['collectibles','figures',5],['other','mixed pieces',7]
 ];
 const values=await page.evaluate(cases=>{
  const nl=String.fromCharCode(10);
  return cases.map(([category,unit,qty])=>{
   const description=['[Listing contents]','Quantity included: '+qty,'Unit: '+unit,
    'Sold together for the listing price.','[End listing contents]','Seller description'].join(nl);
   showDetails({n:'Synthetic '+category+' lot',c:category,p:120,
    s:'@seller',sellerId:'22222222-2222-4222-8222-222222222222',imageUrls:[],description});
   return {category,price:document.querySelector('#detailContent .detail-price')?.textContent,
    scope:document.querySelector('#detailContent .detail-price-scope')?.textContent};
  });
 },cases);
 expect(values).toHaveLength(7);
 values.forEach((row,index)=>{
  expect(row.price).toBe('$120.00');
  expect(row.scope).toBe('Price for the complete listing: '+cases[index][2]+' '+cases[index][1]+' included. Not a per-unit price.');
 });
});
test('T1.4: unknown lot size is not invented and buyer quantity labels cannot inject HTML',async({page})=>{
 await ready(page);
 const result=await page.evaluate(()=>{
  const item={n:'Synthetic card',c:'Trading cards',p:19.99,s:'@seller',
   sellerId:'22222222-2222-4222-8222-222222222222',imageUrls:[]};
  const nl=String.fromCharCode(10);
  showDetails({...item,description:'Older listing without contents disclosure'});
  const legacy=document.querySelector('.detail-price-scope')?.textContent;
  showDetails({...item,description:['[Listing contents]','Quantity included: 1','Unit: sealed pack',
   'Sold together for the listing price.','[End listing contents]'].join(nl)});
  const single=document.querySelector('.detail-price-scope')?.textContent;
  showDetails({...item,description:['[Listing contents]','Quantity included: 100001','Unit: items',
   'Sold together for the listing price.','[End listing contents]'].join(nl)});
  const invalid=document.querySelector('.detail-price-scope')?.textContent;
  showDetails({...item,description:['[Listing contents]','Quantity included: 2',
   'Unit: cards<img src=x onerror=alert(1)>','Sold together for the listing price.',
   '[End listing contents]'].join(nl)});
  return {legacy,single,invalid,
   safeText:document.querySelector('.detail-price-scope')?.textContent,
   injectedImages:document.querySelectorAll('.detail-price-scope img').length};
 });
 expect(result.legacy).toBe('Asking price for this listing. Check the description for what is included.');
 expect(result.single).toBe('Price for the complete listing: 1 sealed pack included.');
 expect(result.invalid).toBe(result.legacy);
 expect(result.safeText).toContain('cards<img src=x onerror=alert(1)>');
 expect(result.injectedImages).toBe(0);
});
test('T1.4: marketplace cards identify disclosed multi-item lots but do not invent legacy quantities',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  const nl=String.fromCharCode(10);
  const description=['[Listing contents]','Quantity included: 3','Unit: games',
   'Sold together for the listing price.','[End listing contents]','Three used games'].join(nl);
  const base={s:'@collector',sellerId:'22222222-2222-4222-8222-222222222222',
   c:'Video Games',rawCategory:'video_games',p:75,cond:'Used',e:'🎮',imageUrls:[],trades:false};
  items=[
   {...base,id:'11111111-1111-4111-8111-111111111111',n:'Three-game bundle',description},
   {...base,id:'33333333-3333-4333-8333-333333333333',n:'Older game listing',description:'Ask seller about included items'}
  ];
  listingSource='live';cat='All';filter='All';game='All';query='';onlyMyListings=false;onlySavedListings=false;render();
 });
 await expect(page.locator('#grid .card')).toHaveCount(2);
 await expect(page.locator('#grid .card').first().locator('.listing-lot-badge')).toHaveText('3 games · lot price');
 await expect(page.locator('#grid .card').first().locator('.price')).toHaveText('$75.00');
 await expect(page.locator('#grid .card').nth(1).locator('.listing-lot-badge')).toHaveCount(0);
 // The default landing page keeps Marketplace hidden until the user navigates there.
 await page.evaluate(()=>showMainMarketplace());
 await page.locator('#grid .card').first().getByRole('button',{name:'View item'}).click();
 await expect(page.locator('.detail-price-scope')).toContainText('Not a per-unit price.');
});
test('T1.6: buyer detail explains unknown fees and demo-only checkout next to asking price',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  const nl=String.fromCharCode(10);
  const description=['[Listing contents]','Quantity included: 2','Unit: complete decks',
   'Sold together for the listing price.','[End listing contents]'].join(nl);
  showDetails({n:'Synthetic complete decks',p:89,c:'Trading Cards',description,
   s:'@seller',sellerId:'22222222-2222-4222-8222-222222222222',imageUrls:[]});
 });
 await expect(page.locator('.detail-price')).toHaveText('$89.00');
 await expect(page.locator('.detail-price-scope')).toContainText('2 complete decks included');
 await expect(page.locator('.detail-fee-disclosure')).toContainText('Shipping, taxes and platform fees are not calculated.');
 await expect(page.locator('.detail-fee-disclosure')).toContainText('no purchase or payment is processed');
});

test('T1.2: sports card filters stay visible as removable chips on collapsed mobile and desktop filters',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  items=[
   {id:'sports-a',n:'Topps Baseball Rookie',c:'Trading Cards',game:'sports_cards',rawCategory:'trading_cards',
    description:'Sport: Baseball\nBrand: Topps\nYear: 2024\nPlayer: Rookie',p:30,s:'@tanner',cond:'Near Mint',e:'⚾',sellerId:'seller-a',imageUrls:[]},
   {id:'sports-b',n:'Panini Football Rookie',c:'Trading Cards',game:'sports_cards',rawCategory:'trading_cards',
    description:'Sport: Football\nBrand: Panini\nYear: 2025\nPlayer: Rookie',p:35,s:'@tanner',cond:'Near Mint',e:'🏈',sellerId:'seller-b',imageUrls:[]},
   {id:'game-a',n:'Retro game',c:'Video Games',rawCategory:'video_games',p:20,s:'@jayden',cond:'Used',e:'🎮',sellerId:'seller-c',imageUrls:[]}
  ];
  query='';cat='All';filter='All';game='All';onlySavedListings=false;onlyMyListings=false;listingSource='live';
  document.getElementById('search').value='';
  showMainMarketplace();render();
 });
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await page.locator('#marketGame').selectOption('sports_cards');
 await page.locator('#marketSport').selectOption('Baseball');
 await page.locator('#marketSportsBrand').fill('Topps');
 await page.locator('#marketSportsYear').fill('2024');
 await expect(page.locator('#grid h3')).toHaveText(['Topps Baseball Rookie']);
 await page.locator('#marketFilterToggle').click();
 const chips=page.locator('#marketActiveFilters');
 await expect(chips).toBeVisible();
 for(const text of ['Category: Trading Cards','Game: Sports cards','Sport: Baseball','Brand: Topps','Year: 2024'])
  await expect(chips).toContainText(text);
 await chips.locator('[data-remove-market-filter="year"]').click();
 await expect(page.locator('#marketSportsYear')).toHaveValue('');
 await expect(chips.locator('[data-remove-market-filter="year"]')).toHaveCount(0);
 await expect(chips.locator('[data-remove-market-filter="sport"]')).toHaveCount(1);
 await chips.locator('[data-remove-market-filter="category"]').click();
 await expect(page.locator('#marketCategory')).toHaveValue('All');
 await expect(chips.locator('[data-remove-market-filter="category"]')).toHaveCount(0);
 await expect(page.locator('#grid h3')).toHaveCount(3);
});
test('T1.2: removing a single price or search chip preserves Saved items and remaining criteria',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  items=[
   {id:'favorite-game',n:'Favorite racing game',c:'Video Games',rawCategory:'video_games',
    p:45,s:'@jayden',cond:'Used',e:'🎮',sellerId:'seller-one',imageUrls:[]},
   {id:'favorite-card',n:'Favorite rare card',c:'Trading Cards',rawCategory:'trading_cards',
    p:25,s:'@tanner',cond:'Near Mint',e:'🃏',sellerId:'seller-two',imageUrls:[]},
   {id:'unsaved',n:'Favorite unsaved figure',c:'Collectibles',rawCategory:'collectibles',
    p:10,s:'@tanner',cond:'Used',e:'⭐',sellerId:'seller-three',imageUrls:[]}
  ];
  saved.clear();saved.add('favorite-game');saved.add('favorite-card');
  query='';cat='All';filter='All';game='All';onlyMyListings=false;onlySavedListings=true;
  listingSource='live';document.getElementById('search').value='';
  showMainMarketplace();render();
 });
 await page.locator('#search').fill('Favorite');
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketMinPrice').fill('40');
 await expect(page.locator('#grid h3')).toHaveText(['Favorite racing game']);
 await expect(page.locator('#marketActiveFilters [data-remove-market-filter="search"]')).toBeVisible();
 await page.locator('#marketActiveFilters [data-remove-market-filter="minPrice"]').click();
 await expect(page.locator('#marketMinPrice')).toHaveValue('');
 await expect(page.locator('#grid h3')).toHaveText(['Favorite racing game','Favorite rare card']);
 await expect(page.locator('#market h2')).toHaveText('Saved items');
 await page.locator('#marketActiveFilters [data-remove-market-filter="search"]').click();
 await expect(page.locator('#search')).toHaveValue('');
 await expect(page.locator('#market h2')).toHaveText('Saved items');
 await expect(page.locator('#grid h3')).toHaveCount(2);
 await expect(page.locator('#marketActiveFilters')).toBeHidden();
});
test('T1.2: user-entered HTML remains plain text inside search chips',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{query='';cat='All';filter='All';game='All';showMainMarketplace();render()});
 await page.locator('#search').fill('<img src=x onerror=alert(1)>');
 await expect(page.locator('#marketActiveFilters')).toContainText('<img src=x onerror=alert(1)>');
 await expect(page.locator('#marketActiveFilters img')).toHaveCount(0);
 await page.locator('#marketActiveFilters [data-remove-market-filter="search"]').click();
 await expect(page.locator('#search')).toHaveValue('');
});

test('T1.2: edited sports-card brand and year outrank stale creation labels in buyer filters',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  const nl=String.fromCharCode(10);
  const original='[Sports Cards]'+nl+'Sport: Baseball'+nl+'Brand: Topps'+nl+'Year: 2022'+nl+'Player: Jordan'+nl+nl;
  const updated=['[Listing classification]','Category: Trading Cards','Listing type: Single',
   'Sport: Baseball','Sports brand: Panini','Year: 2025','Player: Jordan',
   '[End classification]'].join(nl);
  items=[
   {id:'updated-card',n:'Updated baseball card',c:'Trading Cards',rawCategory:'trading_cards',
    game:'sports_cards',p:24,s:'@tanner',description:updated+nl+nl+original,
    sellerId:'seller-updated',cond:'Near Mint',e:'⚾',imageUrls:[]},
   {id:'old-card',n:'Legacy baseball card',c:'Trading Cards',rawCategory:'trading_cards',
    game:'sports_cards',p:20,s:'@tanner',description:original,sellerId:'seller-legacy',
    cond:'Near Mint',e:'⚾',imageUrls:[]}
  ];
  cat='All';game='All';filter='All';query='';onlyMyListings=false;onlySavedListings=false;
  listingSource='live';document.getElementById('search').value='';showMainMarketplace();render();
 });
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await page.locator('#marketGame').selectOption('sports_cards');
 await page.locator('#marketSport').selectOption('Baseball');
 await page.locator('#marketSportsBrand').fill('Panini');
 await page.locator('#marketSportsYear').fill('2025');
 await expect(page.locator('#grid h3')).toHaveText(['Updated baseball card']);
 await page.locator('#marketSportsYear').fill('2022');
 await expect(page.locator('#grid h3')).toHaveCount(0);
 await page.locator('#marketSportsBrand').fill('Topps');
 await expect(page.locator('#grid h3')).toHaveText(['Legacy baseball card']);
 await page.locator('#marketSportsBrand').fill('Panini');
 await page.locator('#marketSportsYear').fill('2025');
 await expect(page.locator('#grid h3')).toHaveText(['Updated baseball card']);
});

async function sellerEditorFixture(page){
 await ready(page);
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'synthetic-edit-owner'};
  window.editFixtureRow={
   id:'synthetic-edit-listing',seller_id:'synthetic-edit-owner',
   title:'Original listed item',description:'Exact condition and included contents',
   price:24.75,accepts_trades:true,accepts_price_offers:true,
   status:'active',updated_at:'2026-10-30T10:00:00Z',
   category:'video_games',product_type:'game',condition:'used',
   tcg_game:null,collectible_subcategory:null,
   image_urls:['https://example.test/front.jpg','https://example.test/back.jpg']
  };
  supabaseClient.from=()=>({
   select(){return this},eq(){return this},
   async maybeSingle(){return {data:editFixtureRow,error:null}}
  });
  await window.listingEditor.open('synthetic-edit-listing');
 });
 await expect(page.locator('#editListingModal')).toHaveClass(/open/);
 await expect(page.locator('#editListingTitle')).toHaveValue('Original listed item');
}
test('T1.1: seller can keep editing when Cancel discard confirmation is refused',async({page})=>{
 await sellerEditorFixture(page);
 await page.locator('#editListingTitle').fill('Edited retro game bundle');
 page.once('dialog',async dialog=>{expect(dialog.message()).toContain('Discard your unsaved listing changes');await dialog.dismiss()});
 await page.locator('#editListingModal [data-close-editor]').last().click();
 await expect(page.locator('#editListingModal')).toHaveClass(/open/);
 await expect(page.locator('#editListingTitle')).toHaveValue('Edited retro game bundle');
 page.once('dialog',async dialog=>dialog.accept());
 await page.locator('#editListingModal [data-close-editor]').last().click();
 await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);
});
test('T1.1: closing an unchanged listing never triggers a confirmation',async({page})=>{
 await sellerEditorFixture(page);
 let prompted=false;page.on('dialog',async dialog=>{prompted=true;await dialog.dismiss()});
 await page.locator('#editListingModal [data-close-editor]').last().click();
 await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);
 expect(prompted).toBe(false);
});
test('T1.1: Escape and backdrop preserve modified photos and fields unless discard is confirmed',async({page})=>{
 await sellerEditorFixture(page);
 await page.locator('#editListingPhotos [data-edit-photo="remove"]').last().click();
 await expect(page.locator('#editListingPhotos [data-edit-photo="remove"]')).toHaveCount(1);
 page.once('dialog',async dialog=>dialog.dismiss());
 await page.keyboard.press('Escape');
 await expect(page.locator('#editListingModal')).toHaveClass(/open/);
 await expect(page.locator('#editListingPhotos [data-edit-photo="remove"]')).toHaveCount(1);
 page.once('dialog',async dialog=>dialog.dismiss());
 await page.evaluate(()=>document.getElementById('editListingModal').click());
 await expect(page.locator('#editListingModal')).toHaveClass(/open/);
 page.once('dialog',async dialog=>dialog.accept());
 await page.evaluate(()=>document.getElementById('editListingModal').click());
 await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);
});
test('T1.1: switching seller accounts destroys private unsaved edits without prompting',async({page})=>{
 await sellerEditorFixture(page);
 await page.locator('#editListingDescription').fill('Private exact details draft');
 let prompted=false;page.on('dialog',async dialog=>{prompted=true;await dialog.dismiss()});
 await page.evaluate(()=>{currentUser={id:'different-seller'};window.listingEditor.reset()});
 await expect(page.locator('#editListingModal')).not.toHaveClass(/open/);
 await expect(page.locator('#editListingDescription')).toHaveValue('');
 expect(prompted).toBe(false);
});

test('T1.3: buyer sees current seller-edited card set, number, variant and grading instead of stale originals',async({page})=>{
 await ready(page);
 const result=await page.evaluate(()=>{
  const nl=String.fromCharCode(10);
  const original=['Set: Old Starter','Card number: 001','Variant: Regular','Grader: Old grader','Grade: 8'].join(nl);
  const edited=['[Listing classification]','Category: Trading Cards','Listing type: Single',
   'Set: New Set','Card number: 099','Variant: Alternate Art',
   'Edition / printing: First Edition','Language: Japanese',
   'Grader: PSA','Grade: 10','Certification: 12345',
   '[End classification]'].join(nl);
  const item={n:'One Piece collectible card',p:90,c:'Trading Cards',rawCategory:'trading_cards',
   game:'one_piece',description:edited+nl+nl+original,imageUrls:[],s:'@seller',sellerId:'seller'};
  showDetails(item);
  return {specifics:document.querySelector('.detail-item-specifics')?.textContent,
   description:document.querySelector('.detail-description')?.textContent};
 });
 expect(result.specifics).toContain('Set:New Set');
 expect(result.specifics).toContain('Card number:099');
 expect(result.specifics).toContain('Variant:Alternate Art');
 expect(result.specifics).toContain('Edition / printing:First Edition');
 expect(result.specifics).toContain('Language:Japanese');
 expect(result.specifics).toContain('Grader:PSA');
 expect(result.specifics).toContain('Grade:10');
 expect(result.specifics).toContain('Certification:12345');
 expect(result.specifics).not.toContain('Old Starter');
 expect(result.specifics).not.toContain('Old grader');
 expect(result.description).toContain('New Set');
});
test('T1.3: older card descriptions, sports cards and hardware expose exact useful details',async({page})=>{
 await ready(page);
 const result=await page.evaluate(()=>{
  const nl=String.fromCharCode(10),output=[];
  const base={n:'Synthetic collectible',p:20,s:'@seller',imageUrls:[],sellerId:'seller'};
  const cases=[
   {...base,c:'Trading Cards',rawCategory:'trading_cards',game:'pokemon',
    description:['Set: Crown Zenith','Card number: 160/159','Variant: Secret Rare','Language: English'].join(nl)},
   {...base,c:'Trading Cards',rawCategory:'trading_cards',game:'sports_cards',
    description:['[Listing classification]','Sport: Baseball','Sports brand: Topps','Year: 2025',
     'Player: Rookie','[End classification]'].join(nl)},
   {...base,c:'Video Games',rawCategory:'video_games',description:'[Video Game]'+nl+'Platform: Nintendo Switch'},
   {...base,c:'Consoles & Controllers',rawCategory:'controllers',
    description:'[Hardware: Controller]'+nl+'Brand: Nintendo'+nl+'Model: Pro Controller'+nl+'Storage/version: wired'}
  ];
  for(const item of cases){showDetails(item);output.push(document.querySelector('.detail-item-specifics')?.textContent||'')}
  return output;
 });
 expect(result[0]).toContain('Crown Zenith');
 expect(result[0]).toContain('160/159');
 expect(result[1]).toContain('Brand:Topps');
 expect(result[1]).toContain('Year:2025');
 expect(result[2]).toContain('Platform:Nintendo Switch');
 expect(result[3]).toContain('Model:Pro Controller');
 expect(result[3]).toContain('Storage / version:wired');
});
test('T1.3: seller-provided detail fields cannot inject markup and absent details are omitted',async({page})=>{
 await ready(page);
 const result=await page.evaluate(()=>{
  const nl=String.fromCharCode(10);
  showDetails({n:'Safe card',p:50,c:'Trading Cards',rawCategory:'trading_cards',game:'one_piece',
   description:'Set: <img src=x onerror=alert(1)>'+nl+'Card number: OP17-001',imageUrls:[]});
  const el=document.querySelector('.detail-item-specifics');
  const escaped={text:el?.textContent,images:el?.querySelectorAll('img').length};
  showDetails({n:'No declared specifics',p:20,c:'Collectibles',rawCategory:'collectibles',
   description:'Original collectible description only',imageUrls:[]});
  return {...escaped,empty:document.querySelectorAll('.detail-item-specifics').length};
 });
 expect(result.text).toContain('<img src=x onerror=alert(1)>');
 expect(result.images).toBe(0);
 expect(result.empty).toBe(0);
});


// T3.4: actual trade compose UI; synthetic account and listing API, no staging writes.
async function openSyntheticTradeComposer(page,buyer='trade-draft-buyer',seller='trade-draft-seller',target='trade-draft-target'){
 await page.evaluate(({buyer,seller,target})=>{
  currentUser={id:buyer};
  syncInboxDraftUser();
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,
    range:async()=>({data:table==='listings'?[{id:'trade-owned-card',title:'My listed Pokémon card'},{id:'trade-owned-game',title:'My listed Switch game'}]:[],error:null})};
   return q;
  };
  showDetails({databaseId:target,n:'Seller collectible bundle',p:90,c:'Collectibles',
   imageUrls:[],sellerId:seller,s:'@seller',trades:true});
 },{buyer,seller,target});
 await page.locator('#detailContent [data-trade-id]').click();
 await expect(page.locator('#tradeComposeModal')).toHaveClass(/open/);
 await expect(page.locator('#tradeOfferedListing option')).toHaveCount(3);
}
test('T3.4: multi-item trade draft survives modal close, different listing and page reload without leaking terms',async({page})=>{
 await ready(page);
 await openSyntheticTradeComposer(page);
 await page.locator('#tradeOfferedListing').selectOption('trade-owned-card');
 await page.locator('#tradeAddItem').click();
 await page.locator('#tradeCashDirection').selectOption('sender_pays');
 await page.locator('#tradeCashAmount').fill('24.50');
 await page.locator('#tradeOfferNote').fill('My Pokémon card plus cash for your figure; please check the corners.');
 await page.locator('#tradeComposeModal [data-close]').click();
 await openSyntheticTradeComposer(page,'trade-draft-buyer','trade-draft-other-seller','trade-other-target');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('');
 await expect(page.locator('#tradeBundleItems li')).toHaveCount(0);
 await expect(page.locator('#tradeCashDirection')).toHaveValue('none');
 await page.locator('#tradeComposeModal [data-close]').click();
 await openSyntheticTradeComposer(page);
 await expect(page.locator('#tradeOfferNote')).toHaveValue(/My Pokémon card plus cash/);
 await expect(page.locator('#tradeBundleItems li')).toHaveCount(1);
 await expect(page.locator('#tradeCashDirection')).toHaveValue('sender_pays');
 await expect(page.locator('#tradeCashAmount')).toHaveValue('24.5');
 await page.reload();await page.waitForLoadState('networkidle');
 await openSyntheticTradeComposer(page);
 await expect(page.locator('#tradeOfferNote')).toHaveValue(/My Pokémon card plus cash/);
 await expect(page.locator('#tradeBundleItems li')).toHaveCount(1);
 await expect(page.locator('#tradeOfferStatus')).toContainText('Trade draft restored');
});
test('T3.4: switching collectors destroys the former trade draft and prevents cross-account proposal leakage',async({page})=>{
 await ready(page);await openSyntheticTradeComposer(page);
 await page.locator('#tradeOfferNote').fill('Private buyer-only negotiation details');
 await page.evaluate(()=>{
  currentUser={id:'another-test-collector'};syncInboxDraftUser();
 });
 await expect(page.locator('#tradeComposeModal')).not.toHaveClass(/open/);
 await expect(page.locator('#tradeOfferNote')).toHaveValue('');
 await page.evaluate(()=>{
  currentUser={id:'trade-draft-buyer'};syncInboxDraftUser();
 });
 await openSyntheticTradeComposer(page);
 await expect(page.locator('#tradeOfferNote')).toHaveValue('');
 const snapshot=await page.evaluate(()=>sessionStorage.getItem('deckplay-trade-compose-v1:trade-draft-buyer'));
 expect(snapshot).toBeNull();
});
test('T3.4: network failure keeps a trade proposal editable and recoverable when composer is reopened',async({page})=>{
 await ready(page);await openSyntheticTradeComposer(page);
 await page.locator('#tradeOfferNote').fill('Bundle offer while network is unstable');
 await page.evaluate(()=>{
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,range:async()=>({data:[{id:'trade-owned-card',title:'My card'}],error:null}),
    maybeSingle:async()=>({data:null,error:null}),
    insert:()=>({select:()=>({single:async()=>({data:null,error:{message:'Network unavailable'}})})})};
   return q;
  };
 });
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 await expect(page.locator('#tradeOfferStatus')).toContainText('Network unavailable');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('Bundle offer while network is unstable');
 await page.locator('#tradeComposeModal [data-close]').click();
 await page.evaluate(()=>showDetails({databaseId:'trade-draft-target',n:'Seller collectible bundle',p:90,c:'Collectibles',imageUrls:[],sellerId:'trade-draft-seller',s:'@seller',trades:true}));
 await page.locator('#detailContent [data-trade-id]').click();
 await expect(page.locator('#tradeOfferNote')).toHaveValue('Bundle offer while network is unstable');
});

test('T7.1: denied clipboard gives a selectable public link instead of losing the copy action',async({page})=>{
 await ready(page);
 await page.evaluate(({listing,seller})=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('Clipboard blocked','NotAllowedError')}}});
  showDetails({databaseId:listing,n:'Synthetic collectible',p:18,c:'Collectibles',sellerId:seller,s:'@collector',imageUrls:[]});
  document.querySelector('#detailContent [data-copy-kind="listing"]').click();
 },{listing:LISTING,seller:SELLER});
 const dialog=page.locator('#deckplayShareFallback');
 await expect(dialog).toBeVisible();
 const link=page.locator('#deckplayShareFallbackInput');
 await expect(link).toHaveValue(new RegExp('listing='+LISTING+'$'));
 expect(new URL(await link.inputValue()).searchParams.size).toBe(1);
 await page.getByRole('button',{name:'Select link'}).click();
 expect(await link.evaluate(el=>el.selectionEnd-el.selectionStart)).toBe((await link.inputValue()).length);
 await dialog.getByRole('button',{name:'Close'}).click();
 await expect(dialog).not.toBeVisible();
});

test('T7.1: failed Android-style native share keeps the collector link copyable',async({page})=>{
 await ready(page);
 await page.evaluate(({listing,seller})=>{
  Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Sharing denied','NotAllowedError')}});
  showDetails({databaseId:listing,n:'Synthetic video game',p:35,c:'Video Games',sellerId:seller,s:'@collector',imageUrls:[]});
  document.querySelector('#detailContent [data-share-kind="listing"]').click();
 },{listing:LISTING,seller:SELLER});
 await expect(page.locator('#deckplayShareFallback')).toBeVisible();
 const link=await page.locator('#deckplayShareFallbackInput').inputValue();
 expect(new URL(link).searchParams.get('listing')).toBe(LISTING);
 expect(new URL(link).searchParams.has('collector')).toBe(false);
 await page.locator('#deckplayShareFallback').getByRole('button',{name:'Close'}).click();
 await expect(page.locator('#deckplayShareFallback')).not.toBeVisible();
});
