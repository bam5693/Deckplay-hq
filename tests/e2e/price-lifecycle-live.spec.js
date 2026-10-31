const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

// Real staging-only auth + data test; no real shoppers or live payments.
// Three dedicated seller-owned fixture listings share one unique marker so the
// existing authenticated cleanup RPC safely removes every offer and history.
test('T3.1 real price offer rejects invalid cents and respects accept, withdraw and decline',async({page,browser})=>{
 test.setTimeout(145000);
 if(process.env.DECKPLAY_STAGING_URL!=='https://deckplay-hq-staging.cstivers56.workers.dev')throw Error('Staging-only price lifecycle test');
 const title=marker();
 let sellerSignedIn=false,buyerSignedIn=false,primaryError=null;
 const context=await browser.newContext({
  baseURL:process.env.DECKPLAY_STAGING_URL,
  httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
  ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
 });
 const buyer=await context.newPage();
 const rpc=async(tab,name,args)=>tab.evaluate(async({name,args})=>{
  const {data,error}=await supabaseClient.rpc(name,args);
  return {data,error:error?{message:error.message,code:error.code}:null};
 },{name,args});
 const read=async(tab,id)=>tab.evaluate(async id=>{
  const [offer,history]=await Promise.all([
   supabaseClient.from('price_offers').select('id,listing_id,buyer_id,seller_id,status,amount,last_actor_id').eq('id',id).single(),
   supabaseClient.from('price_offer_history').select('action,amount,actor_id').eq('offer_id',id).order('created_at',{ascending:true}).order('id',{ascending:true})
  ]);
  if(offer.error||history.error)throw Error(offer.error?.message||history.error?.message);
  return {offer:offer.data,history:history.data};
 },id);
 try{
  await signIn(page,'SELLER');sellerSignedIn=true;
  const seller=await page.evaluate(()=>({id:currentUser?.id,email:currentUser?.email}));
  expect(seller.email).toBe('deckplay-seller@deckplay.test');
  const acceptedListing=await seedListing(page,title,{description:'Synthetic sports card price counter',tcg_game:'sports_cards'});
  const withdrawnListing=await seedListing(page,title,{category:'video_games',description:'Synthetic game price withdrawal'});
  const declinedListing=await seedListing(page,title,{category:'collectibles',description:'Synthetic memorabilia price decline'});
  await signIn(buyer,'BUYER');buyerSignedIn=true;
  const account=await buyer.evaluate(()=>({id:currentUser?.id,email:currentUser?.email}));
  expect(account.email).toBe('deckplay-buyer@deckplay.test');

  // Validate the real signed RPC, not only browser-side numeric input guards.
  for(const amount of [19.999,0,-1,100001]){
   const failed=await rpc(buyer,'submit_price_offer',{p_listing_id:acceptedListing,p_amount:amount});
   expect(failed.error?.message,'Invalid original offer '+amount+' must be rejected by database').toMatch(/Invalid offer amount/i);
  }
  const placed=await rpc(buyer,'submit_price_offer',{p_listing_id:acceptedListing,p_amount:20});
  expect(placed.error).toBeNull();
  const offerId=placed.data;
  expect(offerId).toMatch(/^[a-f0-9-]{36}$/);

  // Server-side idempotency: connection retry must reuse the original open offer
  // without appending a duplicate negotiation event.
  const retry=await rpc(buyer,'submit_price_offer',{p_listing_id:acceptedListing,p_amount:20});
  expect(retry.error).toBeNull();
  expect(retry.data).toBe(offerId);
  const differentAmount=await rpc(buyer,'submit_price_offer',{p_listing_id:acceptedListing,p_amount:21});
  expect(differentAmount.error?.message).toMatch(/An open offer already exists/i);
  const one=await buyer.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('price_offers').select('id').eq('listing_id',id).eq('buyer_id',currentUser.id).in('status',['pending','countered']);
   if(error)throw Error(error.message);
   return data.length;
  },acceptedListing);
  expect(one).toBe(1);
  expect((await read(buyer,offerId)).history.map(x=>x.action)).toEqual(['submitted']);

  const fractionalCounter=await rpc(page,'respond_price_offer',{p_offer_id:offerId,p_action:'counter',p_amount:22.999});
  expect(fractionalCounter.error?.message).toMatch(/Invalid counteroffer amount/i);
  const counter=await rpc(page,'respond_price_offer',{p_offer_id:offerId,p_action:'counter',p_amount:22.5});
  expect(counter.error).toBeNull();
  const counteredDuplicate=await rpc(buyer,'submit_price_offer',{p_listing_id:acceptedListing,p_amount:20});
  expect(counteredDuplicate.error?.message).toMatch(/An open offer already exists/i);
  const staleSeller=await rpc(page,'respond_price_offer',{p_offer_id:offerId,p_action:'accept',p_amount:null});
  expect(staleSeller.error?.message).toMatch(/Wait for the other collector/i);
  const accepted=await rpc(buyer,'respond_price_offer',{p_offer_id:offerId,p_action:'accept',p_amount:null});
  expect(accepted.error).toBeNull();
  const staleBuyer=await rpc(buyer,'respond_price_offer',{p_offer_id:offerId,p_action:'withdraw',p_amount:null});
  expect(staleBuyer.error?.message).toMatch(/closed/i);
  const price=await read(page,offerId),buyerPrice=await read(buyer,offerId);
  for(const view of [price,buyerPrice]){
   expect(view.offer.status).toBe('accepted');
   expect(Number(view.offer.amount)).toBe(22.5);
   expect(view.history.map(x=>x.action)).toEqual(['submitted','counter','accept']);
   expect(view.history.map(x=>Number(x.amount))).toEqual([20,22.5,22.5]);
  }
  const reserved=await page.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('listings').select('status').eq('id',id).single();
   if(error)throw Error(error.message);return data.status;
  },acceptedListing);
  expect(reserved).toBe('reserved');

  const withdrawn=await rpc(buyer,'submit_price_offer',{p_listing_id:withdrawnListing,p_amount:18});
  expect(withdrawn.error).toBeNull();
  const unauthorizedWithdraw=await rpc(page,'respond_price_offer',{p_offer_id:withdrawn.data,p_action:'withdraw',p_amount:null});
  expect(unauthorizedWithdraw.error?.message).toMatch(/Only buyer/i);
  const withdraw=await rpc(buyer,'respond_price_offer',{p_offer_id:withdrawn.data,p_action:'withdraw',p_amount:null});
  expect(withdraw.error).toBeNull();
  expect((await read(buyer,withdrawn.data)).offer.status).toBe('withdrawn');
  const renewed=await rpc(buyer,'submit_price_offer',{p_listing_id:withdrawnListing,p_amount:19});
  expect(renewed.error).toBeNull();
  expect(renewed.data).not.toBe(withdrawn.data);
  const closedCounter=await rpc(page,'respond_price_offer',{p_offer_id:withdrawn.data,p_action:'counter',p_amount:19});
  expect(closedCounter.error?.message).toMatch(/closed/i);

  const declined=await rpc(buyer,'submit_price_offer',{p_listing_id:declinedListing,p_amount:15});
  expect(declined.error).toBeNull();
  const decline=await rpc(page,'respond_price_offer',{p_offer_id:declined.data,p_action:'decline',p_amount:null});
  expect(decline.error).toBeNull();
  expect((await read(page,declined.data)).offer.status).toBe('declined');
  const closedWithdraw=await rpc(buyer,'respond_price_offer',{p_offer_id:declined.data,p_action:'withdraw',p_amount:null});
  expect(closedWithdraw.error?.message).toMatch(/closed/i);
  const remaining=await page.evaluate(async ids=>{
   const {data,error}=await supabaseClient.from('listings').select('id,status').in('id',ids);
   if(error)throw Error(error.message);
   return Object.fromEntries(data.map(row=>[row.id,row.status]));
  },[withdrawnListing,declinedListing]);
  expect(remaining[withdrawnListing]).toBe('active');
  expect(remaining[declinedListing]).toBe('active');
 }catch(error){primaryError=error;throw error}
 finally{
  if(sellerSignedIn&&!page.isClosed()){
   try{await cleanup(page,title)}catch(error){
    console.error('Exact synthetic price fixture cleanup failed: '+error.message);
    if(!primaryError)primaryError=error;
   }
  }
  await context.close();
  if(primaryError)throw primaryError;
 }
});
