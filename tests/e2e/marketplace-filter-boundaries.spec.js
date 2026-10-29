const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
});

// Local-only synthetic listings; restore every mutated global after each test.
async function installFixture(page,listings,blocked=[]){
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(({listings,blocked})=>{
  window.__marketFilterFixture={
   items,query,cat,filter,game,onlyMyListings,onlySavedListings,
   blocked:[...blockedCollectorIds],saved:[...saved]
  };
  items=listings;query='';cat='All';filter='All';game='All';
  onlyMyListings=false;onlySavedListings=false;
  blockedCollectorIds.clear();blocked.forEach(id=>blockedCollectorIds.add(id));
  document.getElementById('search').value='';
  document.getElementById('marketCategory').value='All';
  document.getElementById('marketGame').value='All';
  document.getElementById('marketMinPrice').value='';
  document.getElementById('marketMaxPrice').value='';
  document.getElementById('marketCollectibleSubcategory').value='All';
  showMainMarketplace();syncCollectibleFilter();render();
 },{listings,blocked});
}
test.afterEach(async({page})=>{
 if(page.isClosed())return;
 await page.evaluate(()=>{
  const f=window.__marketFilterFixture;if(!f)return;
  items=f.items;query=f.query;cat=f.cat;filter=f.filter;game=f.game;
  onlyMyListings=f.onlyMyListings;onlySavedListings=f.onlySavedListings;
  blockedCollectorIds.clear();f.blocked.forEach(id=>blockedCollectorIds.add(id));
  saved.clear();f.saved.forEach(id=>saved.add(id));
  document.getElementById('search').value=query;
  document.getElementById('marketCategory').value=cat;
  document.getElementById('marketGame').value=game;
  document.getElementById('marketMinPrice').value='';
  document.getElementById('marketMaxPrice').value='';
  syncCollectibleFilter();render();
  delete window.__marketFilterFixture;
 }).catch(()=>{});
});

test('blocked seller listings stay hidden through search and maximum-price filters',async({page})=>{
 await installFixture(page,[
  {id:'fixture-visible-card',n:'Charizard visible',c:'Trading Cards',game:'pokemon',p:35,s:'visible collector',sellerId:'fixture-allowed-seller',cond:'Near Mint',e:'🃏'},
  {id:'fixture-blocked-card',n:'Charizard blocked',c:'Trading Cards',game:'pokemon',p:10,s:'blocked collector',sellerId:'fixture-blocked-seller',cond:'Near Mint',e:'🃏'}
 ],['fixture-blocked-seller']);
 await expect(page.locator('#grid h3')).toHaveText(['Charizard visible']);
 await page.locator('#search').fill('charizard');
 await expect(page.locator('#grid h3')).toHaveText(['Charizard visible']);
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketMaxPrice').fill('20');
 await expect(page.locator('#grid h3')).toHaveCount(0);
 await page.locator('#marketMaxPrice').fill('50');
 await expect(page.locator('#grid h3')).toHaveText(['Charizard visible']);
 await page.locator('#search').fill('blocked');
 await expect(page.locator('#grid h3')).toHaveCount(0);
});

test('collectibles subcategory and price filters combine and clear without stale fields',async({page})=>{
 await installFixture(page,[
  {id:'fixture-anime',n:'Anime figure',c:'Collectibles',collectibleSubcategory:'anime_manga',p:40,s:'fixture',cond:'Used',e:'🃏'},
  {id:'fixture-sports',n:'Signed jersey',c:'Collectibles',collectibleSubcategory:'sports_memorabilia',p:25,s:'fixture',cond:'Used',e:'🃏'},
  {id:'fixture-statue',n:'Anime statue',c:'Collectibles',collectibleSubcategory:'anime_manga',p:100,s:'fixture',cond:'Used',e:'🃏'}
 ]);
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Collectibles');
 await expect(page.locator('#marketCollectibleWrap')).toBeVisible();
 await page.locator('#marketCollectibleSubcategory').selectOption('anime_manga');
 await page.locator('#marketMaxPrice').fill('50');
 await expect(page.locator('#grid h3')).toHaveText(['Anime figure']);
 await page.locator('#marketClearFilters').click();
 await expect(page.locator('#marketCategory')).toHaveValue('All');
 await expect(page.locator('#marketCollectibleSubcategory')).toHaveValue('All');
 await expect(page.locator('#marketMaxPrice')).toHaveValue('');
 await expect(page.locator('#marketCollectibleWrap')).toBeHidden();
 await expect(page.locator('#grid h3')).toHaveCount(3);
});

