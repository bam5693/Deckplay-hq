const {test,expect}=require('@playwright/test');
const {marker,cleanup}=require('../helpers/release-preview.cjs');
async function signIn(page,role){
 await page.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
 const opener=await page.locator('#accountButton').isVisible()?page.locator('#accountButton'):page.locator('[data-dock="profile"]');await opener.click();
 await page.locator('#authEmail').fill(process.env['DECKPLAY_TEST_'+role+'_EMAIL']);await page.locator('#authPassword').fill(process.env['DECKPLAY_TEST_'+role+'_PASSWORD']);
 await page.waitForFunction(()=>!!signupCaptchaToken,{},{timeout:25000});await page.locator('#authSubmit').click();await expect(page.locator('#authModal')).not.toHaveClass(/open/,{timeout:25000});
 await expect.poll(()=>page.evaluate(()=>!!currentUser)).toBe(true);
}
test('seller uploads and lists; buyer saves, messages and offers; seller accepts and locks',async({page,browser})=>{
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await signIn(page,'SELLER');
 const buyerContext=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,viewport:page.viewportSize(),httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE});
 const buyer=await buyerContext.newPage();buyer.on('pageerror',e=>errors.push(e.message));
 const title=marker();
 try {
  const sell=page.locator('[data-dock="sell"]');
  if(await sell.isVisible())await sell.click();else await page.getByRole('button',{name:'＋ Sell an item',exact:true}).click();
  await page.locator('#item').fill(title);await page.locator('#tcgGame').selectOption('one_piece');await page.locator('#cardCondition').selectOption('near_mint');await page.locator('#price').fill('25');
  await page.locator('#photos').setInputFiles({name:'test-only.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await expect(page.locator('#listingPhotoCount')).toContainText('1 of 5');
  await page.locator('#publishButton').click();await expect(page.locator('#sellModal')).not.toHaveClass(/open/,{timeout:30000});
  await signIn(buyer,'BUYER');await buyer.locator('[data-cat="Trading Cards"]').first().click();await buyer.locator('#search').fill(title);
  const card=buyer.locator('#grid .card').filter({hasText:title});await expect(card).toHaveCount(1,{timeout:25000});
  await card.locator('[data-heart]').click();await expect(card.locator('[data-heart]')).toHaveText('♥');
  await card.locator('[data-view]').click();await buyer.locator('[data-contact-id]').click();await buyer.locator('#composeBody').fill(title+' — hello from the automated buyer');await buyer.locator('#composeForm button[type="submit"]').click();await expect(buyer.locator('#composeModal')).not.toHaveClass(/open/,{timeout:20000});
  await buyer.locator('[data-price-offer-id]').click();await buyer.locator('#priceOfferAmount').fill('19');
  const offerResponse=buyer.waitForResponse(r=>r.url().endsWith('/rpc/submit_price_offer')&&r.request().method()==='POST');
  await buyer.locator('#priceOfferForm button[type="submit"]').click();const response=await offerResponse;expect(response.ok()).toBe(true);const offerId=await response.json();
  await expect(buyer.locator('#priceOfferModal')).not.toHaveClass(/open/);
  if(await page.locator('[data-dock="inbox"]').isVisible())await page.locator('[data-dock="inbox"]').click();else {await page.locator('#accountButton').click();await page.locator('#myMessages').click()}
  await page.locator('[data-conversation-id]').filter({hasText:'test_buyer'}).click();await expect(page.locator('#conversationThread')).toContainText(title+' — hello',{timeout:15000});
  const contactId=await page.locator('.chat-composer').getAttribute('data-chat-recipient');
  await page.locator('#chatInput').fill('Question about the card back');
  await page.goBack();
  await expect(page.locator('#inboxPage')).toBeVisible();
  await expect(page.locator('#inboxPage')).not.toHaveClass(/thread-open/);
  await page.evaluate(id=>showInboxPage(id),contactId);
  await expect(page.locator('#chatInput')).toHaveValue('Question about the card back');
  await page.goBack();
  await expect(page.locator('#inboxPage')).not.toHaveClass(/thread-open/);
  await page.locator('[data-conversation-id="'+contactId+'"]').click();
  page.once('dialog',d=>d.accept());await page.locator('[data-inbox-price="accept"][data-offer="'+offerId+'"]').click();
  await expect(page.locator('#conversationThread')).toContainText('accepted',{timeout:20000});
  await buyer.reload({waitUntil:'domcontentloaded',timeout:30000});await buyer.locator('[data-cat="Trading Cards"]').first().click();await buyer.locator('#search').fill(title);await expect.poll(()=>buyer.evaluate(()=>listingSource)).toBe('live');await expect(buyer.locator('#grid .card').filter({hasText:title})).toHaveCount(0,{timeout:20000});
  expect(errors).toEqual([]);
 } finally {try{await cleanup(page,title)}finally{await buyerContext.close()}}
});
