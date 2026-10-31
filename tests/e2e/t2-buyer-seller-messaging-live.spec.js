const {test,expect}=require('@playwright/test');
const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');

// T2.1: real signed collector-to-seller text delivery, not a mocked API test.
// Dedicated synthetic staging accounts and marker-scoped cleanup only.
test('T2.1 signed buyer and seller exchange real Inbox messages',async({browser})=>{
 test.setTimeout(120000);
 if(process.env.DECKPLAY_STAGING_URL!=='https://deckplay-hq-staging.cstivers56.workers.dev')throw Error('Staging-only test');
 const context=await browser.newContext({
  baseURL:process.env.DECKPLAY_STAGING_URL,
  httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
  ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
 });
 const seller=await context.newPage();
 const buyerContext=await browser.newContext({baseURL:process.env.DECKPLAY_STAGING_URL,httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE});
 const buyer=await buyerContext.newPage();
 const title=marker(),buyerMessage=title+' buyer message',reply=title+' seller reply';
 let buyerReady=false,sellerReady=false,failed=null;
 try{
  await signIn(seller,'SELLER');sellerReady=true;
  const sellerId=await seller.evaluate(()=>currentUser.id);
  await seedListing(seller,title,{category:'video_games',description:'T2.1 synthetic messaging fixture'});
  await signIn(buyer,'BUYER');buyerReady=true;
  const buyerId=await buyer.evaluate(()=>currentUser.id);
  // Establish a real participant-scoped thread; the actions below exercise the rendered composer.
  await buyer.evaluate(async({sellerId,title})=>{const {error}=await supabaseClient.from('collector_messages').insert({sender_id:currentUser.id,recipient_id:sellerId,body:title+' opener'});if(error)throw Error(error.message)},{sellerId,title});
  await buyer.evaluate(id=>showInboxPage(id),sellerId);
  await expect(buyer.locator('.chat-composer[data-chat-recipient="'+sellerId+'"]')).toBeVisible({timeout:20000});
  await buyer.locator('#chatInput').fill(buyerMessage);
  await buyer.locator('[aria-label="Send message"]').click();
  await expect.poll(async()=>buyer.evaluate(async body=>{
   const {data,error}=await supabaseClient.from('collector_messages').select('id').eq('body',body).eq('sender_id',currentUser.id);
   if(error)throw Error(error.message);return data.length;
  },buyerMessage),{timeout:18000}).toBe(1);
  await seller.evaluate(id=>showInboxPage(id),buyerId);
  await expect(seller.locator('.conversation-bubbles')).toContainText(buyerMessage,{timeout:20000});
  await seller.locator('#chatInput').fill(reply);
  await seller.locator('[aria-label="Send message"]').click();
  await expect.poll(async()=>seller.evaluate(async body=>{
   const {data,error}=await supabaseClient.from('collector_messages').select('id').eq('body',body).eq('sender_id',currentUser.id);
   if(error)throw Error(error.message);return data.length;
  },reply),{timeout:18000}).toBe(1);
  await buyer.evaluate(id=>showInboxPage(id),sellerId);
  await expect(buyer.locator('.conversation-bubbles')).toContainText(reply,{timeout:20000});
  // Sender and recipient must each see only one persisted copy.
  for(const [page,body] of [[buyer,buyerMessage],[seller,reply]]){
   const count=await page.evaluate(async body=>{
    const {data,error}=await supabaseClient.from('collector_messages').select('id').eq('body',body);
    if(error)throw Error(error.message);return data.length;
   },body);
   expect(count).toBe(1);
  }
 }catch(error){failed=error;throw error}
 finally{
  const errors=[];
  for(const [page,ready] of [[buyer,buyerReady],[seller,sellerReady]]){
   if(!ready)continue;
   try{await cleanup(page,title)}catch(error){errors.push(error)}
  }
  await buyerContext.close();
  await context.close();
  if(!failed&&errors.length)throw errors[0];
 }
});