test('Tanner and Jayden can narrow sports cards, One Piece singles and sports memorabilia without cross-category results',async({page})=>{
 await installFixture(page,[
  {id:'sports-card',n:'PSA 10 baseball rookie',c:'Trading Cards',game:'sports_cards',gameLabel:'Sports cards',p:85,s:'Tanner',sellerId:'sports-seller',cond:'Graded',e:'🃏'},
  {id:'tcg-card',n:'Luffy playable single',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:12,s:'Jayden',sellerId:'tcg-seller',cond:'Near Mint',e:'🃏'},
  {id:'sports-jersey',n:'Signed baseball jersey',c:'Collectibles',collectibleSubcategory:'sports_memorabilia',p:65,s:'Tanner',sellerId:'memorabilia-seller',cond:'Used',e:'🧢'},
  {id:'game-item',n:'Retro game cartridge',c:'Video Games',p:30,s:'Jayden',sellerId:'game-seller',cond:'Used',e:'🎮'}
 ]);
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await page.locator('#marketGame').selectOption('sports_cards');
 await expect(page.locator('#grid h3')).toHaveText(['PSA 10 baseball rookie']);
 await page.locator('#marketGame').selectOption('one_piece');
 await expect(page.locator('#grid h3')).toHaveText(['Luffy playable single']);
 await page.locator('#marketClearFilters').click();
 await page.locator('#marketCategory').selectOption('Collectibles');
 await page.locator('#marketCollectibleSubcategory').selectOption('sports_memorabilia');
 await expect(page.locator('#grid h3')).toHaveText(['Signed baseball jersey']);
 await page.locator('#marketClearFilters').click();
 await page.locator('#marketCategory').selectOption('Video Games');
 await expect(page.locator('#grid h3')).toHaveText(['Retro game cartridge']);
});

test('switching TCG game filters and searching never reveals a blocked collector',async({page})=>{
 await installFixture(page,[
  {id:'allowed-op',n:'Luffy card allowed',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:15,s:'collector',sellerId:'allowed-seller',cond:'Near Mint',e:'🃏'},
  {id:'blocked-op',n:'Luffy card blocked',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:5,s:'collector',sellerId:'blocked-seller',cond:'Near Mint',e:'🃏'},
  {id:'allowed-sports',n:'Baseball rookie allowed',c:'Trading Cards',game:'sports_cards',gameLabel:'Sports cards',p:40,s:'collector',sellerId:'sports-seller',cond:'Graded',e:'🃏'}
 ],['blocked-seller']);
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await page.locator('#marketGame').selectOption('one_piece');
 await page.locator('#search').fill('Luffy');
 await expect(page.locator('#grid h3')).toHaveText(['Luffy card allowed']);
 await page.locator('#search').fill('blocked');
 await expect(page.locator('#grid h3')).toHaveCount(0);
 await page.locator('#search').fill('');
 await page.locator('#marketGame').selectOption('sports_cards');
 await expect(page.locator('#grid h3')).toHaveText(['Baseball rookie allowed']);
});

test('Tanner: saved sports cards and memorabilia honor blocked sellers, price limits and sort order',async({page})=>{
 await installFixture(page,[
  {id:'tanner-graded',n:'PSA 10 rookie card',c:'Trading Cards',game:'sports_cards',p:95,s:'sports collector',sellerId:'tanner-sports',cond:'Graded',e:'🃏'},
  {id:'tanner-jersey',n:'Signed baseball jersey',c:'Collectibles',collectibleSubcategory:'sports_memorabilia',p:25,s:'memorabilia seller',sellerId:'tanner-memorabilia',cond:'Used',e:'🧢'},
  {id:'tanner-blocked',n:'Blocked graded rookie',c:'Trading Cards',game:'sports_cards',p:10,s:'blocked collector',sellerId:'blocked-sports',cond:'Graded',e:'🃏'},
  {id:'jayden-unsaved',n:'Unsaved Luffy card',c:'Trading Cards',game:'one_piece',p:5,s:'tcg collector',sellerId:'tcg-seller',cond:'Near Mint',e:'🃏'}
 ],['blocked-sports']);
 await page.evaluate(()=>{
  saved.clear();['tanner-graded','tanner-jersey','tanner-blocked'].forEach(id=>saved.add(id));
  document.getElementById('myFavorites').click();
 });
 await expect(page.locator('#market h2')).toHaveText('Saved items');
 await page.locator('#marketSort').selectOption('low');
 await expect(page.locator('#grid h3')).toHaveText(['Signed baseball jersey','PSA 10 rookie card']);
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketMaxPrice').fill('50');
 await expect(page.locator('#grid h3')).toHaveText(['Signed baseball jersey']);
 await page.locator('#marketClearFilters').click();
 await expect(page.locator('#grid h3')).toHaveText(['Signed baseball jersey','PSA 10 rookie card']);
 await expect(page.locator('#grid')).not.toContainText('Blocked graded rookie');
 await expect(page.locator('#grid')).not.toContainText('Unsaved Luffy card');
});

