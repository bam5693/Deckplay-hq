/* MFA setup never grants a moderator role. Secrets remain in transient UI only. */
(() => {
 const client=window.supabase.createClient('https://prrrzeelltmyugssqnzk.supabase.co','sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh');
 const el=id=>document.getElementById(id),status=el('mfaStatus');
 let generation=0,owner=null,busy=false,factors=[];
 const inFlightEnrollments=new Set();
 function clearPrivate(){
  owner=null;busy=false;factors=[];
  el('accessContent').hidden=true;el('accountIdentity').textContent='';
  el('setupMaterial').hidden=true;el('setupQr').removeAttribute('src');el('setupSecret').textContent='';el('manualSetup').open=false;
  el('mfaCode').value='';el('mfaFactor').replaceChildren();el('enrollConsent').checked=false;
  for(const id of ['setupOptions','verificationPanel','verifiedPanel','openCommandCenter','signedOutHelp'])el(id).hidden=true;
 }
 function controls(){
  el('accessContent').querySelectorAll('button,input,select').forEach(control=>control.disabled=busy);
  el('reloadAccess').disabled=busy;
  el('beginEnrollment').disabled=busy||inFlightEnrollments.has(owner);
 }
 function invalidate(message){++generation;clearPrivate();status.textContent=message;controls()}
 function allTotp(data){
  return [...new Map([...(data?.all||[]),...(data?.totp||[])].filter(f=>f.factor_type==='totp'&&['verified','unverified'].includes(f.status)).map(f=>[f.id,f])).values()].sort((a,b)=>Number(b.status==='verified')-Number(a.status==='verified'));
 }
 function selectFactor(){
  el('mfaCode').value='';
  const unfinished=factors.find(f=>f.id===el('mfaFactor').value)?.status==='unverified';
  el('unfinishedHelp').hidden=!unfinished;el('cancelEnrollment').hidden=!unfinished;
 }
 function renderFactors(){
  el('mfaFactor').replaceChildren();
  for(const factor of factors){const option=document.createElement('option');option.value=factor.id;option.textContent=(factor.friendly_name||'Authenticator')+(factor.status==='unverified'?' · unfinished setup':'');el('mfaFactor').append(option)}
  el('verificationPanel').hidden=!factors.length;el('setupOptions').hidden=!!factors.length;selectFactor();
 }
 async function refresh(){
  const version=++generation,active=()=>version===generation&&!document.hidden;
  clearPrivate();busy=true;controls();status.textContent='Checking your account…';
  try{
   const user=await client.auth.getUser();if(!active())return;
   if(user.error||!user.data?.user){el('signedOutHelp').hidden=false;status.textContent='Sign in to set up or verify your authenticator.';return}
   const userId=user.data.user.id;
   const list=await client.auth.mfa.listFactors();if(!active())return;if(list.error)throw Error('load');
   const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(!active())return;if(assurance.error)throw Error('load');
   owner=userId;factors=allTotp(list.data);el('accountIdentity').textContent='Signed in as '+(user.data.user.email||userId);el('accessContent').hidden=false;renderFactors();
   const hasVerifiedFactor=[...(list.data?.all||[]),...(list.data?.totp||[])].some(f=>f.status==='verified');
   if(assurance.data?.currentLevel==='aal2'&&hasVerifiedFactor){
    el('setupOptions').hidden=true;el('verificationPanel').hidden=!factors.some(f=>f.status==='unverified');
    el('verifiedPanel').hidden=false;
    const role=await client.rpc('is_deckplay_moderator');if(!active())return;
    el('openCommandCenter').hidden=!!role.error||role.data!==true;
    status.textContent=!role.error&&role.data===true?'MFA verified. Moderator access confirmed.':'MFA verified. Moderator access is unavailable or has not been assigned.';
   }else status.textContent=factors.length?'Enter your current authenticator code to verify this session.':inFlightEnrollments.has(owner)?'An authenticator setup request is still finishing. Refresh account status shortly.':'Start setup when you are ready to add an authenticator.';
  }catch{if(active()){clearPrivate();status.textContent='Unable to check account security. Refresh account status to try again.'}}
  finally{if(active()){busy=false;controls()}}
 }
 async function action(work,failure){
  if(busy||!owner||document.hidden)return;
  const version=generation,userId=owner,active=()=>version===generation&&owner===userId&&!document.hidden;
  busy=true;controls();
  try{
   const identity=await client.auth.getUser();if(!active())return;
   if(identity.error)throw Error('identity');
   if(identity.data?.user?.id!==userId){invalidate('Your account changed. Refresh account status before continuing.');return}
   await work(active);
  }catch{if(active())status.textContent=failure}
  finally{if(active()){busy=false;controls()}}
 }
 el('beginEnrollment').addEventListener('click',()=>{
  if(inFlightEnrollments.has(owner))return;
  if(!el('enrollConsent').checked){status.textContent='Confirm that you want to add an authenticator to this account first.';return}
  action(async active=>{
   status.textContent='Starting authenticator setup…';
   // Check the server again: a second tab may already have enrolled a factor.
   const list=await client.auth.mfa.listFactors();if(!active())return;if(list.error)throw Error('list');
   if(allTotp(list.data).length){await refresh();return}
   const requestOwner=owner;inFlightEnrollments.add(requestOwner);let result;
   try{result=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'DeckPlay authenticator',issuer:'DeckPlay HQ'})}
   finally{inFlightEnrollments.delete(requestOwner);if(owner===requestOwner&&!document.hidden)controls()}
   if(!active())return;
   if(result.error||!result.data?.id||!result.data.totp?.secret||!result.data.totp?.qr_code)throw Error('enroll');
   let qr=result.data.totp.qr_code;
   // Supabase may return raw SVG, percent-encoded SVG, or base64 SVG with
   // an XML declaration. Keep it in an image data URL, never inject HTML.
   if(typeof qr!=='string'||qr.length>200000)throw Error('qr');
   qr=qr.trim();
   if(/^data:image\/svg\+xml(?:;[^,]*)?,/i.test(qr)){
    const comma=qr.indexOf(','),meta=qr.slice(0,comma),payload=qr.slice(comma+1);
    qr=/;base64(?:;|$)/i.test(meta)
     ?new TextDecoder().decode(Uint8Array.from(atob(payload),c=>c.charCodeAt(0)))
     :decodeURIComponent(payload);
   }
   qr=qr.replace(/^\uFEFF/,'').trimStart().replace(/^<\?xml[\s\S]*?\?>\s*/i,'');
   if(!/^<svg(?:\s|>)/i.test(qr)||/<script\b|<foreignObject\b|\bon[a-z]+\s*=/i.test(qr))throw Error('qr');
   factors=[{id:result.data.id,factor_type:'totp',status:'unverified',friendly_name:'DeckPlay authenticator'}];renderFactors();
   el('setupSecret').textContent=result.data.totp.secret;
   el('setupQr').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);el('setupMaterial').hidden=false;
   status.textContent='Add this account to your authenticator, then enter its current code to finish setup.';
  },'Setup could not be completed. Refresh account status before trying again; an unfinished setup may need to be removed.');
 });
 el('mfaVerifyForm').addEventListener('submit',event=>{
  event.preventDefault();if(busy)return;const code=el('mfaCode').value.trim(),factorId=el('mfaFactor').value;
  if(!/^\d{6}$/.test(code)||!factors.some(f=>f.id===factorId)){status.textContent='Enter the current six-digit code from the selected authenticator.';return}
  el('mfaCode').value='';
  action(async active=>{
   status.textContent='Verifying your authenticator…';
   const challenge=await client.auth.mfa.challenge({factorId});if(!active())return;
   if(challenge.error||!challenge.data?.id)throw Error('challenge');
   const verified=await client.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});if(!active())return;
   el('mfaCode').value='';if(verified.error)throw Error('verify');
   await refresh();
  },'Code not accepted or verification unavailable. Use the current six-digit code and try again.');
 });
 el('cancelEnrollment').addEventListener('click',()=>{
  const factorId=el('mfaFactor').value;
  if(!factors.some(f=>f.id===factorId&&f.status==='unverified'))return;
  action(async active=>{
   status.textContent='Removing unfinished setup…';
   const list=await client.auth.mfa.listFactors();if(!active())return;if(list.error)throw Error('list');
   if(!allTotp(list.data).some(f=>f.id===factorId&&f.status==='unverified')){await refresh();return}
   const removed=await client.auth.mfa.unenroll({factorId});if(!active())return;if(removed.error)throw Error('remove');
   await refresh();
  },'Unable to remove the unfinished setup. Refresh account status and try again.');
 });
 el('mfaFactor').addEventListener('change',selectFactor);
 el('reloadAccess').addEventListener('click',refresh);
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION')return;
  // A same-user Supabase token refresh during enrollment must not erase its one-time QR.
  // Different-user sign-in, sign-out and page hiding still scrub setup material.
  if((event==='SIGNED_IN'||event==='TOKEN_REFRESHED')&&session?.user?.id===owner&&!document.hidden&&(busy||!el('setupMaterial').hidden))return;
  invalidate('Account security changed. Checking your session…');
  if(!session?.user||event==='PASSWORD_RECOVERY'){status.textContent='Sign in to set up or verify your authenticator.';el('signedOutHelp').hidden=false;return}
  const version=generation;setTimeout(()=>{if(version===generation&&!document.hidden)refresh()},0);
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)invalidate('Setup details hidden. Return to this page to check your session.');else refresh()});
 window.addEventListener('pagehide',()=>invalidate('Setup details hidden. Refresh account status to continue.'));
 window.addEventListener('pageshow',event=>{if(event.persisted)refresh()});
 refresh();
})();
