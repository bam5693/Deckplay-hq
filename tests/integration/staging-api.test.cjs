const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {http}=require('../../scripts/staging-http.cjs');
const base='https://prrrzeelltmyugssqnzk.supabase.co';
const key='sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh';
// Hardcoded isolated target: no configurable production URL or service-role credential.
const users={};const run='TEST ONLY BOT '+randomUUID();
const sessions={};const activityFixtureIds=[],messageFixtureIds=[];
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
test('a refreshed session restores buyer access while malformed tokens cannot read private data',()=>{
 const email=process.env.DECKPLAY_TEST_BUYER_EMAIL,password=process.env.DECKPLAY_TEST_BUYER_PASSWORD;
 // Create a separate session so refresh-token rotation never affects shared test sessions.
 const signedIn=ok(api(null,'/auth/v1/token?grant_type=password','POST',{email,password}));
 assert.equal(signedIn.user.id,users.buyer,'Fresh sign-in must belong to the buyer fixture');
 assert(signedIn.refresh_token,'Sign-in must return a refresh token');
 const refreshed=ok(api(null,'/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:signedIn.refresh_token}));
 assert.equal(refreshed.user.id,users.buyer,'Refresh must preserve buyer identity');
 assert(refreshed.access_token,'Refresh must provide a usable access token');
 const auth={Authorization:'Bearer '+refreshed.access_token};
 assert.equal(ok(api(null,'/auth/v1/user','GET',undefined,auth)).id,users.buyer,'Refreshed token must authenticate');
 assert.equal(ok(api(null,'/rest/v1/profiles?id=eq.'+users.buyer,'GET',undefined,auth)).length,1,'Refreshed session must restore profile access');
 const invalid=api(null,'/rest/v1/collector_messages?select=id&limit=1','GET',undefined,{Authorization:'Bearer malformed.session.token'});
 assert([401,403].includes(invalid.status),'Malformed bearer token must not read private messages');
 assert.deepEqual(ok(api(null,'/rest/v1/collector_messages?select=id&limit=1')),[],'Anonymous requests must not see private messages');
});
test('listing persists and is browseable/searchable; foreign ownership and missing photos rejected',()=>{
 const l=createListing();assert.equal(ok(api(null,'/rest/v1/listings?id=eq.'+l.id))[0].title,run);
 assert.equal(ok(api(null,'/rest/v1/listings?title=ilike.*'+encodeURIComponent(run)+'*')).some(x=>x.id===l.id),true);
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+l.id,'PATCH',{title:'tampered'},{Prefer:'return=representation'})).length,0);
 assert(api('buyer','/rest/v1/listings','POST',{seller_id:users.seller,title:run,price:10,category:'trading_cards',condition:'like_new',image_urls:['https://example.test/x.jpg']}).status>=400);
 assert(api('seller','/rest/v1/listings','POST',{seller_id:users.seller,title:run,price:10,category:'trading_cards',condition:'like_new',image_urls:[]}).status>=400);
 ok(api('seller','/rest/v1/listings?id=eq.'+l.id,'DELETE'),204);
});
test('anonymous and signed-in searches combine case-insensitive title and price filters',()=>{
 const marker=run+' SEARCH '+randomUUID(),ids=[];
 try{
  const budget=createListing('seller',{title:marker+' budget',price:18});ids.push(budget.id);
  const premium=createListing('seller',{title:marker+' premium',price:62});ids.push(premium.id);
  const filter='title=ilike.*'+encodeURIComponent(marker.toLowerCase())+'*&category=eq.trading_cards';
  for(const role of [null,'buyer']){
   const all=ok(api(role,'/rest/v1/listings?select=id,title,price&'+filter));
   assert.deepEqual(all.map(row=>row.id).sort(),ids.slice().sort(),'Case-insensitive search should find both fixture listings');
   const filtered=ok(api(role,'/rest/v1/listings?select=id,price&'+filter+'&price=gte.50&price=lte.70'));
   assert.deepEqual(filtered.map(row=>row.id),[premium.id],'Price range must exclude the budget listing');
   const empty=ok(api(role,'/rest/v1/listings?select=id&'+filter+'&price=lt.10'));
   assert.equal(empty.length,0,'A nonmatching price filter must return no results');
  }
 }finally{
  for(const id of ids)ok(api('seller','/rest/v1/listings?id=eq.'+id,'DELETE'),204);
 }
});
test('another collector cannot delete the seller listing',()=>{
 const listing=createListing();
 try{
  const attempt=api('buyer','/rest/v1/listings?id=eq.'+listing.id,'DELETE',undefined,{Prefer:'return=representation'});
  assert([200,204].includes(attempt.status),'Unauthorized delete should be filtered by row-level security');
  assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+listing.id)).length,1,'Seller listing must remain after unauthorized deletion');
 }finally{ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'DELETE'),204)}
});
test('wanted posts reject impersonation and foreign edits',()=>{
 const post=ok(api('buyer','/rest/v1/wanted_posts','POST',{user_id:users.buyer,title:run,game:'one_piece',budget:50,details:'TEST ONLY'},{Prefer:'return=representation'}),201)[0];
 try{
  const spoof=api('buyer','/rest/v1/wanted_posts','POST',{user_id:users.seller,title:run,game:'one_piece',budget:50,details:'TEST ONLY spoof'});
  assert(spoof.status>=400,'A buyer must not publish a wanted post under the seller identity');
  const edit=api('seller','/rest/v1/wanted_posts?id=eq.'+post.id,'PATCH',{details:'TEST ONLY foreign edit'},{Prefer:'return=representation'});
  assert([200,204].includes(edit.status),'Foreign edits should affect no rows');
  assert.equal(ok(api('buyer','/rest/v1/wanted_posts?id=eq.'+post.id))[0].details,'TEST ONLY','Original wanted post must be unchanged');
 }finally{ok(api('buyer','/rest/v1/wanted_posts?id=eq.'+post.id,'DELETE'),204)}
});
test('favorites persist privately and can be removed',()=>{const l=createListing();ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:l.id}),201);assert.equal(ok(api('buyer','/rest/v1/saved_listings?listing_id=eq.'+l.id)).length,1);assert.equal(ok(api('seller','/rest/v1/saved_listings?listing_id=eq.'+l.id)).length,0);ok(api('buyer','/rest/v1/saved_listings?listing_id=eq.'+l.id,'DELETE'),204);ok(api('seller','/rest/v1/listings?id=eq.'+l.id,'DELETE'),204)});
test('another collector cannot remove a buyer saved listing',()=>{
 const listing=createListing();
 const filter='?user_id=eq.'+users.buyer+'&listing_id=eq.'+listing.id;
 try{
  ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id}),201);
  const attempt=api('seller','/rest/v1/saved_listings'+filter,'DELETE',undefined,{Prefer:'return=representation'});
  assert([200,204].includes(attempt.status),'Foreign deletion must be denied or row-filtered');
  if(attempt.status===200)assert.deepEqual(attempt.data,[],'Foreign deletion must affect no rows');
  assert.equal(ok(api('buyer','/rest/v1/saved_listings'+filter)).length,1,'Buyer favorite must survive a foreign delete');
 }finally{
  ok(api('buyer','/rest/v1/saved_listings'+filter,'DELETE'),204);
  ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'DELETE'),204);
 }
});
test('another collector cannot add or remove favorites under someone else identity',()=>{
 const listing=createListing();
 const filter='?user_id=eq.'+users.buyer+'&listing_id=eq.'+listing.id;
 try{
  const spoof=api('seller','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id},{Prefer:'return=representation'});
  assert(spoof.status>=400,'Seller must not save a listing on behalf of buyer');
  assert.equal(ok(api('buyer','/rest/v1/saved_listings'+filter)).length,0,'Rejected spoof must not create buyer favorite');
 }finally{
  ok(api('buyer','/rest/v1/saved_listings'+filter,'DELETE'),204);
  ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'DELETE'),204);
 }
});
test('a collector cannot impersonate another user when saving their own listing',()=>{
 const listing=createListing('buyer');
 const filter='?user_id=eq.'+users.seller+'&listing_id=eq.'+listing.id;
 try{
  const spoof=api('buyer','/rest/v1/saved_listings','POST',{user_id:users.seller,listing_id:listing.id},{Prefer:'return=representation'});
  assert(spoof.status>=400,'Buyer must not create a saved listing for the seller');
  assert.equal(ok(api('seller','/rest/v1/saved_listings'+filter)).length,0,'Spoofed favorite must not persist');
 }finally{
  ok(api('seller','/rest/v1/saved_listings'+filter,'DELETE'),204);
  ok(api('buyer','/rest/v1/listings?id=eq.'+listing.id,'DELETE'),204);
 }
});
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
test('sender cannot mark recipient private message read',()=>{
 const msg=ok(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:run},{Prefer:'return=representation'}),201)[0];
 messageFixtureIds.push(msg.id);
 const attempt=api('buyer','/rest/v1/collector_messages?id=eq.'+msg.id,'PATCH',{read_at:new Date().toISOString()},{Prefer:'return=representation'});
 assert(attempt.status>=400||Array.isArray(attempt.data)&&attempt.data.length===0,'Sender cannot mark recipient message read');
 assert.equal(ok(api('seller','/rest/v1/collector_messages?id=eq.'+msg.id))[0].read_at,null,'Recipient unread state must remain intact');
 ok(api('seller','/rest/v1/collector_messages?id=eq.'+msg.id,'PATCH',{read_at:new Date().toISOString()}),204);
 assert(ok(api('seller','/rest/v1/collector_messages?id=eq.'+msg.id))[0].read_at,'Recipient may mark their own message read');
});
test('message read status cannot be cleared by sender after recipient reads it',()=>{
 const msg=ok(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:run},{Prefer:'return=representation'}),201)[0];
 ok(api('seller','/rest/v1/collector_messages?id=eq.'+msg.id,'PATCH',{read_at:new Date().toISOString()}),204);
 assert(ok(api('seller','/rest/v1/collector_messages?id=eq.'+msg.id))[0].read_at,'Recipient message must be read');
 messageFixtureIds.push(msg.id);
 const attempt=api('buyer','/rest/v1/collector_messages?id=eq.'+msg.id,'PATCH',{read_at:null},{Prefer:'return=representation'});
 assert(attempt.status>=400||Array.isArray(attempt.data)&&attempt.data.length===0,'Sender cannot reset recipient unread status');
 assert(ok(api('seller','/rest/v1/collector_messages?id=eq.'+msg.id))[0].read_at,'Recipient read status must survive sender reset attempt');
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

