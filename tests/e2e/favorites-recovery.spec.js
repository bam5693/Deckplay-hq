const {test,expect}=require('@playwright/test');
async function fixture(page,selected=false){
 await page.route('https://**/*',r=>r.abort());await page.goto('/');await page.evaluate(async selected=>{
  await supabaseClient.auth.getSession();currentUser={id:'first-buyer'};syncInboxDraftUser();saved.clear();if(selected)saved.add('favorite-item');window.favoriteWrites=[];window.favoriteToasts=[];toast=message=>favoriteToasts.push(message);
  supabaseClient.from=()=>{const wait=()=>new Promise((resolve,reject)=>{favoriteWrites.push(true);window.finishFavorite=resolve;window.failFavorite=reject});const q={eq:()=>q,insert:wait,delete:()=>q,then:(a,b)=>wait().then(a,b)};return q};
  items=[{id:'favorite-item',databaseId:'favorite-item',n:'TEST ONLY game',c:'Video Games',p:25,s:'seller',sellerId:'seller',cond:'Used',imageUrls:[]}];cat='All';filter='All';game='All';query='';onlyMyListings=false;onlySavedListings=false;showMainMarketplace();render();
 },selected);
}
test('repeated favorite taps submit once and show a busy control until the request finishes',async({page})=>{
 await fixture(page);await page.locator('[data-heart]').click();await expect(page.locator('[data-heart]')).toBeDisabled();await page.locator('[data-heart]').evaluate(b=>b.click());expect(await page.evaluate(()=>favoriteWrites.length)).toBe(1);await page.evaluate(()=>finishFavorite({error:null}));await expect(page.locator('[data-heart]')).toBeEnabled();await expect(page.locator('[data-heart]')).toHaveText('♥');
});
test('a rejected favorite removal from the previous account cannot populate the new account saved items',async({page})=>{
 await fixture(page,true);await page.locator('[data-heart]').click();await page.evaluate(()=>{currentUser={id:'second-buyer'};syncInboxDraftUser();saved.clear();render();finishFavorite({error:{message:'Old account request failed'}})});await expect.poll(()=>page.evaluate(()=>[...saved])).toEqual([]);expect(await page.evaluate(()=>favoriteToasts)).toEqual([]);
});
test('transport failure preserves the earlier favorite state and permits a safe retry',async({page})=>{
 await fixture(page);await page.locator('[data-heart]').click();await page.evaluate(()=>failFavorite(Error('Network unavailable')));await expect(page.locator('[data-heart]')).toBeEnabled();await expect(page.locator('[data-heart]')).toHaveText('♡');await page.locator('[data-heart]').click();await expect.poll(()=>page.evaluate(()=>favoriteWrites.length)).toBe(2);await page.evaluate(()=>finishFavorite({error:{code:'23505',message:'Already saved'}}));await expect(page.locator('[data-heart]')).toHaveText('♥');
});

