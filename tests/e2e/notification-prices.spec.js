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
    await supabaseClient.auth.getSession();currentUser={id:'price-fixture-buyer'};syncInboxDraftUser();
    const notifications=[
     {id:'price-fixture-1',actor_id:'price-fixture-seller',kind:'favorite_price_drop',source_id:'price-fixture-listing',created_at:'2026-10-29T12:00:00Z',read_at:null},
     {id:'price-fixture-2',actor_id:'price-fixture-seller',kind:'wanted_match',source_id:'price-fixture-listing',created_at:'2026-10-29T11:00:00Z',read_at:null},
     {id:'price-fixture-3',actor_id:'price-fixture-seller',kind:'favorite_price_drop',source_id:'price-fixture-sold',created_at:'2026-10-29T10:00:00Z',read_at:null}
    ];
    supabaseClient.from=table=>{
     const data=table==='collector_notifications'?notifications:table==='profiles'?[{id:'price-fixture-seller',username:'collector'}]:table==='listings'?[{id:'price-fixture-listing',title:'Mixed card lot',price:18.75,status:'active'},{id:'price-fixture-sold',title:'Sold controller',price:40,status:'sold'}]:[];
     const query={select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return Promise.resolve({data,error:null})},then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject)}};
     return query;
    };
    await loadNotificationCenter();
   });
   const alerts=page.locator('#notificationList');
   await expect(alerts.locator('[data-notification-kind="favorite_price_drop"][data-notification-source="price-fixture-listing"]')).toContainText('current asking price $18.75');
   await expect(alerts.locator('[data-notification-kind="wanted_match"]')).toContainText('Mixed card lot for $18.75');
   await expect(page.locator('#inboxNotificationList')).toContainText('current asking price $18.75');
   const stale=alerts.locator('[data-notification-kind="favorite_price_drop"][data-notification-source="price-fixture-sold"]');
   await expect(stale).toContainText('Sold controller');
   await expect(stale).not.toContainText('$40.00');
   await expect(alerts).not.toContainText('NaN');
   expect(await page.evaluate(()=>[notificationListingPrice(null),notificationListingPrice('bad'),notificationListingPrice(-1),notificationListingPrice(0)])).toEqual(['','','','$0.00']);
  });
 });
}

for(const [device,viewport] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
 test.describe('T4.3 stale discovery alert recovery — '+device,()=>{
  test.use({viewport});
  test('expired listing alert opens an unblocked seller storefront but never a blocked seller',async({page})=>{
   await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
   await page.route('https://*.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
   await page.goto('/');
   const result=await page.evaluate(async()=>{
    currentUser={id:'stale-alert-buyer'};
    blockedCollectorIds.clear();
    const visited=[],notices=[];
    const originalFrom=supabaseClient.from,originalProfile=showPublicProfile,originalToast=toast;
    try{
     supabaseClient.from=()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:null})});
     showPublicProfile=async id=>{visited.push(id);return 'ready'};
     toast=message=>notices.push(message);
     await navigateDeckplayNotification('favorite_price_drop','seller-with-current-stock','removed-listing');
     blockedCollectorIds.add('blocked-seller');
     await navigateDeckplayNotification('wanted_match','blocked-seller','removed-listing');
     return {visited,notices};
    }finally{
     supabaseClient.from=originalFrom;showPublicProfile=originalProfile;toast=originalToast;
     blockedCollectorIds.clear();
    }
   });
   expect(result.visited).toEqual(['seller-with-current-stock']);
   expect(result.notices).toHaveLength(2);
   expect(result.notices[0]).toContain("Showing the seller's current listings");
   expect(result.notices[1]).toContain('no longer available');
  });
 });
}
