const {test,expect,devices}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

// Real, signed buyer/seller staging acceptance. No service-role key or live customer writes.
// Every record is tagged with one random dedicated-fixture title and cleaned through
// cleanup_staging_fixture. Never run this test against production.
test('real buyer and seller recover their price and trade counter history in Inbox',async({page,browser})=>{
 test.setTimeout(160000);
 const title=marker();
 let sellerSignedIn=false,buyerSignedIn=false,primaryFailure=null;
 let mobileContext=null;
 const context=await browser.newContext({
  baseURL:process.env.DECKPLAY_STAGING_URL,
  httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
  ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
 });
 const buyer=await context.newPage();
 try{
  await signIn(page,'SELLER');sellerSignedIn=true;
  const sellerId=await page.evaluate(()=>currentUser.id);
  const target=await seedListing(page,title,{description:'Synthetic sports card to validate negotiation history',tcg_game:'sports_cards'});
  await signIn(buyer,'BUYER');buyerSignedIn=true;
  const buyerId=await buyer.evaluate(()=>currentUser.id);
  const offered=await seedListing(buyer,title,{description:'Synthetic One Piece single to validate trade history',tcg_game:'one_piece'});

  const priceId=await buyer.evaluate(async listing=>{
   const {data,error}=await supabaseClient.rpc('submit_price_offer',{p_listing_id:listing,p_amount:20});
   if(error)throw Error('Creating synthetic price offer failed: '+error.message);
   return data;
  },target);
  await page.evaluate(async id=>{
   const {error}=await supabaseClient.rpc('respond_price_offer',{p_offer_id:id,p_action:'counter',p_amount:22});
   if(error)throw Error('Creating synthetic price counter failed: '+error.message);
  },priceId);

  const tradeId=await buyer.evaluate(async ids=>{
   const {data,error}=await supabaseClient.from('trade_offers').insert({
    listing_id:ids.target,offered_listing_id:ids.offered,sender_id:currentUser.id,
    recipient_id:ids.seller,offer_note:ids.marker
   }).select('id').single();
   if(error)throw Error('Creating synthetic trade offer failed: '+error.message);
   return data.id;
  },{target,offered,seller:sellerId,marker:title});
  const counterId=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.rpc('create_trade_counter',{
    p_offer:id,p_cash:5,p_direction:'sender_pays',p_note:'Synthetic counter '+id
   });
   if(error)throw Error('Creating synthetic trade counter failed: '+error.message);
   return data;
  },tradeId);

  // Query the real participant-scoped PostgREST endpoint with the same composite
  // conversation filter and timestamp ordering used in the Inbox browser.
  for(const [tab,user,other] of [[page,sellerId,buyerId],[buyer,buyerId,sellerId]]){
   const history=await tab.evaluate(async ({user,other})=>{
    const get=async(table,first,second,fields)=>{
     const {data,error}=await supabaseClient.from(table).select(fields)
      .or(inboxNegotiationFilter(user,other,first,second,null))
      .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50);
     if(error)throw Error('Real '+table+' query failed: '+error.message);
     return data;
    };
    return {
     prices:await get('price_offer_history','buyer_id','seller_id','id,offer_id,action,amount,created_at'),
     trades:await get('trade_counteroffers','proposer_id','recipient_id','id,trade_offer_id,offer_note,created_at')
    };
   },{user,other});
   expect(history.prices.filter(x=>x.offer_id===priceId).length,'Both users see their negotiated price events').toBeGreaterThanOrEqual(2);
   expect(history.trades.some(x=>x.id===counterId&&x.trade_offer_id===tradeId),'Both users see their trade counter').toBe(true);
  }

  // Exercise the real app button, not only an API query or a mocked browser.
  await buyer.evaluate(async id=>{await showInboxPage(id)},sellerId);
  const more=buyer.locator('[data-inbox-older-negotiations]');
  await expect(more).toBeVisible({timeout:18000});
  await more.click();
  await expect.poll(()=>buyer.evaluate(({sellerId,priceId,counterId})=>{
   const rows=inboxNegotiationPages.get(sellerId);
   return !!rows?.prices.some(x=>x.offer_id===priceId)&&!!rows?.trades.some(x=>x.id===counterId);
  },{sellerId,priceId,counterId}),{timeout:18000}).toBe(true);
  await expect(buyer.locator('.conversation-bubbles')).toContainText('22.00',{timeout:12000});
  await expect(buyer.locator('.conversation-bubbles')).toContainText('Synthetic counter',{timeout:12000});

  // Anonymous tokens must not gain visibility of these private events.
  const anonymous=await buyer.evaluate(async ({priceId,counterId})=>{
   const headers={apikey:SUPABASE_PUBLISHABLE_KEY};
   const origin=SUPABASE_URL;
   const get=async(table,field,id)=>{
    const url=origin+'/rest/v1/'+table+'?select=id&'+field+'=eq.'+encodeURIComponent(id);
    const response=await fetch(url,{headers});
    if(!response.ok)throw Error('Anonymous read failed unexpectedly: '+response.status);
    return response.json();
   };
   return {prices:await get('price_offer_history','offer_id',priceId),trades:await get('trade_counteroffers','id',counterId)};
  },{priceId,counterId});
  expect(anonymous).toEqual({prices:[],trades:[]});

  // P0 signed transaction-integrity gate: a pending counter cannot be bypassed,
  // and accepting the actual counter reserves only the two fixture listings.
  const denied=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('trade_offers').update({
    status:'accepted',cash_amount:500,cash_direction:'sender_pays',offer_note:'UNAPPROVED CHANGE'
   }).eq('id',id).select('id');
   return {count:(data||[]).length,failed:!!error};
  },tradeId);
  expect(denied.failed||denied.count===0,'Direct acceptance/cash tampering must not succeed').toBe(true);
  const before=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('trade_offers')
    .select('status,cash_amount,offer_note').eq('id',id).single();
   if(error)throw Error(error.message);
   return data;
  },tradeId);
  expect(before.status).toBe('pending');
  expect(Number(before.cash_amount)).toBe(0);
  expect(before.offer_note).toBe(title);

  await buyer.evaluate(async id=>{
   const {error}=await supabaseClient.rpc('respond_trade_counter',{p_counter:id,p_accept:true});
   if(error)throw Error('Valid signed trade-counter acceptance failed: '+error.message);
  },counterId);
  const accepted=await buyer.evaluate(async ({tradeId,target,offered})=>{
   const {data:trade,error}=await supabaseClient.from('trade_offers')
    .select('status,cash_amount,cash_direction,offer_note,initial_terms').eq('id',tradeId).single();
   if(error)throw Error(error.message);
   const {data:listings,error:listingError}=await supabaseClient.from('listings')
    .select('id,status').in('id',[target,offered]);
   if(listingError)throw Error(listingError.message);
   return {trade,listings};
  },{tradeId,target,offered});
  expect(accepted.trade.status).toBe('accepted');
  expect(Number(accepted.trade.cash_amount)).toBe(5);
  expect(accepted.trade.cash_direction).toBe('sender_pays');
  expect(accepted.trade.offer_note).toBe('Synthetic counter '+tradeId);
  expect(accepted.trade.initial_terms.note).toBe(title);
  expect(accepted.listings).toHaveLength(2);
  expect(accepted.listings.every(x=>x.status==='reserved')).toBe(true);

  // Verify the authenticated deal progress RPC itself before the Inbox rendering.
  const progressProbe=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.rpc('ensure_deal_progress',{p_offer_type:'trade',p_offer_id:id});
   return {id:data?.id||null,status:data?.status||null,error:error?.message||null};
  },tradeId);
  expect(progressProbe.error,'Accepted synthetic trade must initialize scoped progress').toBeNull();
  expect(progressProbe.status).toBe('accepted');

  // The listing owner must be able to open the actual Inbox and see the
  // accepted deal next steps; the server creates an isolated progress row
  // only when the seller views this accepted bot transaction.
  await page.evaluate(async id=>showInboxPage(id),buyerId);
  const sellerOlder=page.locator('[data-inbox-older-negotiations]');
  if(await sellerOlder.isVisible())await sellerOlder.click();
  await expect(page.locator('.conversation-bubbles')).toContainText('Synthetic counter',{timeout:18000});
  await expect(page.locator('.chat-deal-panel > summary')).toBeVisible({timeout:18000});
  await page.locator('.chat-deal-panel > summary').click();
  await expect.poll(async()=>page.locator('.chat-deal-panel [data-deal-details]').textContent(),{timeout:18000}).toContain('Transaction:');
  const sellerProgress=page.locator('.transaction-next-steps').filter({has:page.locator('[data-deal-status="'+progressProbe.id+'"]')});
  await expect(sellerProgress).toHaveCount(1,{timeout:18000});
  await expect(sellerProgress).toBeVisible();
  await expect(sellerProgress).toContainText('Progress is self-reported');
  await expect(sellerProgress).toContainText('DeckPlay does not verify payments or shipping');
  // A second signed-in, mobile-emulated buyer independently reads the same
  // participant-scoped history and sees the seller-created progress record.
  mobileContext=await browser.newContext({
   ...devices['Pixel 7'],baseURL:process.env.DECKPLAY_STAGING_URL,
   httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
   ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
  });
  const mobileBuyer=await mobileContext.newPage();
  await signIn(mobileBuyer,'BUYER');
  await mobileBuyer.evaluate(async id=>showInboxPage(id),sellerId);
  const mobileOlder=mobileBuyer.locator('[data-inbox-older-negotiations]');
  if(await mobileOlder.isVisible())await mobileOlder.click();
  await expect(mobileBuyer.locator('.conversation-bubbles')).toContainText('Synthetic counter',{timeout:18000});
  await expect(mobileBuyer.locator('.conversation-bubbles')).toContainText('22.00',{timeout:18000});
  await expect(mobileBuyer.locator('.chat-deal-panel > summary')).toBeVisible({timeout:18000});
  await mobileBuyer.locator('.chat-deal-panel > summary').click();
  const mobileProgress=mobileBuyer.locator('.transaction-next-steps').filter({has:mobileBuyer.locator('[data-deal-status="'+progressProbe.id+'"]')});
  await expect(mobileProgress).toHaveCount(1,{timeout:18000});
  await expect(mobileProgress).toBeVisible();
  await expect(mobileProgress).toContainText('Progress is self-reported');
  await expect(mobileProgress).toContainText('DeckPlay does not verify payments or shipping');
  await expect(mobileProgress.locator('[data-confirm-deal]')).toHaveCount(1);
 }catch(error){primaryFailure=error;throw error}
 finally{
  const errors=[];
  for(const [signedIn,tab,label] of [[buyerSignedIn,buyer,'buyer'],[sellerSignedIn,page,'seller']]){
   if(!signedIn||tab.isClosed())continue;
   try{await cleanup(tab,title)}catch(error){
    errors.push(error);
    console.error('Dedicated '+label+' fixture cleanup failed: '+error.message);
   }
  }
  if(mobileContext)await mobileContext.close();
  await context.close();
  if(!primaryFailure&&errors.length)throw errors[0];
 }
});


