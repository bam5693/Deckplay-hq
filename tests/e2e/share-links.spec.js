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
