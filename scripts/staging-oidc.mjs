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
 const required={iss:OIDC_ISSUER,aud:OIDC_AUDIENCE,repository_id:'1432533626',repository_owner_id:'347527951',repository:'bam5693/Deckplay-hq',ref:'refs/heads/test/staging-reporting',workflow_ref:OIDC_WORKFLOW,sub:'repo:bam5693@347527951/Deckplay-hq@1432533626:environment:deckplay-staging',environment:'deckplay-staging'};
 for(const [name,value] of Object.entries(required))if(claims[name]!==value)throw Error('Untrusted claim '+name);
 if(!['push','workflow_dispatch'].includes(claims.event_name))throw Error('Untrusted event');
 if(!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+600||!Number.isInteger(claims.iat)||claims.iat>now+30||claims.iat<now-600||!Number.isInteger(claims.nbf)||claims.nbf>now+30)throw Error('Invalid identity lifetime');
 if(!/^\d+$/.test(claims.run_id||''))throw Error('Invalid run ID');
 let response;try{response=await fetcher(OIDC_ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000),redirect:'error'})}catch(e){throw Error('Identity keys fetch failed '+e.name+': '+e.message)}
 if(!response.ok)throw Error('Identity keys unavailable');
 const data=await response.json();const jwk=data.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256');
 if(!jwk)throw Error('Identity key missing');
 let key;try{key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify'])}catch{throw Error('Identity key import failed')}
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
 }catch(e){const reason=/^(Untrusted claim [a-z_]+|Untrusted event|Invalid identity lifetime|Invalid run ID|Invalid signature|Identity keys unavailable|Identity keys fetch failed|Identity key import failed|Identity key missing|Identity required|Credentials unavailable)$/.test(e.message)?e.message:'Invalid identity';return Response.json({error:e.message.startsWith('Identity keys fetch failed ')?e.message:reason},{status:401,headers})}
}
