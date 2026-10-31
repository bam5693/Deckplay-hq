const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
});
async function ready(page){await page.goto('/');await page.waitForLoadState('networkidle')}
async function inbox(page,unread=false){
 await ready(page);
 await page.evaluate(async unread=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};
  const now=new Date().toISOString();window.fixtureWrites=0;
  supabaseClient.from=table=>{
   let inserting=false,markingRead=false;
   const data=table==='collector_messages'?['buyer-a','buyer-b'].map((id,i)=>({id:'message-'+i,sender_id:id,recipient_id:'fixture-seller',body:'Hello '+id,read_at:unread?null:now,created_at:now})):table==='profiles'?['buyer-a','buyer-b'].map(id=>({id,username:id})):[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:markingRead&&unread==='fail'?{message:'Read receipt failed'}:null}).then(resolve,reject)};
   for(const key of ['select','order','limit','in','eq','is','maybeSingle'])q[key]=()=>q;
   q.update=()=>{markingRead=true;return q};
   q.insert=()=>{inserting=true;window.fixtureWrites++;return q};
   q.single=async()=>{if(inserting)return await new Promise(resolve=>{window.finishFixtureSend=resolve});return {data:null,error:null}};
   return q;
  };
  sendCollectorEmailForSource=async()=>{};
  await showInboxPage(unread?null:'buyer-a');
 },unread);
}
test('message drafts survive refresh, thread switching and inbox navigation',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('Draft for A');
 await page.evaluate(()=>loadInbox());await expect(page.locator('#chatInput')).toHaveValue('Draft for A');
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-b"]').click());
 await expect(page.locator('#chatInput')).toHaveValue('');await page.locator('#chatInput').fill('Draft for B');
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-a"]').click());
 await expect(page.locator('#chatInput')).toHaveValue('Draft for A');
 await page.evaluate(()=>showInboxPage('buyer-b'));await expect(page.locator('#chatInput')).toHaveValue('Draft for B');
});
test('Send stays disabled for empty drafts and re-enables only for message text',async({page})=>{
 await inbox(page);
 const send=page.locator('.chat-composer button[type="submit"]');
 await expect(send).toBeDisabled();
 await page.locator('#chatInput').fill('   ');
 await expect(send).toBeDisabled();
 await page.locator('#chatInput').fill('Message ready');
 await expect(send).toBeEnabled();
 await page.locator('#chatInput').fill('');
 await expect(send).toBeDisabled();
 await page.locator('#chatInput').fill('Send once');
 await page.locator('#chatInput').press('Enter');
 await expect(send).toBeDisabled();
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('#chatInput')).toHaveValue('');
 await expect(page.locator('.chat-composer button[type="submit"]')).toBeDisabled();
});
test('rapid Enter submits once and a service exception allows retry without losing text',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('One message');
 await page.locator('#chatInput').press('Enter');await page.locator('#chatInput').press('Enter');
 expect(await page.evaluate(()=>fixtureWrites)).toBe(1);
 await page.evaluate(()=>finishFixtureSend(Promise.reject(Error('Connection lost'))));
 await expect(page.locator('.chat-send-status')).toContainText('Connection lost');
 await expect(page.locator('#chatInput')).toHaveValue('One message');await expect(page.locator('.chat-composer button[type="submit"]')).toBeEnabled();
 await page.locator('#chatInput').press('Enter');expect(await page.evaluate(()=>fixtureWrites)).toBe(2);
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('#chatInput')).toHaveValue('');
});
test('finishing a send does not pull the reader out of another conversation',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('To A');await page.locator('#chatInput').press('Enter');
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-b"]').click());
 await page.locator('#chatInput').fill('Private draft B');
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-b');
 await expect(page.locator('#chatInput')).toHaveValue('Private draft B');
});
test('loaded listing timestamps drive oldest and newest sorting',async({page})=>{
 await ready(page);await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();supabaseClient.from=table=>{const data=table==='listings'?[{id:'new',title:'New listing',created_at:'2026-10-20',price:25,category:'trading_cards'},{id:'old',title:'Old listing',created_at:'2026-09-01',price:25,category:'trading_cards'}]:[];const q={then:r=>Promise.resolve({data,error:null}).then(r)};for(const key of ['select','eq','order','in'])q[key]=()=>q;return q};await loadListings();showMainMarketplace();
 });
 await page.locator('#marketSort').selectOption('oldest');await expect(page.locator('#grid h3').first()).toHaveText('Old listing');
 await page.locator('#marketSort').selectOption('newest');await expect(page.locator('#grid h3').first()).toHaveText('New listing');
});
test('sign-out removes private conversation text and unsent drafts',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('Secret draft');
 await page.evaluate(()=>supabaseClient.auth.signOut({scope:'local'}));
 await expect(page.locator('#messageInbox')).not.toContainText('Hello buyer-a');
 expect(await page.locator('#messageInbox textarea').count()).toBe(0);
});
test('marketplace search tolerates accents, case and extra spaces',async({page})=>{
 await ready(page);await page.evaluate(()=>{items=[{id:'pokemon',n:'Pokémon Charizard',c:'Trading Cards',game:'pokemon',gameLabel:'Pokémon',p:25,s:'@fixture',cond:'Used',e:'🃏'},{id:'onepiece',n:'Luffy',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:25,s:'@fixture',cond:'Used',e:'🃏'}];showMainMarketplace();render()});
 await page.locator('#search').fill('  CHARIZARD   POKEMON  ');
 await expect(page.locator('#grid h3')).toHaveText(['Pokémon Charizard']);
 await page.locator('#search').fill('   ');await expect(page.locator('#grid h3')).toHaveCount(2);
});
test('refresh during a pending send clears the sent draft and shows errors on the current form',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('Send while refreshing');await page.locator('#chatInput').press('Enter');
 await page.evaluate(()=>loadInbox());await expect(page.locator('.chat-composer button[type="submit"]')).toBeDisabled();
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('#chatInput')).toHaveValue('');
 await page.locator('#chatInput').fill('Retry after refresh');await page.locator('#chatInput').press('Enter');
 await page.evaluate(()=>loadInbox());await page.evaluate(()=>finishFixtureSend({error:{message:'Try again later'}}));
 await expect(page.locator('.chat-send-status')).toContainText('Try again later');
 await expect(page.locator('#chatInput')).toHaveValue('Retry after refresh');await expect(page.locator('.chat-composer button[type="submit"]')).toBeEnabled();
});
test('an older listing response cannot replace newer marketplace results',async({page})=>{
 await ready(page);await page.evaluate(async()=>{
  window.pendingListingLoads=[];
  supabaseClient.from=()=>{const q={then:(resolve,reject)=>new Promise(done=>pendingListingLoads.push(done)).then(resolve,reject)};for(const key of ['select','eq','order'])q[key]=()=>q;return q};
  window.oldListingLoad=loadListings();window.newListingLoad=loadListings();
 });
 await expect.poll(()=>page.evaluate(()=>pendingListingLoads.length)).toBe(2);
 await page.evaluate(async()=>{pendingListingLoads[1]({data:[{id:'current',title:'Current listing',category:'trading_cards',price:10,created_at:'2026-10-27'}],error:null});await newListingLoad;showMainMarketplace()});
 await expect(page.locator('#grid h3')).toHaveText(['Current listing']);
 await page.evaluate(async()=>{pendingListingLoads[0]({data:[{id:'stale',title:'Stale listing',category:'trading_cards',price:20,created_at:'2026-10-26'}],error:null});await oldListingLoad});
 await expect(page.locator('#grid h3')).toHaveText(['Current listing']);
});
test('inbox exposes price and trade offers without activity alerts',async({page})=>{
 await inbox(page);
 await page.getByRole('button',{name:'Price offers',exact:true}).click();
 await expect(page.locator('#priceOffersModal')).toHaveClass(/open/);await expect(page.locator('#priceOffersList')).toContainText('No price offers yet');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Trade offers',exact:true}).click();
 await expect(page.locator('#tradesModal')).toHaveClass(/open/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});
test('switching collectors hides prior unread badges and closes private activity immediately',async({page})=>{
 await ready(page);
 const sameOwner=await page.evaluate(()=>{
  currentUser={id:'fixture-alert-owner-a'};syncInboxDraftUser();
  for(const id of ['headerUnread','menuUnread','menuTradeUnread','notificationBadge','dockNotifications']){
   const el=document.getElementById(id);if(!el)continue;el.hidden=false;el.textContent='9';
  }
  document.getElementById('notificationBell').setAttribute('aria-label','9 unread notifications');
  document.getElementById('notificationList').textContent='Private favorite from collector A';
  document.getElementById('inboxNotificationList').textContent='Private favorite from collector A';
  openModal('notificationModal');
  syncInboxDraftUser(); // A token refresh for the same owner must preserve the UI.
  // The unread badge is optional in some responsive layouts; account isolation
  // must still preserve the active modal during a same-owner token refresh.
  const badge=document.getElementById('notificationBadge');
  const preserved=(!badge||!badge.hidden)
   &&document.getElementById('notificationModal').classList.contains('open');
  currentUser={id:'fixture-alert-owner-b'};syncInboxDraftUser();
  return preserved;
 });
 expect(sameOwner).toBe(true);
 for(const id of ['headerUnread','menuUnread','menuTradeUnread','notificationBadge','dockNotifications']){
  if(await page.locator('#'+id).count()){
   await expect(page.locator('#'+id)).toHaveJSProperty('hidden',true);
   await expect(page.locator('#'+id)).toHaveText('');
  }
 }
 await expect(page.locator('#notificationBell')).toHaveAttribute('aria-label','Notifications');
 await expect(page.locator('#notificationModal')).not.toHaveClass(/open/);
 await expect(page.locator('#notificationList')).not.toContainText('Private favorite from collector A');
 await expect(page.locator('#inboxNotificationList')).not.toContainText('Private favorite from collector A');
});

test('delayed alert reads cannot navigate into a previous collector account',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-alert-a'};syncInboxDraftUser();
  window.alertNavigationAttempts=[];
  navigateDeckplayNotification=async(...args)=>alertNavigationAttempts.push(args);
  markNotificationRead=()=>new Promise(resolve=>{window.finishAlertRead=resolve});
  const row='<button type="button" data-open-notification="fixture-alert" data-notification-kind="favorite_price_drop" data-notification-actor="fixture-seller" data-notification-source="fixture-listing">Open old alert</button>';
  document.getElementById('notificationList').innerHTML=row;
  openModal('notificationModal');
  document.querySelector('#notificationList [data-open-notification]').click();
 });
 await expect.poll(()=>page.evaluate(()=>typeof finishAlertRead)).toBe('function');
 await page.evaluate(()=>{currentUser={id:'fixture-alert-b'};syncInboxDraftUser();finishAlertRead()});
 await page.waitForTimeout(240);
 expect(await page.evaluate(()=>alertNavigationAttempts)).toEqual([]);
 await expect(page.locator('#notificationModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>{
  currentUser={id:'fixture-alert-c'};syncInboxDraftUser();
  window.finishAlertRead=null;
  document.getElementById('inboxNotificationList').innerHTML='<button type="button" data-open-notification="fixture-alert-2" data-notification-kind="followed_seller_listing" data-notification-actor="fixture-seller" data-notification-source="fixture-listing">Old Inbox alert</button>';
  document.querySelector('#inboxNotificationList [data-open-notification]').click();
 });
 await expect.poll(()=>page.evaluate(()=>typeof finishAlertRead)).toBe('function');
 await page.evaluate(()=>{currentUser={id:'fixture-alert-d'};syncInboxDraftUser();finishAlertRead()});
 await page.waitForTimeout(60);
 expect(await page.evaluate(()=>alertNavigationAttempts)).toEqual([]);
});

