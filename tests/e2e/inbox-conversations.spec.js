const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};syncInboxDraftUser();
  const date='2026-10-29T10:00:00.123456Z';
  window.conversationQueries=[];window.conversationPending=[];
  window.leadingMessages=Array.from({length:500},(_,i)=>({id:String(1000-i).padStart(8,'0'),sender_id:'charles',recipient_id:'fixture-seller',body:'Collectible discussion '+i,created_at:date,read_at:date}));
  window.recoveredMessage={id:'00000500',sender_id:'kyle',recipient_id:'fixture-seller',body:'Original console inquiry',created_at:date,read_at:date};
  supabaseClient.from=table=>{let more=false;const q={then:(resolve,reject)=>(more?new Promise(done=>conversationPending.push(done)):Promise.resolve({data:table==='collector_messages'?leadingMessages:table==='profiles'?[{id:'charles',username:'Charles'},{id:'kyle',username:'Kyle'}]:[],error:null})).then(resolve,reject)};for(const key of ['select','order','limit','eq','in','is'])q[key]=()=>q;q.or=value=>{more=true;conversationQueries.push(value);return q};return q};
  await showInboxPage();
 });
});
test('older console collector becomes searchable with a microsecond and id cursor',async({page})=>{
 await page.locator('[data-conversation-search]').fill('Kyle');
 await expect(page.locator('[data-conversation-id="charles"]')).toBeHidden();
 await page.locator('[data-inbox-more-conversations]').click();
 await page.evaluate(()=>conversationPending.shift()({data:[recoveredMessage],error:null}));
 await expect(page.locator('[data-conversation-search]')).toHaveValue('Kyle');
 await expect(page.locator('[data-conversation-id="kyle"]')).toBeVisible();
 await expect(page.locator('[data-inbox-more-conversations]')).toHaveCount(0);
 expect(await page.evaluate(()=>conversationQueries[0])).toBe('created_at.lt.2026-10-29T10:00:00.123456Z,and(created_at.eq.2026-10-29T10:00:00.123456Z,id.lt.00000501)');
 await page.locator('[data-conversation-id="kyle"]').click();
 await expect(page.locator('.conversation-bubbles')).toContainText('Original console inquiry');
 await page.evaluate(()=>loadInbox());
 await expect(page.locator('.conversation-bubbles')).toContainText('Original console inquiry');
});
test('failed conversation paging is retryable without losing the composer draft',async({page})=>{
 await page.locator('[data-conversation-id="charles"]').click();
 await page.locator('#chatInput').fill('Mixed collectible lot draft');
 // Mobile list is intentionally hidden while the thread is open.
 await page.locator('#inboxThreadBack').evaluate(el=>el.click());
 await page.locator('[data-inbox-more-conversations]').click();
 await page.evaluate(()=>conversationPending.shift()({error:{message:'Offline'}}));
 await expect(page.locator('[data-inbox-more-status]')).toContainText('Try again');
 await page.locator('[data-inbox-more-conversations]').click();
 await page.evaluate(()=>conversationPending.shift()({data:[recoveredMessage],error:null}));
 await page.locator('[data-conversation-id="charles"]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Mixed collectible lot draft');
});
test('older conversations arriving after account switch are discarded',async({page})=>{
 await page.locator('[data-inbox-more-conversations]').click();
 await page.evaluate(()=>{currentUser={id:'different-collector'};syncInboxDraftUser();conversationPending.shift()({data:[recoveredMessage],error:null})});
 await expect(page.locator('[data-conversation-id="kyle"]')).toHaveCount(0);
 expect(await page.evaluate(()=>inboxOlderMessages.size)).toBe(0);
 expect(await page.evaluate(()=>inboxConversationCursor)).toBe(null);
});
test('Tanner and Jayden see local calendar days across sports, TCG and collectible messages',async({page})=>{
 await page.evaluate(async()=>{
  leadingMessages=[
   {id:'day3',sender_id:'charles',recipient_id:'fixture-seller',body:'Collectible follow-up',created_at:'2026-10-29T12:30:00Z',read_at:'yes'},
   {id:'day2',sender_id:'charles',recipient_id:'fixture-seller',body:'Jayden TCG deck details',created_at:'2026-10-29T12:00:00Z',read_at:'yes'},
   {id:'day1',sender_id:'charles',recipient_id:'fixture-seller',body:'Tanner sports lot details',created_at:'2026-10-28T12:00:00Z',read_at:'yes'}
  ];
  await showInboxPage('charles');
 });
 await expect(page.locator('.conversation-day')).toHaveCount(2);
 await expect(page.locator('.conversation-day').first()).toContainText('2026');
 await expect(page.locator('.conversation-bubbles .chat-text').first()).toContainText('Tanner sports lot');
 await expect(page.locator('.conversation-bubbles .chat-text').last()).toContainText('Collectible follow-up');
 const order=await page.locator('.conversation-bubbles').evaluate(el=>[...el.children].map(x=>x.classList.contains('conversation-day')?'date':'message'));
 expect(order).toEqual(['date','message','date','message','message']);
});
