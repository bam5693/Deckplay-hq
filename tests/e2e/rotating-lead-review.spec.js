const {test,expect}=require('@playwright/test');

// Free, deterministic baseline for the two rotating reviewer personas.
// This is NOT an LLM agent: it raises reproducible UX defects for supervisor review.
const rounds=[
 {lead:'Lead 1',persona:'seller',type:'single',category:'trading_cards',expected:'#cardConditionWrap'},
 {lead:'Lead 2',persona:'seller',type:'figure',category:'collectibles',expected:'#collectibleSubcategoryWrap'},
 {lead:'Lead 1',persona:'buyer reviewing seller flow',type:'game',category:'video_games',expected:'#gamePlatformFields'},
 {lead:'Lead 2',persona:'buyer reviewing seller flow',type:'single',category:'trading_cards',expected:'#cardConditionWrap'},
 {lead:'Lead 1',persona:'trader reviewing listing',type:'figure',category:'collectibles',expected:'#collectibleSubcategoryWrap'},
 {lead:'Lead 2',persona:'trader reviewing listing',type:'game',category:'video_games',expected:'#gamePlatformFields'}
];
for(const round of rounds){
 test(round.lead+' rotates as '+round.persona+' through '+round.category,async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));
  await page.locator('#listingType').selectOption(round.type);
  await expect(page.locator('#category')).toHaveValue(round.category);
  await expect(page.locator(round.expected)).toBeVisible();
  await expect(page.locator('#publishButton')).toBeVisible();
  const result=await page.evaluate(()=>{
   const dialog=document.querySelector('#sellModal');
   const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   const fields=[...dialog.querySelectorAll('input,select,textarea,button')].filter(visible);
   const clipped=fields.filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2}).map(el=>el.id||el.name||el.tagName);
   return {clipped,ghostCondition:document.getElementById('category').value==='trading_cards'&&visible(document.getElementById('condition'))};
  });
  expect(result.clipped,'Hold up, management: visible controls overflow the viewport: '+result.clipped.join(', ')).toEqual([]);
  expect(result.ghostCondition,'Hold up, management: generic Used condition is visible for cards').toBe(false);
 });
}
