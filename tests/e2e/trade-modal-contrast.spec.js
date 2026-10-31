const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
});
for(const theme of ['light','dark']){
 test('Trade offers white card is readable on '+theme+' theme',async({page})=>{
  await page.evaluate(theme=>{
   document.documentElement.dataset.theme=theme;
   document.getElementById('tradeOffersList').innerHTML=`
    <article class="trade-offer-card">
     <div class="kind">Sent to @collector</div>
     <div class="chat-trade-items">
      <div><small>You give</small><article class="trade-snapshot-item"><strong>One Piece cards</strong><small>Listing price now: $1.00</small><details><summary>Item details</summary></details></article></div>
      <div><small>You receive</small><article class="trade-snapshot-item"><strong>Handsome Chansey</strong><small>Listing price now: $9999.69</small></article></div>
     </div>
     <small class="muted">Current listing details · older proposal has no saved item snapshot</small>
     <p>Proposal terms: One Piece and cash</p><strong>Original offer: cancelled</strong>
     <button class="ghost" type="button">Open conversation with @collector</button>
    </article>`;
   openModal('tradesModal');
  },theme);
  await expect(page.locator('#tradesModal .trade-offer-card')).toBeVisible();
  const result=await page.locator('#tradesModal .trade-offer-card').evaluate(el=>{
   const bg=getComputedStyle(el).backgroundColor;
   const samples=[...el.querySelectorAll('strong,small,.kind,p,summary')].map(node=>({
    text:node.textContent.trim(),color:getComputedStyle(node).color
   }));
   return {bg,samples,button:getComputedStyle(el.querySelector('button')).color};
  });
  expect(result.bg).toBe('rgb(255, 255, 255)');
  for(const sample of result.samples)expect(sample.color, sample.text).not.toBe('rgb(232, 238, 248)');
  for(const sample of result.samples){
   const channels=sample.color.match(/\d+/g)?.slice(0,3).map(Number)||[];
   const luminosity=channels.reduce((sum,value)=>sum+value,0);
   expect(luminosity,sample.text+' must not be light on white').toBeLessThan(390);
  }
  expect(result.button).toBe('rgb(255, 255, 255)');
 });
}
