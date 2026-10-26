// Only this repository's trusted staging workflow can obtain synthetic-account credentials.
const OIDC_ISSUER='https://token.actions.githubusercontent.com';
const OIDC_AUDIENCE='https://deckplay-hq-staging.cstivers56.workers.dev';
const OIDC_WORKFLOW='bam5693/Deckplay-hq/.github/workflows/private-staging.yml@refs/heads/test/staging-reporting';
function decodeBase64url(value){
 if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid encoding');
 return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=')),c=>c.charCodeAt(0));
}
export async function verifyStagingIdentity(token,fetcher=fetch,now=Math.floor(Date.now()/1000)){
 if(typeof token!=='string'||token.length>16000)throw Error('Invalid identity');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid identity');
 const header=JSON.parse(new TextDecoder().decode(decodeBase64url(parts[0])));
 const claims=JSON.parse(new TextDecoder().decode(decodeBase64url(parts[1])));
 if(header.alg!=='RS256'||typeof header.kid!=='string'||header.crit||header.jku||header.jwk)throw Error('Invalid algorithm');
 if(claims.iss!==OIDC_ISSUER||claims.aud!==OIDC_AUDIENCE||
 claims.repository_id!=='1432533626'||claims.repository_owner_id!=='347527951'||
 claims.repository!=='bam5693/Deckplay-hq'||claims.ref!=='refs/heads/test/staging-reporting'||
 claims.workflow_ref!==OIDC_WORKFLOW||claims.sub!=='repo:bam5693/Deckplay-hq:environment:deckplay-staging'||
 claims.environment!=='deckplay-staging'||!['push','workflow_dispatch'].includes(claims.event_name)||
 !Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+600||
 !Number.isInteger(claims.iat)||claims.iat>now+30||claims.iat<now-600||
 !Number.isInteger(claims.nbf)||claims.nbf>now+30||!/^\d+$/.test(claims.run_id||''))throw Error('Untrusted workflow');
 const response=await fetcher(OIDC_ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw Error('Identity keys unavailable');
 const data=await response.json();const jwk=data.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256');
 if(!jwk)throw Error('Identity key missing');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decodeBase64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('Invalid signature');
 return {run_id:claims.run_id};
}
export async function stagingCiSession(request,env,headers){
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers});
 try{
  const authorization=request.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))throw Error('Identity required');
  await verifyStagingIdentity(authorization.slice(7));
  if(!env.TEST_SELLER_PASSWORD||!env.TEST_BUYER_PASSWORD||!env.STAGING_ACCESS_PASSWORD)throw Error('Credentials unavailable');
  // Returned only to a GitHub-signed trusted job over TLS; never logged or cached.
  return Response.json({DECKPLAY_STAGING_URL:OIDC_AUDIENCE,DECKPLAY_STAGING_ACCESS_PASSWORD:env.STAGING_ACCESS_PASSWORD,
   DECKPLAY_TEST_SELLER_EMAIL:'deckplay-seller@deckplay.test',DECKPLAY_TEST_SELLER_PASSWORD:env.TEST_SELLER_PASSWORD,
   DECKPLAY_TEST_BUYER_EMAIL:'deckplay-buyer@deckplay.test',DECKPLAY_TEST_BUYER_PASSWORD:env.TEST_BUYER_PASSWORD},{headers});
 }catch{return new Response('Trusted staging workflow identity required',{status:401,headers})}
}
