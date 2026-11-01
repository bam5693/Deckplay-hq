const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
const start = source.indexOf('const follow=e.target.closest("[data-follow-profile]")');
const end = source.indexOf('}const report=e.target.closest("[data-report-profile]")', start);
assert.ok(start >= 0 && end > start, 'Find the actual T4.1 follow click handler');
const snippet = source.slice(start, end + 1);
function fixture({write, read, initialFollowing=false}={}) {
 let writes=0, reads=0, reloads=0; const notices=[];
 const button={disabled:false,isConnected:true,textContent:'Follow seller',setAttribute(){},removeAttribute(){}};
 const query={}; for(const method of ['select','eq','maybeSingle','insert','delete'])query[method]=()=>query;
 const ctx={currentUser:{id:'buyer'},id:'seller',followUnavailable:false,blockedCollectorIds:new Set(),isFollowing:initialFollowing,messageAccountVersion:1,
  supabaseClient:{from:()=>query},toast:value=>notices.push(value),showPublicProfile:async()=>{reloads++},openModal:()=>{},current:()=>true,
  readMarketplaceRequest:async()=>{writes++;return write?write(writes):{error:null}},
  publicProfileRead:async()=>{reads++;return read?read(reads):{data:{seller_id:'seller'},error:null}}};
 const factory=new Function('ctx', 'const {currentUser,id,followUnavailable,blockedCollectorIds,isFollowing,supabaseClient,readMarketplaceRequest,publicProfileRead,toast,showPublicProfile,openModal,current}=ctx;let messageAccountVersion=ctx.messageAccountVersion;let followStatusUncertain=false;const action=async e=>{' + snippet + '};return {action,setEpoch:n=>messageAccountVersion=n};');
 const handler=factory(ctx),event={target:{closest:selector=>selector==='[data-follow-profile]'?button:null}};
 return {click:()=>handler.action(event),setEpoch:handler.setEpoch,button,notices,stats:()=>({writes,reads,reloads})};
}
test('T4.1 timed-out follow never retries the mutation blindly; check status only',async()=>{
 const h=fixture({write:()=>{throw Error('timeout')}});
 await h.click();assert.equal(h.button.textContent,'Check follow status');assert.deepEqual(h.stats(),{writes:1,reads:0,reloads:0});
 await h.click();assert.deepEqual(h.stats(),{writes:1,reads:1,reloads:1});
});
test('T4.1 unconfirmed follow write never announces success or invites an opposite action',async()=>{
 const h=fixture({read:()=>({data:null,error:null})});
 await h.click();assert.equal(h.button.textContent,'Check follow status');assert.equal(h.notices.length,0);assert.deepEqual(h.stats(),{writes:1,reads:1,reloads:0});
});
test('T4.1 confirmed follow and unfollow use owner-scoped readback',async()=>{
 const followed=fixture();await followed.click();assert.equal(followed.notices.length,1);
 const unfollowed=fixture({initialFollowing:true,read:()=>({data:null,error:null})});await unfollowed.click();assert.match(unfollowed.notices[0],/unfollowed/);
});
test('T4.1 a changed login epoch cannot paint stale follow success',async()=>{
 let release;const h=fixture({write:()=>new Promise(resolve=>{release=resolve})});
 const pending=h.click();h.setEpoch(2);release({error:null});await pending;
 assert.deepEqual(h.stats(),{writes:1,reads:0,reloads:0});assert.equal(h.notices.length,0);
});
