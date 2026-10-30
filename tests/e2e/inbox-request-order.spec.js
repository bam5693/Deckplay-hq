const {test,expect}=require('@playwright/test');

test('a former account inbox response cannot replace the new account conversation',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-former-account'};
  syncInboxDraftUser();
  window.pendingInboxMessages=[];
  supabaseClient.from=table=>{
   const q={then:(resolve,reject)=>(table==='collector_messages'
    ?new Promise(done=>pendingInboxMessages.push(done))
    :Promise.resolve({data:[],error:null})).then(resolve,reject)};
   for(const method of ['select','order','limit','in','eq','is'])q[method]=()=>q;
   return q;
  };
  window.formerInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxMessages.length)).toBe(1);
 await page.evaluate(()=>{
  currentUser={id:'fixture-current-account'};
  syncInboxDraftUser();
  window.currentInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxMessages.length)).toBe(2);
 await page.evaluate(async()=>{
  pendingInboxMessages[1]({data:[{
   id:'current-message',sender_id:'current-contact',recipient_id:'fixture-current-account',
   body:'Current account conversation',read_at:new Date().toISOString(),
   created_at:new Date().toISOString()
  }],error:null});
  await currentInboxLoad;
 });
 await expect(page.locator('#messageInbox')).toContainText('Current account conversation');
 await page.evaluate(async()=>{
  pendingInboxMessages[0]({data:[{
   id:'former-message',sender_id:'former-contact',recipient_id:'fixture-former-account',
   body:'Former account private message',read_at:null,created_at:new Date().toISOString()
  }],error:null});
  await formerInboxLoad;
 });
 await expect(page.locator('#messageInbox')).toContainText('Current account conversation');
 await expect(page.locator('#messageInbox')).not.toContainText('Former account private message');
 await expect(page.locator('#messageInbox [data-conversation-id="current-contact"]')).toHaveCount(1);
 await expect(page.locator('#messageInbox [data-conversation-id="former-contact"]')).toHaveCount(0);
});

test('a former account inbox response arriving first cannot flash private messages',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-former-account'};
  syncInboxDraftUser();
  window.pendingInboxMessages=[];
  supabaseClient.from=table=>{
   const q={then:(resolve,reject)=>(table==='collector_messages'
    ?new Promise(done=>pendingInboxMessages.push(done))
    :Promise.resolve({data:[],error:null})).then(resolve,reject)};
   for(const method of ['select','order','limit','in','eq','is'])q[method]=()=>q;
   return q;
  };
  window.formerInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxMessages.length)).toBe(1);
 await page.evaluate(()=>{
  currentUser={id:'fixture-current-account'};
  syncInboxDraftUser();
  window.currentInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxMessages.length)).toBe(2);
 await page.evaluate(async()=>{
  pendingInboxMessages[0]({data:[{
   id:'former-message',sender_id:'former-contact',recipient_id:'fixture-former-account',
   body:'Former account private message',read_at:null,created_at:new Date().toISOString()
  }],error:null});
  await formerInboxLoad;
 });
 await expect(page.locator('#messageInbox')).not.toContainText('Former account private message');
 await expect(page.locator('#messageInbox [data-conversation-id="former-contact"]')).toHaveCount(0);
 await page.evaluate(async()=>{
  pendingInboxMessages[1]({data:[{
   id:'current-message',sender_id:'current-contact',recipient_id:'fixture-current-account',
   body:'Current account conversation',read_at:new Date().toISOString(),
   created_at:new Date().toISOString()
  }],error:null});
  await currentInboxLoad;
 });
 await expect(page.locator('#messageInbox')).toContainText('Current account conversation');
 await expect(page.locator('#messageInbox')).not.toContainText('Former account private message');
});

test('sign-out during an inbox request never restores private conversations',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-signing-out'};
  syncInboxDraftUser();
  window.pendingInboxMessages=[];
  supabaseClient.from=table=>{
   const q={then:(resolve,reject)=>(table==='collector_messages'
    ?new Promise(done=>pendingInboxMessages.push(done))
    :Promise.resolve({data:[],error:null})).then(resolve,reject)};
   for(const method of ['select','order','limit','in','eq','is'])q[method]=()=>q;
   return q;
  };
  window.inFlightInbox=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxMessages.length)).toBe(1);
 await page.evaluate(()=>{currentUser=null;syncInboxDraftUser()});
 await page.evaluate(async()=>{
  pendingInboxMessages[0]({data:[{
   id:'signed-out-message',sender_id:'private-contact',recipient_id:'fixture-signing-out',
   body:'Private message after sign-out',read_at:null,created_at:new Date().toISOString()
  }],error:null});
  await inFlightInbox;
 });
 await expect(page.locator('#messageInbox')).not.toContainText('Private message after sign-out');
 await expect(page.locator('#messageInbox [data-conversation-id="private-contact"]')).toHaveCount(0);
});

