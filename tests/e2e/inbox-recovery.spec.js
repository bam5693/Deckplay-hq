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
test('rapid Enter submits once and a service exception allows retry without losing text',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('One message');
 await page.locator('#chatInput').press('Enter');await page.locator('#chatInput').press('Enter');
 expect(await page.evaluate(()=>fixtureWrites)).toBe(1);
 await page.evaluate(()=>finishFixtureSend(Promise.reject(Error('Connection lost'))));
 await expect(page.locator('.chat-send-status')).toContainText('Connection lost');
 await expect(page.locator('#chatInput')).toHaveValue('One message');await expect(page.locator('.chat-composer button')).toBeEnabled();
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
 await page.evaluate(()=>loadInbox());await expect(page.locator('.chat-composer button')).toBeDisabled();
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('#chatInput')).toHaveValue('');
 await page.locator('#chatInput').fill('Retry after refresh');await page.locator('#chatInput').press('Enter');
 await page.evaluate(()=>loadInbox());await page.evaluate(()=>finishFixtureSend({error:{message:'Try again later'}}));
 await expect(page.locator('.chat-send-status')).toContainText('Try again later');
 await expect(page.locator('#chatInput')).toHaveValue('Retry after refresh');await expect(page.locator('.chat-composer button')).toBeEnabled();
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
