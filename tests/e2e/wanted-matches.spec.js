const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}))});
test('Wanted Board shows card matching fields for every supported card game and hides them for other categories',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>document.getElementById('wantedModal').classList.add('open'));
 await page.locator('#wantedGame').selectOption('pokemon');
 await expect(page.locator('#wantedCardFields')).toBeVisible();
 expect(await page.locator('#wantedVariant option').allTextContents()).not.toContain('Manga Rare');
 await page.locator('#wantedGame').selectOption('one_piece');
 expect(await page.locator('#wantedVariant option').allTextContents()).toContain('Manga Rare');
 const games=await page.locator('#tcgGame option').evaluateAll(nodes=>nodes.filter(n=>n.value).map(n=>n.value));
 for(const game of games){await page.locator('#wantedGame').selectOption(game);await expect(page.locator('#wantedCardFields')).toBeVisible()}
 await page.locator('#wantedGame').selectOption('video_games');
 await expect(page.locator('#wantedCardFields')).toBeHidden();
 for(const category of ['consoles','collectibles','other']){await page.locator('#wantedGame').selectOption(category);await expect(page.locator('#wantedCardFields')).toBeHidden()}
});
test('exact wanted matches respect card number, variant, and budget',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
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
 await page.goto('/');await page.waitForLoadState('networkidle');
 const result=await page.evaluate(()=>{
  const previous=items;
  items=['\n','\r\n','\\n'].map((separator,i)=>({id:String(i),c:'Trading Cards',game:'one_piece',sellerId:'seller',p:20,description:['Card number: OP05-119','Variant: Manga Rare','Seller description: OP05-120'].join(separator)}));
  const post={user_id:'buyer',game:'one_piece',budget:30,details:'[DeckPlay match: {"cardNumber":"OP05-119","variant":"Manga Rare"}]'};
  const exact=exactWantedMatches(post).map(x=>x.id);post.details='[DeckPlay match: {"cardNumber":"OP05-120","variant":"Manga Rare"}]';const wrong=exactWantedMatches(post).map(x=>x.id);items=previous;return {exact,wrong};
 });
 expect(result.exact).toEqual(['0','1','2']);expect(result.wrong).toEqual([]);
});

test('wanted matches reject near-miss variants and sets, including legacy line breaks',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
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
 await page.goto('/');await page.waitForLoadState('networkidle');
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
 await expect(page.locator('#detailContent .detail-price')).toHaveText('$125.00');
});

async function pendingWantedPublish(page){
 await page.goto('/');await page.waitForLoadState('networkidle');
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


test('blocked sellers stay out of wanted matches and stale match buttons cannot open them',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  window.blockedWantedToasts=[];toast=message=>blockedWantedToasts.push(message);
  items=[{id:'blocked-wanted',databaseId:'blocked-wanted',c:'Trading Cards',game:'magic',sellerId:'blocked-seller',n:'Collector card',p:10,description:'Card number: M-001',imageUrls:[]}];
  blockedCollectorIds.add('blocked-seller');
  window.blockedWantedMatches=exactWantedMatches({user_id:'buyer',game:'magic',details:'[DeckPlay match: {"cardNumber":"M-001"}]'}).map(x=>x.id);
  document.getElementById('wantedGrid').innerHTML='<button type="button" data-wanted-match="blocked-wanted">View stale match</button>';
  document.getElementById('wantedSection').classList.add('is-open');document.getElementById('wantedSection').setAttribute('aria-hidden','false');document.body.classList.add('wanted-open');
 });
 expect(await page.evaluate(()=>blockedWantedMatches)).toEqual([]);
 await page.locator('[data-wanted-match="blocked-wanted"]').click();
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>blockedWantedToasts)).toEqual(['This listing is no longer available. Refresh wanted posts.']);
});

test('a delayed Wanted Board load cannot render the previous account view',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  currentUser={id:'wanted-buyer-a'};
  window.wantedReadQueue=[];
  const original=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>table==='wanted_posts'?(()=>{
   const q={select:()=>q,order:()=>q,limit:()=>new Promise(resolve=>wantedReadQueue.push(resolve))};return q;
  })():original(table);
  window.oldWantedDone=loadWanted();
  currentUser={id:'wanted-buyer-b'};
 });
 await expect.poll(()=>page.evaluate(()=>wantedReadQueue.length)).toBe(1);
 await page.evaluate(()=>wantedReadQueue.shift()({data:[{id:'old-post',user_id:'old-seller',game:'one_piece',title:'Old account post',offer_type:'buy',details:''}],error:null}));
 await page.evaluate(()=>oldWantedDone);
 await expect(page.locator('#wantedGrid')).not.toContainText('Old account post');
});

test('an older Wanted Board refresh cannot overwrite the newest results',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  currentUser={id:'wanted-buyer'};
  window.wantedReadQueue=[];
  const original=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>table==='wanted_posts'?(()=>{
   const q={select:()=>q,order:()=>q,limit:()=>new Promise(resolve=>wantedReadQueue.push(resolve))};return q;
  })():table==='profiles'?(()=>{
   const q={select:()=>q,in:()=>Promise.resolve({data:[],error:null})};return q;
  })():original(table);
  window.firstWantedDone=loadWanted();window.secondWantedDone=loadWanted();
 });
 await expect.poll(()=>page.evaluate(()=>wantedReadQueue.length)).toBe(2);
 await page.evaluate(()=>wantedReadQueue[1]({data:[{id:'new-post',user_id:'seller',game:'one_piece',title:'Current wanted post',offer_type:'buy',details:''}],error:null}));
 await page.evaluate(()=>secondWantedDone);
 await expect(page.locator('#wantedGrid')).toContainText('Current wanted post');
 await page.evaluate(()=>wantedReadQueue[0]({data:[{id:'old-post',user_id:'seller',game:'one_piece',title:'Outdated wanted post',offer_type:'buy',details:''}],error:null}));
 await page.evaluate(()=>firstWantedDone);
 await expect(page.locator('#wantedGrid')).toContainText('Current wanted post');
 await expect(page.locator('#wantedGrid')).not.toContainText('Outdated wanted post');
});
