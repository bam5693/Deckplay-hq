import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGING_PROJECT_URL,parseInviteArgs,validateSendGuard,sendStagingInvite} from '../../scripts/beta-invite.mjs';

const key = 'eyJhbGciOiJIUzI1NiJ9.' + 'c3RhZ2luZy10ZXN0' + '.signature';
const config = { DECKPLAY_STAGING_SUPABASE_URL: STAGING_PROJECT_URL,
  DECKPLAY_STAGING_SERVICE_ROLE_KEY: key,
  DECKPLAY_BETA_INVITE_APPROVED: '1' };

test('dry run needs no credentials, produces no send authorization', () => {
  const args = parseInviteArgs(['--email=Collector@Example.test']);
  assert.equal(args.email,'collector@example.test');
  assert.equal(validateSendGuard({args,env:{}}),false);
});
test('rejects ambiguous, missing and malformed email inputs', () => {
  for (const list of [[],['--email=nope'],['--email=a@example.test','--email=b@example.test'],['--email=x@example.test','--bad']]) {
    assert.throws(()=>parseInviteArgs(list));
  }
});
test('rejects unapproved send or incorrect staging URL, even with a service key', () => {
  const args = parseInviteArgs(['--email=x@example.test','--send','--confirm=SEND-STAGING-INVITE']);
  assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_BETA_INVITE_APPROVED:'0'}}));
  assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_STAGING_SUPABASE_URL:'https://yffruutknztvdyioovmp.supabase.co'}}));
  assert.throws(()=>validateSendGuard({args,env:{...config,DECKPLAY_STAGING_SERVICE_ROLE_KEY:'sb_publishable_test'}}));
  assert.equal(validateSendGuard({args,env:config}),true);
});
test('approved staging invite posts once, never follows redirect', async () => {
  const calls=[];
  const result=await sendStagingInvite({
    email:'collector@example.test',key,
    fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,status:200}}
  });
  assert.deepEqual(result,{sent:true});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,STAGING_PROJECT_URL+'/auth/v1/invite');
  assert.equal(calls[0].options.redirect,'error');
  assert.equal(calls[0].options.method,'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body),{email:'collector@example.test'});
});
test('API errors are generic and do not print email or secrets',async()=>{
  await assert.rejects(sendStagingInvite({email:'collector@example.test',key,
    fetchImpl:async()=>({ok:false,status:429})}),error=>{
      assert.match(error.message,/HTTP 429/);
      assert.doesNotMatch(error.message,/collector|eyJ/);
      return true;
    });
});
