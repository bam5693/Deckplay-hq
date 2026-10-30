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
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
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
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
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
