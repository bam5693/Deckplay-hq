const {test,expect}=require('@playwright/test');

// Local desktop/mobile fixture: verifies activity copy without spending real
// staging API calls or modifying customer/synthetic notification records.
for(const [device,viewport] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
 test.describe('Activity asking-price clarity — '+device,()=>{
  test.use({viewport});
  test('favorite price drop and wanted match show current asking price, never a fabricated discount',async({page})=>{
   await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
   await page.route('https://*.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
   await page.goto('/');
   await page.evaluate(async()=>{
    currentUser={id:'price-fixture-buyer'};
    const notifications=[
     {id:'price-fixture-1',actor_id:'price-fixture-seller',kind:'favorite_price_drop',source_id:'price-fixture-listing',created_at:'2026-10-29T12:00:00Z',read_at:null},
     {id:'price-fixture-2',actor_id:'price-fixture-seller',kind:'wanted_match',source_id:'price-fixture-listing',created_at:'2026-10-29T11:00:00Z',read_at:null}
    ];
    supabaseClient.from=table=>{
     const data=table==='collector_notifications'?notifications:table==='profiles'?[{id:'price-fixture-seller',username:'collector'}]:table==='listings'?[{id:'price-fixture-listing',title:'Mixed card lot',price:18.75}]:[];
     const query={select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return Promise.resolve({data,error:null})},then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject)}};
     return query;
    };
    await loadNotificationCenter();
   });
   const alerts=page.locator('#notificationList');
   await expect(alerts.locator('[data-notification-kind="favorite_price_drop"]')).toContainText('current asking price $18.75');
   await expect(alerts.locator('[data-notification-kind="wanted_match"]')).toContainText('Mixed card lot for $18.75');
   await expect(page.locator('#inboxNotificationList')).toContainText('current asking price $18.75');
   await expect(alerts).not.toContainText('NaN');
   expect(await page.evaluate(()=>[notificationListingPrice(null),notificationListingPrice('bad'),notificationListingPrice(-1),notificationListingPrice(0)])).toEqual(['','','','$0.00']);
  });
 });
}