test('late activity responses cannot restore private alerts after sign-out',async({page})=>{
 await ready(page);await page.evaluate(()=>{
  currentUser={id:'fixture-old'};syncInboxDraftUser();
  supabaseClient.from=table=>{const q={then:(resolve,reject)=>(table==='collector_notifications'?new Promise(done=>window.finishOldActivity=done):Promise.resolve({data:[],error:null})).then(resolve,reject)};for(const key of ['select','eq','order','limit','in'])q[key]=()=>q;return q};
  window.oldActivityLoad=loadNotificationCenter();
 });
 await expect.poll(()=>page.evaluate(()=>typeof finishOldActivity)).toBe('function');
 await page.evaluate(()=>supabaseClient.auth.signOut({scope:'local'}));
 await page.evaluate(async()=>{finishOldActivity({data:[{id:'private-alert',kind:'favorite_sold',actor_id:null,source_id:null,created_at:new Date().toISOString(),read_at:null}],error:null});await oldActivityLoad});
 await expect(page.locator('#notificationList')).not.toContainText('Favorite sold');
});
test('late unread counts cannot restore account badges after sign-out',async({page})=>{
 await ready(page);await page.evaluate(()=>{
  currentUser={id:'fixture-old'};syncInboxDraftUser();
  window.oldCountReplies={};
  supabaseClient.from=table=>{const q={then:(resolve,reject)=>(['collector_messages','collector_notifications'].includes(table)?new Promise(done=>oldCountReplies[table]=done):Promise.resolve({data:[],error:null})).then(resolve,reject)};for(const key of ['select','eq','is','in','order','limit'])q[key]=()=>q;return q};
  window.oldCounts=Promise.all([refreshUnreadCount(),refreshNotificationCount()]);
 });
 await expect.poll(()=>page.evaluate(()=>Object.keys(oldCountReplies).length)).toBe(2);
 await page.evaluate(()=>supabaseClient.auth.signOut({scope:'local'}));
 await page.evaluate(async()=>{Object.values(oldCountReplies).forEach(done=>done({count:7,error:null}));await oldCounts});
 for(const id of ['headerUnread','menuUnread','notificationBadge'])await expect(page.locator('#'+id)).toHaveJSProperty('hidden',true);
});

test('stale favorite responses cannot leak saved listings after switching accounts or signing out',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-old'};window.pendingSaved={};
  supabaseClient.from=()=>{let account;const q={select:()=>q,eq:(field,value)=>{if(field==='user_id')account=value;return q},then:(resolve,reject)=>new Promise(done=>pendingSaved[account]=done).then(resolve,reject)};return q};
  window.oldSavedLoad=loadSavedListings();
 });
 await expect.poll(()=>page.evaluate(()=>typeof pendingSaved['fixture-old'])).toBe('function');
 await page.evaluate(()=>{currentUser={id:'fixture-new'};window.newSavedLoad=loadSavedListings()});
 await expect.poll(()=>page.evaluate(()=>typeof pendingSaved['fixture-new'])).toBe('function');
 await page.evaluate(async()=>{pendingSaved['fixture-new']({data:[{listing_id:'new-favorite'}],error:null});await newSavedLoad});
 expect(await page.evaluate(()=>[...saved])).toEqual(['new-favorite']);
 await page.evaluate(async()=>{pendingSaved['fixture-old']({data:[{listing_id:'old-private-favorite'}],error:null});await oldSavedLoad});
 expect(await page.evaluate(()=>[...saved])).toEqual(['new-favorite']);
 await page.evaluate(()=>{window.pendingAfterLogout=loadSavedListings()});
 await page.evaluate(async()=>{currentUser=null;await loadSavedListings();pendingSaved['fixture-new']({data:[{listing_id:'private-after-logout'}],error:null});await pendingAfterLogout});
 expect(await page.evaluate(()=>[...saved])).toEqual([]);
});

test('newest activity refresh wins when an older same-account request resolves last',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-collector'};window.pendingActivity=[];
  supabaseClient.from=table=>{
   const q={then:(resolve,reject)=>(table==='collector_notifications'?new Promise(done=>pendingActivity.push(done)):Promise.resolve({data:[],error:null})).then(resolve,reject)};
   for(const key of ['select','eq','order','limit','in'])q[key]=()=>q;return q;
  };
  window.oldActivityLoad=loadNotificationCenter();window.newActivityLoad=loadNotificationCenter();
 });
 await expect.poll(()=>page.evaluate(()=>pendingActivity.length)).toBe(2);
 await page.evaluate(async()=>{
  pendingActivity[1]({data:[{id:'new-activity',kind:'favorite_sold',actor_id:null,source_id:null,created_at:new Date().toISOString(),read_at:null}],error:null});
  await newActivityLoad;
 });
 await expect(page.locator('#notificationList')).toContainText('Favorite sold');
 await page.evaluate(async()=>{pendingActivity[0]({data:[],error:null});await oldActivityLoad});
 await expect(page.locator('#notificationList')).toContainText('Favorite sold');
});
test('newest unread activity count wins when an older same-account count resolves last',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-collector'};window.pendingActivityCounts=[];
  supabaseClient.from=()=>{
   const q={then:(resolve,reject)=>new Promise(done=>pendingActivityCounts.push(done)).then(resolve,reject)};
   for(const key of ['select','eq','is','in'])q[key]=()=>q;return q;
  };
  window.oldActivityCount=refreshNotificationCount();window.newActivityCount=refreshNotificationCount();
 });
 await expect.poll(()=>page.evaluate(()=>pendingActivityCounts.length)).toBe(2);
 await page.evaluate(async()=>{pendingActivityCounts[1]({count:2,error:null});await newActivityCount});
 await expect(page.locator('#notificationBadge')).toHaveText('2');
 await page.evaluate(async()=>{pendingActivityCounts[0]({count:0,error:null});await oldActivityCount});
 await expect(page.locator('#notificationBadge')).toHaveText('2');
 await expect(page.locator('#notificationBadge')).toHaveJSProperty('hidden',false);
});


