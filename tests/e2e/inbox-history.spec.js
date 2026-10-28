const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
});
test('Jayden can load older TCG conversation messages without losing a draft',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();
  currentUser={id:'fixture-seller'};syncInboxDraftUser();
  const base=Date.parse('2026-10-28T20:00:00Z');
  const recent=Array.from({length:500},(_,i)=>({id:'recent-'+i,sender_id:'buyer-jayden',recipient_id:'fixture-seller',body:'One Piece card chat '+i,read_at:new Date(base).toISOString(),created_at:new Date(base-i*60000).toISOString()}));
  const older=[{id:'old-jayden',sender_id:'buyer-jayden',recipient_id:'fixture-seller',body:'Original Luffy deck inquiry',read_at:new Date(base).toISOString(),created_at:new Date(base-600*60000).toISOString()}];
  window.olderMessageQueries=0;
  supabaseClient.from=table=>{
   let olderQuery=false;
   const q={then:(resolve,reject)=>Promise.resolve({data:table==='collector_messages'?(olderQuery?older:recent):table==='profiles'?[{id:'buyer-jayden',username:'Jayden'}]:[],error:null}).then(resolve,reject)};
   for(const name of ['select','order','limit','in','eq','is','lt'])q[name]=()=>q;
   q.or=()=>{olderQuery=true;window.olderMessageQueries++;return q};
   return q;
  };
  await showInboxPage('buyer-jayden');
 });
 await page.locator('#chatInput').fill('My private draft about Zoro');
 await expect(page.locator('[data-inbox-older]')).toBeVisible();
 await page.locator('[data-inbox-older]').click();
 await expect(page.locator('.conversation-bubbles')).toContainText('Original Luffy deck inquiry');
 await expect(page.locator('#chatInput')).toHaveValue('My private draft about Zoro');
 await expect(page.locator('[data-inbox-older]')).toHaveCount(0);
 await expect(page.getByText('Beginning of conversation')).toBeVisible();
 expect(await page.evaluate(()=>window.olderMessageQueries)).toBe(1);
 await page.evaluate(()=>loadInbox('buyer-jayden'));
 await expect(page.locator('.conversation-bubbles')).toContainText('Original Luffy deck inquiry');
 await expect(page.locator('#chatInput')).toHaveValue('My private draft about Zoro');
});
