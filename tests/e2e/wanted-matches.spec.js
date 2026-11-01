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

test('Wanted Board still shows posts when optional profile lookup fails',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  const original=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>table==='wanted_posts'?(()=>{
   const q={select:()=>q,order:()=>q,limit:()=>Promise.resolve({data:[{id:'wanted-no-profile',user_id:'seller-1',game:'video_games',title:'Nintendo Switch game',offer_type:'buy',details:''}],error:null})};return q;
  })():table==='profiles'?(()=>{
   const q={select:()=>q,in:()=>Promise.reject(Error('Profile network failed'))};return q;
  })():original(table);
  toggleWanted(true);
 });
 await expect(page.locator('#wantedGrid')).toContainText('Nintendo Switch game');
 await expect(page.locator('#wantedGrid')).toContainText('DeckPlay member');
 await expect(page.locator('#wantedGrid')).not.toContainText('Loading wanted posts');
});

test('Wanted Board offers a working retry after a posts request failure',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  window.wantedAttempts=0;
  const original=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>table==='wanted_posts'?(()=>{
   const q={select:()=>q,order:()=>q,limit:()=>{
    wantedAttempts++;
    return wantedAttempts===1?Promise.reject(Error('Offline')):Promise.resolve({data:[{id:'wanted-recovered',user_id:'seller-2',game:'consoles',title:'Switch 2 console',offer_type:'buy',details:''}],error:null});
   }};return q;
  })():table==='profiles'?(()=>{
   const q={select:()=>q,in:()=>Promise.resolve({data:[],error:null})};return q;
  })():original(table);
  toggleWanted(true);
 });
 const retry=page.locator('#wantedGrid [data-retry-wanted]');
 await expect(retry).toBeVisible();
 await retry.click();
 await expect(page.locator('#wantedGrid')).toContainText('Switch 2 console');
 await expect(retry).toHaveCount(0);
 expect(await page.evaluate(()=>wantedAttempts)).toBe(2);
});


