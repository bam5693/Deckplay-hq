const {test,expect}=require('@playwright/test');

// Local-only, no listings are created or changed in Supabase.
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
});

test('Charles and Kyle: failed live inventory never displays synthetic demo merchandise and retry recovers',async({page})=>{
 await page.evaluate(async()=>{
  const original=supabaseClient.from;
  supabaseClient.from=table=>table==='listings'
   ?{select:()=>({eq:()=>({order:async()=>({data:null,error:{message:'synthetic unavailable'}})})})}
   :original(table);
  try{await loadListings()}finally{supabaseClient.from=original}
 });
 await expect(page.locator('#grid [data-view]')).toHaveCount(0);
 await expect(page.locator('#grid')).toContainText('Live listings could not load');
 await expect(page.locator('#grid [data-retry-marketplace]')).toBeVisible();
 await expect(page.locator('#count')).toContainText('unavailable');
 await page.evaluate(()=>{
  window.__originalMarketplaceFrom=supabaseClient.from;
  supabaseClient.from=table=>table==='listings'
   ?{select:()=>({eq:()=>({order:async()=>({data:[],error:null})})})}
   :window.__originalMarketplaceFrom(table);
 });
 await page.locator('#grid [data-retry-marketplace]').click();
 await expect(page.locator('#grid [data-retry-marketplace]')).toHaveCount(0);
 await expect(page.locator('#count')).toContainText('0 live listing(s) shown');
 await expect(page.locator('#grid [data-view]')).toHaveCount(0);
 await page.evaluate(()=>{supabaseClient.from=window.__originalMarketplaceFrom;delete window.__originalMarketplaceFrom});
});

test('Tanner and Jayden: offline listing requests offer retry instead of pretending collectibles are for sale',async({page})=>{
 await page.evaluate(async()=>{
  const original=supabaseClient.from;
  supabaseClient.from=table=>table==='listings'
   ?{select:()=>({eq:()=>({order:async()=>{throw Error('synthetic offline')}})})}
   :original(table);
  try{await loadListings()}finally{supabaseClient.from=original}
 });
 await expect(page.locator('#grid [data-view]')).toHaveCount(0);
 await expect(page.locator('#grid')).toContainText('No demo items are shown');
 await expect(page.locator('#grid [data-retry-marketplace]')).toBeEnabled();
});

test('T1.2/T7.5: empty live inventory offers Wanted and private feedback, never fake listings',async({page})=>{
 await page.evaluate(async()=>{
  const original=supabaseClient.from;
  supabaseClient.from=table=>table==='listings'
   ?{select:()=>({eq:()=>({order:async()=>({data:[],error:null})})})}
   :original(table);
  try{await loadListings()}finally{supabaseClient.from=original}
 });
 await expect(page.locator('#grid [data-view]')).toHaveCount(0);
 await expect(page.locator('#grid [data-wanted-from-search]')).toBeVisible();
 await expect(page.locator('#grid [data-market-search-feedback="empty"]')).toBeVisible();
 await page.locator('#grid [data-market-search-feedback="empty"]').click();
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportSignIn')).toBeVisible();
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await page.locator('#supportClose').click();
 await page.locator('#grid [data-wanted-from-search]').click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
});
