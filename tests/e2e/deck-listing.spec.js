const {test,expect}=require('@playwright/test');
test('complete deck listing shows deck details and requires a photo',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));
 await page.locator('#listingType').selectOption('deck');
 await expect(page.locator('#category')).toHaveValue('trading_cards');
 await expect(page.locator('#deckFields')).toBeVisible();
 await page.locator('#item').fill('STAGING TEST — Complete One Piece deck');
 await page.locator('#deckLeader').fill('Black Yamato');
 await page.locator('#deckCardCount').fill('51');
 await page.locator('#deckList').fill('1x leader Yamato\n4x OP16-097 Yamato\n4x OP16-081 Otama');
 await page.locator('#price').fill('40');
 await expect(page.locator('#deckLeader')).toHaveValue('Black Yamato');
 await expect(page.locator('#deckCardCount')).toHaveValue('51');
 await expect(page.locator('#deckList')).toHaveValue(/OP16-097/);
 await page.locator('#publishButton').click();
 await expect(page.locator('#sellModal')).toHaveClass(/open/);
 await expect(page.locator('#listingPhotoCount')).toContainText('0 of 5');
});

test('seller publishes a complete deck and a separate buyer sees its full decklist',async({page,browser})=>{
 test.setTimeout(150000);
 const {signIn,cleanup,marker}=require('../helpers/staging.cjs');
 const title=marker();
 await signIn(page,'SELLER');
 const buyerContext=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,viewport:page.viewportSize(),httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE});
 try{
  const sell=page.locator('[data-dock="sell"]');
  if(await sell.isVisible())await sell.click();else await page.getByRole('button',{name:'＋ Sell an item',exact:true}).click();
  await page.locator('#item').fill(title);
  await page.locator('#listingType').selectOption('deck');
  await page.locator('#tcgGame').selectOption('one_piece');
  await page.locator('#cardCondition').selectOption('near_mint');
  await page.locator('#deckLeader').fill('Black Yamato');
  await page.locator('#deckCardCount').fill('51');
  await page.locator('#deckList').fill('1x Leader Yamato\n4x OP16-097 Yamato\n4x OP16-081 Otama');
  await page.locator('#price').fill('40');
  await page.locator('#photos').setInputFiles({name:'deck-test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await expect(page.locator('#listingPhotoCount')).toContainText('1 of 5');
  await page.locator('#publishButton').click();
  await expect(page.locator('#sellModal')).not.toHaveClass(/open/,{timeout:30000});
  const saved=await page.evaluate(async title=>{
   const {data,error}=await supabaseClient.from('listings').select('description,category,price,image_urls').eq('title',title).eq('seller_id',currentUser.id).single();
   if(error)throw Error(error.message);return data;
  },title);
  expect(saved.category).toBe('trading_cards');
  expect(saved.price).toBe(40);
  expect(saved.image_urls).toHaveLength(1);
  expect(saved.description).toContain('[Complete Deck]');
  expect(saved.description).toContain('Deck: Black Yamato');
  expect(saved.description).toContain('Cards: 51');
  expect(saved.description).toContain('4x OP16-097 Yamato');
  const buyer=await buyerContext.newPage();
  await buyer.goto('/',{waitUntil:'domcontentloaded'});
  await buyer.locator('[data-cat="Trading Cards"]').first().click();
  await buyer.locator('#search').fill(title);
  const card=buyer.locator('#grid .card').filter({hasText:title});
  await expect(card).toHaveCount(1,{timeout:25000});
  await card.locator('[data-view]').click();
  await expect(buyer.locator('#detailContent')).toContainText('Black Yamato');
  await expect(buyer.locator('#detailContent')).toContainText('OP16-097');
 }finally{
  try{await cleanup(page,title)}finally{await buyerContext.close()}
 }
});