test('competing trade proposals cannot both reserve the same listing',()=>{
 const target=createListing(),firstItem=createListing('buyer'),secondItem=createListing('buyer');
 const propose=offeredId=>ok(api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:offeredId,sender_id:users.buyer,recipient_id:users.seller,offer_note:run},{Prefer:'return=representation'}),201)[0];
 const first=propose(firstItem.id),second=propose(secondItem.id);
 ok(api('seller','/rest/v1/rpc/respond_trade_offer','POST',{p_offer:first.id,p_action:'accepted'}),204);
 const losingResponse=api('seller','/rest/v1/rpc/respond_trade_offer','POST',{p_offer:second.id,p_action:'accepted'});
 assert(losingResponse.status>=400,'A competing trade must not accept after the target is reserved');
 assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+target.id))[0].status,'reserved');
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+firstItem.id))[0].status,'reserved');
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+secondItem.id))[0].status,'active','Losing trade must not lock its offered listing');
 const trades=ok(api('seller','/rest/v1/trade_offers?id=in.('+first.id+','+second.id+')'));
 assert.equal(trades.filter(t=>t.status==='accepted').length,1,'Exactly one trade may be accepted');
});

after(()=>{
 if(!sessions.seller)return;
 ok(api('seller','/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:run}),204);
 for(const id of messageFixtureIds){
  for(const role of ['seller','buyer']){
   assert.deepEqual(ok(api(role,'/rest/v1/collector_messages?id=eq.'+id)),[],'Cleanup must remove private message fixtures');
   assert.deepEqual(ok(api(role,'/rest/v1/collector_notifications?source_id=eq.'+id)),[],'Cleanup must remove message alerts');
  }
 }
 for(const id of activityFixtureIds){
  assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+id)).length,0,'Cleanup must remove saved-item activity alerts');
  assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+id)).length,0,'Cleanup must remove saved-item fixture listing');
 }
});
test('notification preferences persist and suppress unwanted notifications',()=>{
 const original=ok(api('seller','/rest/v1/notification_preferences?user_id=eq.'+users.seller))[0];
 const preferences={user_id:users.seller,messages:false,trade_offers:true,wanted_matches:true,product_updates:false};
 try{
  assert([200,201].includes(api('seller','/rest/v1/notification_preferences','POST',preferences,{Prefer:'resolution=merge-duplicates'}).status));
  assert.equal(ok(api('seller','/rest/v1/notification_preferences?user_id=eq.'+users.seller))[0].messages,false);
  assert.equal(ok(api('buyer','/rest/v1/notification_preferences?user_id=eq.'+users.seller)).length,0);
  assert(api('buyer','/rest/v1/notification_preferences','POST',preferences,{Prefer:'resolution=merge-duplicates'}).status>=400);
  const message=ok(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:run},{Prefer:'return=representation'}),201)[0];
  assert.equal(ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+message.id)).length,0);
 } finally{assert([200,201].includes(api('seller','/rest/v1/notification_preferences','POST',original||{...preferences,messages:true},{Prefer:'resolution=merge-duplicates'}).status))}
});
test('blocking prevents messages and price offers until unblocked',()=>{
 ok(api('seller','/rest/v1/user_blocks','POST',{blocker_id:users.seller,blocked_id:users.buyer}),201);
 try{
  assert.equal(ok(api('buyer','/rest/v1/user_blocks?blocker_id=eq.'+users.seller)).length,0);
  const l=createListing();
  assert(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:run}).status>=400);
  assert(api('buyer','/rest/v1/rpc/submit_price_offer','POST',{p_listing_id:l.id,p_amount:20}).status>=400);
 }finally{ok(api('seller','/rest/v1/user_blocks?blocker_id=eq.'+users.seller+'&blocked_id=eq.'+users.buyer,'DELETE'),204)}
 ok(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:run}),201);
});
test('blocked collectors cannot initiate trades, and unblocking restores trading',()=>{
 const target=createListing(),offered=createListing('buyer');
 const blockFilter='?blocker_id=eq.'+users.seller+'&blocked_id=eq.'+users.buyer;
 const payload={listing_id:target.id,offered_listing_id:offered.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run};
 ok(api('seller','/rest/v1/user_blocks','POST',{blocker_id:users.seller,blocked_id:users.buyer}),201);
 try{
  const rejected=api('buyer','/rest/v1/trade_offers','POST',payload);
  assert(rejected.status>=400,'A blocked buyer must not propose a trade');
  assert.equal(ok(api('seller','/rest/v1/trade_offers?listing_id=eq.'+target.id)).length,0,'Rejected trade must not persist');
 }finally{ok(api('seller','/rest/v1/user_blocks'+blockFilter,'DELETE'),204)}
 const accepted=ok(api('buyer','/rest/v1/trade_offers','POST',payload,{Prefer:'return=representation'}),201)[0];
 assert(accepted.id,'Unblocked collectors should be able to trade again');
});

