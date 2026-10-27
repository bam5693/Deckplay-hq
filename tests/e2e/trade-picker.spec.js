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
