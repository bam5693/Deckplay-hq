const {test,expect}=require('@playwright/test');
const base=Date.parse('2026-10-29T12:00:00Z');
const timestamp=i=>new Date(base-i*1000).toISOString();
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
});
async function fixture(page,kind){
 await page.evaluate(async kind=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-owner'};syncInboxDraftUser();
  const stamp=i=>new Date(Date.parse('2026-10-29T12:00:00Z')-i*1000).toISOString();
  const initial=Array.from({length:200},(_,i)=>kind==='price'
   ?{id:'p'+String(i).padStart(4,'0'),buyer_id:'fixture-owner',seller_id:'tanner',amount:20,status:'pending',last_actor_id:'fixture-owner',updated_at:stamp(i)}
   :{id:'t'+String(i).padStart(4,'0'),sender_id:'fixture-owner',recipient_id:'tanner',status:'declined',offer_note:'Sports lot '+i,created_at:stamp(i),offered_listing_ids:[]});
  const older=kind==='price'
   ?{id:'p-old',buyer_id:'fixture-owner',seller_id:'jayden',amount:17,status:'declined',last_actor_id:'jayden',updated_at:stamp(250)}
   :{id:'t-old',sender_id:'fixture-owner',recipient_id:'jayden',status:'declined',offer_note:'One Piece deck',created_at:stamp(250),offered_listing_ids:[]};
  window.activityCursorFilters=[];window.failOlderActivity=false;
  supabaseClient.from=table=>{
   let olderQuery=false;
   const q={then:(resolve,reject)=>{
    let data=[];
    if(table==='profiles')data=[{id:'tanner',username:'Tanner'},{id:'jayden',username:'Jayden'}];
    if(table===(kind==='price'?'price_offers':'trade_offers'))data=olderQuery?[older]:initial;
    const error=olderQuery&&failOlderActivity?{message:'Offline'}:null;
    return Promise.resolve({data:error?null:data,error}).then(resolve,reject);
   }};
   for(const key of ['select','order','limit','eq','in','is'])q[key]=()=>q;
   q.or=value=>{olderQuery=true;activityCursorFilters.push({table,filter:value});return q};
   return q;
  };
  await showInboxPage();
 },kind);
}
test('Tanner sports offer window can page to Jayden TCG offer-only conversation without losing filters or drafts',async({page})=>{
 await fixture(page,'price');
 await page.locator('[data-conversation-id="tanner"]').click();
 await page.locator('#chatInput').fill('Private draft for Tanner');
 await page.locator('#inboxThreadBack').evaluate(el=>el.click());
 await page.locator('[data-conversation-search]').fill('Jayden');
 await expect(page.locator('[data-conversation-id="tanner"]')).toBeHidden();
 await expect(page.locator('[data-inbox-more-activity]')).toBeVisible();
 await page.locator('[data-inbox-more-activity]').click();
 await expect(page.locator('[data-conversation-id="jayden"]')).toBeVisible();
 await expect(page.locator('[data-conversation-search]')).toHaveValue('Jayden');
 await page.locator('[data-conversation-search]').fill('Tanner');
 await page.locator('[data-conversation-id="tanner"]').click();
 await expect(page.locator('#chatInput')).toHaveValue('Private draft for Tanner');
 const state=await page.evaluate(()=>({size:inboxOlderPriceOffers.size,filter:activityCursorFilters[0]}));
 expect(state.size).toBe(1);
 expect(state.filter).toEqual({table:'price_offers',filter:'updated_at.lt.2026-10-29T11:56:41.000Z,and(updated_at.eq.2026-10-29T11:56:41.000Z,id.lt.p0199)'});
});
test('Kyle can retry an offline activity page without advancing the cursor',async({page})=>{
 await fixture(page,'price');
 await page.evaluate(()=>{failOlderActivity=true});
 const initial=await page.evaluate(()=>inboxPriceCursor);
 await page.locator('[data-inbox-more-activity]').click();
 await expect(page.locator('[data-inbox-activity-status]')).toContainText('Try again');
 expect(await page.evaluate(()=>inboxPriceCursor)).toEqual(initial);
 await page.evaluate(()=>{failOlderActivity=false});
 await page.locator('[data-inbox-more-activity]').click();
 await expect(page.locator('[data-conversation-id="jayden"]')).toBeVisible();
});
test('Charles isolates older trade-only pages and discards them on account switch',async({page})=>{
 await fixture(page,'trade');
 await page.locator('[data-inbox-more-activity]').click();
 await expect(page.locator('[data-conversation-id="jayden"]')).toBeVisible();
 await page.locator('[data-conversation-id="jayden"]').click();
 await expect(page.locator('.conversation-bubbles')).toContainText('One Piece deck');
 const before=await page.evaluate(()=>({size:inboxOlderTradeOffers.size,filter:activityCursorFilters[0]}));
 expect(before.size).toBe(1);
 expect(before.filter.table).toBe('trade_offers');
 expect(before.filter.filter).toContain('created_at.lt.2026-10-29T11:56:41.000Z');
 await page.evaluate(()=>{currentUser={id:'other-collector'};syncInboxDraftUser()});
 expect(await page.evaluate(()=>({size:inboxOlderTradeOffers.size,cursor:inboxTradeCursor}))).toEqual({size:0,cursor:null});
 await expect(page.locator('[data-conversation-id="jayden"]')).toHaveCount(0);
});