test('saved-item refresh keeps the same account favorites on failure and reconciles on retry',async({page})=>{
 await fixture(page,true);
 await page.evaluate(()=>{
  resetSavedListingsForAccount('first-buyer');saved.add('favorite-item');
  window.savedReadQueue=[];
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({error:{message:'Offline'}}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 expect(await page.evaluate(()=>[...saved])).toEqual(['favorite-item']);
 await page.evaluate(()=>{window.savedRetryDone=false;loadSavedListings().then(()=>savedRetryDone=true)});
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[{listing_id:'other-saved-item'}],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRetryDone)).toBe(true);
 expect(await page.evaluate(()=>[...saved])).toEqual(['other-saved-item']);
});
test('account switch immediately clears prior saves despite a pending refresh and slow block lookup',async({page})=>{
 await fixture(page,true);
 await page.evaluate(()=>{
  resetSavedListingsForAccount('first-buyer');saved.add('favorite-item');
  window.savedReadQueue=[];
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.oldSavedRefresh=loadSavedListings();
  loadBlockedCollectors=()=>new Promise(()=>{}); // Simulate delayed privacy preflight.
  applyDeckplayAuthSession('SIGNED_IN',{user:{id:'second-buyer',user_metadata:{}}});
 });
 expect(await page.evaluate(()=>[...saved])).toEqual([]);
 await page.evaluate(()=>savedReadQueue.shift()({data:[{listing_id:'favorite-item'}],error:null}));
 await expect.poll(()=>page.evaluate(()=>[...saved])).toEqual([]);
});

test('a saved-items refresh cannot erase an optimistic favorite while its write is pending',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>resetSavedListingsForAccount('first-buyer'));
 await page.locator('[data-heart]').click();
 await page.evaluate(()=>{
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  window.savedReadQueue=[];readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 await expect(page.locator('[data-heart]')).toHaveText('♥');
 await page.evaluate(()=>finishFavorite({error:null}));
 await expect(page.locator('[data-heart]')).toBeEnabled();
 await expect(page.locator('[data-heart]')).toHaveText('♥');
});

test('a stale saved-items read cannot undo a confirmed save after its write completes',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>resetSavedListingsForAccount('first-buyer'));
 await page.locator('[data-heart]').click();
 await page.evaluate(()=>{
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  window.savedReadQueue=[];readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>finishFavorite({error:null}));
 await expect(page.locator('[data-heart]')).toBeEnabled();
 await page.evaluate(()=>savedReadQueue.shift()({data:[],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 await expect(page.locator('[data-heart]')).toHaveText('♥');
});

test('a saved-items refresh does not resurrect an item being unsaved',async({page})=>{
 await fixture(page,true);
 await page.evaluate(()=>{resetSavedListingsForAccount('first-buyer');saved.add('favorite-item');render()});
 await page.locator('[data-heart]').click();
 await page.evaluate(()=>{
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  window.savedReadQueue=[];readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[{listing_id:'favorite-item'}],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 await expect(page.locator('[data-heart]')).toHaveText('♡');
 await page.evaluate(()=>finishFavorite({error:null}));
 await expect(page.locator('[data-heart]')).toBeEnabled();
 await expect(page.locator('[data-heart]')).toHaveText('♡');
});

test('an old account pending save never enters a new account saved-list refresh',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>resetSavedListingsForAccount('first-buyer'));
 await page.locator('[data-heart]').click();
 await page.evaluate(()=>{
  currentUser={id:'second-buyer'};resetSavedListingsForAccount('second-buyer');render();
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  window.savedReadQueue=[];readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.savedRefreshDone=false;loadSavedListings().then(()=>savedRefreshDone=true);
 });
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[],error:null}));
 await expect.poll(()=>page.evaluate(()=>savedRefreshDone)).toBe(true);
 expect(await page.evaluate(()=>[...saved])).toEqual([]);
 await page.evaluate(()=>finishFavorite({error:null}));
 expect(await page.evaluate(()=>[...saved])).toEqual([]);
});

test('saved marketplace keeps previous favorites visible offline and retries only the saved read',async({page})=>{
 await fixture(page,true);
 await page.evaluate(()=>{
  resetSavedListingsForAccount('first-buyer');saved.add('favorite-item');onlySavedListings=true;render();
  window.savedReadQueue=[];
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.firstSavedRead=loadSavedListings();
 });
 await expect(page.locator('#grid')).toContainText('Refreshing your saved items');
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({error:{message:'Offline'}}));
 await page.evaluate(()=>firstSavedRead);
 await expect(page.locator('#grid [data-retry-saved-listings]')).toBeVisible();
 await expect(page.locator('#grid')).toContainText('Showing your previous saves for this account');
 await expect(page.locator('#grid [data-heart]')).toHaveText('♥');
 await page.locator('#grid [data-retry-saved-listings]').click();
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[{listing_id:'favorite-item'}],error:null}));
 await expect(page.locator('#grid [data-retry-saved-listings]')).toHaveCount(0);
 await expect(page.locator('#grid [data-heart]')).toHaveText('♥');
});

