// GitHub runner only: short-lived GitHub identity replaces manually copied secrets.
const fs=require('node:fs');
(async()=>{
 const origin='https://deckplay-hq-staging.cstivers56.workers.dev';
 if(!process.env.GITHUB_ACTIONS||!process.env.GITHUB_ENV)throw Error('GitHub runner required');
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.actions.githubusercontent.com'))throw Error('Unexpected identity endpoint');
 url.searchParams.set('audience',origin);
 const identity=await fetch(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(15000)});
 if(!identity.ok)throw Error('GitHub identity request failed');
 const {value}=await identity.json();if(!value)throw Error('GitHub identity missing');
 console.log('::add-mask::'+value);
 const response=await fetch(origin+'/__ci/session',{method:'POST',headers:{Authorization:'Bearer '+value},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Staging identity exchange failed (HTTP '+response.status+')');
 const values=await response.json();
 const names=['DECKPLAY_STAGING_URL','DECKPLAY_STAGING_ACCESS_PASSWORD','DECKPLAY_TEST_SELLER_EMAIL','DECKPLAY_TEST_SELLER_PASSWORD','DECKPLAY_TEST_BUYER_EMAIL','DECKPLAY_TEST_BUYER_PASSWORD'];
 for(const name of names){const value=values[name];if(typeof value!=='string'||!value||/[\r\n]/.test(value))throw Error('Invalid staging credential response');console.log('::add-mask::'+value)}
 fs.appendFileSync(process.env.GITHUB_ENV,names.map(name=>name+'='+values[name]+'\n').join(''));
 console.log('Trusted GitHub identity verified; staging-only credentials loaded.');
})().catch(()=>{console.error('Unable to authenticate the staging runner. No secrets printed.');process.exit(1)});
