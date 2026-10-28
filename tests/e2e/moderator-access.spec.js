const {test,expect}=require('@playwright/test');
const secret='SYNTHETIC_SETUP_KEY_ONLY';
const verified={id:'verified-factor',factor_type:'totp',status:'verified',friendly_name:'Test authenticator'};
async function install(page,options={}){
 await page.route('**/vendor/supabase-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>window.mfaFixture}'}));
 await page.addInitScript(options=>{
  window.mfaCalls=[];window.mfaListeners=[];window.fixtureIdentity=options.signedOut?null:{id:'mfa-owner',email:'synthetic@deckplay.test'};
  window.fixtureFactors=options.factors||[];window.fixtureLevel=options.level||'aal1';window.fixtureModerator=!!options.moderator;
  window.fireMfaAuth=(event,session)=>mfaListeners.forEach(fn=>fn(event,session));
  window.mfaFixture={auth:{
   getUser:async()=>({data:{user:fixtureIdentity},error:null}),
   onAuthStateChange:fn=>{mfaListeners.push(fn);return {data:{subscription:{unsubscribe(){}}}}},
   mfa:{
    listFactors:async()=>({data:{all:structuredClone(fixtureFactors),totp:structuredClone(fixtureFactors.filter(f=>f.status==='verified'))},error:null}),
    getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:fixtureLevel},error:null}),
    enroll:async payload=>{mfaCalls.push('enroll');window.lastEnrollPayload=payload;const factor={id:'new-factor',factor_type:'totp',status:'unverified'};fixtureFactors.push(factor);return {data:{id:factor.id,type:'totp',totp:{secret:'SYNTHETIC_SETUP_KEY_ONLY',qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>'}},error:null}},
    challenge:async payload=>{mfaCalls.push(['challenge',payload]);return {data:{id:'challenge-id'},error:null}},
    verify:async payload=>{mfaCalls.push(['verify',payload]);fixtureLevel='aal2';fixtureFactors.forEach(f=>{if(f.id===payload.factorId)f.status='verified'});if(options.verifyEvent)fireMfaAuth('MFA_CHALLENGE_VERIFIED',{user:fixtureIdentity});return {data:{},error:null}},
    unenroll:async payload=>{mfaCalls.push(['unenroll',payload]);fixtureFactors=fixtureFactors.filter(f=>f.id!==payload.factorId);return {data:{},error:null}}
   }
  },rpc:async name=>{mfaCalls.push(name);return {data:fixtureModerator,error:null}}};
 },options);
 await page.goto('/moderator-access.html');
 await expect(page.locator('#reloadAccess')).toBeEnabled();
}
async function begin(page){await page.locator('#enrollConsent').check();await page.locator('#beginEnrollment').click()}

test('authenticator enrollment is deliberate and cannot grant moderator permission',async({page})=>{
 await install(page);expect(await page.evaluate(()=>mfaCalls)).not.toContain('enroll');
 await page.locator('#beginEnrollment').click();await expect(page.locator('#mfaStatus')).toContainText('Confirm');
 expect(await page.evaluate(()=>mfaCalls)).not.toContain('enroll');
 await begin(page);await expect(page.locator('#setupMaterial')).toBeVisible();
 expect(await page.evaluate(()=>lastEnrollPayload)).toEqual({factorType:'totp',friendlyName:'DeckPlay authenticator',issuer:'DeckPlay HQ'});
 await expect(page.locator('#setupQr')).toHaveAttribute('src',/^data:image\/svg\+xml;charset=utf-8,/);
 await page.locator('#manualSetup summary').click();await expect(page.locator('#setupSecret')).toHaveText(secret);
 await page.locator('#mfaCode').fill('123456');await page.locator('#verifyMfa').click();
 await expect(page.locator('#mfaStatus')).toContainText('MFA verified. Moderator access is unavailable or has not been assigned.');
 await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#setupQr')).not.toHaveAttribute('src');
 await expect(page.locator('#openCommandCenter')).toBeHidden();
 expect(await page.evaluate(()=>Object.values(localStorage).join(' '))).not.toContain(secret);
 expect(await page.evaluate(()=>Object.values(sessionStorage).join(' '))).not.toContain(secret);
});
test('Supabase percent-encoded SVG QR data URLs display safely during enrollment',async({page})=>{
 await install(page);
 await page.evaluate(()=>{const original=mfaFixture.auth.mfa.enroll;mfaFixture.auth.mfa.enroll=async payload=>{const result=await original(payload);result.data.totp.qr_code='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E';return result}});
 await begin(page);
 await expect(page.locator('#setupMaterial')).toBeVisible();
 await expect(page.locator('#setupQr')).toHaveAttribute('src',/^data:image\/svg\+xml;charset=utf-8,/);
 await expect(page.locator('#setupSecret')).toHaveText(secret);
});
test('Supabase base64 SVG with XML declaration opens the authenticator setup QR',async({page})=>{
 await install(page);
 await page.evaluate(()=>{
  const original=mfaFixture.auth.mfa.enroll;
  mfaFixture.auth.mfa.enroll=async payload=>{
   const result=await original(payload);
   const svg='<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>';
   result.data.totp.qr_code='data:image/svg+xml;base64,'+btoa(svg);
   return result;
  };
 });
 await begin(page);
 await expect(page.locator('#setupMaterial')).toBeVisible();
 await expect(page.locator('#setupQr')).toHaveAttribute('src',/^data:image\\/svg\\+xml;charset=utf-8,/);
 await expect(page.locator('#setupSecret')).toHaveText(secret);
});