test('Wanted non-card exact matching requires a category-specific detail',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>openModal('wantedModal'));
 await page.locator('#wantedGame').selectOption('video_games');
 await expect(page.locator('#wantedNonCardFields')).toBeVisible();
 await page.locator('#wantedExactNonCard').check();
 await expect(page.locator('#wantedNonCardPlatformWrap')).toBeVisible();
 await expect(page.locator('#wantedNonCardPlatform')).toHaveAttribute('required','');
 await page.locator('#wantedGame').selectOption('consoles');
 await expect(page.locator('#wantedExactNonCard')).not.toBeChecked();
 await page.locator('#wantedExactNonCard').check();
 await expect(page.locator('#wantedNonCardHardwareWrap')).toBeVisible();
 await expect(page.locator('#wantedNonCardHardwareType')).toHaveAttribute('required','');
 await expect(page.locator('#wantedNonCardModel')).toHaveAttribute('required','');
 await page.locator('#wantedGame').selectOption('collectibles');
 await page.locator('#wantedExactNonCard').check();
 await expect(page.locator('#wantedNonCardCollectibleWrap')).toBeVisible();
 await expect(page.locator('#wantedNonCardCollectibleType')).toHaveAttribute('required','');
 await page.locator('#wantedGame').selectOption('pokemon');
 await expect(page.locator('#wantedNonCardFields')).toBeHidden();
 await expect(page.locator('#wantedCardFields')).toBeVisible();
});
test('non-card Wanted matching rejects near misses, self, blocked, inactive and over-budget listings',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 const actual=await page.evaluate(()=>{
  const previous=items;
  items=[
   {id:'game',sellerId:'seller',rawCategory:'video_games',n:'Super Mario Odyssey',description:'Platform: Nintendo Switch',p:35},
   {id:'platform-mismatch',sellerId:'seller',rawCategory:'video_games',n:'Super Mario Odyssey',description:'Platform: Switch 2',p:35},
   {id:'title-mismatch',sellerId:'seller',rawCategory:'video_games',n:'Super Mario Odyssey Deluxe',description:'Platform: Nintendo Switch',p:35},
   {id:'self',sellerId:'buyer',rawCategory:'video_games',n:'Super Mario Odyssey',description:'Platform: Nintendo Switch',p:35},
   {id:'blocked',sellerId:'blocked-seller',rawCategory:'video_games',n:'Super Mario Odyssey',description:'Platform: Nintendo Switch',p:35},
   {id:'inactive',sellerId:'seller',rawCategory:'video_games',n:'Super Mario Odyssey',description:'Platform: Nintendo Switch',status:'paused',p:35},
   {id:'console',sellerId:'seller',rawCategory:'consoles',n:'Nintendo Switch OLED',description:'Model: OLED Model',p:250},
   {id:'controller',sellerId:'seller',rawCategory:'controllers',n:'Nintendo Switch OLED',description:'Model: OLED Model',p:50},
   {id:'jersey',sellerId:'seller',rawCategory:'collectibles',collectibleSubcategory:'sports_memorabilia',n:'Signed Jersey',p:95},
   {id:'wrong-type',sellerId:'seller',rawCategory:'collectibles',collectibleSubcategory:'anime_manga',n:'Signed Jersey',p:50}
  ];
  blockedCollectorIds.add('blocked-seller');
  const find=(game,title,meta,budget)=>exactWantedMatches({game,title,user_id:'buyer',budget,details:'[DeckPlay match: '+JSON.stringify(meta)+']'}).map(item=>item.id);
  const result={
   game:find('video_games','Super Mario Odyssey',{nonCardExact:true,platform:'Nintendo Switch'},50),
   noOptIn:find('video_games','Super Mario Odyssey',{platform:'Nintendo Switch'},50),
   noPlatform:find('video_games','Super Mario Odyssey',{nonCardExact:true},50),
   budget:find('video_games','Super Mario Odyssey',{nonCardExact:true,platform:'Nintendo Switch'},20),
   console:find('consoles','Nintendo Switch OLED',{nonCardExact:true,hardwareType:'consoles',model:'OLED Model'},300),
   memorabilia:find('collectibles','Signed Jersey',{nonCardExact:true,subcategory:'sports_memorabilia'},100)
  };
  blockedCollectorIds.delete('blocked-seller');items=previous;return result;
 });
 expect(actual).toEqual({game:['game'],noOptIn:[],noPlatform:[],budget:[],console:['console'],memorabilia:['jersey']});
});
test('Wanted post stores opt-in non-card precision without a real database write',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  currentUser={id:'synthetic-wanted-buyer'};syncInboxDraftUser();
  window.wantedPayloads=[];
  const original=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>table==='wanted_posts'?{
   insert:payload=>{wantedPayloads.push(payload);return Promise.resolve({error:null})},
   select:()=>({order:()=>({limit:()=>Promise.resolve({data:[],error:null})})})
  }:original(table);
  openModal('wantedModal');
 });
 await page.locator('#wantedItem').fill('Super Mario Odyssey');
 await page.locator('#wantedGame').selectOption('video_games');
 await page.locator('#wantedExactNonCard').check();
 await page.locator('#wantedNonCardPlatform').fill('Nintendo Switch');
 await page.locator('#wantedForm button[type="submit"]').click();
 await expect.poll(()=>page.evaluate(()=>wantedPayloads.length)).toBe(1);
 const payload=await page.evaluate(()=>wantedPayloads[0]);
 expect(payload.game).toBe('video_games');
 expect(payload.details).toContain('"nonCardExact":true');
 expect(payload.details).toContain('"platform":"Nintendo Switch"');
});


test('Wanted exact matching prefers seller-edited classification over stale creation notes',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 const result=await page.evaluate(()=>{
  const before=items;
  items=[
   {id:'current-game',sellerId:'seller',rawCategory:'video_games',n:'Super Mario Odyssey',p:25,description:'Platform: Switch 2\\n[Listing classification]\\nPlatform: Nintendo Switch\\n[End classification]'},
   {id:'stale-game',sellerId:'seller',rawCategory:'video_games',n:'Super Mario Odyssey',p:25,description:'Platform: Nintendo Switch\\n[Listing classification]\\nPlatform: Switch 2\\n[End classification]'},
   {id:'current-console',sellerId:'seller',rawCategory:'consoles',n:'Switch OLED',p:150,description:'Model: Original\\n[Listing classification]\\nModel: OLED Model\\n[End classification]'}
  ];
  const find=(game,title,meta)=>exactWantedMatches({game,title,user_id:'buyer',details:'[DeckPlay match: '+JSON.stringify(meta)+']'}).map(x=>x.id);
  const result={
   games:find('video_games','Super Mario Odyssey',{nonCardExact:true,platform:'Nintendo Switch'}),
   consoles:find('consoles','Switch OLED',{nonCardExact:true,hardwareType:'consoles',model:'OLED Model'})
  };
  items=before;return result;
 });
 expect(result).toEqual({games:['current-game'],consoles:['current-console']});
});