test('an offline empty saved view does not falsely claim there are no favorites',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  resetSavedListingsForAccount('first-buyer');onlySavedListings=true;render();
  window.savedReadQueue=[];
  supabaseClient.from=()=>({select:()=>({eq:()=>({})})});
  readMarketplaceRequest=()=>new Promise(resolve=>savedReadQueue.push(resolve));
  window.firstSavedRead=loadSavedListings();
 });
 await expect(page.locator('#grid')).toContainText('Loading your saved items');
 await page.evaluate(()=>savedReadQueue.shift()({error:{message:'Offline'}}));
 await page.evaluate(()=>firstSavedRead);
 await expect(page.locator('#grid')).toContainText('Could not refresh your saved items');
 await expect(page.locator('#grid')).not.toContainText('No saved items to show yet');
 await page.locator('#grid [data-retry-saved-listings]').click();
 await expect.poll(()=>page.evaluate(()=>savedReadQueue.length)).toBe(1);
 await page.evaluate(()=>savedReadQueue.shift()({data:[],error:null}));
 await expect(page.locator('#grid')).toContainText('No saved items to show yet');
});

test('saved profile tab offers an inline retry after an offline read',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  window.profileSavedReads=0;sellerRatingHtml=async()=>'';
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,in:()=>q,then:(resolve,reject)=>{
    const response=table==='saved_listings'?(++profileSavedReads===1?{data:null,error:{message:'Offline'}}:{data:[{listing_id:'favorite-item'}],error:null}):table==='listings'?{data:[{id:'favorite-item',title:'TEST ONLY game',price:25,status:'active',seller_id:'seller',image_urls:[]}],error:null}:{data:[],error:null};
    return Promise.resolve(response).then(resolve,reject);
   }};
   q.maybeSingle=async()=>({data:{username:'jayden'},error:null});
   return q;
  };
  return showCollectorPage('saved');
 });
 await expect(page.locator('#profilePageContent')).toContainText('Your saved items could not load');
 await expect(page.locator('[data-retry-profile-saved]')).toBeVisible();
 await page.locator('[data-retry-profile-saved]').click();
 await expect(page.locator('#profilePageContent')).toContainText('TEST ONLY game');
 await expect(page.locator('[data-retry-profile-saved]')).toHaveCount(0);
 expect(await page.evaluate(()=>profileSavedReads)).toBe(2);
});

test('saved profile fails closed if blocked collectors cannot be checked',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  window.privateSavedReads=0;sellerRatingHtml=async()=>'';
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,in:()=>q,then:(resolve,reject)=>{
    if(table==='saved_listings')privateSavedReads++;
    const response=table==='user_blocks'?{data:null,error:{message:'Offline'}}:table==='saved_listings'?{data:[{listing_id:'private-card'}],error:null}:table==='listings'?{data:[{id:'private-card',title:'Blocked seller sports card',price:80,status:'active',seller_id:'blocked-seller',image_urls:[]}],error:null}:{data:[],error:null};
    return Promise.resolve(response).then(resolve,reject);
   }};
   q.maybeSingle=async()=>({data:{username:'jayden'},error:null});
   return q;
  };
  return showCollectorPage('saved');
 });
 await expect(page.locator('#profilePageContent')).toContainText('Could not verify blocked collectors');
 await expect(page.locator('#profilePageContent')).not.toContainText('Blocked seller sports card');
 await expect(page.locator('[data-retry-profile-saved]')).toBeVisible();
 expect(await page.evaluate(()=>privateSavedReads)).toBe(0);
});

