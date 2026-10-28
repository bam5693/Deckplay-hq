const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {cleanup}=require('../helpers/staging.cjs');
const {http,httpAsync,assertStagingUrl}=require('../../scripts/staging-http.cjs');
const origin='https://prrrzeelltmyugssqnzk.supabase.co';
const marker='TEST ONLY BOT 11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
function fixture(changes={}){
 const calls=[];
 const user={id,email:'deckplay-seller@deckplay.test'};
 const rows=[{id,title:marker,seller_id:id,image_urls:[origin+'/storage/v1/object/public/listing-images/'+id+'/33333333-3333-4333-8333-333333333333.png']}];
 const context={location:{origin:'https://deckplay-hq-staging.cstivers56.workers.dev'},SUPABASE_URL:origin,SUPABASE_PUBLISHABLE_KEY:'synthetic-key',currentUser:user,AbortSignal,...changes};
 context.supabaseClient={
  from(){const query={select(){return query},eq(){return query},async abortSignal(signal){assert(signal instanceof AbortSignal);if(changes.switchAccount)context.currentUser={id:'different'};return {data:changes.rows||rows,error:null}}};return query},
  auth:{async getSession(){return {data:{session:{user:changes.sessionUser||user,access_token:'synthetic-token'}},error:null}}},
  rpc(name,args){calls.push({name,args});return {async abortSignal(signal){assert(signal instanceof AbortSignal);return {error:null}}}}
 };
 context.fetch=async(url,options)=>{calls.push({url,options});assert(options.signal instanceof AbortSignal);if(changes.switchAccountDuringStorage)context.currentUser={id:'different'};return {ok:!changes.storageFails,status:changes.storageFails?503:200}};
 const page={async evaluate(fn,arg){return vm.runInNewContext('('+fn.toString()+')',context)(arg)}};
 return {page,calls};
}
test('HTTP transports reject production and deceptive origins before any request',()=>{
 for(const url of ['https://yffruutknztvdyioovmp.supabase.co/rest/v1/listings','https://prrrzeelltmyugssqnzk.supabase.co.attacker.test/','http://prrrzeelltmyugssqnzk.supabase.co/','https://user:pass@prrrzeelltmyugssqnzk.supabase.co/']){
  assert.throws(()=>http(url,{method:'DELETE'}),/Refusing/);
  assert.throws(()=>httpAsync(url,{method:'DELETE'}),/Refusing/);
 }
 assert.doesNotThrow(()=>assertStagingUrl(origin+'/rest/v1/listings?id=eq.'+id));
});
test('cleanup rejects broad or missing markers before browser evaluation',async()=>{
 const page={evaluate(){assert.fail('Browser must not be accessed')}};
 for(const title of [null,undefined,'','TEST ONLY%','TEST ONLY BOT '+id+' extra',marker+'\n'])await assert.rejects(()=>cleanup(page,title),/Exact synthetic/);
});
test('cleanup requires the private staging page, database and disposable identity',async()=>{
 for(const changes of [{location:{origin:'https://deckplayhq.com'}},{SUPABASE_URL:'https://other.supabase.co'},{currentUser:{id,email:'real@example.test'}},{currentUser:null}]){
  const {page,calls}=fixture(changes);await assert.rejects(()=>cleanup(page,marker),/Refusing|Dedicated/);assert.equal(calls.length,0);
 }
});
test('cleanup rejects unverified listing rows and unsafe owned photo paths',async()=>{
 for(const row of [{id:'bad',title:marker,seller_id:id},{id,title:'unrelated',seller_id:id},{id,title:marker,seller_id:'other'},{id,title:marker,seller_id:id,image_urls:[origin+'/storage/v1/object/public/listing-images/'+id+'/../real.png']}]){
  const {page,calls}=fixture({rows:[row]});await assert.rejects(()=>cleanup(page,marker),/Unverified/);assert.equal(calls.length,0);
 }
});
test('account changes prevent destructive cleanup and storage failure retains diagnostic rows',async()=>{
 for(const changes of [{switchAccount:true},{sessionUser:{id:'other'}}]){
  const {page,calls}=fixture(changes);await assert.rejects(()=>cleanup(page,marker),/changed/);assert.equal(calls.length,0);
 }
 const {page,calls}=fixture({storageFails:true});await assert.rejects(()=>cleanup(page,marker),/HTTP 503/);assert.equal(calls.length,1);assert(calls[0].url.endsWith('/storage/v1/object/listing-images'));
});
test('verified cleanup deletes only exact fixture photo paths then invokes the existing scoped RPC',async()=>{
 const {page,calls}=fixture();await cleanup(page,marker);
 assert.equal(calls.length,2);assert.equal(calls[0].options.method,'DELETE');
 assert.deepEqual(JSON.parse(calls[0].options.body),{prefixes:[id+'/33333333-3333-4333-8333-333333333333.png']});
 assert.equal(calls[1].name,'cleanup_staging_fixture');assert.equal(calls[1].args.p_marker,marker);
});
test('cleanup leaves shared and foreign photo URLs alone and supports already-removed listings',async()=>{
 for(const rows of [[],[{id,title:marker,seller_id:id,image_urls:[origin+'/storage/v1/object/public/listing-images/test.jpg',origin+'/storage/v1/object/public/listing-images/another-user/shared.png','https://example.test/photo.png']}]]){
  const {page,calls}=fixture({rows});await cleanup(page,marker);
  assert.equal(calls.length,1);assert.equal(calls[0].name,'cleanup_staging_fixture');
 }
});

test('account switch during photo cleanup stops before fixture deletion RPC',async()=>{
 const {page,calls}=fixture({switchAccountDuringStorage:true});
 await assert.rejects(()=>cleanup(page,marker),/Cleanup account changed/);
 assert.equal(calls.length,1,'No database cleanup may run under a different account');
 assert(calls[0].url.endsWith('/storage/v1/object/listing-images'));
});

test('duplicate verified photo references are removed only once',async()=>{
 const image=origin+'/storage/v1/object/public/listing-images/'+id+'/33333333-3333-4333-8333-333333333333.png';
 const {page,calls}=fixture({rows:[{id,title:marker,seller_id:id,image_urls:[image,image]}]});
 await cleanup(page,marker);
 assert.equal(calls.length,2);
 assert.deepEqual(JSON.parse(calls[0].options.body),{prefixes:[id+'/33333333-3333-4333-8333-333333333333.png']});
 assert.equal(calls[1].name,'cleanup_staging_fixture');
});