test('blocking after trade proposal prevents acceptance without reserving items',()=>{
 const target=createListing(),offered=createListing('buyer');
 const trade=ok(api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:offered.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run},{Prefer:'return=representation'}),201)[0];
 const blockFilter='?blocker_id=eq.'+users.seller+'&blocked_id=eq.'+users.buyer;
 ok(api('seller','/rest/v1/user_blocks','POST',{blocker_id:users.seller,blocked_id:users.buyer}),201);
 try{
  const attempt=api('seller','/rest/v1/rpc/respond_trade_offer','POST',{p_offer:trade.id,p_action:'accepted'});
  assert(attempt.status>=400,'A pending trade must not be accepted after a collector blocks the other');
  assert.equal(ok(api('seller','/rest/v1/trade_offers?id=eq.'+trade.id))[0].status,'pending','Rejected acceptance must leave the trade pending');
  for(const [role,id] of [['seller',target.id],['buyer',offered.id]]){
   assert.equal(ok(api(role,'/rest/v1/listings?id=eq.'+id))[0].status,'active','Blocked trade must not reserve either item');
  }
 }finally{ok(api('seller','/rest/v1/user_blocks'+blockFilter,'DELETE'),204)}
 ok(api('seller','/rest/v1/rpc/respond_trade_offer','POST',{p_offer:trade.id,p_action:'accepted'}),204);
 assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+target.id))[0].status,'reserved');
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+offered.id))[0].status,'reserved');
});


