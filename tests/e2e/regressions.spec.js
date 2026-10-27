const {test,expect}=require('@playwright/test');
test('login validation recovers without an unrelated listing-button error',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await page.evaluate(()=>{setAuthMode('signin');openModal('authModal');signupCaptchaToken='';});
 await page.locator('#authEmail').fill('invalid@deckplay.test');await page.locator('#authPassword').fill('Wrong-password1!');
 await page.locator('#authSubmit').click();
 await expect(page.locator('#authStatus')).toContainText('security check');
 await expect(page.locator('#authForm')).not.toHaveClass(/busy/);
 await expect(page.locator('#authSubmit')).toBeEnabled();
 expect(errors).toEqual([]);
});
test('built page is isolated and scripts initialize all late handlers',async({page})=>{
 const errors=[],production=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('yffruutknztvdyioovmp'))production.push(r.url())});
 await page.goto('/');
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
 expect(await page.evaluate(()=>!!supabaseClient)).toBe(true);
 expect(errors).toEqual([]);expect(production).toEqual([]);
});
test('dialogs contain keyboard focus and restore it when closed',async({page})=>{
 await page.goto('/');const opener=await page.locator('#accountButton').isVisible()?page.locator('#accountButton'):page.locator('[data-dock="profile"]');await opener.click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 const close=page.locator('#authModal button.close');await close.focus();await page.keyboard.press('Shift+Tab');
 expect(await page.locator('#authModal').evaluate(el=>el.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('#authModal')).not.toHaveClass(/open/);
 await expect(opener).toBeFocused();
});
test('mobile and desktop home categories navigate to the marketplace without overflow',async({page})=>{
 await page.goto('/');await page.locator('[data-cat="Trading Cards"]').first().click();
 await expect(page.locator('#market')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});
test('a late Turnstile ready callback initializes the widget',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.goto('/');
 const widget=await page.evaluate(()=>{window.turnstile={render:()=>99,reset:()=>{}};window.deckplayTurnstileReady();return signupCaptchaWidget});
 expect(widget).toBe(99);
});
test('inbox loads once and retains the selected conversation during background refresh',async({page})=>{
 await page.goto('/');
 // Isolated deterministic fixture: no network write or real authentication is performed.
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};window.inboxFixtureReads=0;
  const now=new Date().toISOString();
  supabaseClient.from=table=>{
   if(table==='collector_messages')window.inboxFixtureReads++;
   const data=table==='collector_messages'?[{id:'fixture-message',sender_id:'fixture-buyer',recipient_id:'fixture-seller',body:'Fixture message persists',read_at:now,created_at:now}]:table==='profiles'?[{id:'fixture-buyer',username:'fixture_buyer'}]:[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const name of ['select','order','limit','in','eq','is','update','insert','maybeSingle'])q[name]=()=>q;
   return q;
  };
  await showInboxPage();
 });
 expect(await page.evaluate(()=>window.inboxFixtureReads)).toBe(1);
 await page.locator('[data-conversation-id="fixture-buyer"]').click();
 await expect(page.locator('#conversationThread')).toContainText('Fixture message persists');
 await page.evaluate(()=>loadInbox());
 await expect(page.locator('#conversationThread')).toContainText('Fixture message persists');
 await expect(page.locator('#inboxPage')).toHaveClass(/thread-open/);
});

test('page element IDs are unique so notifications have one working target',async({page})=>{
 await page.goto('/');
 const duplicates=await page.locator('[id]').evaluateAll(elements=>{const counts=new Map();elements.forEach(e=>counts.set(e.id,(counts.get(e.id)||0)+1));return [...counts].filter(([,n])=>n>1).map(([id])=>id)});
 expect(duplicates).toEqual([]);
});

test('notification bell counts discovery alerts without counting inbox negotiations',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-alert-user'};
  let kinds=null;
  const original=supabaseClient.from;
  supabaseClient.from=table=>{
   const query={select:()=>query,eq:()=>query,is:()=>query,in:(column,values)=>{if(column==='kind')kinds=values;return query},then:(resolve,reject)=>Promise.resolve({count:3,error:null}).then(resolve,reject)};
   return query;
  };
  try{await refreshNotificationCount();return {kinds,badge:document.getElementById('notificationBadge').textContent,hidden:document.getElementById('notificationBadge').hidden}}
  finally{supabaseClient.from=original;currentUser=null}
 });
 expect(result.kinds).toEqual(expect.arrayContaining(['favorite_price_drop','favorite_sold','followed_seller_listing','wanted_match']));
 expect(result.kinds).not.toContain('message');
 expect(result.kinds).not.toContain('price_offer');
 expect(result.badge).toBe('3');
 expect(result.hidden).toBe(false);
});

test('discovery notification opens an available listing rather than redirecting to inbox',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const previous=items;
  items=[{id:'fixture-listing',databaseId:'fixture-listing',n:'Fixture collectible',p:12,c:'Trading Cards',imageUrls:[],trades:false}];
  try{
   await navigateDeckplayNotification('wanted_match','fixture-seller','fixture-listing');
   return {title:document.getElementById('detailTitle')?.textContent,modal:document.getElementById('detailModal')?.classList.contains('open'),inbox:document.getElementById('inboxPage')?.classList.contains('active')};
  }finally{items=previous}
 });
 expect(result.title).toBe('Fixture collectible');
 expect(result.modal).toBe(true);
 expect(result.inbox).not.toBe(true);
});

