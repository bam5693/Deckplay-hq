const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('async function sendTradeProposalOnce('),html.indexOf('async function sendCollectorMessageOnce('));
const payload={cash_amount:5,cash_direction:'sender_pays',listing_id:'console',sender_id:'jayden',recipient_id:'tanner',offered_listing_id:'sports',offered_listing_ids:['sports','deck','figure'],offer_note:'Mixed category trade'};
function setup(storage=new Map()){
 let next=0,fail=true,commit=false,lookupError=false,stored=null;
 const writes=[],reads=[];
 const context=vm.createContext({TextEncoder,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},crypto:require("node:crypto").webcrypto,currentUser:{id:'jayden'},messageAccountVersion:0,tradeSendAttempts:new Map(),supabaseClient:{from(table){assert.equal(table,'trade_offers');let value;
  const q={insert(p){value=p;writes.push(p);return q},select(){return q},eq(k,v){reads.push([k,v]);return q},async single(){if(commit)stored={...value,initial_terms:{note:value.offer_note,cash_amount:value.cash_amount,cash_direction:value.cash_direction}};if(fail)throw Error('Connection lost');return {data:{id:value.id},error:null}},async maybeSingle(){return lookupError?{error:Error('Read offline')}:{data:stored,error:null}}};return q;
 }}});
 vm.runInContext(source,context);
 return {context,writes,reads,storage,send:p=>context.sendTradeProposalOnce(p||payload),options(o){if('fail'in o)fail=o.fail;if('commit'in o)commit=o.commit;if('lookupError'in o)lookupError=o.lookupError;if('stored'in o)stored=o.stored},row:()=>stored};
}
test('lost trade response confirms exact immutable terms with one insert',async()=>{const x=setup();x.options({commit:true});const r=await x.send();assert.equal(r.data.id,x.writes[0].id);assert.equal(x.writes.length,1);assert.equal(x.context.tradeSendAttempts.size,0)});
test('offline retry reuses its UUID and confirms before inserting again',async()=>{const x=setup();x.options({commit:true,lookupError:true});await assert.rejects(x.send(),/Connection lost/);x.options({lookupError:false});await x.send();assert.equal(x.writes.length,1)});
test('uncommitted retry uses same ID; changing selected inventory gets a different ID',async()=>{const x=setup();await assert.rejects(x.send());await assert.rejects(x.send());assert.equal(x.writes[0].id,x.writes[1].id);await assert.rejects(x.send({...payload,offered_listing_ids:['game'],offered_listing_id:'game'}));assert.notEqual(x.writes[1].id,x.writes[2].id)});
test('a recovered accepted counter checks original proposal terms',async()=>{const x=setup();x.options({commit:true,lookupError:true});await assert.rejects(x.send());const row=x.row();row.cash_amount=99;row.offer_note='Counter terms';x.options({lookupError:false});await x.send();assert.equal(x.writes.length,1)});
test('a mismatched sender, recipient, inventory or original term never confirms delivery',async()=>{for(const edit of [{sender_id:'other'},{recipient_id:'other'},{listing_id:'other'},{offered_listing_ids:['other']},{initial_terms:{note:'different',cash_amount:5,cash_direction:'sender_pays'}}]){const x=setup();x.options({commit:true,lookupError:true});await assert.rejects(x.send());x.options({commit:false,lookupError:false,stored:{...x.row(),...edit}});await assert.rejects(x.send(),/Connection lost/);assert.equal(x.context.tradeSendAttempts.size,1)}});
test('confirmed success releases the ID so a deliberate new proposal is distinct',async()=>{const x=setup();x.options({fail:false});await x.send();await x.send();assert.notEqual(x.writes[0].id,x.writes[1].id)});
test('switching accounts during failure prevents private trade readback',async()=>{const x=setup();x.context.supabaseClient.from=()=>({insert(){return this},select(){return this},async single(){x.context.currentUser={id:'charles'};throw Error('Connection lost')}});await assert.rejects(x.send(),/Connection lost/);assert.equal(x.reads.length,0)});
test('same-account relogin cannot confirm an old generation response',async()=>{const x=setup();x.context.supabaseClient.from=()=>({insert(){return this},select(){return this},async single(){x.context.messageAccountVersion++;throw Error('Connection lost')}});await assert.rejects(x.send(),/Connection lost/);assert.equal(x.reads.length,0)});


test('reload confirms a committed mixed-category proposal before a second insert',async()=>{
 const x=setup();x.options({commit:true,lookupError:true});await assert.rejects(x.send());
 assert.equal(x.storage.size,1);const serialized=[...x.storage.values()].join('');
 assert.ok(!serialized.includes(payload.offer_note));assert.ok(!serialized.includes('sports'));
 const y=setup(x.storage);y.options({stored:x.row()});const result=await y.send();
 assert.equal(result.data.id,x.writes[0].id);assert.equal(y.writes.length,0);assert.equal(x.storage.size,0);
});
test('reload retries an uncommitted proposal with the original ID; changed cash is independent',async()=>{
 const x=setup();await assert.rejects(x.send());const y=setup(x.storage);await assert.rejects(y.send());
 assert.equal(y.writes[0].id,x.writes[0].id);await assert.rejects(y.send({...payload,cash_amount:10}));
 assert.notEqual(y.writes[1].id,x.writes[0].id);
});
test('stale or malformed stored references cannot select an existing trade ID',async()=>{
 const x=setup();await assert.rejects(x.send());const key=[...x.storage.keys()][0];const rows=JSON.parse(x.storage.get(key));
 rows[0].at=Date.now()-86400001;x.storage.set(key,JSON.stringify(rows));
 const y=setup(x.storage);await assert.rejects(y.send());assert.notEqual(y.writes[0].id,x.writes[0].id);
 x.storage.set(key,'invalid JSON');const z=setup(x.storage);await assert.rejects(z.send());assert.equal(z.writes.length,1);
});
test('unavailable session storage preserves in-memory trade retry',async()=>{
 const x=setup();x.context.sessionStorage={getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}};
 await assert.rejects(x.send());await assert.rejects(x.send());assert.equal(x.writes[0].id,x.writes[1].id);
});
test('account change while hashing stops both storage and trade requests',async()=>{
 const x=setup();x.context.crypto={subtle:{async digest(){x.context.currentUser={id:'kyle'};return new Uint8Array(32).buffer}}};
 await assert.rejects(x.send(),/account changed/);assert.equal(x.writes.length,0);assert.equal(x.storage.size,0);
});