test('blocking after a trade proposal prevents new counteroffers until unblocked',()=>{
 const target=createListing(),offered=createListing('buyer');
 const trade=ok(api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:offered.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run},{Prefer:'return=representation'}),201)[0];
 const blockFilter='?blocker_id=eq.'+users.seller+'&blocked_id=eq.'+users.buyer;
 ok(api('seller','/rest/v1/user_blocks','POST',{blocker_id:users.seller,blocked_id:users.buyer}),201);
 try{
  const rejected=api('seller','/rest/v1/rpc/create_trade_counter','POST',{p_offer:trade.id,p_cash:5,p_direction:'sender_pays',p_note:run});
  assert(rejected.status>=400,'A block must stop new trade counteroffers');
  assert.equal(ok(api('seller','/rest/v1/trade_counteroffers?trade_offer_id=eq.'+trade.id)).length,0,'Rejected counteroffer must not persist');
  assert.equal(ok(api('seller','/rest/v1/trade_offers?id=eq.'+trade.id))[0].status,'pending');
 }finally{ok(api('seller','/rest/v1/user_blocks'+blockFilter,'DELETE'),204)}
 const counter=ok(api('seller','/rest/v1/rpc/create_trade_counter','POST',{p_offer:trade.id,p_cash:5,p_direction:'sender_pays',p_note:run}));
 assert(counter,'Unblocking should restore the ability to counter a pending trade');
});

test('blocking after a trade counteroffer prevents acceptance and item reservations',()=>{
 const target=createListing(),offered=createListing('buyer');
 const trade=ok(api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:offered.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run},{Prefer:'return=representation'}),201)[0];
 const counter=ok(api('seller','/rest/v1/rpc/create_trade_counter','POST',{p_offer:trade.id,p_cash:5,p_direction:'sender_pays',p_note:run}));
 const blockFilter='?blocker_id=eq.'+users.buyer+'&blocked_id=eq.'+users.seller;
 ok(api('buyer','/rest/v1/user_blocks','POST',{blocker_id:users.buyer,blocked_id:users.seller}),201);
 try{
  const rejected=api('buyer','/rest/v1/rpc/respond_trade_counter','POST',{p_counter:counter,p_accept:true});
  assert(rejected.status>=400,'A blocked trade counteroffer must not be accepted');
  assert.equal(ok(api('buyer','/rest/v1/trade_counteroffers?id=eq.'+counter))[0].status,'pending','Failed acceptance must roll back counter status');
  assert.equal(ok(api('buyer','/rest/v1/trade_offers?id=eq.'+trade.id))[0].status,'pending','Failed acceptance must leave original trade pending');
  for(const [role,id] of [['seller',target.id],['buyer',offered.id]]){
   assert.equal(ok(api(role,'/rest/v1/listings?id=eq.'+id))[0].status,'active','Failed acceptance must not reserve either item');
  }
 }finally{ok(api('buyer','/rest/v1/user_blocks'+blockFilter,'DELETE'),204)}
 ok(api('buyer','/rest/v1/rpc/respond_trade_counter','POST',{p_counter:counter,p_accept:true}),204);
 assert.equal(ok(api('buyer','/rest/v1/trade_offers?id=eq.'+trade.id))[0].status,'accepted');
 assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+target.id))[0].status,'reserved');
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+offered.id))[0].status,'reserved');
});

test('reports are private to reporter and cannot impersonate another reporter',()=>{
 const report=ok(api('buyer','/rest/v1/user_reports','POST',{reporter_id:users.buyer,reported_id:users.seller,reason:'other',details:run},{Prefer:'return=representation'}),201)[0];
 assert.equal(ok(api('seller','/rest/v1/user_reports?id=eq.'+report.id)).length,0);
 assert.equal(ok(api(null,'/rest/v1/user_reports?id=eq.'+report.id)).length,0);
 assert(api('buyer','/rest/v1/user_reports','POST',{reporter_id:users.seller,reported_id:users.buyer,reason:'other',details:run}).status>=400);
});
test('empty messages, invalid photos and broad cleanup attempts fail',()=>{
 assert(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:'   '}).status>=400);
 assert(api(null,'/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:run}).status>=400);
 assert(api('seller','/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:'TEST ONLY%'}).status>=400);
});
test('shared demo order creates, joins, advances and deletes without a real purchase',()=>{
 const order=ok(api('seller','/rest/v1/demo_orders','POST',{creator_id:users.seller,creator_role:'seller',item_name:run,item_price:25,shipping_price:5},{Prefer:'return=representation'}),201)[0];
 try{
  assert.equal(ok(api('buyer','/rest/v1/demo_orders?id=eq.'+order.id)).length,0);
  assert(api('seller','/rest/v1/rpc/advance_deckplay_demo_order','POST',{p_id:order.id}).status>=400);
  ok(api('buyer','/rest/v1/rpc/join_deckplay_demo_order','POST',{p_code:order.invite_code}),204);
  assert.equal(ok(api('buyer','/rest/v1/demo_orders?id=eq.'+order.id)).length,1);
  assert(api('buyer','/rest/v1/rpc/delete_deckplay_demo_order','POST',{p_id:order.id}).status>=400);
  for(let stage=1;stage<=4;stage++){
   ok(api(stage%2?'buyer':'seller','/rest/v1/rpc/advance_deckplay_demo_order','POST',{p_id:order.id}),204);
   assert.equal(ok(api('buyer','/rest/v1/demo_orders?id=eq.'+order.id))[0].stage,stage);
  }
  assert(api('buyer','/rest/v1/rpc/advance_deckplay_demo_order','POST',{p_id:order.id}).status>=400);
  assert.equal(ok(api('buyer','/rest/v1/orders?item_title=eq.'+encodeURIComponent(run))).length,0);
 }finally{ok(api('seller','/rest/v1/rpc/delete_deckplay_demo_order','POST',{p_id:order.id}),204)}
});

test('another collector cannot mark private notifications as read',()=>{
 const message=ok(api('buyer','/rest/v1/collector_messages','POST',{sender_id:users.buyer,recipient_id:users.seller,body:run},{Prefer:'return=representation'}),201)[0];
 const notifications=ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+message.id));
 assert.equal(notifications.length,1,'Message should create exactly one recipient notification');
 const id=notifications[0].id;
 assert.equal(notifications[0].read_at,null,'New notification must be unread');
 const attempt=api('buyer','/rest/v1/collector_notifications?id=eq.'+id,'PATCH',{read_at:new Date().toISOString()},{Prefer:'return=representation'});
 if(attempt.status<400)assert.deepEqual(attempt.data,[],'Foreign notification update must affect no rows');
 const unchanged=ok(api('seller','/rest/v1/collector_notifications?id=eq.'+id));
 assert.equal(unchanged.length,1);
 assert.equal(unchanged[0].read_at,null,'Recipient notification must remain unread');
 ok(api('seller','/rest/v1/collector_notifications?id=eq.'+id,'PATCH',{read_at:new Date().toISOString()}),204);
 assert(ok(api('seller','/rest/v1/collector_notifications?id=eq.'+id))[0].read_at,'Recipient should be able to mark their notification read');
});


