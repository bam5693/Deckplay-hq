const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{currentUser={id:'fixture-owner'};syncInboxDraftUser();openModal('sellModal')});
});
test('Kyle previews the whole console bundle price and corrects a quantity mismatch before posting',async({page})=>{
 await page.locator('#category').selectOption('consoles');
 await page.locator('#listingIncludedQuantity').fill('3');await page.locator('#listingQuantityUnit').fill('items');
 await page.locator('#price').fill('125');
 await page.locator('#listingContentsList').fill('1x Console — tested\n1x Controller — stick wear');
 await expect(page.locator('#listingContentsPreview')).toContainText('quantities total 2; quantity included is 3');
 await expect(page.locator('#listingContentsPreview')).toHaveAttribute('data-invalid','true');
 await page.locator('#listingContentsList').fill('1x Console — tested\n2x Controllers — stick wear');
 await expect(page.locator('#listingContentsPreview')).toHaveText('Quantity included: 3 items. Sold together for $125.00.');
 await expect(page.locator('#listingContentsPreview')).not.toHaveAttribute('data-invalid','true');
});
test('Charles Tanner and Jayden can preview lots across cards games collectibles and Other',async({page})=>{
 const choices=await page.locator('#category option').evaluateAll(nodes=>nodes.filter(x=>x.value).map(x=>x.value));
 for(const category of choices){
  await page.locator('#category').selectOption(category);
  await page.locator('#listingIncludedQuantity').fill('2');await page.locator('#listingQuantityUnit').fill(category==='trading_cards'?'complete decks':'pieces');
  await page.locator('#listingContentsList').fill('2x Exact item — variant and condition');await page.locator('#price').fill('40');
  await expect(page.locator('#listingContentsPreview')).toContainText('Sold together for $40.00.');
 }
 await page.locator('#listingIncludedQuantity').fill('1.5');
 await expect(page.locator('#listingContentsPreview')).toContainText('whole number');
});

test('T1.4: whole-lot asking price is clear on buyer details across every collectible category',async({page})=>{
 const cases=[
  ['trading_cards','complete decks',3],
  ['video_games','games',4],
  ['consoles','bundled items',2],
  ['controllers','controllers',2],
  ['accessories','accessories',6],
  ['collectibles','figures',5],
  ['other','mixed pieces',7]
 ];
 const output=await page.evaluate(cases=>{
  closeModal('sellModal');
  return cases.map(([category,unit,quantity])=>{
   const desc='[Listing contents]\nQuantity included: '+quantity+'\nUnit: '+unit+'\nSold together for the listing price.\n[End listing contents]\nTest collectible';
   showDetails({n:'Synthetic '+category+' lot',p:120,c:category,description:desc,imageUrls:[],sellerId:'other-seller'});
   return {category,text:document.querySelector('.detail-price-scope')?.textContent,
    price:document.querySelector('#detailContent .detail-price')?.textContent};
  });
 },cases);
 expect(output).toHaveLength(7);
 for(let i=0;i<cases.length;i++){
  expect(output[i].price).toBe('$120.00');
  expect(output[i].text).toBe('Price for the complete listing: '+cases[i][2]+' '+cases[i][1]+' included. Not a per-unit price.');
 }
});
test('T1.4: single-quantity disclosures are truthful; legacy and malformed lots are not assumed single-copy',async({page})=>{
 await page.evaluate(()=>{
  closeModal('sellModal');
  window.showScopedTest=(description)=>{
   showDetails({n:'Synthetic sealed pack',p:19.99,c:'trading_cards',description,imageUrls:[],sellerId:'other-seller'});
   return document.querySelector('.detail-price-scope')?.textContent;
  };
 });
 const single=await page.evaluate(()=>showScopedTest('[Listing contents]\nQuantity included: 1\nUnit: sealed pack\nSold together for the listing price.\n[End listing contents]'));
 expect(single).toBe('Price for the complete listing: 1 sealed pack included.');
 const legacy=await page.evaluate(()=>showScopedTest('Vintage complete set; ask seller about contents'));
 expect(legacy).toBe('Asking price for this listing. Check the description for what is included.');
 const invalid=await page.evaluate(()=>showScopedTest('[Listing contents]\nQuantity included: 100001\nUnit: cards\nSold together for the listing price.\n[End listing contents]'));
 expect(invalid).toBe(legacy);
});
test('T1.4: unusual unit disclosures remain escaped as text, never injected into buyer listing HTML',async({page})=>{
 await page.evaluate(()=>{
  closeModal('sellModal');
  const desc='[Listing contents]\nQuantity included: 2\nUnit: cards<img src=x onerror=alert(1)>\nSold together for the listing price.\n[End listing contents]';
  showDetails({n:'Safe listing',p:40,c:'trading_cards',description:desc,imageUrls:[],sellerId:'other-seller'});
 });
 await expect(page.locator('.detail-price-scope')).toContainText('cards<img src=x onerror=alert(1)>');
 await expect(page.locator('.detail-price-scope img')).toHaveCount(0);
 await expect(page.locator('.detail-price-scope')).toContainText('Not a per-unit price');
});

test('T5 narrow phone listing preview stacks cover above long title without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.locator('#item').fill('Collector edition console bundle with exceptionally long variant and accessories details');
 const card=page.locator('#listingPreviewCard');
 await expect(card).toBeVisible();
 const measured=await card.evaluate(el=>{
  const photo=el.querySelector('.listing-preview-image').getBoundingClientRect();
  const info=el.querySelector('.listing-preview-info').getBoundingClientRect();
  const box=el.getBoundingClientRect();
  return {photoBottom:photo.bottom,infoTop:info.top,cardWidth:box.width,infoWidth:info.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
 });
 expect(measured.infoTop).toBeGreaterThanOrEqual(measured.photoBottom);
 expect(measured.infoWidth).toBeGreaterThan(measured.cardWidth*0.8);
 expect(measured.scrollWidth).toBeLessThanOrEqual(measured.clientWidth+1);
});
