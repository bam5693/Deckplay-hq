const {test,expect}=require('@playwright/test');const {signIn,menu,seedListing,cleanup,marker}=require('../helpers/staging.cjs');
test('Tanner and Jayden rotate hands-on sports/TCG trading and cash counteroffers',async({page,browser},testInfo)=>{
 const sellerLead=testInfo.project.name.endsWith('mobile')?'Jayden':'Tanner',buyerLead=sellerLead==='Tanner'?'Jayden':'Tanner';
 testInfo.annotations.push({type:'persona',description:sellerLead+' sells and counters; '+buyerLead+' buys, proposes a trade and accepts. Disposable SELLER/BUYER accounts rotate by viewport.'});
 test.setTimeout(100000);page.setDefaultTimeout(12000);const stage=async(name,fn)=>test.step(name,fn);const title=marker();await stage(sellerLead+' signs in as seller',()=>signIn(page,'SELLER'));
 const context=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,viewport:page.viewportSize(),httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE});const buyer=await context.newPage();buyer.setDefaultTimeout(12000);let buyerSignedIn=false,originalFailure=null;
 try{
  const details=lead=>({description:lead==='Tanner'?'Synthetic sports-card collector fixture: graded baseball card, condition and photos for exchange.':'Synthetic One Piece playable deck component for a TCG player and video-game collector.',tcg_game:lead==='Tanner'?'sports_cards':'one_piece'});
  const target=await stage(sellerLead+' lists an item for trade',()=>seedListing(page,title,details(sellerLead)));await stage(buyerLead+' signs in as buyer',()=>signIn(buyer,'BUYER'));buyerSignedIn=true;const offered=await stage(buyerLead+' lists trade collateral',()=>seedListing(buyer,title,details(buyerLead)));const extra=await seedListing(buyer,title,{...details(buyerLead),description:'Second distinct printing or collectible in the bundle'});
  console.log('TRADE STAGE buyer marketplace search');await buyer.reload({waitUntil:'domcontentloaded'});await buyer.locator('[data-cat="Trading Cards"]').first().click();await buyer.locator('#search').fill(title);
  try{await expect.poll(()=>buyer.evaluate(()=>listingSource),{timeout:17000,intervals:[100,300,500,1000]}).toBe('live')}
  catch(error){
   const snapshot=await buyer.evaluate(()=>({source:listingSource,loaded:items.length,authReady:!!currentUser,
    filters:{category:cat,game,query},message:document.querySelector('#grid .empty')?.textContent?.slice(0,180)||''}));
   console.log('TRADE CATALOG LOADING DIAGNOSTIC '+JSON.stringify(snapshot));
   throw error;
  }
  const discovery=await buyer.evaluate(async id=>{
   const r=await supabaseClient.from('listings').select('id,category,status').eq('id',id).maybeSingle();
   return {directStatus:r.data?.status||null,directCategory:r.data?.category||null,directError:r.error?.code||null,catalogCount:items.length,
     inMemory:items.some(x=>x.id===id),inGrid:!!document.querySelector('[data-view="'+id+'"]'),cat,game,filter,query,source:listingSource,
     filterCategory:document.getElementById('marketCategory').value,visibleGrid:!document.getElementById('market').hidden};
  },target);
  console.log('TRADE DISCOVERY '+JSON.stringify(discovery));
  if(discovery.directStatus!=='active')throw Error('Staging fixture is not visible to buyer in the Data API');
  if(!discovery.inGrid)throw Error('Buyer marketplace catalog/search did not show an active fixture; see TRADE DISCOVERY for diagnostics');
  await buyer.locator('[data-view="'+target+'"]').click();console.log('TRADE STAGE buyer detail then open trade');await buyer.locator('[data-trade-id]').click();
  console.log('TRADE STAGE buyer offered listing options');await expect(buyer.locator('#tradeOfferedListing option[value="'+offered+'"]')).toBeAttached({timeout:15000});await buyer.locator('#tradeOfferedListing').selectOption(offered);await buyer.locator('#tradeAddItem').click();await buyer.locator('#tradeOfferedListing').selectOption(extra);await expect(buyer.locator('#tradeBundleCount')).toContainText('2 listed items selected');await buyer.locator('#tradeOfferNote').fill(title);
  console.log('TRADE STAGE buyer posts trade offer');const response=buyer.waitForResponse(r=>r.url().includes('/rest/v1/trade_offers')&&r.request().method()==='POST');await buyer.locator('#tradeComposeForm button[type="submit"]').click();expect((await response).ok()).toBe(true);await expect(buyer.locator('#tradeComposeModal')).not.toHaveClass(/open/,{timeout:15000});
  console.log('TRADE STAGE seller receives offer');await stage(sellerLead+' opens trade inbox',()=>menu(page,'myTrades'));const card=page.locator('.trade-offer-card').filter({hasText:title});await expect(card).toHaveCount(1,{timeout:15000});await card.locator('[data-counter-start]').click();await page.locator('#counterDirection').selectOption('sender_pays');await page.locator('#counterAmount').fill('5');await page.locator('#counterNote').fill(title+' counter');await page.locator('#counterForm button[type="submit"]').click();await expect(page.locator('#counterModal')).not.toHaveClass(/open/,{timeout:15000});
  if(await buyer.locator('#detailModal').evaluate(el=>el.classList.contains('open'))) await buyer.locator('[data-close="detailModal"]').click({force:true,timeout:5000});await stage(buyerLead+' opens trade inbox',()=>menu(buyer,'myTrades'));const incoming=buyer.locator('.trade-offer-card').filter({hasText:title});await expect(incoming.locator('[data-counter-response="accept"]')).toBeVisible({timeout:15000});buyer.once('dialog',d=>d.accept());console.log('TRADE STAGE buyer accepts counter');await stage(buyerLead+' accepts counteroffer',()=>incoming.locator('[data-counter-response="accept"]').click());await expect(incoming).toContainText('Original offer: accepted',{timeout:15000});
  for(const [p,id] of [[page,target],[buyer,offered],[buyer,extra]])expect(await p.evaluate(async id=>{const {data,error}=await supabaseClient.from('listings').select('status').eq('id',id).single();if(error)throw Error(error.message);return data.status},id)).toBe('reserved');
 }catch(error){originalFailure=error;throw error}
 finally{
  const cleanupFailures=[];
  async function finishFixture(which,tab){
   if(tab.isClosed())return;
   try{await cleanup(tab,title)}catch(error){
    cleanupFailures.push(error);
    const scope=await tab.evaluate(()=>({loggedIn:!!currentUser,uuid:/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(currentUser?.id||''),
     dedicated:['deckplay-seller@deckplay.test','deckplay-buyer@deckplay.test'].includes(currentUser?.email||'')})).catch(()=>({unavailable:true}));
    console.error('Protected '+which+' fixture cleanup could not complete: '+error.message+'; account state '+JSON.stringify(scope));
   }
  }
  try{
   if(buyerSignedIn)await finishFixture('buyer',buyer);
   await finishFixture('seller',page);
  }finally{await context.close().catch(error=>{if(!originalFailure)throw error})}
  if(!originalFailure&&cleanupFailures.length)throw cleanupFailures[0];
 }

});
