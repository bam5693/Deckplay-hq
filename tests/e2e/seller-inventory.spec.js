const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'inventory-owner'};syncInboxDraftUser();
  window.inventoryRows=['trading_cards','video_games','consoles','controllers','accessories','collectibles','other'].map((category,i)=>({id:'inventory-'+i,title:['Magic single','Nintendo game','Console bundle','Controller','Accessory cable','Sports memorabilia','Other collectible'][i],price:10+i,status:i===2?'reserved':i===5?'sold':'active',category,image_urls:[]}));
  window.inventoryUpdates=[];
  supabaseClient.from=table=>{
   let updating=false;const q={then:(resolve,reject)=>Promise.resolve({data:table==='profiles'?{username:'Tanner'}:table==='listings'?(updating?null:inventoryRows):[],error:null}).then(resolve,reject)};
   for(const method of ['select','order','limit','in','eq','is','maybeSingle'])q[method]=(...args)=>{if(updating)inventoryUpdates.push([method,...args]);return q};
   q.update=changes=>{updating=true;inventoryUpdates.push(['update',changes]);return q};return q;
  };
  await showCollectorPage();
 });
});
test('inventory filters cover cards, games, hardware and collectibles and persist across tabs',async({page})=>{
 await expect(page.locator('[data-inventory-search]:visible')).toHaveCount(7);
 await page.locator('#inventoryStatus').selectOption('active');await expect(page.locator('[data-inventory-search]:visible')).toHaveCount(5);
 await page.locator('#inventoryCategory').selectOption('accessories');await expect(page.locator('[data-inventory-search]:visible')).toHaveCount(1);await expect(page.locator('#profilePageContent')).toContainText('Accessory cable');
 await page.locator('#inventorySearch').fill('missing card');await expect(page.locator('[data-inventory-summary]')).toContainText('No listings match');
 await page.locator('[data-inventory-clear]').click();await page.locator('#inventorySearch').fill('Controller');
 await page.evaluate(()=>showCollectorPage('wanted'));await page.evaluate(()=>showCollectorPage('listings'));
 await expect(page.locator('#inventorySearch')).toHaveValue('Controller');await expect(page.locator('[data-inventory-search]:visible')).toHaveCount(1);
 await page.evaluate(()=>{currentUser={id:'new-owner'};syncInboxDraftUser()});await page.evaluate(()=>showCollectorPage());await expect(page.locator('#inventorySearch')).toHaveValue('');
});
test('profile inventory links use the existing editor and active listing detail',async({page})=>{
 await page.evaluate(()=>{window.openedInventory=[];listingEditor.open=async id=>openedInventory.push(['edit',id]);navigateDeckplayNotification=async(kind,actor,id)=>openedInventory.push(['view',id])});
 await page.locator('[data-profile-edit="inventory-1"]').click();await page.locator('[data-profile-view="inventory-1"]').click();
 expect(await page.evaluate(()=>openedInventory)).toEqual([['edit','inventory-1'],['view','inventory-1']]);
 await expect(page.locator('[data-profile-edit="inventory-2"]')).toHaveCount(0);await expect(page.locator('[data-page-sold="inventory-2"]')).toHaveCount(0);
});
test('a reserved listing cannot be overwritten by stale profile Mark sold',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());await page.locator('[data-page-sold="inventory-1"]').click();
 await expect(page.locator('[data-page-sold="inventory-1"]')).toBeEnabled();
 expect(await page.evaluate(()=>inventoryUpdates)).toContainEqual(['eq','status','active']);
 await expect(page.locator('#profilePageContent')).toContainText('Nintendo game');
 await expect(page.locator('#toast')).toContainText('This listing changed or was reserved');
});

for(const action of ['sold','delete'])test('marketplace My Listings '+action+' rejects stale reserved inventory without false success',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.evaluate(()=>{
  items=[{id:'synthetic-active-item',databaseId:'synthetic-active-item',sellerId:'inventory-owner',n:'TEST ONLY synthetic game',c:'Video Games',p:25,cond:'Used',s:'Test seller',imageUrls:[]}];
  cat='All';filter='All';game='All';query='';onlyMyListings=true;onlySavedListings=false;listingSource='live';
  window.marketplaceSellerWrites=[];
  supabaseClient.from=()=>{const request={
   delete:()=>{marketplaceSellerWrites.push('delete');return request},
   update:changes=>{marketplaceSellerWrites.push(['update',changes]);return request},
   eq:(key,value)=>{marketplaceSellerWrites.push(['eq',key,value]);return request},
   select:()=>request,
   maybeSingle:async()=>({data:null,error:null})
  };return request};
  showMainMarketplace();render();
 });
 const button=page.locator('#grid [data-'+(action==='delete'?'delete-listing':'sold')+'="synthetic-active-item"]');
 await button.click();
 await expect(page.locator('#toast')).toContainText('This listing changed, was reserved, or is no longer active');
 await expect(button).toBeEnabled();
 const filters=await page.evaluate(()=>marketplaceSellerWrites.filter(x=>Array.isArray(x)&&x[0]==='eq'));
 expect(filters).toEqual(expect.arrayContaining([['eq','seller_id','inventory-owner'],['eq','status','active']]));
});
