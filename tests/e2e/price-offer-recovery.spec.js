const {test,expect}=require('@playwright/test');
async function ready(page){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'offer-buyer'};window.offerRequests=[];
  items=['a','b'].map(id=>({id,databaseId:id,n:'Offer item '+id,p:25,sellerId:'offer-seller',priceOffers:true,imageUrls:[]}));
  supabaseClient.rpc=(name,args)=>{offerRequests.push({name,args});return new Promise((resolve,reject)=>{window.finishOffer=resolve;window.failOffer=reject})};
  sendCollectorEmailForSource=async()=>{};
  showDetails(items[0]);document.querySelector('[data-price-offer-id]').click();
 });
 await expect(page.locator('#priceOfferModal')).toHaveClass(/open/);
 await page.locator('#priceOfferAmount').fill('19');
}
const submit=page=>page.evaluate(()=>document.getElementById('priceOfferForm').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));
test('repeated price-offer submissions send once; connection failure preserves the amount and allows retry',async({page})=>{
 await ready(page);await submit(page);await submit(page);
 expect(await page.evaluate(()=>offerRequests.length)).toBe(1);
 await expect(page.locator('#priceOfferForm button')).toBeDisabled();
 await page.evaluate(()=>failOffer(Error('Connection lost')));
 await expect(page.locator('#priceOfferStatus')).toContainText('Connection lost');
 await expect(page.locator('#priceOfferAmount')).toHaveValue('19');await expect(page.locator('#priceOfferForm button')).toBeEnabled();
 await submit(page);expect(await page.evaluate(()=>offerRequests.length)).toBe(2);
 await page.evaluate(()=>finishOffer({data:'offer-id',error:null}));
 await expect(page.locator('#priceOfferModal')).not.toHaveClass(/open/);
});
test('an earlier successful offer preserves a newer amount draft',async({page})=>{
 await ready(page);await submit(page);await page.locator('#priceOfferAmount').fill('21');
 await page.evaluate(()=>finishOffer({data:'offer-id',error:null}));
 await expect(page.locator('#priceOfferModal')).toHaveClass(/open/);await expect(page.locator('#priceOfferAmount')).toHaveValue('21');
 await expect(page.locator('#priceOfferStatus')).toContainText('$19.00');
 await expect(page.locator('#priceOfferForm button')).toBeEnabled();
});
test('late offer responses do not close another listing offer or expose errors to a different account',async({page})=>{
 for(const failed of [false,true]){
  await ready(page);await submit(page);
  await page.evaluate(()=>{currentUser={id:'second-buyer'};showDetails(items[1]);document.querySelector('[data-price-offer-id]').click()});
  await page.locator('#priceOfferAmount').fill('23');
  await page.evaluate(failed=>finishOffer({data:failed?null:'offer-id',error:failed?{message:'Private first-account error'}:null}),failed);
  await expect(page.locator('#priceOfferModal')).toHaveClass(/open/);
  await expect(page.locator('#priceOfferContext')).toContainText('item b');await expect(page.locator('#priceOfferAmount')).toHaveValue('23');
  await expect(page.locator('#priceOfferStatus')).toHaveText('');await expect(page.locator('#priceOfferForm button')).toBeEnabled();
 }
});
test('out-of-range price offers do not reach the service even through a synthetic submit event',async({page})=>{
 await ready(page);await page.locator('#priceOfferAmount').fill('100001');await submit(page);
 expect(await page.evaluate(()=>offerRequests.length)).toBe(0);await expect(page.locator('#priceOfferStatus')).toContainText('valid price');
});

test('price-offer responses recover from a connection failure and ignore duplicate clicks',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  closeModal('priceOfferModal');closeModal('detailModal');openModal('priceOffersModal');
  document.getElementById('priceOffersList').innerHTML='<button data-price-action="accept" data-price-id="offer-a">Accept</button>';
  window.offerReloads=0;loadPriceOffers=async()=>{offerReloads++};loadListings=async()=>{};refreshNotificationCount=async()=>{};
 });
 page.on('dialog',d=>d.accept());
 const respond=()=>page.evaluate(()=>document.querySelector('[data-price-action]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
 await respond();await respond();expect(await page.evaluate(()=>offerRequests.length)).toBe(1);
 await page.evaluate(()=>failOffer(Error('Response connection lost')));
 await expect(page.locator('[data-price-action]')).toBeEnabled();
 await respond();expect(await page.evaluate(()=>offerRequests.length)).toBe(2);
 await page.evaluate(()=>finishOffer({error:null}));
 await expect.poll(()=>page.evaluate(()=>offerReloads)).toBe(1);
});

test('late price-offer response errors do not refresh another account or leave controls locked',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  closeModal('priceOfferModal');closeModal('detailModal');openModal('priceOffersModal');
  document.getElementById('priceOffersList').innerHTML='<button data-price-action="decline" data-price-id="offer-a">Decline</button>';
  window.offerReloads=0;window.offerToasts=[];loadPriceOffers=async()=>{offerReloads++};toast=message=>offerToasts.push(message);
 });
 page.on('dialog',d=>d.accept());await page.locator('[data-price-action]').click();
 await page.evaluate(()=>{currentUser={id:'second-account'};finishOffer({error:{message:'Private response error'}})});
 await expect(page.locator('[data-price-action]')).toBeEnabled();
 expect(await page.evaluate(()=>({reloads:offerReloads,toasts:offerToasts}))).toEqual({reloads:0,toasts:[]});
});


test('Jayden TCG price counteroffers reject fractional cents and show the current amount in both surfaces',async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  closeModal('priceOfferModal');closeModal('detailModal');openModal('priceOffersModal');
  document.getElementById('priceOffersList').innerHTML='<button type="button" data-price-action="counter" data-price-id="offer-tcg" data-current-amount="19.00">Counteroffer</button>';
 });
 const values=['19.999','18.75','18.751','17.50'],defaults=[];
 page.on('dialog',async dialog=>{
  if(dialog.type()==='prompt'){defaults.push(dialog.defaultValue());await dialog.accept(values.shift())}
  else await dialog.accept();
 });
 await page.locator('[data-price-action="counter"]').click();
 expect(await page.evaluate(()=>offerRequests.length)).toBe(0);
 await page.locator('[data-price-action="counter"]').click();
 expect(await page.evaluate(()=>offerRequests[0]?.args)).toMatchObject({p_offer_id:'offer-tcg',p_action:'counter',p_amount:18.75});
 await page.evaluate(()=>finishOffer({error:null}));
 await expect(page.locator('#priceOffersList')).toContainText('No price offers yet');
 await page.evaluate(()=>{
  closeModal('priceOffersModal');
  document.getElementById('messageInbox').innerHTML='<p class="price-offer-actions"><button type="button" data-inbox-price="counter" data-offer="offer-tcg2" data-current-amount="22.00">Counter</button></p>';
 });
 await page.locator('[data-inbox-price="counter"]').click();
 expect(await page.evaluate(()=>offerRequests.length)).toBe(1);
 await page.locator('[data-inbox-price="counter"]').click();
 expect(await page.evaluate(()=>offerRequests[1]?.args)).toMatchObject({p_offer_id:'offer-tcg2',p_action:'counter',p_amount:17.5});
 expect(defaults).toEqual(['19.00','19.00','22.00','22.00']);
 await page.evaluate(()=>finishOffer({error:null}));
});
