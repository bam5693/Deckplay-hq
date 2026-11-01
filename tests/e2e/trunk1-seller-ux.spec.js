const {test,expect}=require('@playwright/test');
// Synthetic, unauthenticated browser UX regression. Not signed staging or physical Android acceptance.
const matrix=[
 ['single','trading_cards','card'],
 ['deck','trading_cards','deck'],
 ['lot','trading_cards','card'],
 ['sealed','trading_cards','card'],
 ['game','video_games','platform'],
 ['console','consoles','model'],
 ['figure','collectibles','maker'],
 ['other','other','item']
];
for(const theme of ['light','dark']){
 test('T1 seller eight-type cold classification and help — mobile '+theme,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/');
  await page.evaluate(value=>{document.documentElement.dataset.theme=value;currentUser={id:'synthetic-seller'};openSell()},theme);
  await expect(page.locator('#sellModal')).toHaveClass(/open/);
  for(const [type,category,helpWord] of matrix){
   await page.locator('#listingType').selectOption(type);
   await expect(page.locator('#category')).toHaveValue(category);
   if(type==='other')await expect(page.locator('#listingCategoryChoice')).toBeVisible();
   else await expect(page.locator('#listingCategoryChoice')).toBeHidden();
   await expect(page.locator('#listingDescriptionHelp')).toContainText(new RegExp(helpWord,'i'));
   if(['game','console','figure','other'].includes(type))
    await expect(page.locator('#listingDescriptionHelp')).not.toContainText(/foil|rarity|missing a card/i);
   if(type==='game'){
    await expect(page.locator('#gamePlatformFields')).toBeVisible();
    await expect(page.locator('#tcgGameWrap')).toBeHidden();
   }
   if(type==='console'){
    await expect(page.locator('#consoleItemTypeWrap')).toBeVisible();
    await page.locator('#consoleItemType').selectOption('Controller');
    await expect(page.locator('#category')).toHaveValue('controllers');
    await page.locator('#consoleItemType').selectOption('Accessory');
    await expect(page.locator('#category')).toHaveValue('accessories');
   }
   if(type==='figure')await expect(page.locator('#collectibleSubcategoryWrap')).toBeVisible();
  }
  await page.locator('#category').selectOption('video_games');
  await expect(page.locator('#listingDescriptionHelp')).toContainText('platform');
  await page.locator('#category').selectOption('trading_cards');
  await expect(page.locator('#listingDescriptionHelp')).toContainText('printing');
  await page.evaluate(()=>applyListingDraftValues({listingType:'console',category:'controllers',consoleItemType:'Controller',description:'Synthetic tested controller'}));
  await expect(page.locator('#listingCategoryChoice')).toBeHidden();
  await expect(page.locator('#category')).toHaveValue('controllers');
  await expect(page.locator('#description')).toHaveValue('Synthetic tested controller');
  await page.locator('#listingForm [data-close="sellModal"]').click();
  await expect(page.locator('#sellModal')).not.toHaveClass(/open/);
  await page.evaluate(()=>openSell());
  await expect(page.locator('#sellModal')).toHaveClass(/open/);
 });
}
