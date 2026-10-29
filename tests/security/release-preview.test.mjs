import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Exercise actual handler with an isolated in-memory asset and gate binding.
const source='const assets={"/index.html":{body:"candidate",type:"text/html"}};\n'+fs.readFileSync('scripts/release-preview-handler.mjs','utf8');
const handler=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const origin='https://deckplay-hq-release-preview.cstivers56.workers.dev';
test('anonymous preview fails closed before returning assets',async()=>{
 const r=await handler.fetch(new Request(origin),{STAGING_GATE:{fetch:async()=>new Response(null,{status:401,headers:{'WWW-Authenticate':'Basic realm="DeckPlay staging"'}})}});
 assert.equal(r.status,401);assert.equal(await r.text(),'');assert.match(r.headers.get('WWW-Authenticate'),/Basic/);assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('preview gate forwards only auth to a fixed read-only staging path',async()=>{
 let seen;const gate={fetch:async(url,options)=>{seen={url,options};return new Response(null,{status:200})}};
 const r=await handler.fetch(new Request(origin+'/',{headers:{Authorization:'Basic synthetic','Cloudflare-Workers-Version-Overrides':'old-version'}}),{STAGING_GATE:gate});
 assert.equal(await r.text(),'candidate');assert.equal(seen.url,'https://deckplay-hq-staging.cstivers56.workers.dev/');assert.equal(seen.options.method,'HEAD');assert.deepEqual(seen.options.headers,{Authorization:'Basic synthetic'});
});
test('unavailable gate never serves preview assets',async()=>{
 const r=await handler.fetch(new Request(origin),{STAGING_GATE:{fetch:async()=>{throw Error('offline')}}});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/candidate/);
});
test('preview denies other hosts, write requests and internal CI endpoints',async()=>{
 const env={STAGING_GATE:{fetch:async()=>new Response(null,{status:200})}};
 assert.equal((await handler.fetch(new Request('https://deckplayhq.com'),env)).status,403);
 assert.equal((await handler.fetch(new Request(origin,{method:'POST'}),env)).status,405);
 assert.equal((await handler.fetch(new Request(origin+'/__ci/session'),env)).status,404);
});
