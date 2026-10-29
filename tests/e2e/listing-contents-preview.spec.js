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
