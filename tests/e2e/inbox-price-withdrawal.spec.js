const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
});
async function ready(page){await page.goto('/');await page.waitForLoadState('networkidle')}
async function outgoingPriceFixture(page){
 await ready(page);
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-buyer'};window.withdrawCalls=[];
  window.outgoingOffer={id:'outgoing-price',buyer_id:'fixture-buyer',seller_id:'fixture-seller',amount:25,status:'pending',last_actor_id:'fixture-buyer',updated_at:new Date().toISOString()};
  supabaseClient.from=table=>{
   const data=table==='price_offers'?[outgoingOffer]:table==='profiles'?[{id:'fixture-seller',username:'collector'}]:[];
   const q={then:resolve=>Promise.resolve({data,error:null}).then(resolve)};
   for(const key of ['select','order','limit','in','eq','or'])q[key]=()=>q;return q;
  };
  supabaseClient.rpc=(name,args)=>{withdrawCalls.push({name,args});return new Promise(resolve=>window.finishWithdrawal=resolve)};
  await showInboxPage('fixture-seller');
 });
}
test('outgoing price offer can be withdrawn directly in Inbox with one protected submission',async({page})=>{
 await outgoingPriceFixture(page);
 await expect(page.locator('#conversationThread')).toContainText('$25.00');
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-inbox-price="withdraw"]').click();
 await expect(page.locator('[data-inbox-price="withdraw"]')).toBeDisabled();
 await page.locator('[data-inbox-price="withdraw"]').evaluate(button=>button.click());
 expect(await page.evaluate(()=>withdrawCalls)).toEqual([{name:'respond_price_offer',args:{p_offer_id:'outgoing-price',p_action:'withdraw',p_amount:null}}]);
 await page.evaluate(()=>{outgoingOffer.status='withdrawn';finishWithdrawal({error:null})});
 await expect(page.locator('#conversationThread')).toContainText('withdrawn');await expect(page.locator('[data-inbox-price="withdraw"]')).toHaveCount(0);
});
test('withdrawal network failure restores the offer action and keeps the message draft',async({page})=>{
 await outgoingPriceFixture(page);await page.locator('#chatInput').fill('Private question about this offer');
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-inbox-price="withdraw"]').click();
 await page.evaluate(()=>finishWithdrawal({error:{message:'Connection lost'}}));
 await expect(page.locator('[data-inbox-price="withdraw"]')).toBeEnabled();
 await expect(page.locator('#chatInput')).toHaveValue('Private question about this offer');
 expect(await page.evaluate(()=>withdrawCalls.length)).toBe(1);
});
