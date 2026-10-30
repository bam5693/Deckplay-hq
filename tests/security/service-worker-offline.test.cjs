const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('sw.js','utf8');
const origin='https://deckplay-hq-staging.cstivers56.workers.dev';
function boot(network) {
 const handlers={};
 const self={
  location:{origin},
  skipWaiting(){},
  clients:{claim:async()=>{}},
  addEventListener:(name,handler)=>{handlers[name]=handler}
 };
 // Old CacheStorage entries must never be consulted for private pages.
 const caches={match(){throw Error('Unsafe cached response replayed')}};
 vm.runInNewContext(source,{self,URL,Response,fetch:network,caches},{filename:'sw.js'});
 return request=>{
  let pending;
  handlers.fetch({request,respondWith:response=>{pending=Promise.resolve(response)}});
  return pending;
 };
}
const navigation=(url=origin+'/')=>({method:'GET',mode:'navigate',url});
test('PWA offline navigations show explicit non-cached unavailable state',async()=>{
 const handle=boot(async()=>{throw Error('Connection unavailable')});
 const result=await handle(navigation());
 assert.equal(result.status,503);
 assert.match(result.headers.get('cache-control')||'',/no-store/);
 assert.match(result.headers.get('x-robots-tag')||'',/noindex/);
 const html=await result.text();
 assert.match(html,/DeckPlay HQ is offline/);
 assert.match(html,/No cached private conversations or old listings are shown/);
 assert.doesNotMatch(html,/<script/i);
});
test('PWA online navigation passes through server response including private auth denial',async()=>{
 const expected=new Response('Private staging', {status:401,headers:{'WWW-Authenticate':'Basic realm="DeckPlay staging"'}});
 const handle=boot(async()=>expected);
 const result=await handle(navigation(origin+'/?listing=00000000-0000-0000-0000-000000000000'));
 assert.strictEqual(result,expected);
 assert.equal(result.status,401);
});
test('PWA does not intercept private resources, API traffic, POST or cross-origin calls',()=>{
 const handle=boot(async()=>{throw Error('Must not fetch')});
 assert.equal(handle({method:'GET',mode:'cors',url:origin+'/private-listing.json'}),undefined);
 assert.equal(handle({method:'POST',mode:'navigate',url:origin+'/auth'}),undefined);
 assert.equal(handle({method:'GET',mode:'navigate',url:'https://example.org/'}),undefined);
});