test('Jayden: saved TCG singles remain isolated from unsaved and blocked cards while switching games',async({page})=>{
 await installFixture(page,[
  {id:'saved-luffy',n:'Luffy playable single',c:'Trading Cards',game:'one_piece',p:12,s:'TCG seller',sellerId:'op-seller',cond:'Near Mint',e:'🃏'},
  {id:'saved-pokemon',n:'Charizard collection card',c:'Trading Cards',game:'pokemon',p:30,s:'TCG seller',sellerId:'pokemon-seller',cond:'Near Mint',e:'🃏'},
  {id:'unsaved-nami',n:'Nami playable single',c:'Trading Cards',game:'one_piece',p:5,s:'TCG seller',sellerId:'nami-seller',cond:'Near Mint',e:'🃏'},
  {id:'blocked-zoro',n:'Zoro card from blocked seller',c:'Trading Cards',game:'one_piece',p:1,s:'blocked collector',sellerId:'blocked-tcg',cond:'Near Mint',e:'🃏'}
 ],['blocked-tcg']);
 await page.evaluate(()=>{
  saved.clear();['saved-luffy','saved-pokemon','blocked-zoro'].forEach(id=>saved.add(id));
  document.getElementById('myFavorites').click();
 });
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await page.locator('#marketGame').selectOption('one_piece');
 await expect(page.locator('#grid h3')).toHaveText(['Luffy playable single']);
 await page.locator('#search').fill('Nami');
 await expect(page.locator('#grid h3')).toHaveCount(0);
 await page.locator('#search').fill('');
 await page.locator('#marketGame').selectOption('pokemon');
 await expect(page.locator('#grid h3')).toHaveText(['Charizard collection card']);
 await page.locator('#marketClearFilters').click();
 await expect(page.locator('#grid h3')).toHaveCount(2);
 await expect(page.locator('#grid')).not.toContainText('Zoro card from blocked seller');
 await expect(page.locator('#grid')).not.toContainText('Nami playable single');
});


test('Jayden can find exact card variants and language in seller descriptions without seeing blocked listings',async({page})=>{
 await installFixture(page,[
  {id:'op-japanese',n:'Monkey D. Luffy',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:95,s:'TCG seller',sellerId:'allowed-op',cond:'Near Mint',description:'Set: OP-17\\nVariant: Manga rare\\nLanguage: Japanese\\nEdition: First printing',e:'🃏'},
  {id:'op-english',n:'Monkey D. Luffy',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:8,s:'TCG seller',sellerId:'allowed-op',cond:'Played',description:'Set: OP-17\\nVariant: Regular\\nLanguage: English',e:'🃏'},
  {id:'op-blocked',n:'Monkey D. Luffy',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:1,s:'blocked seller',sellerId:'blocked-op',cond:'Near Mint',description:'Set: OP-17\\nVariant: Manga rare\\nLanguage: Japanese',e:'🃏'}
 ],['blocked-op']);
 await page.locator('#search').fill('japanese manga');
 await expect(page.locator('#grid [data-view]')).toHaveCount(1);
 await expect(page.locator('#grid [data-view="op-japanese"]')).toBeVisible();
 await page.locator('#search').fill('english regular');
 await expect(page.locator('#grid [data-view]')).toHaveCount(1);
 await expect(page.locator('#grid [data-view="op-english"]')).toBeVisible();
 await page.locator('#search').fill('near mint');
 await expect(page.locator('#grid [data-view]')).toHaveCount(1);
 await expect(page.locator('#grid [data-view="op-japanese"]')).toBeVisible();
 await page.locator('#search').fill('OP-17');
 await expect(page.locator('#grid [data-view]')).toHaveCount(2);
 await expect(page.locator('#grid [data-view="op-blocked"]')).toHaveCount(0);
});