test('opening an unread conversation clears only that collector unread label',async({page})=>{
 await inbox(page,true);
 const first=page.locator('[data-conversation-id="buyer-a"]'),second=page.locator('[data-conversation-id="buyer-b"]');
 await expect(first.locator('.conversation-unread')).toHaveText('1 new');await expect(second.locator('.conversation-unread')).toHaveText('1 new');
 await first.click();
 await expect(first.locator('.conversation-unread')).toHaveCount(0);
 // On mobile the conversation list is hidden while the thread is open, so
 // inspect attachment rather than visibility for the other unread label.
 await expect(second.locator('.conversation-unread')).toHaveText('1 new');
});


test('a failed read receipt preserves the unread label for retry',async({page})=>{
 await inbox(page,'fail');
 const contact=page.locator('[data-conversation-id="buyer-a"]');
 await contact.click();await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-a');
 await expect(contact.locator('.conversation-unread')).toHaveText('1 new');
});

test('a delayed unread message count cannot replace a newer badge count',async({page})=>{
 await ready(page);await page.evaluate(()=>{
  currentUser={id:'fixture-owner'};syncInboxDraftUser();window.pendingUnreadCounts=[];
  supabaseClient.from=()=>{const q={then:(resolve,reject)=>new Promise(done=>pendingUnreadCounts.push(done)).then(resolve,reject)};for(const key of ['select','eq','is'])q[key]=()=>q;return q};
  window.oldUnreadCount=refreshUnreadCount();window.newUnreadCount=refreshUnreadCount();
 });
 await expect.poll(()=>page.evaluate(()=>pendingUnreadCounts.length)).toBe(2);
 await page.evaluate(async()=>{pendingUnreadCounts[1]({count:2,error:null});await newUnreadCount});
 await expect(page.locator('#headerUnread')).toHaveText('2');
 await page.evaluate(async()=>{pendingUnreadCounts[0]({count:9,error:null});await oldUnreadCount});
 for(const id of ['headerUnread','menuUnread']){
  await expect(page.locator('#'+id)).toHaveText('2');await expect(page.locator('#'+id)).toHaveJSProperty('hidden',false);
 }
});

test('activity bell excludes negotiations while retaining favorite alerts and a separate unread count',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  currentUser={id:'fixture-owner'};syncInboxDraftUser();
  const now=new Date().toISOString();
  const alerts=[
   {id:'a1',kind:'message',actor_id:'buyer-a',source_id:null,created_at:now,read_at:null},
   {id:'a2',kind:'price_offer',actor_id:'buyer-a',source_id:null,created_at:now,read_at:null},
   {id:'a3',kind:'trade_offer',actor_id:'buyer-b',source_id:null,created_at:now,read_at:null},
   {id:'a4',kind:'favorite_price_drop',actor_id:null,source_id:'saved-1',created_at:now,read_at:null}
  ];
  supabaseClient.from=table=>{
   const q={then:(resolve,reject)=>Promise.resolve(table==='collector_notifications'?{data:alerts,count:1,error:null}:table==='listings'?{data:[{id:'saved-1',title:'Saved collectible'}],error:null}:{data:[],error:null}).then(resolve,reject)};
   for(const key of ['select','eq','is','in','order','limit'])q[key]=()=>q;
   return q;
  };
  await Promise.all([loadNotificationCenter(),refreshNotificationCount()]);
 });
 await expect(page.locator('#notificationList')).toContainText('Favorite price dropped');
 await expect(page.locator('#notificationList')).toContainText('Saved collectible');
 await expect(page.locator('#notificationList')).not.toContainText('New message');
 await expect(page.locator('#notificationList')).not.toContainText('New price offer');
 await expect(page.locator('#notificationList')).not.toContainText('New trade offer');
 await expect(page.locator('#notificationBadge')).toHaveText('1');
});

test('a former account unread count cannot overwrite the current account badge',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-former-owner'};syncInboxDraftUser();
  window.pendingUnreadCounts=[];
  supabaseClient.from=()=>{
   const q={then:(resolve,reject)=>new Promise(done=>pendingUnreadCounts.push(done)).then(resolve,reject)};
   for(const key of ['select','eq','is'])q[key]=()=>q;
   return q;
  };
  window.formerUnreadCount=refreshUnreadCount();
 });
 await expect.poll(()=>page.evaluate(()=>pendingUnreadCounts.length)).toBe(1);
 await page.evaluate(()=>{
  currentUser={id:'fixture-current-owner'};syncInboxDraftUser();
  window.currentUnreadCount=refreshUnreadCount();
 });
 await expect.poll(()=>page.evaluate(()=>pendingUnreadCounts.length)).toBe(2);
 await page.evaluate(async()=>{
  pendingUnreadCounts[1]({count:3,error:null});
  await currentUnreadCount;
 });
 await expect(page.locator('#headerUnread')).toHaveText('3');
 await page.evaluate(async()=>{
  pendingUnreadCounts[0]({count:11,error:null});
  await formerUnreadCount;
 });
 for(const id of ['headerUnread','menuUnread']){
  await expect(page.locator('#'+id)).toHaveText('3');
  await expect(page.locator('#'+id)).toHaveJSProperty('hidden',false);
 }
});

test('Tanner and Jayden: a former collector activity response cannot replace the new account alerts',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-tanner'};syncInboxDraftUser();
  window.pendingPersonaActivity={};
  supabaseClient.from=table=>{
   let owner='';
   const q={
    select:()=>q,order:()=>q,limit:()=>q,in:()=>q,
    eq:(field,value)=>{if(field==='user_id')owner=value;return q},
    then:(resolve,reject)=>(table==='collector_notifications'
     ?new Promise(done=>pendingPersonaActivity[owner]=done)
     :Promise.resolve({data:[],error:null})).then(resolve,reject)
   };
   return q;
  };
  window.tannerActivity=loadNotificationCenter();
  currentUser={id:'fixture-jayden'};syncInboxDraftUser();
  window.jaydenActivity=loadNotificationCenter();
 });
 await expect.poll(()=>page.evaluate(()=>Object.keys(pendingPersonaActivity).length)).toBe(2);
 await page.evaluate(async()=>{
  pendingPersonaActivity['fixture-jayden']({data:[{
   id:'jayden-wanted',kind:'wanted_match',actor_id:null,source_id:null,
   created_at:new Date().toISOString(),read_at:null
  }],error:null});
  await jaydenActivity;
 });
 await expect(page.locator('#notificationList')).toContainText('Wanted item match');
 await page.evaluate(async()=>{
  pendingPersonaActivity['fixture-tanner']({data:[{
   id:'tanner-private',kind:'favorite_sold',actor_id:null,source_id:null,
   created_at:new Date().toISOString(),read_at:null
  }],error:null});
  await tannerActivity;
 });
 await expect(page.locator('#notificationList')).toContainText('Wanted item match');
 await expect(page.locator('#notificationList')).not.toContainText('Favorite sold');
});

