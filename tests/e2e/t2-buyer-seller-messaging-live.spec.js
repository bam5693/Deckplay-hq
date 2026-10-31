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
  const listingId=await seedListing(seller,title,{category:'video_games',description:'T2.1 synthetic messaging fixture'});
  await signIn(buyer,'BUYER');buyerReady=true;
  const buyerId=await buyer.evaluate(()=>currentUser.id);
  // First contact: render the actual saved video-game listing details, click its
  // Message seller action, send through the real compose form, and require Inbox navigation.
  await buyer.evaluate(async id=>{
   const {data,error}=await supabaseClient.from('listings').select('*').eq('id',id).single();
   if(error)throw Error(error.message);
   showDetails(marketplaceItemFromRow(data,{username:'staging-seller'}));
  },listingId);
  await buyer.locator('#detailContent [data-contact-id="'+sellerId+'"]').click();
  await expect(buyer.locator('#composeModal')).toHaveClass(/open/);
  await buyer.locator('#composeBody').fill(title+' opener');
  await buyer.locator('#composeForm button[type="submit"]').click();
  await expect(buyer.locator('#inboxPage')).toBeVisible({timeout:20000});
  await expect(buyer.locator('.chat-composer[data-chat-recipient="'+sellerId+'"]')).toBeVisible({timeout:20000});
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
  // T2.4 visible send error: rejection must not discard the draft.
  const failedDraft=title+' failed draft';
  await buyer.locator('#chatInput').fill(failedDraft);
  await buyer.evaluate(()=>{
   const original=supabaseClient.from.bind(supabaseClient);
   window.__t2FromOriginal=original;
   supabaseClient.from=table=>{
    if(table!=='collector_messages')return original(table);
    const q=original(table),insert=q.insert.bind(q);
    q.insert=row=>{
     if(row.body.includes('failed draft')){
      return {select:()=>({single:async()=>({data:null,error:new Error('T2.4 simulated message rejection')})})};
     }
     return insert(row);
    };
    return q;
   };
  });
  try{
   await buyer.locator('[aria-label="Send message"]').click();
   await expect(buyer.locator('.chat-send-status')).toContainText('Could not send:',{timeout:15000});
   await expect(buyer.locator('.chat-send-status')).toContainText('Tap Send to retry');
   await expect(buyer.locator('#chatInput')).toHaveValue(failedDraft);
  }finally{
   await buyer.evaluate(()=>{supabaseClient.from=window.__t2FromOriginal;delete window.__t2FromOriginal});
  }
  // Retry the exact draft after the simulated failure, not a different message.
  const rejected=await buyer.evaluate(async text=>{
   const {data,error}=await supabaseClient.from('collector_messages').select('id').eq('body',text).eq('sender_id',currentUser.id);
   if(error)throw Error(error.message);
   return data.length;
  },failedDraft);
  expect(rejected).toBe(0);
  await buyer.locator('[aria-label="Send message"]').click();
  await expect.poll(()=>buyer.evaluate(async text=>{
   const {data,error}=await supabaseClient.from('collector_messages').select('id').eq('body',text).eq('sender_id',currentUser.id);
   if(error)throw Error(error.message);
   return data.length;
  },failedDraft),{timeout:18000}).toBe(1);
  // T2.4: the database commits, but the first HTTP success is lost and the
  // confirmation read fails. The next retry must reuse its message UUID.
  const retryResult=await buyer.evaluate(async({sellerId,body})=>{
   const realFrom=supabaseClient.from.bind(supabaseClient);
   let lost=false,offline=false,insertCount=0,committedId=null;
   const payload={sender_id:currentUser.id,recipient_id:sellerId,body};
   supabaseClient.from=table=>{
    const q=realFrom(table);
    if(table!=='collector_messages')return q;
    const realInsert=q.insert.bind(q),realSelect=q.select.bind(q);
    q.insert=row=>{
     insertCount++;
     const chain=realInsert(row),select=chain.select.bind(chain);
     chain.select=fields=>{
      const result=select(fields),single=result.single.bind(result);
      result.single=async()=>{
       const response=await single();
       if(!lost&&!response.error&&response.data?.id){
        lost=true;committedId=response.data.id;
        throw Error('T2.4 simulated lost success after commit');
       }
       return response;
      };
      return result;
     };
     return chain;
    };
    q.select=fields=>{
     const result=realSelect(fields),maybeSingle=result.maybeSingle.bind(result);
     result.maybeSingle=async()=>{
      if(!offline){offline=true;throw Error('T2.4 temporary confirmation outage')}
      return maybeSingle();
     };
     return result;
    };
    return q;
   };
   let firstFailure=null;
   try{await sendCollectorMessageOnce(payload)}catch(error){firstFailure=error.message}
   finally{supabaseClient.from=realFrom}
   const retry=await sendCollectorMessageOnce(payload);
   const {data,error}=await supabaseClient.from('collector_messages').select('id').eq('body',body).eq('sender_id',currentUser.id);
   if(error)throw Error(error.message);
   return {firstFailure,committedId,retryId:retry.data?.id,insertCount,count:data.length,onlyId:data[0]?.id};
  },{sellerId,body:title+' uncertain delivery'});
  expect(retryResult.firstFailure).toMatch(/temporary confirmation outage|lost success after commit/);
  expect(retryResult.insertCount).toBe(1);
  expect(retryResult.retryId).toBe(retryResult.committedId);
  expect(retryResult.count).toBe(1);
  expect(retryResult.onlyId).toBe(retryResult.committedId);
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