test('price-offer notifications follow seller counter and buyer acceptance without duplicate inbox entries',()=>{
 const listing=createListing(),id=offer(listing.id,19);
 const notifications=role=>ok(api(role,'/rest/v1/collector_notifications?source_id=eq.'+id));
 const sellerInitial=notifications('seller');
 assert.equal(sellerInitial.length,1,'Submitting an offer must create one seller notification');
 assert.equal(sellerInitial[0].kind,'price_offer');
 assert.equal(sellerInitial[0].user_id,users.seller);
 assert.equal(sellerInitial[0].actor_id,users.buyer);
 assert.equal(sellerInitial[0].read_at,null);
 assert.equal(notifications('buyer').length,0,'Buyer must not see seller notification');
 ok(respond(id,'counter',22,'seller'),204);
 const buyerCounter=notifications('buyer');
 assert.equal(buyerCounter.length,1,'Counteroffer must create one buyer notification');
 assert.equal(buyerCounter[0].kind,'price_counter');
 assert.equal(buyerCounter[0].actor_id,users.seller);
 assert.equal(notifications('seller').length,1,'Counter must not duplicate the original seller alert');
 ok(respond(id,'accept',null,'buyer'),204);
 const sellerFinal=notifications('seller');
 assert.equal(sellerFinal.length,2,'Acceptance must add one seller update to the original offer alert');
 assert.deepEqual(sellerFinal.map(n=>n.kind).sort(),['price_offer','price_update']);
 assert.equal(notifications('buyer').length,1,'Buyer must not receive their own acceptance alert');
 ok(api('seller','/rest/v1/collector_notifications?id=eq.'+sellerInitial[0].id,'PATCH',{read_at:new Date().toISOString()}),204);
 const readBack=notifications('seller');
 assert(readBack.find(n=>n.id===sellerInitial[0].id).read_at,'Seller can mark the original alert read');
 assert.equal(readBack.find(n=>n.kind==='price_update').read_at,null,'Reading one alert must not mark another read');
 assert.equal(ok(api('seller','/rest/v1/price_offers?id=eq.'+id))[0].status,'accepted');
});

test('declined trade updates the sender inbox once while both listings remain available',()=>{
 const target=createListing(),offered=createListing('buyer');
 const trade=ok(api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:offered.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run},{Prefer:'return=representation'}),201)[0];
 const notifications=role=>ok(api(role,'/rest/v1/collector_notifications?source_id=eq.'+trade.id));
 const sellerAlert=notifications('seller');
 assert.equal(sellerAlert.length,1,'Proposal must notify its recipient exactly once');
 assert.equal(sellerAlert[0].kind,'trade_offer');
 assert.equal(sellerAlert[0].actor_id,users.buyer);
 assert.equal(notifications('buyer').length,0,'Sender must not see recipient-only proposal alert');
 ok(api('seller','/rest/v1/rpc/respond_trade_offer','POST',{p_offer:trade.id,p_action:'declined'}),204);
 const buyerUpdate=notifications('buyer');
 assert.equal(buyerUpdate.length,1,'Decline must create one trade update for the sender');
 assert.equal(buyerUpdate[0].kind,'trade_update');
 assert.equal(buyerUpdate[0].actor_id,users.seller);
 assert.equal(buyerUpdate[0].read_at,null);
 assert.equal(notifications('seller').length,1,'Declining must not duplicate recipient proposal alert');
 assert.equal(ok(api('buyer','/rest/v1/trade_offers?id=eq.'+trade.id))[0].status,'declined');
 for(const [role,id] of [['seller',target.id],['buyer',offered.id]]){
  assert.equal(ok(api(role,'/rest/v1/listings?id=eq.'+id))[0].status,'active','Declined trade must leave both items available');
 }
 ok(api('buyer','/rest/v1/collector_notifications?id=eq.'+buyerUpdate[0].id,'PATCH',{read_at:new Date().toISOString()}),204);
 assert(notifications('buyer')[0].read_at,'Sender can mark their own update read');
 assert.equal(notifications('seller')[0].read_at,null,'Sender read action must not affect recipient inbox');
});

