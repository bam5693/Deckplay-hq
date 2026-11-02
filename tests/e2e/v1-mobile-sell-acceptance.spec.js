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
  await expect(page.locator('#listingCategoryChoice'))[type==='other'?'toBeVisible':'toBeHidden']();
  await expect(page.locator('#listingCategoryChoice select')).toHaveCount(1);
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
 await page.locator('#listingType').selectOption('deck');
 await expect(page.locator('#listingDescriptionHelp')).toContainText('decklist');
 await expect(page.locator('#listingDescriptionHelp')).not.toContainText('Missing a card');
 await expect(page.locator('#description')).toHaveAttribute('placeholder',/substitutions/);
 await page.locator('#listingType').selectOption('lot');
 await expect(page.locator('#listingDescriptionHelp')).toContainText('quantities');
 await expect(page.locator('#listingDescriptionHelp')).not.toContainText('decklist');
 await page.locator('#listingType').selectOption('single');
 await expect(page.locator('#listingDescriptionHelp')).toContainText('rarity');
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

test('Jayden and Tanner inspect customer-visible screens, not just selectable option IDs',async({page},info)=>{
 const missions=[
  {lead:'Jayden',type:'game',goal:'Sell a Nintendo Switch 2 video game',unwanted:['rarity','foil','grading']},
  {lead:'Tanner',type:'single',game:'sports_cards',goal:'Sell a 1983-84 hockey card',unwanted:['game platform']},
  {lead:'Jayden',type:'deck',goal:'Sell a complete playable One Piece deck',unwanted:['game platform']}
 ];
 const evidence=[];
 for(const mission of missions)for(const theme of ['light','dark']){
  await page.evaluate(value=>{document.documentElement.dataset.theme=value},theme);
  await page.locator('#listingType').selectOption(mission.type);
  if(mission.game)await page.locator('#tcgGame').selectOption(mission.game);
  const observations=await page.evaluate(()=>{
   const dlg=document.querySelector('#sellModal .dialog'),form=document.getElementById('listingForm');
   const visible=el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return !!r.width&&!!r.height&&c.visibility!=='hidden'&&c.display!=='none'};
   const rows=[...form.querySelectorAll('input,select,textarea,button')].filter(visible);
   const overflow=rows.filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2}).map(el=>el.id||el.textContent.trim().slice(0,25));
   const text=document.getElementById('listingDescriptionHelp').textContent.toLowerCase();
   const a=document.querySelector('#sellModal .listing-submit-actions .ghost');
   const b=document.getElementById('publishButton');
   const radius=parseFloat(getComputedStyle(a).borderTopLeftRadius);
   const buttonHeight=Math.abs(a.getBoundingClientRect().height-b.getBoundingClientRect().height);
   return {overflow,help:text,visibleCategory:visible(document.getElementById('listingCategoryChoice')),cancelRadius:radius,buttonHeight,scrollWidth:dlg.scrollWidth,clientWidth:dlg.clientWidth};
  });
  expect(observations.overflow,mission.goal+' must not clip controls').toEqual([]);
  expect(observations.visibleCategory,mission.goal+' must not ask twice').toBe(false);
  expect(observations.scrollWidth).toBeLessThanOrEqual(observations.clientWidth+2);
  expect(observations.buttonHeight).toBeLessThan(3);
  expect(observations.cancelRadius,'Cancel should not be a round pill').toBeLessThanOrEqual(12);
  for(const word of mission.unwanted)expect(observations.help).not.toContain(word);
  const file=info.outputPath(mission.lead+'-'+mission.type+'-'+theme+'.png');
  await page.screenshot({path:file,fullPage:false});
  await info.attach(mission.lead+'-'+mission.type+'-'+theme,{path:file,contentType:'image/png'});
  evidence.push({lead:mission.lead,goal:mission.goal,theme,viewport:page.viewportSize(),...observations,screenshot:file.split('/').pop(),limitations:'local mocked/anonymous staging build; not physical Android, not signed seller→buyer acceptance, screenshot not AI-inspected'});
 }
 const fs=require('node:fs');const file=info.outputPath('collector-customer-journey-evidence.json');
 fs.writeFileSync(file,JSON.stringify({source:'emulated browser observations',missions:evidence,reviewStatus:'AWAITING INDEPENDENT VISUAL REVIEW'},null,2));
 await info.attach('collector-journey-evidence',{path:file,contentType:'application/json'});
});

