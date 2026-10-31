const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
const begin=source.indexOf('async function refreshUnreadCount(){');
const end=source.indexOf('\nlet liveInboxTimer=',begin);
assert.ok(begin>=0&&end>begin,'Unread badge implementation must be present');
const fn=source.slice(begin,end);
function setup(){
 const badges=Object.fromEntries(['headerUnread','menuUnread'].map(id=>[id,{hidden:false,textContent:'7'}]));
 const pending=[];
 const context={currentUser:{id:'buyer-A'},unreadCountLoadVersion:0,
  document:{getElementById:id=>badges[id]},
  supabaseClient:{from:table=>{
   assert.equal(table,'collector_messages');
   const query={select:()=>query,eq:(field,value)=>{assert.equal(field,'recipient_id');query.owner=value;return query},is:()=>new Promise(resolve=>pending.push({owner:query.owner,resolve}))};
   return query;
  }}
 };
 vm.createContext(context);vm.runInContext(fn+'\nthis.refreshUnreadCount=refreshUnreadCount;',context);
 return {context,badges,pending};
}
test('sign-out clears both unread badges immediately',async()=>{
 const {context,badges}=setup();context.currentUser=null;
 await context.refreshUnreadCount();
 for(const badge of Object.values(badges)){assert.equal(badge.hidden,true);assert.equal(badge.textContent,'')}
});
test('late unread count from old account never overwrites new account',async()=>{
 const {context,badges,pending}=setup();
 const old=context.refreshUnreadCount();
 context.currentUser={id:'buyer-B'};
 const newer=context.refreshUnreadCount();
 assert.equal(pending.length,2);
 assert.equal(pending[0].owner,'buyer-A');assert.equal(pending[1].owner,'buyer-B');
 pending[1].resolve({count:2,error:null});await newer;
 pending[0].resolve({count:17,error:null});await old;
 for(const badge of Object.values(badges)){assert.equal(badge.hidden,false);assert.equal(badge.textContent,'2')}
});
test('response finishing after sign-out does not reveal old count',async()=>{
 const {context,badges,pending}=setup();
 const old=context.refreshUnreadCount();
 context.currentUser=null;await context.refreshUnreadCount();
 pending[0].resolve({count:9,error:null});await old;
 for(const badge of Object.values(badges)){assert.equal(badge.hidden,true);assert.equal(badge.textContent,'')}
});