test('Charles and Kyle: a previous account activity count cannot overwrite the new collector badge',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-charles'};syncInboxDraftUser();
  window.pendingPersonaCounts={};
  supabaseClient.from=()=>{
   let owner='';
   const q={
    select:()=>q,is:()=>q,in:()=>q,
    eq:(field,value)=>{if(field==='user_id')owner=value;return q},
    then:(resolve,reject)=>new Promise(done=>pendingPersonaCounts[owner]=done).then(resolve,reject)
   };
   return q;
  };
  window.charlesCount=refreshNotificationCount();
  currentUser={id:'fixture-kyle'};syncInboxDraftUser();
  window.kyleCount=refreshNotificationCount();
 });
 await expect.poll(()=>page.evaluate(()=>Object.keys(pendingPersonaCounts).length)).toBe(2);
 await page.evaluate(async()=>{
  pendingPersonaCounts['fixture-kyle']({count:2,error:null});
  await kyleCount;
 });
 await expect(page.locator('#notificationBadge')).toHaveText('2');
 await page.evaluate(async()=>{
  pendingPersonaCounts['fixture-charles']({count:17,error:null});
  await charlesCount;
 });
 await expect(page.locator('#notificationBadge')).toHaveText('2');
 await expect(page.locator('#notificationBadge')).toHaveJSProperty('hidden',false);
 await expect(page.locator('#notificationBell')).toHaveAttribute('aria-label','2 unread notifications');
});

test('Tanner and Jayden: late listing-title enrichment cannot leak a previous collector activity',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-tanner'};syncInboxDraftUser();
  window.pendingTannerTitles=null;
  supabaseClient.from=table=>{
   const q={
    select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,in:()=>q,
    then:(resolve,reject)=>{
     if(table==='collector_notifications'){
      const isTanner=currentUser?.id==='fixture-tanner';
      const activity=isTanner
       ?[{id:'tanner-sold',kind:'favorite_sold',actor_id:null,source_id:'private-sports-card',created_at:new Date().toISOString(),read_at:null}]
       :[{id:'jayden-wanted',kind:'wanted_match',actor_id:null,source_id:null,created_at:new Date().toISOString(),read_at:null}];
      return Promise.resolve({data:activity,error:null}).then(resolve,reject);
     }
     if(table==='listings')return new Promise(done=>{pendingTannerTitles=done}).then(resolve,reject);
     return Promise.resolve({data:[],error:null}).then(resolve,reject);
    }
   };
   return q;
  };
  window.tannerTitleLoad=loadNotificationCenter();
 });
 await expect.poll(()=>page.evaluate(()=>typeof pendingTannerTitles)).toBe('function');
 await page.evaluate(async()=>{
  currentUser={id:'fixture-jayden'};syncInboxDraftUser();
  await loadNotificationCenter();
 });
 await expect(page.locator('#notificationList')).toContainText('Wanted item match');
 await page.evaluate(async()=>{
  pendingTannerTitles({data:[{id:'private-sports-card',title:'Tanner private graded rookie'}],error:null});
  await tannerTitleLoad;
 });
 await expect(page.locator('#notificationList')).toContainText('Wanted item match');
 await expect(page.locator('#notificationList')).not.toContainText('Tanner private graded rookie');
 await expect(page.locator('#notificationList')).not.toContainText('Favorite sold');
});

test('Charles and Kyle: notification count caps visually and clears on zero across mobile and desktop',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-kyle'};syncInboxDraftUser();
  window.fixtureActivityCount=120;
  supabaseClient.from=()=>{
   const q={select:()=>q,eq:()=>q,is:()=>q,in:()=>q,
    then:(resolve,reject)=>Promise.resolve({count:fixtureActivityCount,error:null}).then(resolve,reject)};
   return q;
  };
 });
 await page.evaluate(()=>refreshNotificationCount());
 await expect(page.locator('#notificationBadge')).toHaveText('99+');
 await expect(page.locator('#notificationBadge')).toHaveJSProperty('hidden',false);
 await expect(page.locator('#notificationBell')).toHaveAttribute('aria-label','120 unread notifications');
 // The current five-button dock has no dedicated Alerts dot; check it only if present.
 const dockActivityDot=page.locator('#dockNotifications');
 if(await dockActivityDot.count())await expect(dockActivityDot).toHaveAttribute('aria-label','120 unread notifications');
 await page.evaluate(async()=>{fixtureActivityCount=0;await refreshNotificationCount()});
 await expect(page.locator('#notificationBadge')).toHaveJSProperty('hidden',true);
 if(await dockActivityDot.count())await expect(dockActivityDot).toHaveJSProperty('hidden',true);
 await expect(page.locator('#notificationBell')).toHaveAttribute('aria-label','Notifications');
});


test('composer grows for multiline messages, restores draft height and shrinks after edits',async({page})=>{
 await inbox(page);
 const box=page.locator('#chatInput');
 const initial=await box.evaluate(el=>el.getBoundingClientRect().height);
 const draft='First line\\nSecond line\\nThird line\\nFourth line'.replaceAll('\\n','\n');
 await box.fill(draft);
 const expanded=await box.evaluate(el=>el.getBoundingClientRect().height);
 expect(expanded).toBeGreaterThan(initial+15);
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-b"]').click());
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-a"]').click());
 await expect(box).toHaveValue(draft);
 expect(await box.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(initial+15);
 await box.fill('Short reply');
 expect(await box.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(expanded);
});

test('Android Back from a directly opened chat returns to the inbox and keeps its draft',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Card back photo question');
 await page.goBack();
 await expect(page.locator('#inboxPage')).toBeVisible();
 await expect(page.locator('#inboxPage')).not.toHaveClass(/thread-open/);
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
 await page.locator('[data-conversation-id="buyer-a"]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Card back photo question');
});

test('switching inbox contacts does not add phantom Android Back steps',async({page})=>{
 await inbox(page,true);
 await page.locator('[data-conversation-id="buyer-a"]').click();
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-b"]').click());
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-b');
 await page.locator('#inboxThreadBack').click();
 await expect(page.locator('#inboxPage')).not.toHaveClass(/thread-open/);
 await page.goBack();
 await expect(page.locator('#inboxPage')).toBeHidden();
});

test('inbox offer and trade decisions lock sibling actions until the server responds',async({page})=>{
 await inbox(page);
 await page.evaluate(()=>{
  document.querySelector('#conversationThread .conversation-bubbles').insertAdjacentHTML('beforeend',
   '<p id="priceDecision" class="price-offer-actions"><button data-inbox-price="accept" data-offer="price-a">Accept</button><button data-inbox-price="decline" data-offer="price-a">Decline</button></p>'+
   '<p id="tradeDecision" class="price-offer-actions"><button data-inbox-trade="accepted" data-offer="trade-a">Accept</button><button data-inbox-trade="declined" data-offer="trade-a">Decline</button></p>');
  window.pendingInboxDecisions=[];
  supabaseClient.rpc=(name,args)=>new Promise(resolve=>pendingInboxDecisions.push({name,args,resolve}));
  loadInbox=async()=>{};loadListings=async()=>{};refreshTradeAlerts=()=>{};
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('#priceDecision [data-inbox-price="accept"]').click();
 await expect(page.locator('#priceDecision button').first()).toBeDisabled();await expect(page.locator('#priceDecision button').last()).toBeDisabled();
 await page.locator('#priceDecision [data-inbox-price="decline"]').evaluate(button=>button.click());
 expect(await page.evaluate(()=>pendingInboxDecisions.length)).toBe(1);
 await page.evaluate(()=>pendingInboxDecisions[0].resolve({error:{message:'Temporary offer outage'}}));
 await expect(page.locator('#priceDecision button').first()).toBeEnabled();await expect(page.locator('#priceDecision button').last()).toBeEnabled();
 await page.locator('#tradeDecision [data-inbox-trade="accepted"]').click();
 await expect(page.locator('#tradeDecision button').first()).toBeDisabled();await expect(page.locator('#tradeDecision button').last()).toBeDisabled();
 await page.locator('#tradeDecision [data-inbox-trade="declined"]').evaluate(button=>button.click());
 expect(await page.evaluate(()=>pendingInboxDecisions.length)).toBe(2);
 await page.evaluate(()=>pendingInboxDecisions[1].resolve({error:{message:'Temporary trade outage'}}));
 await expect(page.locator('#tradeDecision button').first()).toBeEnabled();await expect(page.locator('#tradeDecision button').last()).toBeEnabled();
});


test('mobile inbox composer stays usable with the on-screen keyboard viewport',async({page})=>{
 await page.setViewportSize({width:390,height:650});
 await inbox(page);
 await page.locator('#chatInput').fill('Can you send a photo of the card back?');
 const metrics=await page.locator('#chatInput').evaluate(el=>{
  const rect=el.getBoundingClientRect();
  const send=document.querySelector('.chat-composer button[type="submit"]').getBoundingClientRect();
  return {inputLeft:rect.left,inputRight:rect.right,sendLeft:send.left,sendRight:send.right,width:innerWidth};
 });
 expect(metrics.inputLeft).toBeGreaterThanOrEqual(-2);
 expect(metrics.inputRight).toBeLessThanOrEqual(metrics.width+2);
 expect(metrics.sendLeft).toBeGreaterThanOrEqual(-2);
 expect(metrics.sendRight).toBeLessThanOrEqual(metrics.width+2);
 await expect(page.locator('.chat-composer button[type="submit"]')).toBeEnabled();
});


test('Alerts remain visible after a busy inbox and query discovery kinds at the source',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  currentUser={id:'fixture-jayden'};syncInboxDraftUser();
  const now=new Date().toISOString();
  const messages=Array.from({length:100},(_,i)=>({id:'message-'+i,kind:'message',actor_id:'fixture-charles',source_id:null,created_at:now,read_at:null}));
  const favorite={id:'favorite-1',kind:'favorite_price_drop',actor_id:null,source_id:'one-piece-card',created_at:now,read_at:null};
  window.activityFilterUsed=false;
  supabaseClient.from=table=>{
   let allowed=null,limit=100;
   const q={select:()=>q,eq:()=>q,order:()=>q,in:(key,values)=>{if(table==='collector_notifications'&&key==='kind'){allowed=new Set(values);window.activityFilterUsed=true}return q},limit:n=>{limit=n;return q},then:(resolve,reject)=>{
    const data=table==='collector_notifications'?[...messages,favorite].filter(row=>!allowed||allowed.has(row.kind)).slice(0,limit):table==='listings'?[{id:'one-piece-card',title:'Jayden manga rare'}]:[];
    return Promise.resolve({data,error:null}).then(resolve,reject);
   }};return q;
  };
  await loadNotificationCenter();
 });
 expect(await page.evaluate(()=>activityFilterUsed)).toBe(true);
 await expect(page.locator('#notificationList')).toContainText('Favorite price dropped');
 await expect(page.locator('#notificationList')).toContainText('Jayden manga rare');
 await expect(page.locator('#notificationList')).not.toContainText('New message');
});