test('signed-out visitors cannot start MFA enrollment',async({page})=>{
 await install(page,{signedOut:true});await expect(page.locator('#signedOutHelp')).toBeVisible();await expect(page.locator('#accessContent')).toBeHidden();
 expect(await page.evaluate(()=>mfaCalls)).toEqual([]);
});
test('MFA enrollment prevents duplicate submissions and recovers from errors',async({page})=>{
 await install(page);await page.evaluate(()=>{mfaFixture.auth.mfa.enroll=()=>{mfaCalls.push('enroll');return new Promise(resolve=>window.finishEnroll=resolve)}});
 await begin(page);await expect.poll(()=>page.evaluate(()=>typeof finishEnroll)).toBe('function');
 await page.evaluate(()=>document.getElementById('beginEnrollment').click());expect(await page.evaluate(()=>mfaCalls.filter(c=>c==='enroll').length)).toBe(1);
 await page.evaluate(()=>finishEnroll({data:null,error:{message:'synthetic error'}}));
 await expect(page.locator('#beginEnrollment')).toBeEnabled();await expect(page.locator('#mfaStatus')).toContainText('Refresh account status');await expect(page.locator('#setupMaterial')).toBeHidden();
});
test('late enrollment secrets cannot return after sign-out or a same-account sign-in',async({page})=>{
 await install(page);await page.evaluate(()=>{mfaFixture.auth.mfa.enroll=()=>new Promise(resolve=>window.finishEnroll=resolve)});await begin(page);
 await expect.poll(()=>page.evaluate(()=>typeof finishEnroll)).toBe('function');
 await page.evaluate(()=>{
  const user=fixtureIdentity;fixtureIdentity=null;fireMfaAuth('SIGNED_OUT',null);fixtureIdentity=user;fireMfaAuth('SIGNED_IN',{user});
  finishEnroll({data:{id:'old-factor',totp:{secret:'FORMER_ACCOUNT_SECRET',qr_code:'<svg xmlns="http://www.w3.org/2000/svg"></svg>'}},error:null});
 });
 await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#setupQr')).not.toHaveAttribute('src');
 await expect(page.locator('#setupMaterial')).toBeHidden();await expect(page.locator('body')).not.toContainText('FORMER_ACCOUNT_SECRET');
});
test('switching accounts clears setup keys, codes, identity and factor choices immediately',async({page})=>{
 await install(page);await begin(page);await expect(page.locator('#setupMaterial')).toBeVisible();await page.locator('#mfaCode').fill('123456');
 await page.evaluate(()=>{fixtureIdentity={id:'another-owner',email:'other@deckplay.test'};fixtureFactors=[];fireMfaAuth('SIGNED_IN',{user:fixtureIdentity})});
 await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#setupQr')).not.toHaveAttribute('src');await expect(page.locator('#mfaCode')).toHaveValue('');
 await expect(page.locator('#accountIdentity')).not.toContainText('synthetic@deckplay.test');await expect(page.locator('#mfaFactor option')).toHaveCount(0);
});
test('hidden page scrubs setup keys and can finish an existing unfinished factor after returning',async({page})=>{
 await install(page);await begin(page);await expect(page.locator('#setupMaterial')).toBeVisible();
 await page.evaluate(()=>{window.fixtureHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>fixtureHidden});document.dispatchEvent(new Event('visibilitychange'))});
 await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#setupQr')).not.toHaveAttribute('src');await expect(page.locator('#accessContent')).toBeHidden();
 await page.evaluate(()=>{fixtureHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
 await expect(page.locator('#unfinishedHelp')).toBeVisible();await expect(page.locator('#setupMaterial')).toBeHidden();
 await page.locator('#mfaCode').fill('123456');await page.locator('#verifyMfa').click();await expect(page.locator('#verifiedPanel')).toBeVisible();
});
test('an account mismatch detected before a mutation prevents enrollment',async({page})=>{
 await install(page);await page.locator('#enrollConsent').check();await page.evaluate(()=>{fixtureIdentity={id:'different-owner',email:'different@deckplay.test'}});
 await page.locator('#beginEnrollment').click();await expect(page.locator('#mfaStatus')).toContainText('Your account changed');
 expect(await page.evaluate(()=>mfaCalls)).not.toContain('enroll');
});
test('failed authenticator challenge preserves retry and clears the code',async({page})=>{
 await install(page,{factors:[verified]});await page.evaluate(()=>{mfaFixture.auth.mfa.challenge=async()=>({data:null,error:{message:'synthetic service failure'}})});
 await page.locator('#mfaCode').fill('123456');await page.locator('#verifyMfa').click();await expect(page.locator('#mfaStatus')).toContainText('Code not accepted');
 await expect(page.locator('#mfaCode')).toHaveValue('');await expect(page.locator('#verifyMfa')).toBeEnabled();
 expect(await page.evaluate(()=>mfaCalls.filter(c=>Array.isArray(c)&&c[0]==='verify'))).toEqual([]);
});
test('MFA verification auth events clear secrets and server permission controls the admin link',async({page})=>{
 await install(page,{moderator:true,verifyEvent:true});await begin(page);await expect(page.locator('#setupMaterial')).toBeVisible();
 await page.locator('#mfaCode').fill('123456');await page.locator('#verifyMfa').click();
 await expect(page.locator('#openCommandCenter')).toBeVisible();await expect(page.locator('#mfaStatus')).toContainText('Moderator access confirmed');
 await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#setupQr')).not.toHaveAttribute('src');
});
test('unfinished setup removal targets only the selected current-account unverified factor',async({page})=>{
 await install(page,{factors:[verified,{id:'unfinished',factor_type:'totp',status:'unverified'}]});
 await expect(page.locator('#cancelEnrollment')).toBeHidden();await page.locator('#mfaFactor').selectOption('unfinished');await page.locator('#cancelEnrollment').click();
 await expect(page.locator('#mfaFactor option')).toHaveCount(1);
 expect(await page.evaluate(()=>mfaCalls.filter(c=>Array.isArray(c)&&c[0]==='unenroll'))).toEqual([['unenroll',{factorId:'unfinished'}]]);
});
test('a factor verified in another tab cannot be removed as unfinished setup',async({page})=>{
 await install(page,{factors:[{id:'unfinished',factor_type:'totp',status:'unverified'}]});
 await page.evaluate(()=>{fixtureFactors[0].status='verified'});await page.locator('#cancelEnrollment').click();
 await expect(page.locator('#cancelEnrollment')).toBeHidden();
 expect(await page.evaluate(()=>mfaCalls.filter(c=>Array.isArray(c)&&c[0]==='unenroll'))).toEqual([]);
});
test('late verification results cannot restore a former account admin link',async({page})=>{
 await install(page,{factors:[verified],moderator:true});await page.evaluate(()=>{mfaFixture.auth.mfa.challenge=()=>new Promise(resolve=>window.finishChallenge=resolve)});
 await page.locator('#mfaCode').fill('123456');await page.locator('#verifyMfa').click();await expect.poll(()=>page.evaluate(()=>typeof finishChallenge)).toBe('function');
 await page.evaluate(()=>{fixtureIdentity=null;fireMfaAuth('SIGNED_OUT',null);finishChallenge({data:{id:'late'},error:null})});
 await expect(page.locator('#openCommandCenter')).toBeHidden();await expect(page.locator('#accountIdentity')).toBeEmpty();
 expect(await page.evaluate(()=>mfaCalls.filter(c=>Array.isArray(c)&&c[0]==='verify'))).toEqual([]);
});
test('account security load failure hides controls and supports a deliberate retry',async({page})=>{
 await install(page);await page.evaluate(()=>{window.originalList=mfaFixture.auth.mfa.listFactors;mfaFixture.auth.mfa.listFactors=async()=>{throw Error('synthetic network failure')}});
 await page.locator('#reloadAccess').click();await expect(page.locator('#mfaStatus')).toContainText('Unable to check');await expect(page.locator('#accessContent')).toBeHidden();
 await page.evaluate(()=>{mfaFixture.auth.mfa.listFactors=originalList});await page.locator('#reloadAccess').click();await expect(page.locator('#setupOptions')).toBeVisible();
});

