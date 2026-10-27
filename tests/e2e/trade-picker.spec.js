const {test,expect}=require('@playwright/test');
test('trade picker includes inventory beyond 100 items and discards a switched account response',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'inventory-owner'};window.pickerRanges=[];
  supabaseClient.from=()=>{
   const q={};for(const key of ['select','eq','order'])q[key]=()=>q;
   q.range=async(start,end)=>{pickerRanges.push([start,end]);return {data:Array.from({length:Math.min(100,121-start)},(_,i)=>({id:'item-'+(start+i),title:'Collector item '+(start+i)})),error:null}};return q;
  };
  document.getElementById('detailContent').innerHTML='<button data-trade-id="target" data-trade-seller="other">Trade</button>';
  document.querySelector('[data-trade-id]').click();
 });
 await expect(page.locator('#tradeOfferedListing option')).toHaveCount(122);
 await page.locator('#tradeOfferedListing').selectOption('item-120');
 await expect(page.locator('#tradeOfferedListing')).toHaveValue('item-120');
 expect(await page.evaluate(()=>pickerRanges)).toEqual([[0,99],[100,199]]);
 await page.evaluate(()=>{
  supabaseClient.from=()=>{const q={};for(const key of ['select','eq','order'])q[key]=()=>q;q.range=()=>new Promise(resolve=>window.finishPicker=resolve);return q};
  document.querySelector('[data-trade-id]').click();currentUser={id:'different-account'};
  finishPicker({data:[{id:'private-item',title:'Private inventory'}],error:null});
 });
 await expect(page.locator('#tradeOfferedListing option[value="private-item"]')).toHaveCount(0);
});

async function composeFixture(page){
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'buyer-fixture'};tradeTargetId='target-fixture';tradeRecipientId='seller-fixture';window.tradeWrites=[];
  supabaseClient.from=()=>{const q={select:()=>q,single:()=>new Promise((resolve,reject)=>{window.finishTrade=resolve;window.failTrade=reject})};q.insert=value=>{tradeWrites.push(value);return q};return q};
  sendCollectorEmailForSource=async()=>{};openModal('tradeComposeModal');
 });
 await page.locator('#tradeOfferNote').fill('My original trade proposal');
}
test('repeated trade submission sends once and a connection error preserves the draft for retry',async({page})=>{
 await composeFixture(page);await page.locator('#tradeComposeForm button[type="submit"]').click();
 await page.locator('#tradeComposeForm').dispatchEvent('submit');
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(1);
 await page.evaluate(()=>failTrade(Error('Connection lost')));
 await expect(page.locator('#tradeOfferStatus')).toContainText('Connection lost');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('My original trade proposal');
 await expect(page.locator('#tradeComposeForm button[type="submit"]')).toBeEnabled();
 await page.locator('#tradeComposeForm button[type="submit"]').click();
 expect(await page.evaluate(()=>tradeWrites.length)).toBe(2);
 await page.locator('#tradeOfferNote').fill('A newer trade draft');
 await page.evaluate(()=>finishTrade({data:{id:'sent-trade'},error:null}));
 await expect(page.locator('#tradeOfferStatus')).toContainText('new draft is ready');
 await expect(page.locator('#tradeOfferNote')).toHaveValue('A newer trade draft');
 await expect(page.locator('#tradeComposeModal')).toHaveClass(/open/);
});
test('finishing a trade after an account switch cannot reset or close the new account draft',async({page})=>{
 await composeFixture(page);await page.locator('#tradeComposeForm button[type="submit"]').click();
 await page.evaluate(()=>{currentUser={id:'other-fixture'};tradeTargetId='different-target';tradeRecipientId='different-seller'});
 await page.locator('#tradeOfferNote').fill('Other account private draft');
 await page.evaluate(()=>finishTrade({data:{id:'old-trade'},error:null}));
 await expect(page.locator('#tradeComposeForm button[type="submit"]')).toBeEnabled();
 await expect(page.locator('#tradeOfferNote')).toHaveValue('Other account private draft');
 await expect(page.locator('#tradeComposeModal')).toHaveClass(/open/);
 expect(await page.evaluate(()=>tradeWrites[0])).toMatchObject({sender_id:'buyer-fixture',recipient_id:'seller-fixture',listing_id:'target-fixture'});
});
