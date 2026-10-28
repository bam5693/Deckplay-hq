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
