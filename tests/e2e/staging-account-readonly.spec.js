const {test,expect}=require('@playwright/test');
const {signIn}=require('../helpers/staging.cjs');
for(const role of ['BUYER','SELLER'])test('deployed synthetic '+role.toLowerCase()+' session, marketplace and private data scope',async({page})=>{
 await signIn(page,role);
 const result=await page.evaluate(async()=>{
  const id=currentUser?.id;
  const [messages,trades,offers]=await Promise.all([
   supabaseClient.from('collector_messages').select('sender_id,recipient_id').limit(30),
   supabaseClient.from('trade_offers').select('sender_id,recipient_id').limit(30),
   supabaseClient.from('price_offers').select('buyer_id,seller_id').limit(30)
  ]);
  return {historyReady:typeof inboxDaySeparator==='function',interestsReady:typeof setProfileInterest==='function',signedIn:!!id,errors:[messages,trades,offers].some(x=>!!x.error),messagesScoped:(messages.data||[]).every(x=>x.sender_id===id||x.recipient_id===id),tradesScoped:(trades.data||[]).every(x=>x.sender_id===id||x.recipient_id===id),offersScoped:(offers.data||[]).every(x=>x.buyer_id===id||x.seller_id===id),cardGames:[...document.getElementById('tcgGame').options].filter(x=>x.value).map(x=>x.value),wantedGames:[...document.getElementById('wantedGame').options].map(x=>x.value)};
 });
 expect(result.historyReady&&result.interestsReady).toBe(true);
 expect(result.signedIn).toBe(true);expect(result.errors).toBe(false);
 expect(result.messagesScoped&&result.tradesScoped&&result.offersScoped).toBe(true);
 expect(result.wantedGames).toEqual(expect.arrayContaining(result.cardGames));
 await page.evaluate(()=>showMainMarketplace());await expect(page.locator('#market')).toBeVisible();
 await page.evaluate(()=>showInboxPage());await expect(page.locator('#inboxPage')).toBeVisible();
 await expect(page.locator('#messageInbox')).not.toContainText('Could not load conversations');
 await page.evaluate(()=>document.getElementById('profileEdit').click());
 await expect(page.locator('#profileModal')).toHaveClass(/open/);
 await expect(page.getByLabel('Main collecting interest')).toBeVisible();
 const interests=await page.locator('#profileGame option').evaluateAll(nodes=>nodes.map(x=>x.value));
 expect(interests).toEqual(expect.arrayContaining(['Sports cards','Video games','Consoles & hardware','Controllers & accessories','Collectibles']));
 await page.evaluate(()=>{closeModal('profileModal');openModal('sellModal')});
 await expect(page.locator('#listingIncludedQuantity')).toHaveValue('1');
 await expect(page.locator('#listingQuantityUnit')).toHaveValue('items');
 await expect(page.locator('#listingContentsList')).toBeVisible();
 await page.locator('#listingIncludedQuantity').fill('2');
 await page.locator('#listingQuantityUnit').fill('games');await page.locator('#price').fill('25');
 await expect(page.locator('#listingContentsPreview')).toHaveText('Quantity included: 2 games. Sold together for $25.00.');
 await page.locator('#listingContentsList').fill('1x Game — tested');
 await expect(page.locator('#listingContentsPreview')).toContainText('quantities total 1; quantity included is 2');
 await page.evaluate(()=>closeModal('sellModal'));await expect(page.locator('#sellModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>showInboxPage());
 await expect(page.locator('#search')).toBeVisible();
 await page.locator('#search').fill('deckplay-beta-readonly-no-match');
 await expect(page.locator('#market')).toBeVisible();await expect(page.locator('#inboxPage')).toBeHidden();
 await page.evaluate(()=>document.getElementById('myFavorites').click());
 await expect(page.locator('#market h2')).toHaveText('Saved items');
 await page.locator('#myListingsReset').click();await expect(page.locator('#market h2')).toHaveText('Marketplace picks');
});