test('Tanner to Jayden: a late profile lookup cannot restore the previous inbox',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  window.pendingInboxProfiles=[];
  supabaseClient.from=table=>{
   const owner=currentUser?.id;
   const q={then:(resolve,reject)=>{
    if(table==='profiles')return new Promise(done=>pendingInboxProfiles.push(done)).then(resolve,reject);
    const data=table==='collector_messages'?[{
     id:'message-'+owner,sender_id:'contact-'+owner,recipient_id:owner,
     body:'Private inbox for '+owner,read_at:null,created_at:new Date().toISOString()
    }]:[];
    return Promise.resolve({data,error:null}).then(resolve,reject);
   }};
   for(const method of ['select','order','limit','in','eq','is'])q[method]=()=>q;
   return q;
  };
  currentUser={id:'fixture-tanner'};syncInboxDraftUser();
  window.tannerInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxProfiles.length)).toBe(1);
 await page.evaluate(()=>{
  currentUser={id:'fixture-jayden'};syncInboxDraftUser();
  window.jaydenInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxProfiles.length)).toBe(2);
 await page.evaluate(async()=>{
  pendingInboxProfiles[1]({data:[{id:'contact-fixture-jayden',username:'jayden-contact'}],error:null});
  await jaydenInboxLoad;
 });
 await expect(page.locator('#messageInbox')).toContainText('Private inbox for fixture-jayden');
 await page.evaluate(async()=>{
  pendingInboxProfiles[0]({data:[{id:'contact-fixture-tanner',username:'tanner-contact'}],error:null});
  await tannerInboxLoad;
 });
 await expect(page.locator('#messageInbox')).toContainText('Private inbox for fixture-jayden');
 await expect(page.locator('#messageInbox')).not.toContainText('Private inbox for fixture-tanner');
 await expect(page.locator('#messageInbox [data-conversation-id="contact-fixture-tanner"]')).toHaveCount(0);
});

test('Charles to Kyle: late deal-status enrichment cannot replace the new inbox',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  window.pendingInboxDeals=[];
  supabaseClient.from=table=>{
   const owner=currentUser?.id;
   const q={then:(resolve,reject)=>{
    if(table==='deal_progress')return new Promise(done=>pendingInboxDeals.push(done)).then(resolve,reject);
    const data=table==='collector_messages'?[{
     id:'message-'+owner,sender_id:'contact-'+owner,recipient_id:owner,
     body:'Private inbox for '+owner,read_at:null,created_at:new Date().toISOString()
    }]:table==='profiles'?[{id:'contact-'+owner,username:'contact-'+owner}]:[];
    return Promise.resolve({data,error:null}).then(resolve,reject);
   }};
   for(const method of ['select','order','limit','in','eq','is'])q[method]=()=>q;
   return q;
  };
  currentUser={id:'fixture-charles'};syncInboxDraftUser();
  window.charlesInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxDeals.length)).toBe(1);
 await page.evaluate(()=>{
  currentUser={id:'fixture-kyle'};syncInboxDraftUser();
  window.kyleInboxLoad=loadInbox();
 });
 await expect.poll(()=>page.evaluate(()=>pendingInboxDeals.length)).toBe(2);
 await page.evaluate(async()=>{
  pendingInboxDeals[1]({data:[{buyer_id:'fixture-kyle',seller_id:'contact-fixture-kyle',status:'accepted'}],error:null});
  await kyleInboxLoad;
 });
 await expect(page.locator('#messageInbox')).toContainText('Private inbox for fixture-kyle');
 await page.evaluate(async()=>{
  pendingInboxDeals[0]({data:[{buyer_id:'fixture-charles',seller_id:'contact-fixture-charles',status:'pending'}],error:null});
  await charlesInboxLoad;
 });
 await expect(page.locator('#messageInbox')).toContainText('Private inbox for fixture-kyle');
 await expect(page.locator('#messageInbox')).not.toContainText('Private inbox for fixture-charles');
 await expect(page.locator('#messageInbox [data-conversation-id="contact-fixture-charles"]')).toHaveCount(0);
});
