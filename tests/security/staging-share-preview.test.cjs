const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ID='11111111-1111-4111-8111-111111111111';
const HOST='https://deckplay-hq-staging.cstivers56.workers.dev';
const PUBLIC_KEY='sb_publishable_synthetic_test_only';
const HTML='<!doctype html><head><meta name="robots" content="noindex,nofollow">'+
 '<meta name="description" content="DeckPlay generic description">'+
 '<meta property="og:title" content="DeckPlay HQ">'+
 '<meta property="og:description" content="Generic OG">'+
 '<meta name="twitter:title" content="DeckPlay HQ">'+
 '<meta name="twitter:description" content="Generic social">'+
 '<title>DeckPlay HQ</title></head><body>Staging marketplace</body>';
const sharedContext={URL,URLSearchParams,AbortSignal,Response,Request,TextEncoder,crypto:webcrypto,btoa:txt=>Buffer.from(txt).toString('base64')};
const source=fs.readFileSync('scripts/staging-share-preview.js','utf8');
const preview=vm.runInNewContext(source+'\nrenderStagingListingPreview',sharedContext,{filename:'staging-share-preview.js'});
test('anonymous active listing gets escaped server-generated metadata without leaking account data',async()=>{
 const title='Dragon Ball Tournament & <script>alert("x")</script>';
 let called=0;
 const fetcher=async(url,options)=>{
  called++;
  const u=new URL(url);
  assert.equal(u.origin,'https://prrrzeelltmyugssqnzk.supabase.co');
  assert.equal(u.pathname,'/rest/v1/listings');
  assert.equal(u.searchParams.get('select'),'id,title,status');
  assert.equal(u.searchParams.get('id'),'eq.'+ID);
  assert.equal(u.searchParams.get('status'),'eq.active');
  assert.equal(u.searchParams.get('limit'),'1');
  assert.equal(options.headers.apikey,PUBLIC_KEY);
  assert.equal(options.headers.Authorization,undefined);
  assert.equal(options.headers.Cookie,undefined);
  assert.equal(options.method,'GET');
  return new Response(JSON.stringify([{id:ID,title,status:'active'}]),{status:200});
 };
 const out=await preview(HTML,new URLSearchParams('listing='+ID),fetcher,PUBLIC_KEY);
 assert.equal(called,1);
 assert.match(out,/<title>Dragon Ball Tournament &amp; &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; \| DeckPlay HQ<\/title>/);
 assert.match(out,/og:title" content="Dragon Ball Tournament &amp; &lt;script&gt;/);
 assert.match(out,/og:description" content="Explore Dragon Ball Tournament/);
 assert.doesNotMatch(out,/<script>alert/);
 assert.match(out,/name="robots" content="noindex,nofollow"/);
 assert.doesNotMatch(out,/private messages|service_role|sb_secret_/i);
});
test('invalid, duplicate, combined or nonpublic links never reveal a title',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return new Response('[]')};
 for(const query of ['listing=no','listing='+ID+'&listing='+ID,'collector='+ID+'&listing='+ID,'listing=']){
  assert.equal(await preview(HTML,new URLSearchParams(query),fetcher,PUBLIC_KEY),HTML);
 }
 assert.equal(calls,0);
 const activeQuery=new URLSearchParams('listing='+ID);
 for(const rows of [[],[{id:ID,status:'draft',title:'Private card'}],[{id:'22222222-2222-4222-8222-222222222222',status:'active',title:'Wrong item'}]]){
  const out=await preview(HTML,activeQuery,async()=>new Response(JSON.stringify(rows)),PUBLIC_KEY);
  assert.equal(out,HTML);
 }
 assert.equal(await preview(HTML,activeQuery,fetcher,'sb_secret_not_allowed'),HTML);
 assert.equal(await preview('<html>Public indexing allowed</html>',activeQuery,fetcher,PUBLIC_KEY),'<html>Public indexing allowed</html>');
});
test('database errors and malformed rows safely fall back to generic noindex HTML',async()=>{
 const query=new URLSearchParams('listing='+ID);
 assert.equal(await preview(HTML,query,async()=>{throw Error('offline')},PUBLIC_KEY),HTML);
 assert.equal(await preview(HTML,query,async()=>new Response('unavailable',{status:503}),PUBLIC_KEY),HTML);
 assert.equal(await preview(HTML,query,async()=>new Response('not json'),PUBLIC_KEY),HTML);
 assert.equal(await preview(HTML,query,async()=>new Response(JSON.stringify([{id:ID,title:'',status:'active'}])),PUBLIC_KEY),HTML);
});
test('Worker enforces private authentication BEFORE preview and keeps HEAD static',async()=>{
 let previewCalls=0;
 const context=vm.createContext({
  ...sharedContext,assets:{'/index.html':{body:HTML,type:'text/html; charset=utf-8'}},
  STAGING_PREVIEW_PUBLIC_KEY:PUBLIC_KEY,
  fetch:async()=>{throw Error('Fixture must call the injected render stub')},
  renderStagingListingPreview:async html=>{previewCalls++;return html+'<!-- preview -->'}
 });
 const workerSrc=fs.readFileSync('scripts/staging-handler.js','utf8').replace(/^export default\s*/, 'globalThis.__handler = ');
 vm.runInContext(workerSrc,context,{filename:'staging-handler.js'});
 const worker=context.__handler;
 const env={STAGING_ACCESS_PASSWORD:'synthetic-only'};
 const root=HOST+'/?listing='+ID;
 const denied=await worker.fetch(new Request(root),env);
 assert.equal(denied.status,401);assert.equal(previewCalls,0);
 const badHost=await worker.fetch(new Request('https://other.example/?listing='+ID),env);
 assert.equal(badHost.status,403);assert.equal(previewCalls,0);
 const goodAuth='Basic '+Buffer.from('deckplay:synthetic-only').toString('base64');
 const head=await worker.fetch(new Request(root,{method:'HEAD',headers:{Authorization:goodAuth}}),env);
 assert.equal(head.status,200);assert.equal(previewCalls,0);
 const allowed=await worker.fetch(new Request(root,{headers:{Authorization:goodAuth}}),env);
 assert.equal(allowed.status,200);assert.equal(previewCalls,1);
 assert.match(await allowed.text(),/<!-- preview -->/);
 assert.equal(allowed.headers.get('Cache-Control'),'no-store');
 assert.match(allowed.headers.get('X-Robots-Tag'),/noindex/);
});
