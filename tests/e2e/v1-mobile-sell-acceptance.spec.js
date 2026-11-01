const {test,expect}=require('@playwright/test');
const types={single:'trading_cards',deck:'trading_cards',lot:'trading_cards',sealed:'trading_cards',game:'video_games',console:'consoles',figure:'collectibles',other:'other'};
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://*.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');
 await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));
});
test('a first-time seller makes one classification choice across eight listing types',async({page})=>{
 for(const [type,category] of Object.entries(types)){
  await page.locator('#listingType').selectOption(type);
  await expect(page.locator('#category')).toHaveValue(category);
  await expect(page.locator('#listingCategoryAdvanced')).toBeHidden();
  await expect(page.locator('#listingCategoryAdvanced select')).toHaveCount(1);
  await expect(page.locator('#deckFields'))[type==='deck'?'toBeVisible':'toBeHidden']();
  await expect(page.locator('#cardConditionWrap'))[category==='trading_cards'?'toBeVisible':'toBeHidden']();
 }
});
test('video game customers see platform help, not card rarity advice; cards keep variants',async({page})=>{
 await page.locator('#listingType').selectOption('single');
 await expect(page.locator('#listingDescriptionHelp')).toContainText('rarity');
 await page.locator('#listingType').selectOption('game');
 await expect(page.locator('#listingDescriptionHelp')).toContainText('platform');
 await expect(page.locator('#listingDescriptionHelp')).not.toContainText('rarity');
 await expect(page.locator('#listingDescriptionHelp')).not.toContainText('foil');
 await expect(page.locator('#gamePlatformFields')).toBeVisible();
 await page.locator('#listingType').selectOption('figure');
 await expect(page.locator('#listingDescriptionHelp')).not.toContainText('platform');
 await page.locator('#listingType').selectOption('sealed');
 await expect(page.locator('#listingDescriptionHelp')).toContainText('card');
});
test('deck and contents fields are legible in both themes and Cancel matches Post',async({page},info)=>{
 for(const mode of ['light','dark']){
  await page.evaluate(value=>{document.documentElement.dataset.theme=value},mode);
  await page.locator('#listingType').selectOption('deck');
  const colors=await page.locator('#deckFields').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
  expect(colors.background).not.toBe(colors.color);
  const dark=mode==='dark';
  expect(colors.background).toBe(dark?'rgb(27, 43, 64)':'rgb(243, 246, 250)');
  const heading=page.locator('#deckFields label').first();
  const fg=await heading.evaluate(el=>getComputedStyle(el).color);
  expect(fg).toBe(dark?'rgb(219, 232, 248)':'rgb(36, 51, 75)');
  const cancel=page.locator('#sellModal .listing-submit-actions .ghost');
  const post=page.locator('#publishButton');
  const [ca,po]=await Promise.all([cancel.boundingBox(),post.boundingBox()]);
  expect(Math.abs(ca.height-po.height)).toBeLessThan(3);
  expect(await cancel.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('12px');
  const shot=info.outputPath('deck-'+mode+'-'+info.project.name+'.png');
  await page.screenshot({path:shot});
  await info.attach('deck-'+mode+'-emulated-'+info.project.name,{path:shot,contentType:'image/png'});
 }
});
