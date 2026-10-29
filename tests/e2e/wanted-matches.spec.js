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

test('wanted matches link to real listing details with the correct name and price',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{
  items=[{id:'wanted-fixture-1',databaseId:'wanted-fixture-1',c:'Trading Cards',game:'one_piece',sellerId:'fixture-seller',s:'Fixture seller',n:'Manga Rare Luffy',p:125,cond:'Near Mint',description:'Set: OP-05\nCard number: OP05-119\nVariant: Manga Rare',imageUrls:[]}];
  const originalFrom=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>{
   if(table==='wanted_posts'){
    const q={select:()=>q,order:()=>q,limit:()=>Promise.resolve({data:[{id:'wanted-post-1',user_id:'fixture-buyer',game:'one_piece',title:'Looking for Luffy',offer_type:'buy',budget:200,details:'[DeckPlay match: {"set":"OP-05","cardNumber":"OP05-119","variant":"Manga Rare"}]'}],error:null})};
    return q;
   }
   if(table==='profiles'){
    const q={select:()=>q,in:()=>Promise.resolve({data:[{id:'fixture-buyer',username:'fixture-buyer'}],error:null})};
    return q;
   }
   return originalFrom(table);
  };
  toggleWanted(true);
 });
 const match=page.locator('[data-wanted-match="wanted-fixture-1"]');
 await expect(match).toHaveText('View Manga Rare Luffy · $125.00');
 await match.click();
 await expect(page.locator('#wantedSection')).not.toHaveClass(/is-open/);
 await expect(page.locator('#detailModal')).toHaveClass(/open/);
 await expect(page.locator('#detailTitle')).toHaveText('Manga Rare Luffy');
 await expect(page.locator('#detailContent .detail-price')).toHaveText('125.00');
});

async function pendingWantedPublish(page){
 await page.goto('/');
 await page.evaluate(()=>{
  currentUser={id:'fixture-buyer-a'};syncInboxDraftUser();
  window.wantedWrites=[];window.wantedToasts=[];toast=text=>wantedToasts.push(text);
  const originalFrom=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>table==='wanted_posts'?{insert:payload=>new Promise(resolve=>{wantedWrites.push(payload);window.finishWanted=resolve})}:originalFrom(table);
  openModal('wantedModal');
 });
 await page.locator('#wantedItem').fill('One Piece Manga Rare Luffy');
}
test('wanted publish blocks duplicate submissions and preserves a failed draft',async({page})=>{
 await pendingWantedPublish(page);
 await page.locator('#wantedForm button[type="submit"]').click();
 await expect(page.locator('#wantedForm button[type="submit"]')).toBeDisabled();
 await page.locator('#wantedForm').dispatchEvent('submit');
 expect(await page.evaluate(()=>wantedWrites.length)).toBe(1);
 await page.evaluate(()=>finishWanted({error:{message:'Network unavailable'}}));
 await expect(page.locator('#wantedStatus')).toHaveText('Network unavailable');
 await expect(page.locator('#wantedItem')).toHaveValue('One Piece Manga Rare Luffy');
 await expect(page.locator('#wantedForm button[type="submit"]')).toBeEnabled();
});
test('wanted publish response from previous account cannot clear the new account form',async({page})=>{
 await pendingWantedPublish(page);
 await page.locator('#wantedForm button[type="submit"]').click();
 await page.evaluate(()=>{
  currentUser={id:'fixture-buyer-b'};syncInboxDraftUser();
  finishWanted({error:null});
 });
 await expect(page.locator('#wantedModal')).not.toHaveClass(/open/);
 await expect(page.locator('#wantedItem')).toHaveValue('');
 await expect(page.locator('#wantedForm button[type="submit"]')).toBeEnabled();
 expect(await page.evaluate(()=>wantedToasts)).toEqual([]);
});
