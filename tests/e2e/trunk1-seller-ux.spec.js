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
   if(type==='deck'){
    await expect(page.locator('#deckFields')).toBeVisible();
    // Owner 33662.jpg: white deck panel against a dark form made labels illegible.
    // Measure actual rendered foreground/background contrast, not merely theme class names.
    const deckContrast=await page.locator('#deckFields').evaluate(panel=>{
     const rgb=color=>(color.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
     const luminance=color=>{
      const channels=rgb(color).map(n=>{const v=n/255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)});
      return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
     };
     const contrast=(a,b)=>{const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (hi+0.05)/(lo+0.05)};
     const label=panel.querySelector('label');
     const help=panel.querySelector('.file-help');
     const field=panel.querySelector('#deckList');
     return {
      label:contrast(getComputedStyle(label).color,getComputedStyle(panel).backgroundColor),
      help:contrast(getComputedStyle(help).color,getComputedStyle(panel).backgroundColor),
      field:contrast(getComputedStyle(field).color,getComputedStyle(field).backgroundColor),
      fits:panel.getBoundingClientRect().width<=panel.parentElement.getBoundingClientRect().width+1
     };
    });
    expect(deckContrast.label,'Deck label contrast').toBeGreaterThanOrEqual(4.5);
    expect(deckContrast.help,'Deck instructions contrast').toBeGreaterThanOrEqual(4.5);
    expect(deckContrast.field,'Decklist input contrast').toBeGreaterThanOrEqual(4.5);
    expect(deckContrast.fits,'Deck panel must not overflow phone modal').toBe(true);
   }
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

for(const theme of ['light','dark']){
 test('T1 edit classification avoids duplicate category and preserves hardware buyer taxonomy — mobile '+theme,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/');
  await page.evaluate(theme=>{
   document.documentElement.dataset.theme=theme;
   window.trunk1Classification=createListingEditorClassification(document.getElementById('editListingClassification'),{});
   trunk1Classification.reset({category:'controllers',product_type:'console',condition:'used',description:'[Hardware: Controller]\\nBrand: Sony\\nModel: DualSense'});
   document.getElementById('editListingModal').classList.add('open');
  },theme);
  await page.locator('#editListingClassification summary').click();
  await page.locator('#editClassificationEnabled').check();
  await expect(page.locator('#editAttribute_listingType')).toHaveValue('console');
  await expect(page.locator('#editAttribute_category')).toHaveValue('controllers');
  await expect(page.locator('#editAttribute_category')).toBeHidden();
  await expect(page.locator('#editAttribute_consoleItemType')).toHaveValue('Controller');
  await page.locator('#editAttribute_consoleItemType').selectOption('Accessory');
  await expect(page.locator('#editAttribute_category')).toHaveValue('accessories');
  await expect(page.locator('#editAttribute_category')).toBeHidden();
  await page.locator('#editAttribute_listingType').selectOption('other');
  await expect(page.locator('#editAttribute_category')).toBeVisible();
  await expect(page.locator('#editAttribute_category')).toHaveValue('other');
  await page.locator('#editAttribute_category').selectOption('video_games');
  await expect(page.locator('#editAttribute_listingType')).toHaveValue('other');
  await page.locator('#editAttribute_listingType').selectOption('game');
  await expect(page.locator('#editAttribute_category')).toHaveValue('video_games');
  await expect(page.locator('#editAttribute_category')).toBeHidden();
  await page.locator('#editAttribute_listingType').selectOption('single');
  await expect(page.locator('#editAttribute_category')).toHaveValue('trading_cards');
  await expect(page.locator('#editAttribute_category')).toBeHidden();
 });
}
