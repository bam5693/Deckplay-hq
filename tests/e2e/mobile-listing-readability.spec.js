const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://*.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));await page.goto('/');});
test('mobile listing form stays readable, offers category-specific help and square Cancel',async({page})=>{
 await page.evaluate(()=>{document.getElementById('sellModal').classList.add('open');document.documentElement.dataset.theme='dark'});
 await page.locator('#listingType').selectOption('deck');
 await expect(page.locator('#deckFields')).toBeVisible();
 await expect(page.locator('#listingDescriptionHelp')).toContainText('rarity');
 const dark=await page.locator('#deckFields').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
 expect(dark.background).not.toBe('rgb(242, 245, 239)');
 const fieldset=await page.locator('#listingIncludedQuantity').evaluate(el=>({bg:getComputedStyle(el.parentElement).backgroundColor,fg:getComputedStyle(el.parentElement).color}));
 expect(fieldset.bg).not.toBe('rgb(255, 255, 255)');
 await expect(page.locator('#listingCategoryAdvanced')).toBeHidden();
 await expect(page.locator('#category')).toHaveValue('trading_cards');
 await page.locator('#listingType').selectOption('game');
 await expect(page.locator('#deckFields')).toBeHidden();
 await expect(page.locator('#listingDescriptionHelp')).toContainText('platform');
 await expect(page.locator('#listingDescriptionHelp')).not.toContainText('rarity');
 await expect(page.locator('#category')).toHaveValue('video_games');
 const cancel=page.locator('#sellModal .listing-submit-actions .ghost');
 await expect(cancel).toHaveText('Cancel');
 const radius=await cancel.evaluate(el=>getComputedStyle(el).borderRadius);
 expect(radius).toBe('12px');
});
test('light theme preserves contrast in full-deck form',async({page})=>{
 await page.evaluate(()=>{document.getElementById('sellModal').classList.add('open');document.documentElement.dataset.theme='light'});
 await page.locator('#listingType').selectOption('deck');
 const color=await page.locator('#deckFields').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
 expect(color.bg).not.toBe('rgb(255, 255, 255)');
 await expect(page.locator('#listingQuantityUnit')).toHaveValue('items');
});

test('listing type is the only category picker across all eight types',async({page})=>{
 await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));
 const types={single:'trading_cards',deck:'trading_cards',lot:'trading_cards',sealed:'trading_cards',game:'video_games',console:'consoles',figure:'collectibles',other:'other'};
 for(const [type,category] of Object.entries(types)){
  await page.locator('#listingType').selectOption(type);
  await expect(page.locator('#listingCategoryAdvanced')).toBeHidden();
  await expect(page.locator('#category')).toHaveValue(category);
  if(type==='deck') await expect(page.locator('#deckFields')).toBeVisible();
  else await expect(page.locator('#deckFields')).toBeHidden();
 }
});