test('Saved profile does not lose valid favorites when a global block refresh overlaps its privacy preflight',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{
  sellerRatingHtml=async()=>'';window.blockReadCalls=0;window.blockOwners=[];
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:(field,value)=>{if(table==='user_blocks')blockOwners.push([field,value]);return q},in:()=>q,order:()=>q,
    maybeSingle:async()=>({data:{username:'Jayden'},error:null}),
    then:(resolve,reject)=>{
     if(table==='user_blocks'){
      blockReadCalls++;
      if(blockReadCalls===1)return new Promise(done=>{window.finishGlobalBlock=()=>done({data:[],error:null})}).then(resolve,reject);
      return Promise.resolve({data:[{blocked_id:'bad-seller'}],error:null}).then(resolve,reject);
     }
     if(table==='saved_listings')return Promise.resolve({data:[{listing_id:'safe-id'},{listing_id:'blocked-id'}],error:null}).then(resolve,reject);
     if(table==='listings')return Promise.resolve({data:[
      {id:'safe-id',title:'TEST ONLY sports card',seller_id:'good-seller',status:'active',image_urls:[],price:15},
      {id:'blocked-id',title:'PRIVATE BLOCKED CARD',seller_id:'bad-seller',status:'active',image_urls:[],price:10}
     ],error:null}).then(resolve,reject);
     return Promise.resolve({data:[],error:null}).then(resolve,reject);
    }};
   return q;
  };
  window.globalBlockRefresh=loadBlockedCollectors(); // Global refresh remains unresolved.
  await showCollectorPage('saved'); // Saved must use its own account-scoped privacy result.
 });
 await expect(page.locator('#profilePageContent')).toContainText('TEST ONLY sports card');
 await expect(page.locator('#profilePageContent')).not.toContainText('PRIVATE BLOCKED CARD');
 expect(await page.evaluate(()=>blockReadCalls)).toBe(2);
 expect(await page.evaluate(()=>blockOwners)).toEqual([['blocker_id','first-buyer'],['blocker_id','first-buyer']]);
 await page.evaluate(async()=>{finishGlobalBlock();await globalBlockRefresh});
 await expect(page.locator('#profilePageContent')).toContainText('TEST ONLY sports card');
 await expect(page.locator('#profilePageContent')).not.toContainText('PRIVATE BLOCKED CARD');
});

test('saved profile recovers from a stalled saved-list read even when seller reviews never finish',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  window.stalledSavedReads=0;
  sellerRatingHtml=()=>new Promise(()=>{}); // Unrelated seller reviews must not hold Saved hostage.
  const bounded=readMarketplaceRequest;readMarketplaceRequest=(request)=>bounded(request,60);
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,in:()=>q,then:(resolve,reject)=>{
    if(table==='saved_listings'&&++stalledSavedReads===1)return new Promise(()=>{}).then(resolve,reject);
    const response=table==='saved_listings'?{data:[{listing_id:'favorite-item'}],error:null}:table==='listings'?{data:[{id:'favorite-item',title:'TEST ONLY game',price:25,status:'active',seller_id:'seller',image_urls:[]}],error:null}:{data:[],error:null};
    return Promise.resolve(response).then(resolve,reject);
   }};
   q.maybeSingle=async()=>({data:{username:'jayden'},error:null});
   return q;
  };
  return showCollectorPage('saved');
 });
 await expect(page.locator('#profilePageContent')).toContainText('Your saved items could not load');
 await page.locator('[data-retry-profile-saved]').click();
 await expect(page.locator('#profilePageContent')).toContainText('TEST ONLY game');
 expect(await page.evaluate(()=>stalledSavedReads)).toBe(2);
});

test('saved profile gives a retry rather than spinning forever when profile preflight stalls',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  window.profilePreflightReads=0;sellerRatingHtml=async()=>'';
  const bounded=readMarketplaceRequest;readMarketplaceRequest=(request)=>bounded(request,60);
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,in:()=>q,then:(resolve,reject)=>{
    const response=table==='saved_listings'?{data:[],error:null}:{data:[],error:null};
    return Promise.resolve(response).then(resolve,reject);
   }};
   q.maybeSingle=()=>{
    if(table==='profiles'&&++profilePreflightReads===1)return new Promise(()=>{});
    return Promise.resolve({data:{username:'jayden'},error:null});
   };
   return q;
  };
  return showCollectorPage('saved');
 });
 await expect(page.locator('#profilePageContent')).toContainText('Your saved items could not load');
 await page.locator('[data-retry-profile-saved]').click();
 await expect(page.locator('#profilePageContent')).toContainText('No saved items yet');
 expect(await page.evaluate(()=>profilePreflightReads)).toBe(2);
});


test('Favorites menu routes to the complete account Saved tab, not the loaded marketplace page',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  window.savedRouteVisits=[];
  showCollectorPage=async tab=>{savedRouteVisits.push(tab)};
  onlySavedListings=false;
  document.getElementById('myFavorites').click();
 });
 expect(await page.evaluate(()=>savedRouteVisits)).toEqual(['saved']);
 expect(await page.evaluate(()=>onlySavedListings)).toBe(false);
});


