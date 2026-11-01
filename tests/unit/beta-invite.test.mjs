import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGING_PROJECT_URL,parseInviteArgs,validateSendGuard,validateStagingRedirect,validateStagingServiceRoleJwt,sendStagingInvite} from '../../scripts/beta-invite.mjs';

const jwt = (claims) => ['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify(claims)).toString('base64url'),'signature'].join('.');
const key = jwt({role:'service_role',ref:'prrrzeelltmyugssqnzk',exp:Math.floor(Date.now()/1000)+3600});
const redirect = 'https://deckplay-hq-staging.cstivers56.workers.dev/';
const config = {DECKPLAY_STAGING_SUPABASE_URL:STAGING_PROJECT_URL,DECKPLAY_STAGING_SERVICE_ROLE_KEY:key,
  DECKPLAY_STAGING_INVITE_REDIRECT_URL:redirect,DECKPLAY_BETA_INVITE_APPROVED:'1',
  DECKPLAY_STAGING_INVITE_LINK_VERIFIED:'1',DECKPLAY_STAGING_AUTH_POLICY_VERIFIED:'1'};

test('dry run does not require credentials or any network permission',()=>{
 const args=parseInviteArgs(['--email=Collector@Example.test']);
 assert.equal(args.email,'collector@example.test');
 assert.equal(validateSendGuard({args,env:{}}),false);
});
test('rejects missing, duplicate, malformed email inputs and unknown flags',()=>{
 for(const list of [[],['--email=nope'],['--email=a@example.test','--email=b@example.test'],['--email=x@example.test','--unknown']]){
  assert.throws(()=>parseInviteArgs(list));
 }
});
test('rejects attempts to send without approval or to production',()=>{
 const args=parseInviteArgs(['--email=x@example.test','--send','--confirm=SEND-STAGING-INVITE']);
 assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_BETA_INVITE_APPROVED:'0'}}));
 assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_STAGING_SUPABASE_URL:'https://yffruutknztvdyioovmp.supabase.co'}}));
 assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_STAGING_SERVICE_ROLE_KEY:'sb_publishable_test'}}));
 assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_STAGING_INVITE_REDIRECT_URL:''}}));
 assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_STAGING_INVITE_LINK_VERIFIED:'0'}}));
 assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_STAGING_AUTH_POLICY_VERIFIED:'0'}}));
 assert.equal(validateSendGuard({args,env:config}),true);
});
test('forbids anon and expired JWT, and a JWT claiming another project',()=>{
 for(const claims of [{role:'anon'},{role:'authenticated'},{role:'service_role',ref:'yffruutknztvdyioovmp'},{role:'service_role',exp:1}]){
  assert.throws(()=>validateStagingServiceRoleJwt(jwt(claims)));
 }
 assert.equal(validateStagingServiceRoleJwt(key),key);
});
test('redirect must target a clean allowlisted staging callback',()=>{
 assert.equal(validateStagingRedirect(redirect),redirect);
 for(const bad of ['https://deckplayhq.com','https://evil.example','http://deckplay-hq-staging.cstivers56.workers.dev',
  'https://deckplay-hq-staging.cstivers56.workers.dev.evil.example',
  'https://deckplay-hq-staging.cstivers56.workers.dev@evil.example/',
  'https://deckplay-hq-staging.cstivers56.workers.dev/?token=foo',
  'https://deckplay-hq-staging.cstivers56.workers.dev/other',
  'https://deckplay-hq-staging.cstivers56.workers.dev/auth/callback','not-url']){
  assert.throws(()=>validateStagingRedirect(bad),bad);
 }
});
test('one approved invitation uses one controlled staging request with reviewed callback',async()=>{
 const calls=[];
 const output=await sendStagingInvite({email:'collector@example.test',key,redirectTo:redirect,
  fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,status:200}}});
 assert.deepEqual(output,{sent:true});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,STAGING_PROJECT_URL+'/auth/v1/invite?redirect_to='+encodeURIComponent(redirect));
 assert.equal(calls[0].options.redirect,'error');
 assert.equal(calls[0].options.method,'POST');
 assert.deepEqual(JSON.parse(calls[0].options.body),{email:'collector@example.test'});
});
test('direct transport cannot bypass credential or redirect guards',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return {ok:true,status:200}};
 await assert.rejects(sendStagingInvite({email:'a@example.test',key:jwt({role:'anon'}),redirectTo:redirect,fetchImpl}));
 await assert.rejects(sendStagingInvite({email:'a@example.test',key,redirectTo:'https://deckplayhq.com',fetchImpl}));
 assert.equal(calls,0);
});
test('rejected API requests never log secrets or recipient email',async()=>{
 await assert.rejects(sendStagingInvite({email:'collector@example.test',key,redirectTo:redirect,
  fetchImpl:async()=>({ok:false,status:429})}),error=>{
   assert.match(error.message,/HTTP 429/);
   assert.doesNotMatch(error.message,/collector|eyJ/);
   return true;
  });
});
