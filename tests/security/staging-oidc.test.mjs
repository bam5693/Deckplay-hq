import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {verifyStagingIdentity,stagingCiSession} from '../../scripts/staging-oidc.mjs';
let keys,jwk;const now=1800000000;
const claims={iss:'https://token.actions.githubusercontent.com',aud:'https://deckplay-hq-staging.cstivers56.workers.dev',repository_id:'1432533626',repository_owner_id:'347527951',repository:'bam5693/Deckplay-hq',ref:'refs/heads/test/staging-reporting',workflow_ref:'bam5693/Deckplay-hq/.github/workflows/private-staging.yml@refs/heads/test/staging-reporting',sub:'repo:bam5693/Deckplay-hq:environment:deckplay-staging',environment:'deckplay-staging',event_name:'push',iat:now,nbf:now,exp:now+300,run_id:'123'};
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
before(async()=>{keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test',alg:'RS256',use:'sig'}});
async function token(changes={},head={}){const body=encode({kid:'test',alg:'RS256',...head})+'.'+encode({...claims,...changes});const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,Buffer.from(body));return body+'.'+Buffer.from(signature).toString('base64url')}
const fetcher=async url=>{assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');return Response.json({keys:[jwk]})};
test('accepts signed trusted staging workflow only',async()=>assert.deepEqual(await verifyStagingIdentity(await token(),fetcher,now),{run_id:'123'}));
for(const [name,value] of Object.entries({iss:'https://attacker.test',aud:'other',repository_id:'1',repository_owner_id:'1',repository:'attacker/Deckplay-hq',ref:'refs/heads/main',workflow_ref:'wrong.yml',sub:'repo:attacker/repo',environment:'production',event_name:'pull_request',exp:now-1,iat:now-900,nbf:now+120,run_id:'invalid'}))test('rejects untrusted '+name,async()=>assert.rejects(()=>token({[name]:value}).then(t=>verifyStagingIdentity(t,fetcher,now))));
test('rejects unsigned algorithm substitution',async()=>assert.rejects(()=>token({},{alg:'none'}).then(t=>verifyStagingIdentity(t,fetcher,now))));
test('rejects altered signatures',async()=>{const t=await token();const p=t.split('.');p[1]=encode({...claims,run_id:'456'});await assert.rejects(()=>verifyStagingIdentity(p.join('.'),fetcher,now))});
test('anonymous endpoint never returns credentials',async()=>{const response=await stagingCiSession(new Request('https://example.test/__ci/session',{method:'POST'}),{TEST_SELLER_PASSWORD:'DO_NOT_EXPOSE'},{});assert.equal(response.status,401);assert(!((await response.text()).includes('DO_NOT_EXPOSE')))});
