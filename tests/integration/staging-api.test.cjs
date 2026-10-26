const {test,before}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {http}=require('../../scripts/staging-http.cjs');
const base='https://prrrzeelltmyugssqnzk.supabase.co';
const key='sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh';
// Hardcoded isolated target: no configurable production URL or service-role credential.
const users={};const run='TEST ONLY — NOT FOR SALE '+randomUUID().slice(0,8);
const sessions={};
function api(role,path,method='GET',body,extra={}){
 return http(base+path,{method,headers:{apikey:key,'Content-Type':'application/json',...(sessions[role]?{Authorization:'Bearer '+sessions[role].access_token}:{}),...extra},body});
}
function ok(r,status=200){assert.equal(r.status,status,typeof r.data==='object'?JSON.stringify(r.data):r.data);return r.data}
function createListing(role='seller',extra={}){return ok(api(role,'/rest/v1/listings','POST',{seller_id:users[role],title:run,price:25,category:'trading_cards',condition:'like_new',image_urls:[base+'/storage/v1/object/public/listing-images/test.jpg'],accepts_trades:true,accepts_price_offers:true,...extra},{Prefer:'return=representation'}),201)[0]}
function offer(id,amount=20,role='buyer'){return ok(api(role,'/rest/v1/rpc/submit_price_offer','POST',{p_listing_id:id,p_amount:amount}))}
function respond(id,action,amount=null,role='seller'){return api(role,'/rest/v1/rpc/respond_price_offer','POST',{p_offer_id:id,p_action:action,p_amount:amount})}
before(()=>{
 for(const role of ['seller','buyer']){
  const email=process.env['DECKPLAY_TEST_'+role.toUpperCase()+'_EMAIL'],password=process.env['DECKPLAY_TEST_'+role.toUpperCase()+'_PASSWORD'];
  assert(email&&password,'Dedicated staging credentials required');
  sessions[role]=ok(api(null,'/auth/v1/token?grant_type=password','POST',{email,password}));users[role]=sessions[role].user.id;
 }
});
test('both dedicated users authenticate and have distinct profiles',()=>{assert.notEqual(users.seller,users.buyer);for(const role of ['seller','buyer']){const p=ok(api(role,'/rest/v1/profiles?id=eq.'+users[role]));assert.equal(p.length,1);assert(p[0].username)}});
test('listing persists and is browseable/searchable; foreign ownership and missing photos rejected',()=>{
 const l=createListing();assert.equal(ok(api(null,'/rest/v1/listings?id=eq.'+l.id))[0].title,run);
 assert.equal(ok(api(null,'/rest/v1/listings?title=ilike.*'+encodeURIComponent(run)+'*')).some(x=>x.id===l.id),true);
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+l.id,'PATCH',{title:'tampered'},{Prefer:'return=representation'})).length,0);
 assert(api('buyer','/rest/v1/listings','POST',{seller_id:users.seller,title:run,price:10,category:'trading_cards',condition:'like_new',image_urls:['https://example.test/x.jpg']}).status>=400);
 assert(api('seller','/rest/v1/listings','POST',{seller_id:users.seller,title:run,price:10,category:'trading_cards',condition:'like_new',image_urls:[]}).status>=400);
 ok(api('seller','/rest/v1/listings?id=eq.'+l.id,'DELETE'),204);
});
test('favorites persist privately and can be removed',()=>{const l=createListing();ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:l.id}),201);assert.equal(ok(api('buyer','/rest/v1/saved_listings?listing_id=eq.'+l.id)).length,1);assert.equal(ok(api('seller','/rest/v1/saved_listings?listing_id=eq.'+l.id)).length,0);ok(api('buyer','/rest/v1/saved_listings?listing_id=eq.'+l.id,'DELETE'),204);ok(api('seller','/rest/v1/listings?id=eq.'+l.id,'DELETE'),204)});
test('wanted posts publish, browse and enforce owner deletion',()=>{const p=ok(api('buyer','/rest/v1/wanted_posts','POST',{user_id:users.buyer,title:run,game:'one_piece',budget:50,details:'TEST ONLY'},{Prefer:'return=representation'}),201)[0];assert.equal(ok(api(null,'/rest/v1/wanted_posts?id=eq.'+p.id)).length,1);assert.equal(ok(api('seller','/rest/v1/wanted_posts?id=eq.'+p.id,'DELETE',undefined,{Prefer:'return=representation'})).length,0);ok(api('buyer','/rest/v1/wanted_posts?id=eq.'+p.id,'DELETE'),204)});
test('private messages persist, notify recipient, and cannot be rewritten',()=>{
 const m=ok(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:run},{Prefer:'return=representation'}),201)[0];
 assert.equal(ok(api('seller','/rest/v1/collector_messages?id=eq.'+m.id))[0].body,run);
 assert.equal(ok(api(null,'/rest/v1/collector_messages?id=eq.'+m.id)).length,0);
 assert(api('seller','/rest/v1/collector_messages?id=eq.'+m.id,'PATCH',{body:'tamper'}).status>=400);
 ok(api('seller','/rest/v1/collector_messages?id=eq.'+m.id,'PATCH',{read_at:new Date().toISOString()}),204);
 assert(ok(api('buyer','/rest/v1/collector_messages?id=eq.'+m.id))[0].read_at);
 const n=ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+m.id));assert.equal(n.length,1);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+m.id)).length,0);
 ok(api('seller','/rest/v1/collector_notifications?id=eq.'+n[0].id,'PATCH',{read_at:new Date().toISOString()}),204);
 assert(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.seller,recipient_id:users.buyer,body:run}).status>=400);
});
test('counteroffer changes turns, accepts atomically, and locks the listing',()=>{
 const l=createListing(),id=offer(l.id);assert(respond(id,'accept',null,'buyer').status>=400);
 ok(respond(id,'counter',22),204);assert.equal(ok(api('buyer','/rest/v1/price_offers?id=eq.'+id))[0].amount,22);
 ok(respond(id,'accept',null,'buyer'),204);
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+l.id))[0].status,'reserved');
 assert.equal(ok(api(null,'/rest/v1/listings?id=eq.'+l.id)).length,0);
 assert(api('buyer','/rest/v1/rpc/submit_price_offer','POST',{p_listing_id:l.id,p_amount:25}).status>=400);
 assert(api('seller','/rest/v1/listings?id=eq.'+l.id,'PATCH',{status:'active'}).status>=400);
 assert.equal(ok(api('buyer','/rest/v1/price_offer_history?offer_id=eq.'+id)).length,3);
});
test('decline and withdraw terminate negotiation; invalid amount and self-offer rejected',()=>{
 const l=createListing(),id=offer(l.id);ok(respond(id,'decline'),204);assert(respond(id,'accept').status>=400);
 const id2=offer(l.id);ok(respond(id2,'withdraw',null,'buyer'),204);
 for(const [role,amount] of [['seller',20],['buyer',0],['buyer',-1],['buyer',100001]])assert(api(role,'/rest/v1/rpc/submit_price_offer','POST',{p_listing_id:l.id,p_amount:amount}).status>=400);
});
test('trade proposal accepts and reserves both owned items',()=>{
 const target=createListing(),offered=createListing('buyer');
 const trade=ok(api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:offered.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run},{Prefer:'return=representation'}),201)[0];
 ok(api('seller','/rest/v1/rpc/respond_trade_offer','POST',{p_offer:trade.id,p_action:'accepted'}),204);
 assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+target.id))[0].status,'reserved');assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+offered.id))[0].status,'reserved');
});
test('real photo upload is retrievable and cross-account upload is refused',()=>{
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 const path=users.seller+'/'+randomUUID()+'.png';
 ok(api('seller','/storage/v1/object/listing-images/'+path,'POST',image,{'Content-Type':'image/png'}));
 assert.equal(api(null,'/storage/v1/object/public/listing-images/'+path).status,200);
 assert(api('buyer','/storage/v1/object/listing-images/'+users.seller+'/'+randomUUID()+'.png','POST',image,{'Content-Type':'image/png'}).status>=400);
 ok(api('seller','/storage/v1/object/listing-images','DELETE',{prefixes:[path]}));
});
test('profile edits persist while another user cannot change it',()=>{
 ok(api('seller','/rest/v1/profiles?id=eq.'+users.seller,'PATCH',{bio:'TEST ONLY profile'}),204);
 assert.equal(ok(api('buyer','/rest/v1/profiles?id=eq.'+users.seller,'PATCH',{bio:'tampered'},{Prefer:'return=representation'})).length,0);
 assert.equal(ok(api(null,'/rest/v1/profiles?id=eq.'+users.seller))[0].bio,'TEST ONLY profile');
});
test('trade counteroffer can be accepted only by its recipient',()=>{
 const target=createListing(),offered=createListing('buyer');
 const t=ok(api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:offered.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run},{Prefer:'return=representation'}),201)[0];
 const counter=ok(api('seller','/rest/v1/rpc/create_trade_counter','POST',{p_offer:t.id,p_cash:5,p_direction:'sender_pays',p_note:run}));
 assert(api('seller','/rest/v1/rpc/respond_trade_counter','POST',{p_counter:counter,p_accept:true}).status>=400);
 ok(api('buyer','/rest/v1/rpc/respond_trade_counter','POST',{p_counter:counter,p_accept:true}),204);
 assert.equal(ok(api('buyer','/rest/v1/trade_offers?id=eq.'+t.id))[0].status,'accepted');
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+offered.id))[0].status,'reserved');
});
test('concurrent acceptances produce exactly one winning offer',async()=>{
 const l=createListing(),one=offer(l.id,20),two=offer(l.id,21);const {httpAsync}=require('../../scripts/staging-http.cjs');
 const results=await Promise.all([one,two].map(id=>httpAsync(base+'/rest/v1/rpc/respond_price_offer',{method:'POST',headers:{apikey:key,'Content-Type':'application/json',Authorization:'Bearer '+sessions.seller.access_token},body:{p_offer_id:id,p_action:'accept',p_amount:null}})));
 assert.equal(results.filter(r=>r.status===204).length,1);assert.equal(results.filter(r=>r.status>=400).length,1);
 const rows=ok(api('seller','/rest/v1/price_offers?listing_id=eq.'+l.id));assert.equal(rows.filter(x=>x.status==='accepted').length,1);assert.equal(rows.filter(x=>x.status==='declined').length,1);
});