test('Mark all activity read does not mark inbox messages or negotiations read',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  currentUser={id:'fixture-tanner'};syncInboxDraftUser();window.activityReadFilter=null;
  supabaseClient.from=table=>{
   let updating=false;
   const q={select:()=>q,update:()=>{updating=true;return q},eq:()=>q,is:()=>q,order:()=>q,limit:()=>q,in:(key,values)=>{if(updating&&table==='collector_notifications'&&key==='kind')activityReadFilter=values;return q},then:(resolve,reject)=>Promise.resolve({data:[],count:0,error:null}).then(resolve,reject)};
   return q;
  };
  document.getElementById('markAllNotifications').click();
 });
 await expect.poll(()=>page.evaluate(()=>activityReadFilter)).toEqual(['favorite_price_drop','favorite_sold','followed_seller_listing','wanted_match']);
});


test('message length hint appears near the limit and follows restored drafts',async({page})=>{
 await inbox(page);
 const input=page.locator('#chatInput');
 const hint=page.locator('.chat-length-hint');
 await expect(hint).toBeHidden();
 await input.fill('x'.repeat(1800));
 await expect(hint).toHaveText('200 characters remaining');
 await input.fill('x'.repeat(1999));
 await expect(hint).toHaveText('1 character remaining');
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-b"]').click());
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-a"]').click());
 await expect(input).toHaveValue('x'.repeat(1999));
 await expect(hint).toHaveText('1 character remaining');
 await input.fill('Short');
 await expect(hint).toBeHidden();
});

test('pending trade counteroffers show terms in the thread and suspend original trade actions',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  currentUser={id:'fixture-buyer'};syncInboxDraftUser();
  const now=new Date().toISOString();
  const offer={id:'trade-1',sender_id:'fixture-buyer',recipient_id:'fixture-seller',listing_id:'item-a',offered_listing_id:'item-b',offer_note:'Trade my card',status:'pending',created_at:now};
  const counter={id:'counter-1',trade_offer_id:'trade-1',proposer_id:'fixture-seller',recipient_id:'fixture-buyer',cash_amount:5,cash_direction:'sender_pays',offer_note:'Add five dollars',status:'pending',created_at:new Date(Date.now()+1000).toISOString()};
  supabaseClient.from=table=>{
   const data=table==='trade_offers'?[offer]:table==='trade_counteroffers'?[counter]:table==='profiles'?[{id:'fixture-seller',username:'sports-seller'}]:[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const name of ['select','eq','in','order','limit','maybeSingle'])q[name]=()=>q;
   return q;
  };
  await showInboxPage('fixture-seller');
 });
 await expect(page.locator('#conversationThread')).toContainText('Trade counteroffer');
 await expect(page.locator('#conversationThread')).toContainText('$5.00 cash');
 await expect(page.locator('#conversationThread')).toContainText('Add five dollars');
 await expect(page.locator('[data-inbox-trade="accepted"]')).toHaveCount(0);
 await page.evaluate(()=>navigateDeckplayNotification('counteroffer','fixture-seller','counter-1'));
 await expect(page.locator('#inboxPage')).toBeVisible();
 await expect(page.locator('#tradesModal')).not.toHaveClass(/open/);
 await expect(page.locator('#conversationThread')).toContainText('Add five dollars');
 await page.locator('[data-inbox-trade-review]').click();
 await expect(page.locator('#tradesModal')).toHaveClass(/open/);
 const focused=page.locator('#tradeOffersList [data-trade-offer-id="trade-1"]');
 await expect(focused).toHaveClass(/trade-offer-focused/);
 await expect(focused).toBeFocused();
 await expect(focused).toContainText('Add five dollars');
});

test('collectors find loaded conversations by recent update and filter unread without losing drafts',async({page})=>{
 await inbox(page,true);
 await page.locator('#conversationSearch').fill('Hello buyer-b');
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeHidden();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
 await page.locator('#conversationSearch').fill('missing collector');
 await expect(page.locator('[data-conversation-filter-status]')).toContainText('No matching conversations');
 await page.locator('#conversationSearch').fill('');
 await page.locator('[data-conversation-unread]').check();
 await page.locator('[data-conversation-id="buyer-a"]').click();
 await page.locator('#chatInput').fill('Keep this private draft');
 await page.locator('#inboxThreadBack').click();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeHidden();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
 await page.locator('[data-conversation-unread]').uncheck();
 await page.locator('[data-conversation-id="buyer-a"]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Keep this private draft');
});

test('a committed message survives a lost response and retry without inserting a duplicate',async({page})=>{
 await inbox(page);
 await page.evaluate(()=>{
  window.attemptedMessageIds=[];window.storedMessage=null;window.lookupCount=0;const previous=supabaseClient.from;
  supabaseClient.from=table=>{
   if(table!=='collector_messages')return previous(table);
   let inserted=false,payload=null,lookingUp=false;
   const q={then:(a,b)=>Promise.resolve({data:storedMessage?[storedMessage]:[],error:null}).then(a,b)};
   for(const method of ['order','limit','in','is'])q[method]=()=>q;
   q.select=()=>q;q.eq=()=>{lookingUp=true;return q};q.update=()=>q;
   q.insert=value=>{inserted=true;payload=value;attemptedMessageIds.push(value.id);return q};
   q.single=async()=>{if(inserted){if(!storedMessage){storedMessage={...payload,created_at:new Date().toISOString(),read_at:null};throw Error('Response lost after server commit')}return {data:null,error:{code:'23505',message:'Duplicate reference'}}}return {data:null,error:null}};
   q.maybeSingle=async()=>{lookupCount++;if(lookupCount===1)throw Error('Network still unavailable');return {data:storedMessage,error:null}};
   return q;
  };
 });
 await page.locator('#chatInput').fill('One copy of this message');await page.locator('#chatInput').press('Enter');
 await expect(page.locator('.chat-send-status')).toContainText('Response lost');await expect(page.locator('#chatInput')).toHaveValue('One copy of this message');
 await page.locator('#chatInput').press('Enter');await expect(page.locator('#chatInput')).toHaveValue('');
 // A recovered server row is read before retrying, so no second INSERT is needed.
 expect(await page.evaluate(()=>attemptedMessageIds.length)).toBe(1);expect(await page.evaluate(()=>lookupCount)).toBe(2);
 expect(await page.evaluate(()=>messageSendAttempts.size)).toBe(0);
});

