const {test,expect}=require('@playwright/test');
test('new deck listings save readable section breaks and preserve the supplied decklist',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'description-seller'};
  ensureProfile=async()=>{};uploadPhotos=async()=>['https://example.test/fixture.png'];loadListings=async()=>{};
  supabaseClient.from=()=>({insert:async listing=>{window.savedDescription=listing.description;return {error:null}}});
  listingSelectedPhotos=[new File(['synthetic'],'fixture.png',{type:'image/png'})];
  openModal('sellModal');
 });
 await page.locator('#listingType').selectOption('deck');
 await page.locator('#item').fill('Synthetic One Piece deck');await page.locator('#tcgGame').selectOption('one_piece');
 await page.locator('#deckLeader').fill('Yamato');await page.locator('#deckCardCount').fill('51');
 const decklist='1x Leader Yamato\n4x OP16-097 Yamato\n46x Other cards';
 await page.locator('#deckList').fill(decklist);await page.locator('#price').fill('40');
 await page.locator('#description').fill('Sleeves included.\nShips in a deck box.');
 await page.locator('#publishButton').click();
 await expect.poll(()=>page.evaluate(()=>savedDescription)).toContain('[Complete Deck]\nDeck: Yamato\nCards: 51\n\nFull decklist:\n'+decklist);
 const description=await page.evaluate(()=>savedDescription);
 expect(description).not.toContain('\\n');expect(description).toContain('\n\nSleeves included.\nShips in a deck box.');
 await page.evaluate(description=>showDetails({n:'Synthetic deck',p:40,description,imageUrls:[]}),description);
 const details=page.locator('.detail-description');await expect(details).toHaveText(description);
 expect(await details.evaluate(el=>getComputedStyle(el).whiteSpace)).toMatch(/pre/);
});
