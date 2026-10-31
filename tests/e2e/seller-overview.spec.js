const {test,expect}=require('@playwright/test');
async function ready(page){await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));await page.goto('/');await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await supabaseClient.auth.getSession();currentUser={id:'overview-owner'};syncInboxDraftUser();document.getElementById('collectorPage').hidden=false;window.overviewCalls=0;window.mockPausedCount=2;window.mockPausedFailure=false;supabaseClient.from=table=>{if(table!=='listings')throw Error('Unexpected table '+table);return {select:(keys,options)=>{if(keys!=='id'||!options?.head||options.count!=='exact')throw Error('Paused status count must be exact and head-only');return {eq:(field,value)=>{if(field!=='seller_id'||value!==currentUser?.id)throw Error('Count must be scoped to signed-in seller');return {eq:(status,paused)=>{if(status!=='status'||paused!=='paused')throw Error('Only paused stock allowed');return Promise.resolve(window.mockPausedFailure?{error:{message:'Query unavailable'}}:{count:window.mockPausedCount,error:null})}}}}}}};supabaseClient.rpc=async()=>{overviewCalls++;return {data:{active:12,reserved:2,sold:4,removed:1,active_asking_total:125.50,price_replies:3,trade_replies:1}}}})}
test('seller overview loads on demand and distinguishes asking value from earnings',async({page})=>{
 await ready(page);expect(await page.evaluate(()=>overviewCalls)).toBe(0);await page.locator('#sellerOverview summary').click();await expect(page.locator('.seller-overview-stats dd')).toHaveText(['12','2','2','4','1','3','1']);await expect(page.locator('.seller-asking-total')).toContainText('$125.50');await expect(page.locator('#sellerOverviewContent')).toContainText('not earnings');await expect(page.locator('#sellerOverviewContent')).toContainText('Deleted listings are excluded');await page.locator('[data-seller-overview="refresh"]').click();expect(await page.evaluate(()=>overviewCalls)).toBe(2);
});
test('a stale seller overview cannot show private totals after an account switch',async({page})=>{
 await ready(page);await page.evaluate(()=>supabaseClient.rpc=()=>new Promise(resolve=>window.finishOverview=resolve));await page.locator('#sellerOverview summary').click();await expect(page.locator('#sellerOverviewContent')).toContainText('Loading');await page.evaluate(()=>{currentUser={id:'other-account'};syncInboxDraftUser();finishOverview({data:{active:999,reserved:0,sold:0,removed:0,active_asking_total:99999,price_replies:0,trade_replies:0}})});await expect(page.locator('#sellerOverview')).not.toHaveAttribute('open');await expect(page.locator('#sellerOverviewContent')).toBeEmpty();
});
test('seller overview failure stays retryable without inventing totals',async({page})=>{
 await ready(page);await page.evaluate(()=>supabaseClient.rpc=async()=>({error:{message:'Unavailable'}}));await page.locator('#sellerOverview summary').click();await expect(page.locator('#sellerOverviewContent')).toContainText('could not load');await expect(page.locator('.seller-overview-stats')).toHaveCount(0);await expect(page.locator('[data-seller-overview="refresh"]')).toBeEnabled();
});

test('seller can open pending price and trade decisions directly from the overview',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{window.openModal=id=>{window.overviewOpenedModal=id};window.loadPriceOffers=async()=>{window.overviewPriceLoaded=true};window.loadTradeOffers=async()=>{window.overviewTradesLoaded=true}});
 await page.locator('#sellerOverview summary').click();
 await expect(page.locator('[data-seller-overview="price"]')).toHaveText('Review 3 price offers');
 await expect(page.locator('[data-seller-overview="trade"]')).toHaveText('Review 1 trade proposal');
 await page.locator('[data-seller-overview="price"]').click();
 await expect.poll(()=>page.evaluate(()=>[window.overviewOpenedModal,!!window.overviewPriceLoaded])).toEqual(['priceOffersModal',true]);
 await page.locator('[data-seller-overview="trade"]').click();
 await expect.poll(()=>page.evaluate(()=>[window.overviewOpenedModal,!!window.overviewTradesLoaded])).toEqual(['tradesModal',true]);
 await expect(page.locator('[data-seller-overview="inbox"]')).toBeVisible();
});
test('seller overview hides reply shortcuts when there is nothing to answer',async({page})=>{
 await ready(page);
 await page.evaluate(()=>supabaseClient.rpc=async()=>({data:{active:1,reserved:0,sold:0,removed:0,active_asking_total:20,price_replies:0,trade_replies:0}}));
 await page.locator('#sellerOverview summary').click();
 await expect(page.locator('[data-seller-overview="price"]')).toHaveCount(0);
 await expect(page.locator('[data-seller-overview="trade"]')).toHaveCount(0);
 await expect(page.locator('[data-seller-overview="inbox"]')).toBeVisible();
});

test('paused stock is clearly counted and opens the matching seller inventory filter',async({page})=>{
 await ready(page);await page.locator('#sellerOverview summary').click();
 await expect(page.locator('#sellerOverviewContent')).toContainText('Paused listings');
 await expect(page.locator('[data-seller-overview="paused"]')).toHaveText('Manage 2 paused listings');
 await page.evaluate(()=>{const host=document.createElement('div');host.innerHTML='<select id="inventoryStatus"><option value="active">Active</option><option value="paused">Paused</option></select><input id="inventorySearch" aria-label="Search inventory">';document.getElementById('collectorPage').append(host)});
 await page.locator('#inventoryStatus').selectOption('active');
 await page.locator('[data-seller-overview="paused"]').click();
 await expect(page.locator('#inventoryStatus')).toHaveValue('paused');
 await expect(page.locator('#inventorySearch')).toBeFocused();
});
test('paused zero stock has no dead shortcut and unavailable counts are never fabricated',async({page})=>{
 await ready(page);await page.evaluate(()=>{mockPausedCount=0});
 await page.locator('#sellerOverview summary').click();
 await expect(page.locator('[data-seller-overview="paused"]')).toHaveCount(0);
 await expect(page.locator('.seller-overview-stats dd').nth(1)).toHaveText('0');
 await page.evaluate(()=>{mockPausedFailure=true});
 await page.locator('[data-seller-overview="refresh"]').click();
 await expect(page.locator('#sellerOverviewContent')).toContainText('could not load');
 await expect(page.locator('.seller-overview-stats')).toHaveCount(0);
});
