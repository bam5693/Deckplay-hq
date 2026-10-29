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
 // Record a visible message anchor, away from the bottom of the history.
 await page.locator('.conversation-bubbles').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=el.scrollHeight/2});
 const anchor=await page.locator('.message-bubble').evaluateAll(nodes=>{const box=nodes[0].parentElement.getBoundingClientRect();const node=nodes.find(n=>n.getBoundingClientRect().top>=box.top);return {text:node.textContent,offset:node.getBoundingClientRect().top-box.top}});
 await page.locator('[data-inbox-older]').click();
 await expect(page.locator('.conversation-bubbles')).toContainText('Original Luffy deck inquiry');
 await expect(page.locator('.conversation-bubbles')).toBeFocused();
 const after=await page.locator('.message-bubble').evaluateAll((nodes,text)=>{const node=nodes.find(n=>n.textContent===text);return node.getBoundingClientRect().top-node.parentElement.getBoundingClientRect().top},anchor.text);
 expect(Math.abs(after-anchor.offset)).toBeLessThan(3);
 await expect(page.locator('#chatInput')).toHaveValue('My private draft about Zoro');
 await expect(page.locator('[data-inbox-older]')).toHaveCount(0);
 await expect(page.getByText('Beginning of conversation')).toBeVisible();
 expect(await page.evaluate(()=>window.olderMessageQueries)).toBe(1);
 await page.evaluate(()=>loadInbox('buyer-jayden'));
 await expect(page.locator('.conversation-bubbles')).toContainText('Original Luffy deck inquiry');
 await expect(page.locator('#chatInput')).toHaveValue('My private draft about Zoro');
});

async function hardwareHistory(page){
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};syncInboxDraftUser();
  const now=Date.parse('2026-10-28T20:00:00Z');
  window.historyRows=Array.from({length:500},(_,i)=>({id:'hardware-'+i,sender_id:i===0?'charles':'kyle',recipient_id:'fixture-seller',body:i===0?'Console inquiry':'Controller condition '+i,read_at:new Date(now).toISOString(),created_at:new Date(now-i*60000).toISOString()}));
  window.historyRequests=[];window.historyPending=[];
  supabaseClient.from=table=>{
   let old=false;
   const q={then:(resolve,reject)=>(old?new Promise(done=>historyPending.push(done)):Promise.resolve({data:table==='collector_messages'?historyRows:table==='profiles'?[{id:'charles',username:'Charles'},{id:'kyle',username:'Kyle'}]:[],error:null})).then(resolve,reject)};
   for(const method of ['select','order','limit','in','eq','is'])q[method]=()=>q;
   q.or=value=>{old=true;historyRequests.push({participants:value});return q};
   q.lt=(key,value)=>{historyRequests.at(-1).before=value;return q};
   return q;
  };
  await showInboxPage('kyle');
 });
}
test('Kyle retries failed history and a full duplicate page does not exhaust it',async({page})=>{
 await hardwareHistory(page);await page.locator('#chatInput').fill('Controller photo draft');
 await page.locator('[data-inbox-older]').click();
 await page.evaluate(()=>historyPending.shift()({error:{message:'Offline'}}));
 await expect(page.locator('[data-inbox-older-status]')).toContainText('Try again');
 await expect(page.locator('[data-inbox-older]')).toBeEnabled();
 await page.locator('[data-inbox-older]').click();
 await page.evaluate(()=>historyPending.shift()({data:historyRows.slice(1,51),error:null}));
 await expect(page.locator('[data-inbox-older]')).toBeEnabled();
 await expect(page.locator('.message-bubble')).toHaveCount(499);
 await page.locator('[data-inbox-older]').click();
 await page.evaluate(()=>historyPending.shift()({data:[],error:null}));
 await expect(page.getByText('Beginning of conversation')).toBeVisible();
 await expect(page.locator('#chatInput')).toHaveValue('Controller photo draft');
 expect(await page.evaluate(()=>historyRequests.every(r=>r.before===historyRows.at(-1).created_at))).toBe(true);
});
test('history arriving after switching conversations cannot reopen the old thread',async({page})=>{
 await hardwareHistory(page);
 await page.locator('[data-inbox-older]').click();
 await page.evaluate(()=>document.querySelector('[data-conversation-id="charles"]').click());
 await expect(page.locator('.chat-person h3')).toHaveText('@Charles');
 await page.evaluate(()=>historyPending.shift()({data:[{id:'late-controller',sender_id:'kyle',recipient_id:'fixture-seller',body:'Private controller history',created_at:'2026-01-01T00:00:00Z'}],error:null}));
 await expect(page.locator('.chat-person h3')).toHaveText('@Charles');
 await expect(page.locator('.conversation-bubbles')).not.toContainText('Private controller history');
});