test('gaming platform and hardware filters derive from seller choices and isolate categories',async({page})=>{
 await installFixture(page,[]);await page.evaluate(()=>{
  items=[{id:'switch',seller_id:'seller',title:'Switch game',description:'[Video Game]\nPlatform: Nintendo Switch',price:20,category:'video_games',condition:'used'},{id:'ps',seller_id:'seller',title:'PlayStation game',description:'Platform: PlayStation 5',price:30,category:'video_games',condition:'used'},...['consoles','controllers','accessories'].map((category,i)=>({id:category,seller_id:'seller',title:category,price:40+i,category,condition:'used'}))].map(row=>marketplaceItemFromRow(row,null));render();
 });
 await page.locator('#marketFilterToggle').click();await page.locator('#marketCategory').selectOption('Video Games');await expect(page.locator('#marketPlatformWrap')).toBeVisible();await page.locator('#marketPlatform').selectOption('Nintendo Switch');await expect(page.locator('#grid h3')).toHaveText(['Switch game']);
 const choices=await page.evaluate(()=>({seller:[...document.getElementById('gamePlatform').options].filter(o=>o.value).map(o=>o.value),filter:[...document.getElementById('marketPlatform').options].filter(o=>o.value!=='All').map(o=>o.value)}));expect(choices.filter).toEqual(choices.seller);
 await page.locator('#marketCategory').selectOption('Consoles & Controllers');await expect(page.locator('#marketPlatform')).toHaveValue('All');await expect(page.locator('#marketPlatformWrap')).toBeHidden();for(const type of ['consoles','controllers','accessories']){await page.locator('#marketHardwareType').selectOption(type);await expect(page.locator('#grid h3')).toHaveText([type])}
 await page.locator('#marketClearFilters').click();await expect(page.locator('#marketHardwareType')).toHaveValue('All');await expect(page.locator('#marketHardwareWrap')).toBeHidden();await expect(page.locator('#grid h3')).toHaveCount(5);await page.evaluate(()=>showHomePage());await page.locator('.elegant-tile-1').click();await expect(page.locator('#marketCategory')).toHaveValue('Collectibles');await expect(page.locator('#grid h3')).toHaveCount(0);
});

test('Kyle: All marketplace stays category-neutral, newest first, with price and sort available',async({page})=>{
 await installFixture(page,[
  {id:'older-tcg',n:'Older Pokemon listing',c:'Trading Cards',game:'pokemon',p:40,s:'seller',created_at:'2026-10-01T00:00:00Z',e:'🃏'},
  {id:'newer-console',n:'Newest console listing',c:'Consoles & Controllers',p:90,s:'seller',created_at:'2026-10-03T00:00:00Z',e:'🎮'},
  {id:'middle-figure',n:'Middle figure listing',c:'Collectibles',p:20,s:'seller',created_at:'2026-10-02T00:00:00Z',e:'🎎'}
 ]);
 await page.locator('#marketFilterToggle').click();
 await expect(page.locator('#marketCategory')).toHaveValue('All');
 await expect(page.locator('#marketSort')).toHaveValue('newest');
 for(const id of ['marketGameWrap','marketSportsBranch','marketCollectibleWrap','marketPlatformWrap','marketHardwareWrap']){
  await expect(page.locator('#'+id)).toBeHidden();
 }
 await expect(page.locator('#grid h3')).toHaveText(['Newest console listing','Middle figure listing','Older Pokemon listing']);
 await page.locator('#marketMaxPrice').fill('50');
 await expect(page.locator('#grid h3')).toHaveText(['Middle figure listing','Older Pokemon listing']);
 await page.locator('#marketSort').selectOption('low');
 await expect(page.locator('#grid h3')).toHaveText(['Middle figure listing','Older Pokemon listing']);
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await expect(page.locator('#marketGameWrap')).toBeVisible();
 await page.locator('#marketCategory').selectOption('All');
 await expect(page.locator('#marketGameWrap')).toBeHidden();
});