test('delivery recovery never treats a different thread or body as the sent message',async({page})=>{
 await inbox(page);
 const result=await page.evaluate(async()=>{
  let sent;
  supabaseClient.from=()=>{const q={select:()=>q,eq:()=>q,insert:value=>{sent=value;return q},single:async()=>({error:{code:'23505',message:'Reference collision'}}),maybeSingle:async()=>({data:{...sent,recipient_id:'different-collector',body:'Different private content'},error:null})};return q};
  try{await sendCollectorMessageOnce({sender_id:currentUser.id,recipient_id:'buyer-a',body:'Expected body'});return 'incorrect success'}catch(error){return error.message}
 });
 expect(result).toBe('Reference collision');
 await page.evaluate(()=>{currentUser={id:'another-account'};syncInboxDraftUser()});expect(await page.evaluate(()=>messageSendAttempts.size)).toBe(0);
});

test('returning to the same account cannot let an earlier send clear its newer draft',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('Earlier account send');await page.locator('#chatInput').press('Enter');
 await page.evaluate(async()=>{currentUser={id:'other-account'};syncInboxDraftUser();currentUser={id:'fixture-seller'};syncInboxDraftUser();inboxDrafts.set('buyer-a','New draft after signing back in');await showInboxPage('buyer-a')});
 await page.evaluate(()=>finishFixtureSend({data:{id:'earlier-send'},error:null}));
 await expect(page.locator('#chatInput')).toHaveValue('New draft after signing back in');await expect(page.locator('#chatInput')).not.toHaveJSProperty('readOnly',true);
});

test('inbox search and unread filters survive refresh but reset on account change',async({page})=>{
 await inbox(page,true);
 const search=page.locator('[data-conversation-search]'),unread=page.locator('[data-conversation-unread]');
 await search.fill('buyer-b');await unread.check();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeHidden();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
 await page.evaluate(()=>loadInbox());
 await expect(search).toHaveValue('buyer-b');await expect(unread).toBeChecked();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeHidden();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
 const clear=page.locator('[data-conversation-clear]');
 await expect(clear).toBeVisible();await clear.click();
 await expect(search).toHaveValue('');await expect(unread).not.toBeChecked();
 await expect(search).toBeFocused();await expect(clear).toBeHidden();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
 await search.fill('buyer-b');await unread.check();
 await page.evaluate(async()=>{currentUser={id:'fixture-another-collector'};syncInboxDraftUser();await showInboxPage()});
 await expect(search).toHaveValue('');await expect(unread).not.toBeChecked();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
});

test('Jayden can retry an offline inbox without losing his TCG inquiry draft',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Is your One Piece deck still available?');
 await page.evaluate(()=>{
  const originalFrom=supabaseClient.from;
  let offlineOnce=true;
  supabaseClient.from=table=>{
   if(table==='collector_messages'&&offlineOnce){
    offlineOnce=false;
    const q={select:()=>q,order:()=>q,limit:()=>Promise.reject(new Error('Offline'))};return q;
   }
   return originalFrom(table);
  };
 });
 await page.evaluate(()=>loadInbox());
 await expect(page.locator('[data-inbox-retry]')).toBeVisible();
 await expect(page.locator('[role="alert"]')).toContainText('Could not load conversations');
 await page.locator('[data-inbox-retry]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Is your One Piece deck still available?');
 await expect(page.locator('[data-inbox-retry]')).toHaveCount(0);
});

test('Alerts sheet shows activity, retries failures, and refreshes empty results',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-activity-owner'};syncInboxDraftUser();
  window.fixtureActivityError=false;
  window.fixtureActivityRows=[{id:'fixture-activity-1',actor_id:null,kind:'favorite_price_drop',source_id:null,created_at:new Date().toISOString(),read_at:null}];
  supabaseClient.from=table=>{
   const q={then:(resolve,reject)=>Promise.resolve(table==='collector_notifications'?(fixtureActivityError?{data:null,error:{message:'Offline'}}:{data:fixtureActivityRows,error:null}):{data:[],error:null}).then(resolve,reject)};
   for(const key of ['select','eq','is','in','order','limit'])q[key]=()=>q;
   return q;
  };
  await showInboxPage();
  openModal('notificationModal');
  await loadNotificationCenter();
 });
 await expect(page.locator('#inboxPage')).toBeVisible();
 await expect(page.locator('#inboxNotificationsTab')).toBeHidden();
 await expect(page.locator('#notificationModal')).toHaveClass(/open/);
 await expect(page.locator('#notificationList [data-notification-kind="favorite_price_drop"]')).toHaveCount(1);
 await expect(page.locator('#inboxNotificationList [data-notification-kind="favorite_price_drop"]')).toHaveCount(1);
 expect(await page.evaluate(()=>activityNotificationsVisible())).toBe(true);
 await page.evaluate(async()=>{fixtureActivityError=true;await loadNotificationCenter()});
 await expect(page.locator('#notificationList [data-retry-notifications]')).toHaveText('Retry alerts');
 await page.evaluate(()=>{fixtureActivityError=false});
 await page.locator('#notificationList [data-retry-notifications]').click();
 await expect(page.locator('#notificationList [data-notification-kind="favorite_price_drop"]')).toHaveCount(1);
 await page.evaluate(async()=>{fixtureActivityRows=[];await loadNotificationCenter()});
 await expect(page.locator('#notificationList [data-retry-notifications]')).toHaveText('Refresh alerts');
});

test('Tanner can message a collector with no prior thread directly from the profile',async({page})=>{
 await inbox(page);
 await page.evaluate(async()=>{
  const originalFrom=supabaseClient.from;
  supabaseClient.from=table=>{
   if(table==='user_blocks'){
    const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null,error:null})};
    return q;
   }
   if(table!=='profiles')return originalFrom(table);
   let directId=null;
   const profiles=[{id:'buyer-a',username:'buyer-a'},{id:'buyer-b',username:'buyer-b'},{id:'new-collector',username:'new-collector',collection_links:[]}];
   const q={select:()=>q,eq:(column,value)=>{if(column==='id')directId=value;return q},in:()=>q,
    then:(resolve,reject)=>Promise.resolve({data:profiles,error:null}).then(resolve,reject),
    maybeSingle:async()=>({data:profiles.find(p=>p.id===directId)||null,error:null})};
   return q;
  };
  await showPublicProfile('new-collector');
 });
 await expect(page.locator('#publicProfileContent [data-message-profile]')).toBeVisible();
 await page.locator('#publicProfileContent [data-message-profile]').click();
 await expect(page.locator('#inboxPage')).toBeVisible();
 await expect(page.locator('#publicProfileModal')).not.toHaveClass(/open/);
 await expect(page.locator('#composeModal')).not.toHaveClass(/open/);
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','new-collector');
 await expect(page.locator('#conversationThread')).toContainText('No messages yet');
 await page.locator('#chatInput').fill('Can you share photos of the sports card corners?');
 await page.locator('#inboxThreadBack').click();
 await expect(page.locator('[data-conversation-id="new-collector"]')).toBeVisible();
 await page.locator('[data-conversation-id="new-collector"]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Can you share photos of the sports card corners?');
});

test('Jayden deep links reveal the right conversation despite stale search and unread filters',async({page})=>{
 await inbox(page,true);
 await page.locator('#conversationSearch').fill('buyer-a');
 await page.locator('[data-conversation-unread]').check();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeHidden();
 await page.evaluate(()=>showInboxPage('buyer-b'));
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-b');
 await expect(page.locator('#conversationSearch')).toHaveValue('');
 await expect(page.locator('[data-conversation-unread]')).not.toBeChecked();
 // Opening a thread intentionally hides the conversation list; inspect its filter state,
 // then return to the list before asserting that the requested contact is visible.
 await page.locator('#chatInput').fill('Is that deck available for trade?');
 await page.locator('#inboxThreadBack').click();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
 await page.locator('[data-conversation-id="buyer-b"]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Is that deck available for trade?');
});