// Both tests rely on the guarded, marker-scoped after() cleanup. Do not delete
// listings first: their IDs are needed to remove generated activity alerts.
test('saved favorite receives one price-drop activity alert, not an alert on price increases',()=>{
 const listing=createListing();activityFixtureIds.push(listing.id);
 ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id}),201);
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:20}),204);
 const alerts=ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id));
 assert.equal(alerts.length,1,'Saved listing price drop should notify the buyer exactly once');
 assert.equal(alerts[0].kind,'favorite_price_drop');
 assert.equal(alerts[0].actor_id,users.seller);
 assert.equal(alerts[0].read_at,null);
 assert.equal(ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'Seller must not receive their own alert');
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:23}),204);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,1,'Price increases must not create price-drop alerts');
});

test('saved favorite sold alert is private and emitted only on transition to sold',()=>{
 const listing=createListing();activityFixtureIds.push(listing.id);
 ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id}),201);
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{status:'sold'}),204);
 const alerts=ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id));
 assert.equal(alerts.length,1,'Sale must notify the collector who saved the item once');
 assert.equal(alerts[0].kind,'favorite_sold');
 assert.equal(alerts[0].actor_id,users.seller);
 assert.equal(ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0);
 assert.equal(ok(api(null,'/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'Activity alerts are private');
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{description:run+' sold'}),204);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,1,'Editing a sold listing must not duplicate the alert');
});

test('favorite activity alert cannot be marked read by another collector',()=>{
 const listing=createListing();activityFixtureIds.push(listing.id);
 ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id}),201);
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:19}),204);
 const alerts=ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id));
 assert.equal(alerts.length,1);
 const alert=alerts[0];
 assert.equal(alert.kind,'favorite_price_drop');
 const attempt=api('seller','/rest/v1/collector_notifications?id=eq.'+alert.id,'PATCH',{read_at:new Date().toISOString()},{Prefer:'return=representation'});
 if(attempt.status<400)assert.deepEqual(attempt.data,[],'Seller must not update buyer activity alert');
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?id=eq.'+alert.id))[0].read_at,null,'Foreign update must not mark buyer activity read');
 ok(api('buyer','/rest/v1/collector_notifications?id=eq.'+alert.id,'PATCH',{read_at:new Date().toISOString()}),204);
 assert(ok(api('buyer','/rest/v1/collector_notifications?id=eq.'+alert.id))[0].read_at,'Buyer can mark their own activity read');
});

test('favorite activity alerts are invisible to unrelated collectors and anonymous visitors',()=>{
 const listing=createListing();activityFixtureIds.push(listing.id);
 ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id}),201);
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:18}),204);
 const own=ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id));
 assert.equal(own.length,1);
 assert.equal(own[0].kind,'favorite_price_drop');
 const id=own[0].id;
 assert.equal(ok(api('seller','/rest/v1/collector_notifications?id=eq.'+id)).length,0,'Seller cannot read buyer activity alert');
 assert.equal(ok(api(null,'/rest/v1/collector_notifications?id=eq.'+id)).length,0,'Anonymous visitors cannot read activity alerts');
 const spoof=api('seller','/rest/v1/collector_notifications','POST',{user_id:users.buyer,actor_id:users.seller,kind:'favorite_price_drop',source_id:listing.id});
 assert(spoof.status>=400,'Seller cannot forge a buyer favorite activity alert');
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,1,'Rejected forged alert must not create a duplicate');
});

test('unsaved listing price drops do not create unrelated activity alerts',()=>{
 const listing=createListing();activityFixtureIds.push(listing.id);
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:17}),204);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'A buyer who did not save the listing must not receive a price-drop alert');
 assert.equal(ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'Seller must not receive self-alerts');
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{status:'sold'}),204);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'A buyer who did not save the listing must not receive a sold alert');
});

test('removing a saved favorite stops future price-drop and sold alerts',()=>{
 const listing=createListing();activityFixtureIds.push(listing.id);
 const filter='?user_id=eq.'+users.buyer+'&listing_id=eq.'+listing.id;
 ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id}),201);
 assert.equal(ok(api('buyer','/rest/v1/saved_listings'+filter)).length,1);
 ok(api('buyer','/rest/v1/saved_listings'+filter,'DELETE'),204);
 assert.equal(ok(api('buyer','/rest/v1/saved_listings'+filter)).length,0,'Removed favorite must no longer be saved');
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:19}),204);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'Unfavorited item must not generate a price-drop alert');
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{status:'sold'}),204);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'Unfavorited item must not generate a sold alert');
});

test('saving a listing after an earlier price drop does not send retroactive alerts',()=>{
 const listing=createListing();activityFixtureIds.push(listing.id);
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:21}),204);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0);
 ok(api('buyer','/rest/v1/saved_listings','POST',{user_id:users.buyer,listing_id:listing.id}),201);
 assert.equal(ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id)).length,0,'Saving an item must not backfill an old price drop');
 ok(api('seller','/rest/v1/listings?id=eq.'+listing.id,'PATCH',{price:18}),204);
 const alerts=ok(api('buyer','/rest/v1/collector_notifications?source_id=eq.'+listing.id));
 assert.equal(alerts.length,1,'A new price drop after saving must alert the buyer once');
 assert.equal(alerts[0].kind,'favorite_price_drop');
});