test('Wanted posts and match actions appear before optional profile names finish loading',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  // Public Wanted discovery must render without any authenticated session.
  currentUser=null;
  const originalFrom=supabaseClient.from.bind(supabaseClient);
  window.resolveSlowWantedProfile=null;
  supabaseClient.from=table=>{
   if(table==='wanted_posts'){
    const query={select:()=>query,order:()=>query,limit:()=>Promise.resolve({data:[{
     id:'wanted-slow-name',user_id:'collector-slow',game:'video_games',
     title:'Metroid Prime',details:'Looking for a complete copy',
     offer_type:'buy',budget:50,created_at:'2026-10-31T00:00:00Z'
    }],error:null})};
    return query;
   }
   if(table==='profiles'){
    const query={select:()=>query,in:()=>new Promise(resolve=>{window.resolveSlowWantedProfile=resolve})};
    return query;
   }
   return originalFrom(table);
  };
  toggleWanted(true);
 });
 const card=page.locator('#wantedGrid .wanted-card');
 // The old implementation held all cards behind a five-second profile timeout.
 await expect(card).toBeVisible({timeout:1000});
 await expect(card).toContainText('Metroid Prime');
 await expect(card.locator('[data-wanted-author="collector-slow"]')).toHaveText('DeckPlay member');
 await page.evaluate(()=>resolveSlowWantedProfile({data:[{id:'collector-slow',username:'retrocollector'}],error:null}));
 await expect(card.locator('[data-wanted-author="collector-slow"]')).toHaveText('@retrocollector');
 await expect(card).toContainText('Looking for a complete copy');
});

test('stale Wanted match buttons recheck exact variant, listing availability, and account',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  currentUser={id:'viewer-a'};
  window.staleMatchToasts=[];toast=message=>staleMatchToasts.push(message);
  items=[{id:'stale-match-card',databaseId:'stale-match-card',c:'Trading Cards',game:'one_piece',sellerId:'seller-b',
   n:'Manga Rare Luffy',p:120,cond:'Near Mint',status:'active',
   description:'Card number: OP05-119\\nVariant: Manga Rare',imageUrls:[]}];
  const original=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>{
   if(table==='wanted_posts'){
    const q={select:()=>q,order:()=>q,limit:()=>Promise.resolve({data:[{
     id:'wanted-post-stale',user_id:'buyer-c',game:'one_piece',title:'Manga Rare Luffy',offer_type:'buy',
     details:'[DeckPlay match: {"cardNumber":"OP05-119","variant":"Manga Rare"}]'
    }],error:null})};return q;
   }
   if(table==='profiles'){
    const q={select:()=>q,in:()=>Promise.resolve({data:[],error:null})};return q;
   }
   return original(table);
  };
  toggleWanted(true);
 });
 const match=page.locator('[data-wanted-post="wanted-post-stale"][data-wanted-match="stale-match-card"]');
 await expect(match).toBeVisible();
 await page.evaluate(()=>{items[0].description='Card number: OP05-119\\nVariant: Regular'});
 await match.click();
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>{items[0].description='Card number: OP05-119\\nVariant: Manga Rare';items[0].status='paused'});
 await match.click();
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>{items[0].status='active';currentUser={id:'viewer-b'}});
 await match.click();
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>staleMatchToasts)).toEqual([
  'This listing is no longer an exact match. Refresh wanted posts.',
  'This listing is no longer an exact match. Refresh wanted posts.',
  'This listing is no longer an exact match. Refresh wanted posts.'
 ]);
});
