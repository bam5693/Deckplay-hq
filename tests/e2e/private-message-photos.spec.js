const {test,expect}=require('@playwright/test');const jpeg=require('jpeg-js');
const photo={name:'corner.jpg',mimeType:'image/jpeg',buffer:jpeg.encode({width:4,height:4,data:Buffer.alloc(64,255)},80).data};
async function inbox(page){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'11111111-1111-4111-8111-111111111111'};window.photoWrites=[];window.photoPosts=0;
  const other='22222222-2222-4222-8222-222222222222',now=new Date().toISOString();
  supabaseClient.auth.getSession=async()=>({data:{session:{user:{id:currentUser.id},access_token:'synthetic'}},error:null});
  supabaseClient.from=table=>{let inserted;const data=table==='collector_messages'?[{id:'old',sender_id:other,recipient_id:currentUser.id,body:'Corner photos please',created_at:now,read_at:now}]:table==='profiles'?[{id:other,username:'collector'}]:[];const q={then:(a,b)=>Promise.resolve({data,error:null}).then(a,b)};for(const method of ['select','eq','in','order','limit','update'])q[method]=()=>q;q.insert=p=>{inserted=p;photoWrites.push(p);return q};q.single=async()=>({data:{id:inserted.id},error:null});q.maybeSingle=async()=>({data:null,error:null});return q};sendCollectorEmailForSource=async()=>{};await showInboxPage(other);
 });
}
test('photo previews survive navigation, cap at three, and are cleared on account change',async({page})=>{
 await inbox(page);await page.locator('[data-photo-input="library"]').setInputFiles([photo,photo,photo]);await expect(page.locator('.chat-photo-drafts img')).toHaveCount(3);await expect(page.locator('#chatInput')).toHaveJSProperty('required',false);
 await page.evaluate(()=>loadInbox());await expect(page.locator('.chat-photo-drafts img')).toHaveCount(3);await page.locator('[data-photo-input="library"]').setInputFiles(photo);await expect(page.locator('.chat-send-status')).toContainText('up to three');await expect(page.locator('.chat-photo-drafts img')).toHaveCount(3);
 await page.locator('[data-photo-remove]').first().click();await expect(page.locator('.chat-photo-drafts img')).toHaveCount(2);
 await page.evaluate(()=>{currentUser={id:'another'};syncInboxDraftUser()});await expect(page.locator('.chat-photo-drafts img')).toHaveCount(0);
});
test('failed upload freezes the exact photo draft and retry sends once without losing caption',async({page})=>{
 await inbox(page);let calls=0,ids=[];
 await page.route('**/functions/v1/message-photos',async r=>{if(r.request().method()==='DELETE')return r.fulfill({json:{canceled:true}});calls++;ids.push(r.request().headers()['x-attachment-id']);return r.fulfill({status:calls===1?400:200,json:calls===1?{error:'Photo upload could not be confirmed. Retry the same photo'}:{id:ids.at(-1),status:'uploaded'}})});
 await page.locator('#chatInput').fill('Exact corner disclosure');await page.locator('[data-photo-input="library"]').setInputFiles(photo);await expect(page.locator('.chat-photo-drafts img')).toHaveCount(1);await page.locator('[type="submit"][aria-label="Send message"]').click();
 await expect(page.locator('.chat-send-status')).toContainText('could not be confirmed');await expect(page.locator('#chatInput')).toHaveValue('Exact corner disclosure');await expect(page.locator('#chatInput')).toHaveJSProperty('readOnly',true);await expect(page.locator('[data-photo-discard]')).toBeVisible();
 await page.locator('[type="submit"][aria-label="Send message"]').click();await expect(page.locator('.chat-photo-drafts img')).toHaveCount(0);expect(calls).toBe(2);expect(new Set(ids).size).toBe(1);
 const writes=await page.evaluate(()=>photoWrites);expect(writes).toHaveLength(1);expect(writes[0].attachment_ids).toEqual([ids[0]]);expect(writes[0].body).toBe('Exact corner disclosure');
});
test('photo-only messages recover confirmed sends without a duplicate write',async({page})=>{
 await inbox(page);await page.route('**/functions/v1/message-photos',r=>r.fulfill({json:{status:'uploaded'}}));
 await page.evaluate(()=>{const previous=supabaseClient.from;window.lookup=0;supabaseClient.from=table=>{if(table!=='collector_messages')return previous(table);let payload;const q=previous(table);q.insert=p=>{payload=p;photoWrites.push(p);return q};q.single=async()=>{if(photoWrites.length===1)throw Error('Response lost');return {error:{code:'23505',message:'Duplicate'}}};q.maybeSingle=async()=>{lookup++;return lookup===1?{error:{message:'Offline'}}:{data:photoWrites[0]}};return q}});
 await page.locator('[data-photo-input="library"]').setInputFiles(photo);await expect(page.locator('.chat-photo-drafts img')).toHaveCount(1);await page.locator('[aria-label="Send message"]').click();await expect(page.locator('.chat-send-status')).toContainText('Response lost');await page.locator('[aria-label="Send message"]').click();await expect(page.locator('.chat-photo-drafts img')).toHaveCount(0);
 const rows=await page.evaluate(()=>photoWrites);expect(rows).toHaveLength(1);expect(rows[0].body).toBe('Shared photos');
});

test('preparing a private photo blocks send and never falls back to a text-only message',async({page})=>{
 await inbox(page);
 await page.evaluate(()=>{
  const decode=window.createImageBitmap;
  window.createImageBitmap=async(...args)=>{
   await new Promise(resolve=>{window.releasePhotoDecode=resolve});
   return decode(...args);
  };
 });
 await page.locator('#chatInput').fill('Please inspect the card corners');
 await page.locator('[data-photo-input="library"]').setInputFiles(photo);
 const send=page.locator('[aria-label="Send message"]');
 await expect(page.locator('.chat-send-status')).toContainText('Preparing photos');
 await expect(send).toBeDisabled();
 await expect(page.locator('.chat-composer')).toHaveAttribute('aria-busy','true');
 // Even a scripted form submit must not silently drop the pending attachment.
 await page.evaluate(()=>document.querySelector('.chat-composer').requestSubmit());
 await expect(page.locator('.chat-send-status')).toContainText('Wait for photo preparation to finish');
 expect(await page.evaluate(()=>photoWrites.length)).toBe(0);
 await page.evaluate(()=>window.releasePhotoDecode());
 await expect(page.locator('.chat-photo-drafts img')).toHaveCount(1);
 await expect(send).toBeEnabled();
 await expect(page.locator('.chat-composer')).toHaveAttribute('aria-busy','false');
});