test('blocked existing conversation stays readable but cannot send; unblocking restores its draft',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('Preserved private draft');
 await page.evaluate(async()=>{blockedCollectorIds.add('buyer-a');await loadInbox('buyer-a')});
 await expect(page.locator('.conversation-bubbles')).toContainText('Hello buyer-a');
 await expect(page.locator('#conversationThread')).toContainText('You blocked this collector');
 await expect(page.locator('.chat-composer')).toBeHidden();
 await expect(page.locator('#chatInput')).toBeDisabled();
 await expect(page.locator('#chatInput')).toHaveValue('Preserved private draft');
 await page.evaluate(()=>document.querySelector('.chat-composer').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(await page.evaluate(()=>fixtureWrites)).toBe(0);
 await page.evaluate(async()=>{blockedCollectorIds.delete('buyer-a');await loadInbox('buyer-a')});
 await expect(page.locator('.chat-composer')).toBeVisible();
 await expect(page.locator('#chatInput')).toBeEnabled();
 await expect(page.locator('#chatInput')).toHaveValue('Preserved private draft');
});

test('blocked collector offer controls are disabled and cannot invoke a deal RPC',async({page})=>{
 await inbox(page);
 await page.evaluate(async()=>{
  const originalFrom=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>{
   if(table!=='price_offers')return originalFrom(table);
   const data=[{id:'pending-price-offer',buyer_id:'buyer-a',seller_id:'fixture-seller',amount:15,status:'pending',last_actor_id:'buyer-a',updated_at:new Date().toISOString()}];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const method of ['select','order','limit'])q[method]=()=>q;
   return q;
  };
  window.blockedDealRpcCalls=0;
  supabaseClient.rpc=async()=>{blockedDealRpcCalls++;return {error:null}};
  blockedCollectorIds.add('buyer-a');
  await loadInbox('buyer-a');
 });
 const accept=page.locator('#conversationThread [data-inbox-price="accept"]');
 await expect(accept).toHaveCount(1);
 await expect(accept).toBeDisabled();
 await expect(accept).toHaveAttribute('aria-disabled','true');
 await page.evaluate(()=>document.querySelector('#conversationThread [data-inbox-price="accept"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
 expect(await page.evaluate(()=>blockedDealRpcCalls)).toBe(0);
});

test('legacy reply composer refuses blocked recipients without losing text',async({page})=>{
 await inbox(page);
 await page.evaluate(()=>{
  composeRecipient='buyer-a';composeListing=null;
  blockedCollectorIds.add('buyer-a');
  window.legacySendCalls=0;
  sendCollectorMessageOnce=async()=>{legacySendCalls++;return {data:{id:'synthetic-message'},error:null}};
  openModal('composeModal');
 });
 await page.locator('#composeBody').fill('Keep this reply until unblocked');
 await page.locator('#composeForm button[type="submit"]').click();
 await expect(page.locator('#composeStatus')).toContainText('Unblock this collector');
 await expect(page.locator('#composeBody')).toHaveValue('Keep this reply until unblocked');
 expect(await page.evaluate(()=>legacySendCalls)).toBe(0);
 await page.evaluate(()=>blockedCollectorIds.delete('buyer-a'));
 await page.locator('#composeForm button[type="submit"]').click();
 await expect.poll(()=>page.evaluate(()=>legacySendCalls)).toBe(1);
 await expect(page.locator('#composeBody')).toHaveValue('');
});

test('text drafts for Tanner and Jayden survive a full browser reload in this tab',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Tanner sports-card condition questions');
 await page.locator('#inboxThreadBack').click();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
 await page.locator('[data-conversation-id="buyer-b"]').click();
 await page.locator('#chatInput').fill('Jayden TCG deck trade details');
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem(inboxDraftStorageKey('fixture-seller'))||'[]').length)).toBe(2);
 await page.reload();
 await inbox(page);
 await expect(page.locator('#chatInput')).toHaveValue('Tanner sports-card condition questions');
 await page.locator('#inboxThreadBack').click();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
 await page.locator('[data-conversation-id="buyer-b"]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Jayden TCG deck trade details');
});
test('switching collectors clears stored private Inbox drafts, even after switching back',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Only the original collector should see this');
 expect(await page.evaluate(()=>sessionStorage.getItem(inboxDraftStorageKey('fixture-seller')))).toContain('Only the original collector');
 await page.evaluate(()=>{currentUser={id:'other-collector'};syncInboxDraftUser()});
 expect(await page.evaluate(()=>sessionStorage.getItem(inboxDraftStorageKey('fixture-seller')))).toBeNull();
 await page.evaluate(async()=>{currentUser={id:'fixture-seller'};syncInboxDraftUser();await showInboxPage('buyer-a')});
 await expect(page.locator('#chatInput')).toHaveValue('');
});
test('successful message delivery clears its saved tab draft and refresh does not restore it',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Completed private message');
 await page.locator('#chatInput').press('Enter');
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('#chatInput')).toHaveValue('');
 expect(await page.evaluate(()=>sessionStorage.getItem(inboxDraftStorageKey('fixture-seller')))).toBeNull();
 await page.reload();
 await inbox(page);
 await expect(page.locator('#chatInput')).toHaveValue('');
});
test('failed message delivery preserves a tab draft through reload for safe manual retry',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Unsent message after network failure');
 await page.locator('#chatInput').press('Enter');
 await page.evaluate(()=>finishFixtureSend(Promise.reject(Error('Connection lost'))));
 await expect(page.locator('.chat-send-status')).toContainText('Connection lost');
 await page.reload();
 await inbox(page);
 await expect(page.locator('#chatInput')).toHaveValue('Unsent message after network failure');
});

test('an uncertain text send verifies its exact committed row after reload without another INSERT',async({page})=>{
 await ready(page);
 const payload={sender_id:'fixture-seller',recipient_id:'buyer-a',body:'Private condition details after network loss'};
 const first=await page.evaluate(async payload=>{
  currentUser={id:payload.sender_id};syncInboxDraftUser();
  window.firstTextInsertIds=[];
  supabaseClient.from=()=>{
   const q={select:()=>q,eq:()=>q,insert:value=>{firstTextInsertIds.push(value.id);return q},single:async()=>{throw Error('Response lost')},maybeSingle:async()=>({data:null,error:null})};
   return q;
  };
  try{await sendCollectorMessageOnce(payload)}catch(error){return error.message}
  return 'unexpected success';
 },payload);
 expect(first).toBe('Response lost');
 const saved=await page.evaluate(owner=>JSON.parse(sessionStorage.getItem(inboxTextRetryStorageKey(owner))||'[]'),payload.sender_id);
 expect(saved).toHaveLength(1);
 expect(saved[0].hash).toMatch(/^[0-9a-f]{64}$/);
 expect(JSON.stringify(saved)).not.toContain(payload.body);
 expect(await page.evaluate(()=>firstTextInsertIds)).toEqual([saved[0].id]);
 await page.reload();await page.waitForLoadState('networkidle');
 const second=await page.evaluate(async payload=>{
  currentUser={id:payload.sender_id};syncInboxDraftUser();
  const row=JSON.parse(sessionStorage.getItem(inboxTextRetryStorageKey(payload.sender_id))||'[]')[0];
  window.secondTextInserts=0;
  supabaseClient.from=()=>{
   const q={select:()=>q,eq:()=>q,insert:()=>{secondTextInserts++;return q},single:async()=>({data:null,error:{code:'23505',message:'Duplicate'}}),maybeSingle:async()=>({data:{...payload,id:row.id},error:null})};
   return q;
  };
  const result=await sendCollectorMessageOnce(payload);
  return {id:result.data.id,inserts:secondTextInserts,remaining:sessionStorage.getItem(inboxTextRetryStorageKey(payload.sender_id))};
 },payload);
 expect(second).toEqual({id:saved[0].id,inserts:0,remaining:null});
});
test('switching accounts purges uncertain text delivery references',async({page})=>{
 await ready(page);
 const result=await page.evaluate(async()=>{
  currentUser={id:'fixture-seller'};syncInboxDraftUser();
  supabaseClient.from=()=>{
   const q={select:()=>q,eq:()=>q,insert:()=>q,single:async()=>{throw Error('Offline')},maybeSingle:async()=>({data:null,error:null})};
   return q;
  };
  try{await sendCollectorMessageOnce({sender_id:'fixture-seller',recipient_id:'buyer-a',body:'Private unsent text'})}catch{}
  const before=inboxTextRetryEntries('fixture-seller').length;
  currentUser={id:'other-collector'};syncInboxDraftUser();
  return {before,after:sessionStorage.getItem(inboxTextRetryStorageKey('fixture-seller'))};
 });
 expect(result).toEqual({before:1,after:null});
});