test('reading one inbox conversation leaves another conversation unread',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-owner'};
  const now=new Date().toISOString();
  const messages=[
   {id:'fixture-a',sender_id:'fixture-alice',recipient_id:'fixture-owner',body:'Alice unread',read_at:null,created_at:now},
   {id:'fixture-b',sender_id:'fixture-bob',recipient_id:'fixture-owner',body:'Bob unread',read_at:null,created_at:now}
  ];
  window.fixtureReadUpdates=[];
  const original=supabaseClient.from;
  supabaseClient.from=table=>{
   const data=table==='collector_messages'?messages:table==='profiles'?[{id:'fixture-alice',username:'alice'},{id:'fixture-bob',username:'bob'}]:[];
   let ids=[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const name of ['select','order','limit','eq','is','maybeSingle'])q[name]=()=>q;
   q.in=(field,values)=>{if(field==='id')window.fixtureReadUpdates.push([...values]);return q};
   q.update=()=>q;
   return q;
  };
  window.fixtureOriginalFrom=original;
  await showInboxPage();
 });
 await expect(page.locator('.conversation-unread')).toHaveCount(2);
 await page.locator('[data-conversation-id="fixture-alice"]').click();
 await expect(page.locator('#conversationThread')).toContainText('Alice unread');
 await expect(page.locator('[data-conversation-id="fixture-alice"] .conversation-unread')).toHaveCount(0);
 await expect(page.locator('[data-conversation-id="fixture-bob"] .conversation-unread')).toContainText('1 new');
 expect(await page.evaluate(()=>window.fixtureReadUpdates.some(ids=>ids.length===1&&ids[0]==='fixture-a'))).toBe(true);
});

test('an older inbox refresh cannot replace a newer conversation',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-owner'};
  const now=new Date().toISOString();
  let calls=0,release;
  window.releaseOldInbox=()=>release?.();
  const oldGate=new Promise(resolve=>{release=resolve});
  supabaseClient.from=table=>{
   const isMessages=table==='collector_messages';
   const data=isMessages?[{id:'fixture-old',sender_id:'fixture-alice',recipient_id:'fixture-owner',body:'Alice thread',read_at:now,created_at:now},{id:'fixture-new',sender_id:'fixture-bob',recipient_id:'fixture-owner',body:'Bob thread',read_at:now,created_at:now}]:table==='profiles'?[{id:'fixture-alice',username:'alice'},{id:'fixture-bob',username:'bob'}]:[];
   const thisCall=isMessages?++calls:0;
   const q={then:(resolve,reject)=>(thisCall===2?oldGate:Promise.resolve()).then(()=>({data,error:null})).then(resolve,reject)};
   for(const name of ['select','order','limit','in','eq','is','update','maybeSingle'])q[name]=()=>q;
   return q;
  };
  await showInboxPage('fixture-alice');
  window.oldInboxRefresh=loadInbox('fixture-alice');
 });
 await page.evaluate(()=>loadInbox('fixture-bob'));
 await expect(page.locator('#conversationThread')).toContainText('Bob thread');
 await page.evaluate(async()=>{window.releaseOldInbox();await window.oldInboxRefresh});
 await expect(page.locator('#conversationThread')).toContainText('Bob thread');
 await expect(page.locator('[data-conversation-id="fixture-bob"]')).toHaveClass(/active/);
 await expect(page.locator('#conversationThread')).not.toContainText('Alice thread');
});

test('inbox conversation layout stays within the viewport on mobile and desktop',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-owner'};
  const now=new Date().toISOString();
  supabaseClient.from=table=>{
   const data=table==='collector_messages'?[{id:'fixture-layout-message',sender_id:'fixture-sender',recipient_id:'fixture-owner',body:'A long collectible discussion that should wrap naturally on narrow screens without causing sideways scrolling or clipping.',read_at:now,created_at:now}]:table==='profiles'?[{id:'fixture-sender',username:'collector_layout_test'}]:[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const name of ['select','order','limit','in','eq','is','update','maybeSingle'])q[name]=()=>q;
   return q;
  };
  await showInboxPage('fixture-sender');
 });
 await expect(page.locator('#inboxPage')).toHaveClass(/thread-open/);
 await expect(page.locator('#conversationThread')).toContainText('A long collectible discussion');
 const layout=await page.evaluate(()=>{
  const thread=document.getElementById('conversationThread'),list=document.querySelector('#messageInbox .conversation-list');
  const rect=thread.getBoundingClientRect();
  return {width:innerWidth,left:rect.left,right:rect.right,listHidden:getComputedStyle(list).display==='none',pageOverflow:document.documentElement.scrollWidth-innerWidth};
 });
 expect(layout.listHidden).toBe(true);
 expect(layout.left).toBeGreaterThanOrEqual(-2);
 expect(layout.right).toBeLessThanOrEqual(layout.width+2);
 expect(layout.pageOverflow).toBeLessThanOrEqual(2);
});

test('trading cards hide the generic Used selector while other categories retain it',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));
 await page.evaluate(()=>{
  const category=document.getElementById('category'),game=document.getElementById('tcgGame');
  category.value='trading_cards';toggleTcgField();syncGradedCondition();
  game.value='sports_cards';toggleSportsBrand();
 });
 await expect(page.locator('#sportsBrandWrap')).toBeVisible();
 await expect(page.locator('#cardConditionWrap')).toBeVisible();
 await expect(page.locator('#condition')).toBeHidden();
 await expect(page.locator('label[for="condition"]')).toBeHidden();
 await expect(page.locator('#cardCondition')).toBeEnabled();
 await page.locator('#cardCondition').selectOption('near_mint');
 await expect(page.locator('#cardCondition')).toHaveValue('near_mint');
 await page.evaluate(()=>{
  document.getElementById('category').value='video_games';
  toggleTcgField();syncGradedCondition();
 });
 await expect(page.locator('#condition')).toBeVisible();
 await expect(page.locator('#condition')).toBeEnabled();
 await expect(page.locator('#cardConditionWrap')).toBeHidden();
});
