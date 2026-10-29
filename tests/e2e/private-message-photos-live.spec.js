const {test,expect}=require('@playwright/test');const jpeg=require('jpeg-js');const {signIn,marker,cleanup}=require('../helpers/staging.cjs');
test('collectors share private corner photos with immutable retries and scoped cleanup',async({browser})=>{
 test.setTimeout(120000);const context=await browser.newContext({httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD||''}}),buyer=await context.newPage();let seller,otherContext;const title=marker(),uploads=[];
 buyer.on('request',r=>{if(r.url().endsWith('/functions/v1/message-photos')&&r.method()==='POST')uploads.push({id:r.headers()['x-attachment-id'],recipient:r.headers()['x-recipient-id'],message:r.headers()['x-message-id'],bytes:Array.from(r.postDataBuffer()||[])})});
 try{
  await signIn(buyer,'BUYER');otherContext=await browser.newContext({httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD||''}});seller=await otherContext.newPage();await signIn(seller,'SELLER');
  const sellerId=await seller.evaluate(()=>currentUser.id),buyerId=await buyer.evaluate(()=>currentUser.id);
  await buyer.evaluate(async({recipient,title})=>{const {error}=await supabaseClient.from('collector_messages').insert({sender_id:currentUser.id,recipient_id:recipient,body:title});if(error)throw Error(error.message);await showInboxPage(recipient)},{recipient:sellerId,title});
  const bytes=jpeg.encode({width:8,height:8,data:Buffer.alloc(256,210)},80).data;
  await buyer.locator('#chatInput').fill(title);await buyer.locator('[data-photo-input="library"]').setInputFiles({name:'synthetic-corner.jpg',mimeType:'image/jpeg',buffer:bytes});await expect(buyer.locator('.chat-photo-drafts img')).toHaveCount(1);await buyer.locator('[aria-label="Send message"]').click();
  await expect.poll(async()=>{const drafts=await buyer.locator('.chat-photo-drafts img').count();if(!drafts)return 'sent';const status=await buyer.locator('.chat-composer .chat-send-status').last().textContent().catch(()=>null);return status?.startsWith('Could not send:')?status:'pending'},{timeout:45000,message:'Private photo send must complete or expose its actual API failure'}).toBe('sent');expect(uploads.length).toBeGreaterThan(0);const upload=uploads.at(-1);
  const message=buyer.locator('[data-message-photos="'+upload.message+'"]');await expect(message).toBeVisible();await message.locator('button').click();await expect(message.locator('img')).toBeVisible({timeout:15000});
  const path=buyerId+'/'+upload.id+'.jpg';const denied=await buyer.request.get('https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/conversation-photos/'+path);expect(denied.ok()).toBe(false);
  const retry=await buyer.evaluate(async u=>{const {data}=await supabaseClient.auth.getSession();const r=await fetch(SUPABASE_URL+'/functions/v1/message-photos',{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+data.session.access_token,'content-type':'image/jpeg','x-attachment-id':u.id,'x-message-id':u.message,'x-recipient-id':u.recipient},body:new Uint8Array(u.bytes)});return {status:r.status,data:await r.json()}},upload);expect(retry.status).toBe(200);expect(retry.data.status).toBe('attached');
  await seller.evaluate(id=>showInboxPage(id),buyerId);const received=seller.locator('[data-message-photos="'+upload.message+'"]');await received.locator('button').click();await expect(received.locator('img')).toBeVisible({timeout:15000});const signed=await received.locator('img').getAttribute('src');expect(signed).toContain('/object/sign/conversation-photos/');const actual=await seller.request.get(signed);expect(actual.ok()).toBe(true);expect(actual.headers()['content-type']).toContain('image/jpeg');
 }finally{
  if(await buyer.evaluate(()=>!!currentUser).catch(()=>false)){
   await buyer.evaluate(async({title,ids})=>{const {data}=await supabaseClient.auth.getSession();const headers={apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+data.session.access_token};const url=SUPABASE_URL+'/functions/v1/message-photos';const cleaned=await fetch(url+'?action=cleanup-fixture&marker='+encodeURIComponent(title),{method:'DELETE',headers});if(!cleaned.ok)throw Error('Private photo fixture cleanup failed: '+cleaned.status);for(const id of ids){const r=await fetch(url,{method:'DELETE',headers:{...headers,'x-attachment-id':id}});if(!r.ok&&r.status!==409)throw Error('Pending photo cleanup failed: '+r.status)}},{title,ids:[...new Set(uploads.map(u=>u.id))]});
   await cleanup(buyer,title);
  }
  await context.close();if(otherContext)await otherContext.close();
 }
});
