const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));});
const scenarios=[
 {type:'single',category:'trading_cards',visible:'tcgGameWrap'},
 {type:'deck',category:'trading_cards',visible:'deckFields'},
 {type:'lot',category:'trading_cards',visible:'tcgGameWrap'},
 {type:'sealed',category:'trading_cards',visible:'tcgGameWrap'},
 {type:'game',category:'video_games',visible:'gamePlatformFields'},
 {type:'console',category:'consoles',visible:'consoleFields'},
 {type:'figure',category:'collectibles',visible:'collectibleSubcategoryWrap'},
 {type:'other',category:'other',visible:null}
];
for(const scenario of scenarios){
 test('listing type '+scenario.type+' shows appropriate fields',async({page})=>{
  await page.locator('#listingType').selectOption(scenario.type);
  await expect(page.locator('#category')).toHaveValue(scenario.category);
  if(scenario.visible)await expect(page.locator('#'+scenario.visible)).toBeVisible();
  expect(await page.locator('#gamePlatformFields').isVisible()).toBe(scenario.category==='video_games');
  expect(await page.locator('#consoleFields').isVisible()).toBe(scenario.category==='consoles');
  expect(await page.locator('#cardConditionWrap').isVisible()).toBe(scenario.category==='trading_cards');
  expect(await page.locator('#collectibleSubcategoryWrap').isVisible()).toBe(scenario.category==='collectibles');
 });
}
test('changing from cards to video games hides grading and card fields',async({page})=>{
 await page.locator('#listingType').selectOption('single');
 await page.locator('#cardCondition').selectOption('graded');
 await expect(page.locator('#gradingFields')).toBeVisible();
 await page.locator('#listingType').selectOption('game');
 await expect(page.locator('#gradingFields')).toBeHidden();
 await expect(page.locator('#cardConditionWrap')).toBeHidden();
 await expect(page.locator('#gamePlatformFields')).toBeVisible();
 await expect(page.locator('#condition option[value="graded"]')).toHaveCount(0);
});
test('post listing and cancel buttons have matching dimensions',async({page})=>{
 await expect(page.locator('#publishButton')).toHaveText('Post listing');
 const a=await page.locator('#publishButton').boundingBox();
 const b=await page.locator('#sellModal [data-close="sellModal"]').last().boundingBox();
 expect(a).not.toBeNull();expect(b).not.toBeNull();
 expect(Math.abs(a.height-b.height)).toBeLessThan(3);
});