test('T2.2: keyboard composer focus resumes after an accepted message refresh',async({page})=>{
 await inbox(page);
 const input=page.locator('#chatInput');
 await input.fill('First card-condition question');
 await input.press('Enter');
 await expect.poll(()=>page.evaluate(()=>typeof finishFixtureSend)).toBe('function');
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent-focus'},error:null}));
 await expect(page.locator('#chatInput')).toBeEmpty();
 await expect(page.locator('#chatInput')).toBeFocused();
 await page.keyboard.type('Second question without tapping');
 await expect(page.locator('#chatInput')).toHaveValue('Second question without tapping');
});

test('T2.2: completed message never steals focus from another active control',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('My last question');
 await page.locator('#chatInput').press('Enter');
 await expect.poll(()=>page.evaluate(()=>typeof finishFixtureSend)).toBe('function');
 // Refresh is hidden in a single-thread view. The visible Back control is
 // the actual keyboard navigation destination while a conversation is open.
 await page.locator('#inboxThreadBack').focus();
 await expect(page.locator('#inboxThreadBack')).toBeFocused();
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent-no-steal'},error:null}));
 await expect(page.locator('#chatInput')).toBeEmpty();
 await expect(page.locator('#inboxThreadBack')).toBeFocused();
});

test('T2.2 focused draft keeps keyboard focus and caret after a manual Inbox refresh',async({page})=>{
 await inbox(page);
 const input=page.locator('#chatInput');
 await input.fill('My Charizard card back question');
 await input.evaluate(el=>{el.focus();el.setSelectionRange(3,8)});
 await page.evaluate(()=>loadInbox('buyer-a'));
 await expect(input).toHaveValue('My Charizard card back question');
 await expect(input).toBeFocused();
 expect(await input.evaluate(el=>[el.selectionStart,el.selectionEnd])).toEqual([3,8]);
 await page.keyboard.type('New');
 await expect(input).toHaveValue('My Newzard card back question');
});

test('T2.2 Inbox refresh does not redirect keyboard focus away from Back to all messages',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Unsent Zoro photo request');
 await page.locator('#inboxThreadBack').focus();
 await page.evaluate(()=>loadInbox('buyer-a'));
 await expect(page.locator('#inboxThreadBack')).toBeFocused();
 await expect(page.locator('#chatInput')).toHaveValue('Unsent Zoro photo request');
});

test('T2.4 offline refresh keeps visible private conversation and draft with retry',async({page})=>{
 await inbox(page);
 await page.locator('#chatInput').fill('Keep my Luffy condition question');
 await page.locator('#chatInput').focus();
 await page.evaluate(async()=>{
  window.__savedInboxFrom=supabaseClient.from;
  supabaseClient.from=table=>{
   if(table!=='collector_messages')return window.__savedInboxFrom(table);
   const q={};for(const method of ['select','order','limit'])q[method]=()=>q;
   q.then=(resolve,reject)=>Promise.resolve({data:null,error:{message:'offline'}}).then(resolve,reject);
   return q;
  };
  await loadInbox('buyer-a');
 });
 await expect(page.locator('[data-inbox-refresh-error]')).toBeVisible();
 await expect(page.locator('[data-inbox-refresh-error]')).toContainText('out of date');
 await expect(page.locator('.conversation-bubbles')).toContainText('Hello buyer-a');
 await expect(page.locator('#chatInput')).toHaveValue('Keep my Luffy condition question');
 await expect(page.locator('#chatInput')).toBeFocused();
 // Multiple failed refreshes must not stack duplicate error banners.
 await page.evaluate(()=>loadInbox('buyer-a'));
 await expect(page.locator('[data-inbox-refresh-error]')).toHaveCount(1);
 await page.evaluate(()=>{supabaseClient.from=window.__savedInboxFrom});
 await page.locator('[data-inbox-retry]').click();
 await expect(page.locator('[data-inbox-refresh-error]')).toHaveCount(0);
 await expect(page.locator('#chatInput')).toHaveValue('Keep my Luffy condition question');
});

test('T2.4 first load failure still provides a usable Inbox retry',async({page})=>{
 await inbox(page);
 await page.evaluate(async()=>{
  document.querySelector('#messageInbox').replaceChildren();
  window.__savedInboxFrom=supabaseClient.from;
  supabaseClient.from=table=>{
   if(table!=='collector_messages')return window.__savedInboxFrom(table);
   const q={};for(const method of ['select','order','limit'])q[method]=()=>q;
   q.then=(resolve,reject)=>Promise.resolve({data:null,error:{message:'offline'}}).then(resolve,reject);
   return q;
  };
  await loadInbox();
 });
 await expect(page.locator('[data-inbox-retry]')).toBeVisible();
 await expect(page.locator('.conversation-layout')).toHaveCount(0);
 await page.evaluate(()=>{supabaseClient.from=window.__savedInboxFrom});
 await page.locator('[data-inbox-retry]').click();
 await expect(page.locator('.conversation-layout')).toBeVisible();
 await expect(page.locator('[data-inbox-refresh-error]')).toHaveCount(0);
});

test('T2.2 Inbox finds Pokémon and accented collector names without exact diacritics',async({page})=>{
 await inbox(page);
 await page.locator('#inboxThreadBack').click();
 await page.evaluate(()=>{
  const contact=document.querySelector('[data-conversation-id="buyer-a"]');
  contact.querySelector('strong').textContent='@JoséCards';
  contact.querySelector('.conversation-preview').textContent='Pokémon Scarlet booster bundle';
  const other=document.querySelector('[data-conversation-id="buyer-b"]');
  other.querySelector('.conversation-preview').textContent='Dragon Ball singles';
 });
 const search=page.locator('[data-conversation-search]');
 await search.fill('  POKEMON    SCARLET ');
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeHidden();
 await search.fill('JoseCards');
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeHidden();
 await expect(search).toHaveValue('JoseCards');
});
test('T2.2 Inbox normalized search still obeys unread-only and clear filters',async({page})=>{
 await inbox(page,true);
 await page.evaluate(()=>{
  document.querySelector('[data-conversation-id="buyer-a"] .conversation-preview').textContent='One Pièce cards';
  document.querySelector('[data-conversation-id="buyer-b"] .conversation-preview').textContent='Console trade';
 });
 const search=page.locator('[data-conversation-search]');
 await search.fill('one piece');
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeHidden();
 await page.locator('[data-conversation-unread]').check();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
 await page.locator('[data-conversation-id="buyer-a"]').click();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeHidden();
 // Return to list before using Clear on mobile single-thread navigation.
 await page.locator('#inboxThreadBack').click();
 await page.locator('[data-conversation-clear]').click();
 await expect(search).toHaveValue('');
 await expect(page.locator('[data-conversation-unread]')).not.toBeChecked();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
});

test('T2.5 offers and trades quick filter finds negotiations without hiding message-only collectors',async({page})=>{
 await inbox(page,true);
 await page.evaluate(async()=>{
  const original=supabaseClient.from;
  supabaseClient.from=table=>{
   if(table==='price_offers'){
    const q={then:(resolve,reject)=>Promise.resolve({data:[{id:'price-one',buyer_id:'buyer-a',seller_id:'fixture-seller',amount:28,status:'pending',last_actor_id:'buyer-a',updated_at:new Date().toISOString()}],error:null}).then(resolve,reject)};
    for(const name of ['select','order','limit'])q[name]=()=>q;
    return q;
   }
   return original(table);
  };
  await loadInbox('buyer-a');
 });
 await page.locator('#inboxThreadBack').click();
 const offers=page.locator('[data-conversation-negotiations]');
 await offers.check();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeVisible();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeHidden();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toHaveAttribute('data-has-negotiation','true');
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toHaveAttribute('data-has-negotiation','false');
 await page.evaluate(()=>loadInbox());
 await expect(page.locator('[data-conversation-negotiations]')).toBeChecked();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeHidden();
 await page.locator('[data-conversation-clear]').click();
 await expect(page.locator('[data-conversation-negotiations]')).not.toBeChecked();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeVisible();
});

test('T2.5 direct conversation navigation resets active negotiation-only filter',async({page})=>{
 await inbox(page);
 await page.locator('#inboxThreadBack').click();
 await page.locator('[data-conversation-negotiations]').check();
 await expect(page.locator('[data-conversation-id="buyer-a"]')).toBeHidden();
 await expect(page.locator('[data-conversation-id="buyer-b"]')).toBeHidden();
 await page.evaluate(()=>showInboxPage('buyer-b'));
 await expect(page.locator('[data-conversation-negotiations]')).not.toBeChecked();
 await expect(page.locator('#chatInput')).toBeVisible();
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-b');
});