test('hardware type maps to the actual category without a second category question',async({page})=>{
 await page.locator('#listingType').selectOption('console');
 for(const [hardware,category] of [['Console','consoles'],['Controller','controllers'],['Accessory','accessories']]){
  await page.locator('#consoleItemType').selectOption(hardware);
  await expect(page.locator('#category')).toHaveValue(category);
  await expect(page.locator('#listingCategoryChoice')).toBeHidden();
  await expect(page.locator('#consoleFields')).toBeVisible();
  await expect(page.locator('#gamePlatformFields')).toBeHidden();
  await expect(page.locator('#listingDescriptionHelp')).toContainText('compatibility');
 }
 await page.locator('#listingType').selectOption('game');
 await expect(page.locator('#category')).toHaveValue('video_games');
 await page.locator('#listingType').selectOption('console');
 await expect(page.locator('#consoleItemType')).toHaveValue('Console');
 await expect(page.locator('#category')).toHaveValue('consoles');
});


test('Other item can choose a buyer-search category, and card set fields reset after switching type',async({page})=>{
 await page.locator('#listingType').selectOption('other');
 await expect(page.locator('#listingCategoryChoice')).toBeVisible();
 await page.locator('#category').selectOption('video_games');
 await expect(page.locator('#gamePlatformFields')).toBeVisible();
 await expect(page.locator('#listingDescriptionHelp')).toContainText('platform');
 await page.locator('#listingType').selectOption('single');
 await expect(page.locator('#listingCategoryChoice')).toBeHidden();
 await expect(page.locator('#category')).toHaveValue('trading_cards');
 await page.locator('#tcgGame').selectOption('pokemon');
 await expect(page.locator('#tcgSetFields')).toBeVisible();
 await page.locator('#listingType').selectOption('game');
 await page.locator('#listingType').selectOption('single');
 await expect(page.locator('#tcgGame')).toHaveValue('');
 await expect(page.locator('#tcgSetFields')).toBeHidden();
 await page.locator('#tcgGame').selectOption('one_piece');
 await expect(page.locator('#tcgSetFields')).toBeVisible();
});

test('Other hardware category does not ask for a duplicate hardware type',async({page})=>{
 await page.locator('#listingType').selectOption('other');
 await expect(page.locator('#listingCategoryChoice')).toBeVisible();
 for(const [category,type] of [['controllers','Controller'],['accessories','Accessory'],['consoles','Console']]){
  await page.locator('#category').selectOption(category);
  await expect(page.locator('#consoleItemTypeWrap')).toBeHidden();
  await expect(page.locator('#consoleItemType')).toHaveValue(type);
  await expect(page.locator('#consoleItemType')).not.toHaveAttribute('required','');
  await expect(page.locator('#consoleFields')).toBeVisible();
  await expect(page.locator('#consoleBrand')).toHaveAttribute('required','');
  await expect(page.locator('#category')).toHaveValue(category);
 }
 await page.locator('#listingType').selectOption('console');
 await expect(page.locator('#listingCategoryChoice')).toBeHidden();
 await expect(page.locator('#consoleItemTypeWrap')).toBeVisible();
 await expect(page.locator('#consoleItemType')).toHaveValue('Console');
 await expect(page.locator('#category')).toHaveValue('consoles');
});


test('seller sees one honest whole-listing price for cards, decks, lots and games',async({page})=>{
 for(const type of ['single','deck','lot','game']){
  await page.locator('#listingType').selectOption(type);
  await expect(page.locator('label[for="price"]')).toHaveText('Asking price for everything included (USD)');
  await expect(page.locator('#price')).toHaveAttribute('aria-describedby','listingPriceScopeHelp');
  await expect(page.locator('#listingPriceScopeHelp')).toContainText('full listing, not per card, copy or item');
  await expect(page.locator('#listingPriceScopeHelp')).toContainText('Shipping, taxes and fees are not calculated');
 }
});
