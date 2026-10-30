const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

// Real, signed buyer/seller staging acceptance. No service-role key or live customer writes.
// Every record is tagged with one random dedicated-fixture title and cleaned through
// cleanup_staging_fixture. Never run this test against production.
test('real buyer and seller recover their price and trade counter history in Inbox',async({page,browser})=>{
 test.setTimeout(160000);
 const title=marker();
 let sellerSignedIn=false,buyerSignedIn=false,primaryFailure=null;
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
  await context.close();
  if(!primaryFailure&&errors.length)throw errors[0];
 }
});