test('Tanner: progressive sports card filters work at every depth and reset cleanly',async({page})=>{
 await installFixture(page,[
  {id:'panini-football',n:'Panini football rookie',c:'Trading Cards',game:'sports_cards',p:30,s:'seller',description:'Sport: Football\nBrand: Panini\nYear: 2024\nPlayer: CeeDee Lamb',e:'🃏'},
  {id:'topps-football',n:'Topps football rookie',c:'Trading Cards',game:'sports_cards',p:25,s:'seller',description:'Sport: Football\nBrand: Topps\nYear: 2023\nPlayer: Other',e:'🃏'},
  {id:'panini-basketball',n:'Panini basketball rookie',c:'Trading Cards',game:'sports_cards',p:35,s:'seller',description:'Sport: Basketball\nBrand: Panini\nYear: 2024\nPlayer: Other',e:'🃏'}
 ]);
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await page.locator('#marketGame').selectOption('sports_cards');
 await expect(page.locator('#grid h3')).toHaveCount(3);
 await page.locator('#marketSport').selectOption('Football');
 await expect(page.locator('#grid h3')).toHaveCount(2);
 await page.locator('#marketSportsBrand').fill('Panini');
 await expect(page.locator('#grid h3')).toHaveText(['Panini football rookie']);
 await page.locator('#marketSportsYear').fill('2024');
 await page.locator('#marketSportsPlayer').fill('CeeDee');
 await expect(page.locator('#grid h3')).toHaveText(['Panini football rookie']);
 await page.locator('#marketClearFilters').click();
 await expect(page.locator('#marketSportsBranch')).toBeHidden();
 await expect(page.locator('#marketSportsYear')).toHaveValue('');
 await expect(page.locator('#marketSportsPlayer')).toHaveValue('');
 await expect(page.locator('#grid h3')).toHaveCount(3);
});

test('Kyle and Jayden: switching every marketplace category hides unrelated filters',async({page})=>{
 await installFixture(page,[
  {id:'all-tcg',n:'Pokemon card',c:'Trading Cards',game:'pokemon',p:12,s:'seller',e:'🃏'},
  {id:'all-game',n:'Switch game',c:'Video Games',p:25,s:'seller',e:'🎮'},
  {id:'all-console',n:'Game console',c:'Consoles & Controllers',p:80,s:'seller',e:'🎮'},
  {id:'all-collectible',n:'Anime figure',c:'Collectibles',collectibleSubcategory:'anime_manga',p:18,s:'seller',e:'🎎'}
 ]);
 await page.locator('#marketFilterToggle').click();
 const branches=[
  {category:'Trading Cards',visible:'marketGameWrap'},
  {category:'Video Games',visible:'marketPlatformWrap'},
  {category:'Consoles & Controllers',visible:'marketHardwareWrap'},
  {category:'Collectibles',visible:'marketCollectibleWrap'}
 ];
 const ids=branches.map(b=>b.visible);
 for(const branch of branches){
  await page.locator('#marketCategory').selectOption(branch.category);
  await expect(page.locator('#'+branch.visible)).toBeVisible();
  for(const id of ids.filter(id=>id!==branch.visible))await expect(page.locator('#'+id)).toBeHidden();
  await expect(page.locator('#grid h3')).toHaveCount(1);
 }
 await page.locator('#marketCategory').selectOption('All');
 for(const id of ids)await expect(page.locator('#'+id)).toBeHidden();
 await expect(page.locator('#grid h3')).toHaveCount(4);
});


test('All marketplace keeps category-specific filters hidden and combines minimum and maximum price',async({page})=>{
 await installFixture(page,[
  {id:'fixture-low',n:'Budget game',c:'Video Games',p:10,s:'fixture',cond:'Used',e:'🎮'},
  {id:'fixture-mid',n:'Midrange card',c:'Trading Cards',game:'pokemon',p:35,s:'fixture',cond:'Near Mint',e:'🃏'},
  {id:'fixture-high',n:'Premium figure',c:'Collectibles',p:100,s:'fixture',cond:'New',e:'🧸'}
 ]);
 await page.locator('#marketFilterToggle').click();
 await expect(page.locator('#marketGameWrap')).toBeHidden();
 await expect(page.locator('#marketCollectibleWrap')).toBeHidden();
 await expect(page.locator('#marketPlatformWrap')).toBeHidden();
 await page.locator('#marketMinPrice').fill('20');
 await page.locator('#marketMaxPrice').fill('50');
 await expect(page.locator('#grid h3')).toHaveText(['Midrange card']);
 await page.locator('#marketMinPrice').fill('60');
 await expect(page.locator('#grid h3')).toHaveCount(0);
 await page.locator('#marketClearFilters').click();
 await expect(page.locator('#marketMinPrice')).toHaveValue('');
 await expect(page.locator('#marketMaxPrice')).toHaveValue('');
 await expect(page.locator('#grid h3')).toHaveCount(3);
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await expect(page.locator('#marketGameWrap')).toBeVisible();
});