test('sold listings reject new price offers and trades without creating pending negotiations',()=>{
 const soldTarget=createListing(),buyerItem=createListing('buyer');
 ok(api('seller','/rest/v1/listings?id=eq.'+soldTarget.id,'PATCH',{status:'sold'}),204);
 const priceAttempt=api('buyer','/rest/v1/rpc/submit_price_offer','POST',{p_listing_id:soldTarget.id,p_amount:20});
 assert(priceAttempt.status>=400,'Sold listing must reject a new price offer');
 const tradeAttempt=api('buyer','/rest/v1/trade_offers','POST',{listing_id:soldTarget.id,offered_listing_id:buyerItem.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run});
 assert(tradeAttempt.status>=400,'Sold listing must reject a new trade proposal');
 assert.equal(ok(api('seller','/rest/v1/price_offers?listing_id=eq.'+soldTarget.id)).length,0,'Rejected offer must not persist');
 assert.equal(ok(api('seller','/rest/v1/trade_offers?listing_id=eq.'+soldTarget.id)).length,0,'Rejected trade must not persist');
 const activeTarget=createListing(),soldBuyerItem=createListing('buyer');
 ok(api('buyer','/rest/v1/listings?id=eq.'+soldBuyerItem.id,'PATCH',{status:'sold'}),204);
 const unavailableItem=api('buyer','/rest/v1/trade_offers','POST',{listing_id:activeTarget.id,offered_listing_id:soldBuyerItem.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run});
 assert(unavailableItem.status>=400,'A sold offered item must not be accepted as trade collateral');
 assert.equal(ok(api('seller','/rest/v1/trade_offers?listing_id=eq.'+activeTarget.id)).length,0,'Rejected trade with sold item must not persist');
 // The marker-scoped after() fixture cleanup removes all four synthetic listings.
});

test('reserved listings reject new trades as either the requested item or offered collateral',()=>{
 const reservedTarget=createListing(),activeCollateral=createListing('buyer');
 const buyerOffer=offer(reservedTarget.id,20,'buyer');
 ok(respond(buyerOffer,'accept',null,'seller'),204);
 assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+reservedTarget.id))[0].status,'reserved');
 const targetAttempt=api('buyer','/rest/v1/trade_offers','POST',{
  listing_id:reservedTarget.id,offered_listing_id:activeCollateral.id,
  sender_id:users.buyer,recipient_id:users.seller,offer_note:run
 });
 assert(targetAttempt.status>=400,'A reserved target must reject new trade proposals');
 assert.equal(ok(api('seller','/rest/v1/trade_offers?listing_id=eq.'+reservedTarget.id)).length,0,'Rejected target trade must not persist');
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+activeCollateral.id))[0].status,'active','Rejected proposal must not lock collateral');

 const activeTarget=createListing(),reservedCollateral=createListing('buyer');
 const sellerOffer=offer(reservedCollateral.id,20,'seller');
 ok(respond(sellerOffer,'accept',null,'buyer'),204);
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+reservedCollateral.id))[0].status,'reserved');
 const collateralAttempt=api('buyer','/rest/v1/trade_offers','POST',{
  listing_id:activeTarget.id,offered_listing_id:reservedCollateral.id,
  sender_id:users.buyer,recipient_id:users.seller,offer_note:run
 });
 assert(collateralAttempt.status>=400,'A reserved offered item must not be used as trade collateral');
 assert.equal(ok(api('seller','/rest/v1/trade_offers?listing_id=eq.'+activeTarget.id)).length,0,'Rejected collateral trade must not persist');
 assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+activeTarget.id))[0].status,'active','Rejected trade must leave target available');
 // The marker-scoped after() fixture cleanup removes all four synthetic listings and negotiations.
});