test('a pending enrollment cannot duplicate after hiding and returning to the same account',async({page})=>{
 await install(page);await page.evaluate(()=>{mfaFixture.auth.mfa.enroll=()=>{mfaCalls.push('enroll');return new Promise(resolve=>window.finishEnroll=resolve)}});await begin(page);
 await expect.poll(()=>page.evaluate(()=>typeof finishEnroll)).toBe('function');
 await page.evaluate(()=>{window.fixtureHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>fixtureHidden});document.dispatchEvent(new Event('visibilitychange'));fixtureHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
 await expect(page.locator('#mfaStatus')).toContainText('still finishing');await expect(page.locator('#beginEnrollment')).toBeDisabled();
 await page.evaluate(()=>{document.getElementById('beginEnrollment').click();finishEnroll({data:null,error:{message:'synthetic'}})});
 expect(await page.evaluate(()=>mfaCalls.filter(c=>c==='enroll').length)).toBe(1);await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#beginEnrollment')).toBeEnabled();
});
test('a rejected verification code leaves the current factor available for retry',async({page})=>{
 await install(page,{factors:[verified]});await page.evaluate(()=>{mfaFixture.auth.mfa.verify=async()=>({data:null,error:{message:'SYNTHETIC_PRIVATE_ERROR'}})});
 await page.locator('#mfaCode').fill('123456');await page.locator('#verifyMfa').click();await expect(page.locator('#mfaStatus')).toContainText('Code not accepted');
 await expect(page.locator('#verifyMfa')).toBeEnabled();await expect(page.locator('#mfaCode')).toHaveValue('');await expect(page.locator('#verifiedPanel')).toBeHidden();
 await expect(page.locator('body')).not.toContainText('SYNTHETIC_PRIVATE_ERROR');
});
test('pagehide removes secret material before the page can enter browser back-forward cache',async({page})=>{
 await install(page);await begin(page);await expect(page.locator('#setupMaterial')).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#setupSecret')).toBeEmpty();await expect(page.locator('#setupQr')).not.toHaveAttribute('src');await expect(page.locator('#accessContent')).toBeHidden();
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(page.locator('#unfinishedHelp')).toBeVisible();await expect(page.locator('#setupMaterial')).toBeHidden();
});
test('a stale AAL2 claim without any verified factor cannot display verified moderator access',async({page})=>{
 await install(page,{level:'aal2',moderator:true});await expect(page.locator('#setupOptions')).toBeVisible();
 await expect(page.locator('#verifiedPanel')).toBeHidden();await expect(page.locator('#openCommandCenter')).toBeHidden();
 expect(await page.evaluate(()=>mfaCalls)).not.toContain('is_deckplay_moderator');
});


test('same-account token refresh during authenticator enrollment preserves the QR until sign-out',async({page})=>{
 await install(page);
 await page.evaluate(()=>{
  const original=mfaFixture.auth.mfa.enroll;
  mfaFixture.auth.mfa.enroll=async payload=>{
   const result=await original(payload);
   fireMfaAuth('TOKEN_REFRESHED',{user:fixtureIdentity});
   fireMfaAuth('SIGNED_IN',{user:fixtureIdentity});
   return result;
  };
 });
 await begin(page);
 await expect(page.locator('#setupMaterial')).toBeVisible();
 await expect(page.locator('#setupSecret')).toHaveText(secret);
 await page.evaluate(()=>fireMfaAuth('TOKEN_REFRESHED',{user:fixtureIdentity}));
 await expect(page.locator('#setupMaterial')).toBeVisible();
 await page.evaluate(()=>{fixtureIdentity=null;fireMfaAuth('SIGNED_OUT',null)});
 await expect(page.locator('#setupMaterial')).toBeHidden();
 await expect(page.locator('#setupSecret')).toBeEmpty();
 await expect(page.locator('#setupQr')).not.toHaveAttribute('src');
});
