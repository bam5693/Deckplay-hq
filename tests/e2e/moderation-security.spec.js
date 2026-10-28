const {test,expect}=require('@playwright/test');
async function moderator(page,level='aal2'){
 await page.route('**/vendor/supabase-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>window.moderationFixture}'}));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>window.moderationFixture}'}));
 await page.addInitScript(level=>{
  window.moderationCalls=[];window.moderationListeners=[];
  window.moderationFixture={auth:{
   getUser:async()=>({data:{user:{id:'fixture-moderator'}},error:null}),
   mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level},error:null})},
   onAuthStateChange:callback=>{moderationListeners.push(callback);return {data:{subscription:{unsubscribe(){}}}}}
  },rpc:async name=>{moderationCalls.push(name);return {data:name==='is_deckplay_moderator'?true:name==='moderation_report_queue'?[{id:'synthetic-report',reason:'Counterfeit suspicion',details:'Private synthetic evidence',status:'open',listing_id:null}]:null,error:null}}};
  window.fireModerationAuth=(event,session)=>moderationListeners.forEach(callback=>callback(event,session));
 },level);
 await page.goto('/moderation.html');
}
test('moderator report data requires a verified MFA session',async({page})=>{
 await moderator(page,'aal1');
 await expect(page.locator('#state')).toContainText(/MFA|two.factor/i);
 await expect(page.locator('#reports')).toBeEmpty();
 expect(await page.evaluate(()=>moderationCalls)).not.toContain('moderation_report_queue');
});
test('sign-out immediately removes private moderation reports and action controls',async({page})=>{
 await moderator(page);await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>fireModerationAuth('SIGNED_OUT',null));
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#state')).toContainText(/sign in/i);
});

test('a delayed moderation queue cannot restore reports after sign-out',async({page})=>{
 await moderator(page);await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>name==='moderation_report_queue'?await new Promise(done=>window.finishModeratorQueue=done):{data:true,error:null};
  fireModerationAuth('TOKEN_REFRESHED',{user:{id:'fixture-moderator'}});
 });
 await expect.poll(()=>page.evaluate(()=>typeof finishModeratorQueue)).toBe('function');
 await page.evaluate(()=>{fireModerationAuth('SIGNED_OUT',null);finishModeratorQueue({data:[{id:'late-report',details:'Former account evidence'}],error:null})});
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#state')).toContainText(/sign in/i);
});

test('moderation actions recheck MFA before sending any write',async({page})=>{
 await moderator(page);await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{moderationFixture.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal1'},error:null})});
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Resolve report',exact:true}).click();
 await expect(page.locator('#state')).toContainText('MFA required');
 await expect(page.locator('#reports')).toBeEmpty();
 expect(await page.evaluate(()=>moderationCalls)).not.toContain('review_deckplay_report');
 await expect(page.getByRole('button',{name:'Resolve report',exact:true})).toHaveCount(0);
});