test('fixture cleanup removes its messages and alerts while preserving another run',()=>{
 const markers=[run,'TEST ONLY BOT '+randomUUID()];
 const messages=[];
 try{
  for(const marker of markers){
   messages.push(ok(api('buyer','/rest/v1/collector_messages','POST',{
    sender_id:users.buyer,recipient_id:users.seller,body:marker
   },{Prefer:'return=representation'}),201)[0]);
  }
  // Clean only the independent fixture, never the suite marker still in use.
  const [retained,removed]=messages;
  assert.equal(ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+removed.id)).length,1,'Fixture must create an alert before cleanup');
  ok(api('seller','/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:markers[1]}),204);
  for(const role of ['seller','buyer']){
   assert.deepEqual(ok(api(role,'/rest/v1/collector_messages?id=eq.'+removed.id)),[],'Cleaned fixture message must disappear for both participants');
   assert.deepEqual(ok(api(role,'/rest/v1/collector_notifications?source_id=eq.'+removed.id)),[],'Cleaned message alert must disappear');
   assert.equal(ok(api(role,'/rest/v1/collector_messages?id=eq.'+retained.id)).length,1,'Another run marker must survive cleanup');
  }
  assert.equal(ok(api('seller','/rest/v1/collector_notifications?source_id=eq.'+retained.id)).length,1,'Another run alert must survive cleanup');
  messageFixtureIds.push(retained.id);
 }finally{
  ok(api('seller','/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:markers[1]}),204);
 }
});

test('simultaneous price and trade acceptances allow one deal without locking losing collateral',async()=>{
 const target=createListing(),collateral=createListing('buyer'),priceId=offer(target.id,20);
 const trade=ok(api('buyer','/rest/v1/trade_offers','POST',{
  listing_id:target.id,offered_listing_id:collateral.id,sender_id:users.buyer,recipient_id:users.seller,offer_note:run
 },{Prefer:'return=representation'}),201)[0];
 const {httpAsync}=require('../../scripts/staging-http.cjs');
 const headers={apikey:key,'Content-Type':'application/json',Authorization:'Bearer '+sessions.seller.access_token};
 const results=await Promise.all([
  httpAsync(base+'/rest/v1/rpc/respond_price_offer',{method:'POST',headers,body:{p_offer_id:priceId,p_action:'accept',p_amount:null}}),
  httpAsync(base+'/rest/v1/rpc/respond_trade_offer',{method:'POST',headers,body:{p_offer:trade.id,p_action:'accepted'}})
 ]);
 assert.equal(results.filter(r=>r.status===204).length,1,'Exactly one conflicting acceptance must succeed');
 assert.equal(results.filter(r=>r.status>=400).length,1,'The other acceptance must fail');
 const price=ok(api('seller','/rest/v1/price_offers?id=eq.'+priceId))[0];
 const tradeRow=ok(api('seller','/rest/v1/trade_offers?id=eq.'+trade.id))[0];
 assert.equal([price,tradeRow].filter(row=>row.status==='accepted').length,1,'Only one deal may persist as accepted');
 assert.equal(ok(api('seller','/rest/v1/listings?id=eq.'+target.id))[0].status,'reserved','Winning deal must reserve the target');
 assert.equal(ok(api('buyer','/rest/v1/listings?id=eq.'+collateral.id))[0].status,tradeRow.status==='accepted'?'reserved':'active','Collateral may be reserved only for a winning trade');
 const loser=price.status==='accepted'?tradeRow:price;
 assert(!['pending','countered','accepted'].includes(loser.status),'Losing negotiation must be closed');
});


test('followed seller and wanted-match alerts are private and respect wanted opt-out',()=>{
 const marker='TEST ONLY BOT '+randomUUID(),follower='seller',publisher='buyer';
 const previous=ok(api(follower,'/rest/v1/notification_preferences?user_id=eq.'+users[follower]))[0];
 assert(previous,'Staging seller bot must have notification preferences to restore');
 const followPath='/rest/v1/seller_follows?follower_id=eq.'+users[follower]+'&seller_id=eq.'+users[publisher];
 const alreadyFollowing=ok(api(follower,followPath)).length>0;
 let createdFollow=false;
 try{
  if(!alreadyFollowing){ok(api(follower,'/rest/v1/seller_follows','POST',{follower_id:users[follower],seller_id:users[publisher]}),201);createdFollow=true}
  assert.deepEqual(ok(api(publisher,followPath)),[],'A seller cannot inspect another collector follow list');
  assert(api(publisher,'/rest/v1/seller_follows','POST',{follower_id:users[follower],seller_id:users[publisher]}).status>=400,'Another user cannot forge a follow');
  ok(api(follower,'/rest/v1/notification_preferences?user_id=eq.'+users[follower],'PATCH',{wanted_matches:true}),204);
  ok(api(follower,'/rest/v1/wanted_posts','POST',{user_id:users[follower],title:marker,game:'one_piece',budget:30,details:'TEST ONLY'}, {Prefer:'return=representation'}),201);
  const first=createListing(publisher,{title:marker,price:20,tcg_game:'one_piece'});
  const firstAlerts=ok(api(follower,'/rest/v1/collector_notifications?source_id=eq.'+first.id));
  assert.deepEqual(firstAlerts.map(x=>x.kind).sort(),['followed_seller_listing','wanted_match'],'Following and matching a wanted post should create distinct activity alerts');
  assert.deepEqual(ok(api(null,'/rest/v1/collector_notifications?source_id=eq.'+first.id)),[],'Anonymous visitors cannot read alerts');
  assert.deepEqual(ok(api(publisher,'/rest/v1/collector_notifications?source_id=eq.'+first.id)),[],'Listing seller cannot read follower alerts');
  ok(api(follower,'/rest/v1/notification_preferences?user_id=eq.'+users[follower],'PATCH',{wanted_matches:false}),204);
  const second=createListing(publisher,{title:marker,price:20,tcg_game:'one_piece'});
  const secondAlerts=ok(api(follower,'/rest/v1/collector_notifications?source_id=eq.'+second.id));
  assert.deepEqual(secondAlerts.map(x=>x.kind),['followed_seller_listing'],'Wanted opt-out must suppress matching alerts without silently unfollowing the seller');
 }finally{
  ok(api(follower,'/rest/v1/notification_preferences?user_id=eq.'+users[follower],'PATCH',{wanted_matches:previous.wanted_matches}),204);
  if(createdFollow)ok(api(follower,followPath,'DELETE'),204);
  ok(api(follower,'/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:marker}),204);
 }
});

test('unfollowing a seller stops new-listing alerts and re-following restores them',()=>{
 const marker='TEST ONLY BOT '+randomUUID(),follower='seller',publisher='buyer';
 const followPath='/rest/v1/seller_follows?follower_id=eq.'+users[follower]+'&seller_id=eq.'+users[publisher];
 const original=ok(api(follower,followPath)).length>0;
 let following=original;
 const setFollowing=desired=>{
  if(desired===following)return;
  if(desired)ok(api(follower,'/rest/v1/seller_follows','POST',{follower_id:users[follower],seller_id:users[publisher]}),201);
  else ok(api(follower,followPath,'DELETE'),204);
  following=desired;
 };
 const alerts=id=>ok(api(follower,'/rest/v1/collector_notifications?source_id=eq.'+id+'&kind=eq.followed_seller_listing'));
 try{
  setFollowing(true);
  const first=createListing(publisher,{title:marker+' followed'});
  assert.equal(alerts(first.id).length,1,'Following should create one new-listing alert');
  setFollowing(false);
  const second=createListing(publisher,{title:marker+' unfollowed'});
  assert.equal(alerts(second.id).length,0,'Unfollowing must stop new-listing alerts');
  setFollowing(true);
  const third=createListing(publisher,{title:marker+' followed again'});
  assert.equal(alerts(third.id).length,1,'Re-following should resume exactly one alert per listing');
 }finally{
  try{setFollowing(original)}finally{ok(api(follower,'/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:marker}),204)}
 }
});
