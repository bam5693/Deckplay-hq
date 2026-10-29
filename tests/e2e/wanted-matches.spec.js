const {test,expect}=require('@playwright/test');
test('Wanted Board shows card matching fields only for Pokemon and One Piece',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>document.getElementById('wantedModal').classList.add('open'));
 await page.locator('#wantedGame').selectOption('pokemon');
 await expect(page.locator('#wantedCardFields')).toBeVisible();
 expect(await page.locator('#wantedVariant option').allTextContents()).not.toContain('Manga Rare');
 await page.locator('#wantedGame').selectOption('one_piece');
 expect(await page.locator('#wantedVariant option').allTextContents()).toContain('Manga Rare');
 await page.locator('#wantedGame').selectOption('video_games');
 await expect(page.locator('#wantedCardFields')).toBeHidden();
});
test('exact wanted matches respect card number, variant, and budget',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(()=>{
  const original=items;
  items=[
   {id:'a',c:'Trading Cards',game:'one_piece',sellerId:'seller',n:'Manga',p:200,description:'Card number: OP05-119\\nVariant: Manga Rare'},
   {id:'b',c:'Trading Cards',game:'one_piece',sellerId:'seller',n:'Regular',p:5,description:'Card number: OP05-119\\nVariant: Regular'},
   {id:'c',c:'Trading Cards',game:'pokemon',sellerId:'seller',n:'Other game',p:50,description:'Card number: OP05-119\\nVariant: Manga Rare'}
  ];
  const post={user_id:'buyer',game:'one_piece',budget:250,details:'[DeckPlay match: {"set":"","cardNumber":"OP05-119","variant":"Manga Rare"}]'};
  const exact=exactWantedMatches(post).map(x=>x.id);
  post.budget=100;
  const underBudget=exactWantedMatches(post).map(x=>x.id);
  items=original;
  return {exact,underBudget};
 });
 expect(results.exact).toEqual(['a']);
 expect(results.underBudget).toEqual([]);
});

test('wanted matching accepts new line breaks and legacy escapes without absorbing later metadata',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(()=>{
  const previous=items;
  items=['\n','\r\n','\\n'].map((separator,i)=>({id:String(i),c:'Trading Cards',game:'one_piece',sellerId:'seller',p:20,description:['Card number: OP05-119','Variant: Manga Rare','Seller description: OP05-120'].join(separator)}));
  const post={user_id:'buyer',game:'one_piece',budget:30,details:'[DeckPlay match: {"cardNumber":"OP05-119","variant":"Manga Rare"}]'};
  const exact=exactWantedMatches(post).map(x=>x.id);post.details='[DeckPlay match: {"cardNumber":"OP05-120","variant":"Manga Rare"}]';const wrong=exactWantedMatches(post).map(x=>x.id);items=previous;return {exact,wrong};
 });
 expect(result.exact).toEqual(['0','1','2']);expect(result.wrong).toEqual([]);
});

test('wanted matches reject near-miss variants and sets, including legacy line breaks',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(()=>{
  const original=items;
  const base={c:'Trading Cards',game:'one_piece',sellerId:'seller',p:30};
  items=[
   {id:'exact-crlf',...base,description:'Set: OP-05\r\nCard number: OP05-119\r\nVariant: Manga Rare'},
   {id:'exact-legacy',...base,description:'Set: op-05\\nCard number: OP05-119\\nVariant: manga rare'},
   {id:'wrong-set',...base,description:'Set: OP-050\nCard number: OP05-119\nVariant: Manga Rare'},
   {id:'wrong-variant',...base,description:'Set: OP-05\nCard number: OP05-119\nVariant: Manga Rare Holo'},
   {id:'note-only',...base,description:'Card number: OP05-119\nVariant: Manga Rare\nSeller note: Set: OP-05'},
   {id:'over-budget',...base,p:300,description:'Set: OP-05\nCard number: OP05-119\nVariant: Manga Rare'},
   {id:'self-listing',...base,sellerId:'buyer',description:'Set: OP-05\nCard number: OP05-119\nVariant: Manga Rare'},
   {id:'other-game',...base,game:'pokemon',description:'Set: OP-05\nCard number: OP05-119\nVariant: Manga Rare'}
  ];
  const post={user_id:'buyer',game:'one_piece',budget:250,details:'[DeckPlay match: {"set":"OP-05","cardNumber":"OP05-119","variant":"Manga Rare"}]'};
  const matches=exactWantedMatches(post).map(x=>x.id);
  post.budget=0;const freeOnly=exactWantedMatches(post).map(x=>x.id);
  post.budget='not-a-price';const invalidBudget=exactWantedMatches(post).map(x=>x.id);
  items=original;return {matches,freeOnly,invalidBudget};
 });
 expect(result).toEqual({matches:['exact-crlf','exact-legacy'],freeOnly:[],invalidBudget:[]});
});