test('Saved profile loads older favorites even when unrelated seller and Wanted queries are unavailable',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{
  currentUser={id:'first-buyer',user_metadata:{username:'jayden'}};
  window.sellerOverview={refresh:()=>{}};
  loadBlockedCollectors=async()=>true;
  sellerRatingHtml=async()=>''; 
  supabaseClient.from=table=>{
   if(table==='wanted_posts')throw Error('Saved must not query Wanted');
   const result=table==='saved_listings'
    ?{data:[{listing_id:'older-card'}],error:null}
    :table==='listings'
     ?{data:[{id:'older-card',title:'Older saved One Piece card',price:18,status:'active',image_urls:[],seller_id:'seller-2'}],error:null}
     :{data:[],error:null};
   const q={
    select:()=>q,
    eq:key=>{if(table==='listings'&&key==='seller_id')throw Error('Saved must not query seller inventory');return q},
    in:()=>q,order:()=>q,
    maybeSingle:async()=>{if(window.profileHeaderFails)throw Error('Optional profile header unavailable');return {data:{username:'jayden'},error:null}},
    then:(ok,bad)=>Promise.resolve(result).then(ok,bad)
   };
   return q;
  };
  await showCollectorPage('saved');
  window.profileHeaderFails=true;
  await showCollectorPage('saved'); // Optional profile metadata failure must not hide saved cards.
 });
 await expect(page.locator('#profilePageContent')).toContainText('Older saved One Piece card');
 await expect(page.locator('#pageListingCount')).toContainText('— listings');
});

test('Saved inventory keeps unavailable records removable without disclosing their private details',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{
  sellerRatingHtml=async()=>'';loadBlockedCollectors=async()=>true;blockedCollectorIds.clear();
  saved.add('hidden-saved');saved.add('visible-saved');
  window.savedRemoveAttempts=0;window.profileSavedIds=['hidden-saved','visible-saved'];
  supabaseClient.from=table=>{
   let operation='read',target=null;
   const q={select:()=>q,eq:(key,value)=>{if(key==='listing_id')target=value;return q},in:()=>q,order:()=>q,
    delete:()=>{operation='delete';return q},
    maybeSingle:async()=>({data:{username:'jayden'},error:null}),
    then:(resolve,reject)=>{
     let response={data:[],error:null};
     if(table==='saved_listings'&&operation==='read')response={data:profileSavedIds.map(listing_id=>({listing_id})),error:null};
     if(table==='saved_listings'&&operation==='delete'){
      savedRemoveAttempts++;
      if(savedRemoveAttempts===1)response={data:null,error:{message:'Offline'}};
      else{window.profileSavedIds=profileSavedIds.filter(id=>id!==target);response={data:null,error:null}}
     }
     if(table==='listings')response={data:[{id:'visible-saved',title:'TEST ONLY One Piece card',price:10,status:'active',seller_id:'safe-seller',image_urls:[]}],error:null};
     return Promise.resolve(response).then(resolve,reject);
    }};
   return q;
  };
  await showCollectorPage('saved');
 });
 await expect(page.locator('#profilePageContent')).toContainText('TEST ONLY One Piece card');
 await expect(page.locator('#profilePageContent')).toContainText('Saved listing unavailable');
 await expect(page.locator('[data-remove-profile-saved]')).toHaveCount(2);
 await page.locator('[data-remove-profile-saved="hidden-saved"]').click();
 await expect(page.locator('[data-saved-remove-error]')).toContainText('Could not remove');
 expect(await page.evaluate(()=>saved.has('hidden-saved'))).toBe(true);
 await page.locator('[data-remove-profile-saved="hidden-saved"]').click();
 await expect(page.locator('[data-remove-profile-saved="hidden-saved"]')).toHaveCount(0);
 await expect(page.locator('#profilePageContent')).toContainText('TEST ONLY One Piece card');
 expect(await page.evaluate(()=>saved.has('hidden-saved'))).toBe(false);
 expect(await page.evaluate(()=>savedRemoveAttempts)).toBe(2);
});

