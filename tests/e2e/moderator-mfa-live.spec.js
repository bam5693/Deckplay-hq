const {test,expect}=require('@playwright/test');
const {signIn}=require('../helpers/staging.cjs');const {totp}=require('../helpers/totp.cjs');
const origin='https://prrrzeelltmyugssqnzk.supabase.co',key='sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh';
test('disposable collector completes real authenticator setup with a signed MFA session while moderator access stays denied',async({page})=>{
 test.setTimeout(150000);let factorId=null,owner=null;
 await signIn(page,'BUYER');
 const initial=await page.evaluate(async()=>{const {data,error}=await supabaseClient.auth.getUser();if(error)throw Error('Unable to verify dedicated test identity');return {id:data.user.id,email:data.user.email,factors:data.user.factors||[]}});
 expect(initial.email,'Only the dedicated disposable buyer may enroll a test authenticator').toBe('deckplay-buyer@deckplay.test');
 expect(initial.factors.length,'A pre-existing factor must be investigated, never replaced by this test').toBe(0);owner=initial.id;
 try{
  await page.goto('/moderator-access.html',{waitUntil:'domcontentloaded'});await expect(page.locator('#setupOptions')).toBeVisible({timeout:20000});
  await page.locator('#enrollConsent').check();
  const responsePromise=page.waitForResponse(r=>r.url()===origin+'/auth/v1/factors'&&r.request().method()==='POST',{timeout:20000});
  await page.locator('#beginEnrollment').click();
  const response=await responsePromise;
  expect(response.ok(),'Authenticator enrollment failed; response body intentionally withheld').toBeTruthy();
  const enrolled=await response.json();
  expect(typeof enrolled.id==='string'&&/^[a-f0-9-]{36}$/.test(enrolled.id),'Enrollment must identify its exact factor').toBeTruthy();factorId=enrolled.id;
  await expect(page.locator('#setupMaterial')).toBeVisible({timeout:15000});
  const secret=await page.locator('#setupSecret').textContent();
  expect(typeof secret==='string'&&/^[A-Z2-7]+=*$/i.test(secret),'Setup must provide a TOTP key; value intentionally withheld').toBeTruthy();
  // Avoid including a live code in Playwright's locator call-log arguments.
  await page.evaluate(code=>{const input=document.getElementById('mfaCode');if(!input)throw Error('MFA code input unavailable');input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}))},totp(secret));await page.locator('#verifyMfa').click();
  await expect(page.locator('#verifiedPanel')).toBeVisible({timeout:25000});
  await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#setupQr')).not.toHaveAttribute('src');
  await expect(page.locator('#openCommandCenter')).toBeHidden();
  const checked=await page.evaluate(async({origin,key,owner,factorId})=>{
   const client=window.supabase.createClient(origin,key),identity=await client.auth.getUser(),assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
   if(identity.error||identity.data?.user?.id!==owner)throw Error('MFA test identity changed');
   const role=await client.rpc('is_deckplay_moderator'),queue=await client.rpc('moderation_report_queue');
   return {level:assurance.data?.currentLevel,verified:identity.data.user.factors?.some(f=>f.id===factorId&&f.status==='verified'),role:role.data,roleError:!!role.error,queueDenied:queue.error?.code==='42501'};
  },{origin,key,owner,factorId});
  expect(checked).toEqual({level:'aal2',verified:true,role:false,roleError:false,queueDenied:true});
 }finally{
  // Scrub even when an assertion fails, before Playwright captures error context.
  await page.evaluate(()=>{document.getElementById('setupSecret')?.replaceChildren();document.getElementById('setupQr')?.removeAttribute('src');const code=document.getElementById('mfaCode');if(code)code.value=''}).catch(()=>{});
  if(factorId){
   // No screenshots, traces, tokens or setup keys are written to artifacts.
   // Cleanup may remove only this exact enrolled factor owned by the bot.
   const cleaned=await page.evaluate(async({origin,key,owner,factorId})=>{
    if(location.origin!=='https://deckplay-hq-staging.cstivers56.workers.dev')throw Error('Refusing MFA cleanup outside private staging');
    const client=window.supabase.createClient(origin,key),identity=await client.auth.getUser();
    if(identity.error||identity.data?.user?.id!==owner||identity.data.user.email!=='deckplay-buyer@deckplay.test')throw Error('Refusing MFA cleanup after identity change');
    const factor=identity.data.user.factors?.find(f=>f.id===factorId);
    if(factor){if(factor.factor_type!=='totp'||factor.friendly_name!=='DeckPlay authenticator')throw Error('Unverified cleanup factor');const removed=await client.auth.mfa.unenroll({factorId});if(removed.error)throw Error('Exact synthetic MFA factor cleanup failed')}
    const fresh=await client.auth.getUser();if(fresh.error)throw Error('Unable to verify MFA cleanup');
    return !fresh.data.user.factors?.some(f=>f.id===factorId);
   },{origin,key,owner,factorId});
   expect(cleaned,'Exact synthetic authenticator factor must be absent after cleanup').toBe(true);
  }
 }
});
