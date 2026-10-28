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

test('same-name cards retain distinct custom printing, condition and asking price',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'printing-seller'};
  ensureProfile=async()=>{};uploadPhotos=async()=>['https://example.test/fixture.png'];loadListings=async()=>{};
  window.printingListings=[];
  supabaseClient.from=()=>({insert:async listing=>{printingListings.push(listing);return {error:null}}});
 });
 const variants=[['Japanese stamped promo','near_mint','21.50'],['Reverse etched foil','lightly_played','13.00'],['Serialized red /99','moderately_played','48.25']];
 for(const [variant,condition,price] of variants){
  await page.evaluate(()=>openModal('sellModal'));
  await page.locator('#photos').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await expect(page.locator('#listingPhotoCount')).toContainText('1 of 5');
  await page.locator('#item').fill('Same name collectible');await page.locator('#tcgGame').selectOption('other_tcg');
  await expect(page.locator('#tcgCatalogFields')).toBeHidden();
  await page.locator('#tcgCardNumber').fill('001');if(await page.locator('#customCardDetails').getAttribute('open')===null)await page.locator('#customCardDetails summary').click();
  await page.locator('#tcgCustomSet').fill('Unlisted release');await page.locator('#tcgCustomVariant').fill(variant);
  await page.locator('#tcgRarity').fill('Collector rare');await page.locator('#tcgEdition').fill('First printing');await page.locator('#tcgLanguage').fill('Japanese');
  await page.locator('#cardCondition').selectOption(condition);await page.locator('#price').fill(price);
  await page.locator('#description').fill('Tiny corner wear. <script>not executable</script>');
  await page.locator('#publishButton').click();await expect(page.locator('#sellModal')).not.toHaveClass(/open/);
 }
 const listings=await page.evaluate(()=>printingListings);expect(listings).toHaveLength(3);
 for(let i=0;i<3;i++){
  expect(listings[i].title).toBe('Same name collectible');expect(listings[i].price).toBe(Number(variants[i][2]));
  for(const line of ['Set: Unlisted release','Card number: 001','Variant: '+variants[i][0],'Rarity: Collector rare','Edition / printing: First printing','Language: Japanese','Tiny corner wear.'])expect(listings[i].description).toContain(line);
  await page.evaluate(row=>showDetails(marketplaceItemFromRow(row,{username:'seller'})),listings[i]);
  await expect(page.locator('.detail-description')).toHaveText(listings[i].description);await expect(page.locator('.detail-description script')).toHaveCount(0);
  await page.evaluate(()=>closeModal('detailModal'));
 }
 expect(new Set(listings.map(l=>l.description)).size).toBe(3);
});