test('a late Saved removal cannot clear another account after switching users',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{
  sellerRatingHtml=async()=>'';loadBlockedCollectors=async()=>true;blockedCollectorIds.clear();
  saved.add('old-saved');window.resolveOldRemoval=null;
  supabaseClient.from=table=>{
   let operation='read';
   const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,
    delete:()=>{operation='delete';return q},
    maybeSingle:async()=>({data:{username:'jayden'},error:null}),
    then:(resolve,reject)=>{
     if(table==='saved_listings'&&operation==='delete')return new Promise(done=>{window.resolveOldRemoval=()=>done({error:null})}).then(resolve,reject);
     const rows=table==='saved_listings'?(currentUser?.id==='first-buyer'?[{listing_id:'old-saved'}]:[{listing_id:'new-saved'}]):[];
     return Promise.resolve({data:rows,error:null}).then(resolve,reject);
    }};
   return q;
  };
  await showCollectorPage('saved');
 });
 await page.locator('[data-remove-profile-saved="old-saved"]').click();
 await expect.poll(()=>page.evaluate(()=>!!resolveOldRemoval)).toBe(true);
 await page.evaluate(async()=>{
  currentUser={id:'second-buyer',user_metadata:{username:'tanner'}};
  listingAccountVersion++;resetSavedListingsForAccount('second-buyer');saved.add('new-saved');
  await showCollectorPage('saved');resolveOldRemoval();
 });
 await expect(page.locator('[data-remove-profile-saved="new-saved"]')).toBeVisible();
 expect(await page.evaluate(()=>[...saved])).toEqual(['new-saved']);
});

test('follow status read failure offers safe retry instead of guessing the wrong follow action',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{
  sellerRatingHtml=async()=>'';window.followReadCount=0;window.followWriteCount=0;
  supabaseClient.from=table=>{
   let operation='read';
   const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,
    insert:async()=>{followWriteCount++;return {error:null}},
    delete:()=>{operation='delete';return q},
    maybeSingle:async()=>{
     if(table==='profiles')return {data:{username:'Tanner',collection_links:[],collection_inquiry_mode:'off'},error:null};
     if(table==='user_blocks')return {data:null,error:null};
     if(table==='seller_follows'){
      followReadCount++;
      return followReadCount===1?{data:null,error:{message:'Offline'}}:followReadCount===2?{data:{seller_id:'seller'},error:null}:{data:null,error:null};
     }
     return {data:null,error:null};
    },
    then:(resolve,reject)=>Promise.resolve(table==='seller_follows'&&operation==='delete'?(followWriteCount++,{error:null}):{data:[],error:null}).then(resolve,reject)};
   return q;
  };
  await showPublicProfile('seller');
 });
 await expect(page.locator('[data-follow-profile]')).toHaveText('Follow status unavailable · Retry');
 await page.locator('[data-follow-profile]').click();
 await expect(page.locator('[data-follow-profile]')).toHaveText('Following ✓');
 expect(await page.evaluate(()=>followWriteCount)).toBe(0);
 await page.locator('[data-follow-profile]').click();
 await expect(page.locator('[data-follow-profile]')).toHaveText('Follow seller');
 expect(await page.evaluate(()=>followWriteCount)).toBe(1);
});

test('late follow success after account change cannot show an old account confirmation',async({page})=>{
 await fixture(page);
 await page.evaluate(async()=>{
  sellerRatingHtml=async()=>'';window.followWriteCount=0;window.followToasts=[];
  toast=message=>followToasts.push(message);
  supabaseClient.from=table=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,
    insert:()=>{followWriteCount++;return new Promise(resolve=>{window.finishOldFollow=resolve})},
    maybeSingle:async()=>({data:table==='profiles'?{username:'Tanner',collection_links:[],collection_inquiry_mode:'off'}:null,error:null}),
    then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)};
   return q;
  };
  await showPublicProfile('seller');
 });
 await page.locator('[data-follow-profile]').click();
 await expect.poll(()=>page.evaluate(()=>followWriteCount)).toBe(1);
 await page.evaluate(()=>{
  currentUser={id:'other-buyer',user_metadata:{}};listingAccountVersion++;
  finishOldFollow({error:null});
 });
 await expect.poll(()=>page.evaluate(()=>followToasts)).toEqual([]);
 expect(await page.evaluate(()=>currentUser.id)).toBe('other-buyer');
});
