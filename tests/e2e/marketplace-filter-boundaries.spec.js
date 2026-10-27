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
   blocked:[...blockedCollectorIds]
  };
  items=listings;query='';cat='All';filter='All';game='All';
  onlyMyListings=false;onlySavedListings=false;
  blockedCollectorIds.clear();blocked.forEach(id=>blockedCollectorIds.add(id));
  document.getElementById('search').value='';
  document.getElementById('marketCategory').value='All';
  document.getElementById('marketGame').value='All';
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
  document.getElementById('search').value=query;
  document.getElementById('marketCategory').value=cat;
  document.getElementById('marketGame').value=game;
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