test('T3.4 signed duplicate trade retries keep exactly one pending proposal across categories',async({page,browser})=>{
 test.setTimeout(140000);
 if(process.env.DECKPLAY_STAGING_URL!=='https://deckplay-hq-staging.cstivers56.workers.dev')throw Error('Refusing non-staging target');
 const title=marker();
 let sellerSignedIn=false,buyerSignedIn=false,primaryError=null;
 const context=await browser.newContext({
  baseURL:process.env.DECKPLAY_STAGING_URL,
  httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
  ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
 });
 const buyer=await context.newPage();
 try{
  await signIn(page,'SELLER');sellerSignedIn=true;
  const sellerId=await page.evaluate(()=>currentUser.id);
  const target=await seedListing(page,title,{category:'video_games',description:'TEST ONLY BOT cross-category target'});
  await signIn(buyer,'BUYER');buyerSignedIn=true;
  const offered=await seedListing(buyer,title,{category:'trading_cards',tcg_game:'sports_cards',description:'TEST ONLY BOT sports card collateral'});
  const create=async(note)=>buyer.evaluate(async({target,offered,sellerId,note})=>{
   const payload={id:crypto.randomUUID(),listing_id:target,sender_id:currentUser.id,recipient_id:sellerId,
    offered_listing_id:offered,offered_listing_ids:[offered],offer_note:note,cash_amount:0,cash_direction:'none'};
   const {data,error}=await supabaseClient.from('trade_offers').insert(payload).select('id,status').single();
   return {id:data?.id||null,status:data?.status||null,error:error?.message||null};
  },{target,offered,sellerId,note});
  const first=await create(title);
  expect(first.error).toBeNull();
  expect(first.status).toBe('pending');
  expect(first.id).toMatch(/^[a-f0-9-]{36}$/);
  const duplicate=await create(title);
  expect(duplicate.id).toBeNull();
  expect(duplicate.error).toMatch(/identical pending trade proposal already exists/i);
  const pendingCount=await buyer.evaluate(async target=>{
   const {data,error}=await supabaseClient.from('trade_offers').select('id').eq('listing_id',target).eq('sender_id',currentUser.id).eq('status','pending');
   if(error)throw Error(error.message);return data.length;
  },target);
  expect(pendingCount).toBe(1);
  const sellerCanSee=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('trade_offers').select('id,status').eq('id',id).single();
   if(error)throw Error(error.message);return data.status;
  },first.id);
  expect(sellerCanSee).toBe('pending');
  // A deliberately changed note is a separate proposal and must not be blocked.
  const revised=await create(title+' revised');
  expect(revised.error).toBeNull();
  expect(revised.id).not.toBe(first.id);
  // Declining a pending proposal allows the collector to submit those terms anew.
  // Staging intentionally denies direct client UPDATE on trade_offers;
  // closing a proposal must use the authorized server-side RPC.
  const close=await page.evaluate(async id=>{
   const {error}=await supabaseClient.rpc('respond_trade_offer',{p_offer:id,p_action:'declined'});
   return error?.message||null;
  },first.id);
  expect(close).toBeNull();
  const reopened=await create(title);
  expect(reopened.error).toBeNull();
  expect(reopened.id).not.toBe(first.id);
  const repeatAgain=await create(title);
  expect(repeatAgain.error).toMatch(/identical pending trade proposal already exists/i);
  // The INSERT must really commit to staging, then we deliberately lose the
  // HTTP success result and the first confirmation read. Retrying must recover
  // the same ID without sending a second INSERT or a second notification.
  const lostResponse=await buyer.evaluate(async({target,offered,sellerId,note})=>{
   const payload={listing_id:target,sender_id:currentUser.id,recipient_id:sellerId,
    offered_listing_id:offered,offered_listing_ids:[offered],offer_note:note,
    cash_amount:0,cash_direction:'none'};
   const realFrom=supabaseClient.from.bind(supabaseClient);
   let interceptedInsert=0,committedId=null,lostSuccess=false,lostLookup=false;
   supabaseClient.from=(table)=>{
    const q=realFrom(table);
    if(table!=='trade_offers')return q;
    const insert=q.insert.bind(q),select=q.select.bind(q);
    q.insert=(row)=>{
     interceptedInsert++;
     const chain=insert(row),realSelect=chain.select.bind(chain);
     chain.select=columns=>{
      const selected=realSelect(columns),realSingle=selected.single.bind(selected);
      selected.single=async()=>{
       const response=await realSingle();
       if(!response.error&&response.data?.id&&!lostSuccess){
        lostSuccess=true;committedId=response.data.id;
        throw Error('Synthetic success response lost after a real DB commit');
       }
       return response;
      };
      return selected;
     };
     return chain;
    };
    q.select=columns=>{
     const selected=select(columns),realMaybeSingle=selected.maybeSingle.bind(selected);
     selected.maybeSingle=async()=>{
      if(!lostLookup){lostLookup=true;throw Error('Synthetic confirmation lookup temporarily offline')}
      return realMaybeSingle();
     };
     return selected;
    };
    return q;
   };
   try{
    let firstError=null;
    try{await sendTradeProposalOnce(payload)}catch(error){firstError=error.message}
    const savedRetry=sessionStorage.getItem('deckplay-trade-retries-v1:'+currentUser.id);
    supabaseClient.from=realFrom;
    const recovered=await sendTradeProposalOnce(payload);
    const cleanedRetry=sessionStorage.getItem('deckplay-trade-retries-v1:'+currentUser.id);
    return {firstError,committedId,recovered:recovered.data?.id,interceptedInsert,savedRetry:!!savedRetry,cleanedRetry:cleanedRetry===null};
   }finally{supabaseClient.from=realFrom}
  },{target,offered,sellerId,note:title+' response-lost'});
  expect(lostResponse.firstError).toMatch(/Synthetic success response lost after a real DB commit/);
  expect(lostResponse.interceptedInsert).toBe(1);
  expect(lostResponse.committedId).toMatch(/^[a-f0-9-]{36}$/);
  expect(lostResponse.recovered).toBe(lostResponse.committedId);
  expect(lostResponse.savedRetry).toBe(true);
  expect(lostResponse.cleanedRetry).toBe(true);
  const confirmedOnce=await buyer.evaluate(async({target,note})=>{
   const {data,error}=await supabaseClient.from('trade_offers').select('id').eq('listing_id',target).eq('sender_id',currentUser.id).eq('offer_note',note).eq('status','pending');
   if(error)throw Error(error.message);
   return data.map(x=>x.id);
  },{target,note:title+' response-lost'});
  expect(confirmedOnce).toEqual([lostResponse.committedId]);

 }catch(error){primaryError=error;throw error}
 finally{
  const errors=[];
  for(const [signedIn,tab,label] of [[buyerSignedIn,buyer,'buyer'],[sellerSignedIn,page,'seller']]){
   if(!signedIn||tab.isClosed())continue;
   try{await cleanup(tab,title)}catch(error){
    errors.push(error);
    console.error('Exact '+label+' synthetic trade retry cleanup failed: '+error.message);
   }
  }
  await context.close();
  if(!primaryError&&errors.length)throw errors[0];
 }
});