test('non-finite price inputs never hide otherwise matching listings',async({page})=>{
 await installFixture(page,[
  {id:'fixture-a',n:'Card A',c:'Trading Cards',game:'pokemon',p:20,s:'fixture',e:'🃏'},
  {id:'fixture-b',n:'Game B',c:'Video Games',p:60,s:'fixture',e:'🎮'}
 ]);
 // Number inputs sanitize Infinity and overflow to an empty string in browsers.
 // Override the getter to exercise the actual non-finite defensive branch.
 for(const id of ['marketMinPrice','marketMaxPrice']){
  await page.evaluate(id=>{
   const input=document.getElementById(id);
   Object.defineProperty(input,'value',{configurable:true,get:()=> '1e999'});
   try{render()}finally{delete input.value}
  },id);
  await expect(page.locator('#grid h3')).toHaveText(['Card A','Game B']);
 }
});

test('empty search recovery restores cards, games, hardware and collectibles and focuses search',async({page})=>{
 await installFixture(page,[
  {id:'card',n:'Sports card',c:'Trading Cards',game:'sports_cards',p:10,s:'fixture',e:'🃏'},
  {id:'game',n:'Retro game',c:'Video Games',p:20,s:'fixture',e:'🎮'},
  {id:'console',n:'Console',c:'Consoles & Controllers',p:30,s:'fixture',e:'🎮'},
  {id:'figure',n:'Figure',c:'Collectibles',p:40,s:'fixture',e:'⭐'}
 ]);
 await page.locator('#search').fill('No matching item');
 await expect(page.locator('#grid h3')).toHaveCount(0);
 await page.locator('[data-reset-market-search]').click();
 await expect(page.locator('#search')).toHaveValue('');
 await expect(page.locator('#search')).toBeFocused();
 await expect(page.locator('#grid h3')).toHaveText(['Sports card','Retro game','Console','Figure']);
});

test('empty-state recovery clears price filters while preserving Saved items scope',async({page})=>{
 await installFixture(page,[
  {id:'saved-game',n:'Saved retro game',c:'Video Games',p:20,s:'fixture',e:'🎮'},
  {id:'other-card',n:'Unsaved card',c:'Trading Cards',p:10,s:'fixture',e:'🃏'}
 ]);
 await page.evaluate(()=>{saved.add('saved-game');onlySavedListings=true;render()});
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketMinPrice').fill('500');
 await page.locator('[data-reset-market-search]').click();
 await expect(page.locator('#marketMinPrice')).toHaveValue('');
 await expect(page.locator('#market h2')).toHaveText('Saved items');
 await expect(page.locator('#grid h3')).toHaveText(['Saved retro game']);
});

test('global marketplace search opens results from Inbox and Profile instead of silently doing nothing',async({page})=>{
 await installFixture(page,[
  {id:'fixture-game',n:'Retro game cartridge',c:'Video Games',p:30,s:'Jayden',cond:'Used',e:'🎮'},
  {id:'fixture-card',n:'Graded baseball rookie',c:'Trading Cards',game:'sports_cards',p:80,s:'Tanner',cond:'Graded',e:'🃏'}
 ]);
 for(const section of ['inboxPage','collectorPage']){
  await page.evaluate(section=>{
   document.body.classList.remove('deckplay-home','deckplay-market','inbox-focus','profile-focus');
   document.body.classList.add(section==='inboxPage'?'inbox-focus':'profile-focus');
   document.querySelectorAll('main > section,main > aside').forEach(el=>el.hidden=true);
   document.getElementById(section).hidden=false;
  },section);
  await page.locator('#search').fill(section==='inboxPage'?'retro':'baseball');
  await expect(page.locator('#market')).toBeVisible();
  await expect(page.locator('#'+section)).toBeHidden();
  await expect(page.locator('#grid h3')).toHaveText([section==='inboxPage'?'Retro game cartridge':'Graded baseball rookie']);
 }
});
