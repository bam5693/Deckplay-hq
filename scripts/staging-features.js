// Runs real transactions on the isolated project, always with exact disposable fixture markers.
async function runStagingFeatures(env,suite){
 const marker='TEST ONLY BOT '+crypto.randomUUID(),checks=[],sessions={},photos=[];
 let error=null;
 async function api(role,path,method='GET',body,expected=200,extra={}){
  const response=await fetch(STAGING_API+path,{method,headers:{apikey:STAGING_KEY,'Content-Type':'application/json',...(sessions[role]?{Authorization:'Bearer '+sessions[role].access_token}:{}),...extra},...(body!==undefined?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}
  if(expected==='denied'){if(response.status<400)throw Error('Unauthorized operation unexpectedly succeeded: '+path.split('?')[0]);return data}
  if(response.status!==expected)throw Error(path.split('?')[0]+' returned HTTP '+response.status+' (expected '+expected+')');return data;
 }
 const check=(value,name)=>{if(!value)throw Error(name);checks.push(name)};
 const listing=async role=>(await api(role,'/rest/v1/listings','POST',{seller_id:sessions[role].user.id,title:marker,price:25,category:'trading_cards',condition:'like_new',image_urls:[STAGING_API+'/storage/v1/object/public/listing-images/test.jpg'],accepts_trades:true,accepts_price_offers:true},201,{Prefer:'return=representation'}))[0];
 try{
  for(const role of ['seller','buyer']){sessions[role]=await api(null,'/auth/v1/token?grant_type=password','POST',{email:'deckplay-'+role+'@deckplay.test',password:env['TEST_'+role.toUpperCase()+'_PASSWORD']});checks.push(role+' login')}
  if(suite==='commerce'){
   const item=await listing('seller');checks.push('listing created');
   check((await api(null,'/rest/v1/listings?id=eq.'+item.id))[0]?.title===marker,'listing browse and persistence');
   check((await api('buyer','/rest/v1/listings?id=eq.'+item.id,'PATCH',{title:'tamper'},200,{Prefer:'return=representation'})).length===0,'listing ownership denied');
   const offer=await api('buyer','/rest/v1/rpc/submit_price_offer','POST',{p_listing_id:item.id,p_amount:19});checks.push('price offer submitted');
   await api('buyer','/rest/v1/rpc/respond_price_offer','POST',{p_offer_id:offer,p_action:'accept'},'denied');checks.push('offer cannot accept own turn');
   await api('seller','/rest/v1/rpc/respond_price_offer','POST',{p_offer_id:offer,p_action:'counter',p_amount:22},204);checks.push('seller counteroffer');
   await api('buyer','/rest/v1/rpc/respond_price_offer','POST',{p_offer_id:offer,p_action:'accept'},204);checks.push('buyer acceptance');
   check((await api('seller','/rest/v1/listings?id=eq.'+item.id))[0]?.status==='reserved','accepted listing reserved');
   check((await api(null,'/rest/v1/listings?id=eq.'+item.id)).length===0,'reserved listing hidden from public');
   await api('seller','/rest/v1/listings?id=eq.'+item.id,'PATCH',{status:'active'},'denied');checks.push('reservation cannot be reopened');
   const target=await listing('seller'),owned=await listing('buyer');
   const trade=(await api('buyer','/rest/v1/trade_offers','POST',{listing_id:target.id,offered_listing_id:owned.id,sender_id:sessions.buyer.user.id,recipient_id:sessions.seller.user.id,offer_note:marker},201,{Prefer:'return=representation'}))[0];
   const counter=await api('seller','/rest/v1/rpc/create_trade_counter','POST',{p_offer:trade.id,p_cash:5,p_direction:'sender_pays',p_note:marker});checks.push('trade and counteroffer submitted');
   await api('buyer','/rest/v1/rpc/respond_trade_counter','POST',{p_counter:counter,p_accept:true},204);checks.push('trade counteroffer accepted');
   for(const [role,id] of [['seller',target.id],['buyer',owned.id]])check((await api(role,'/rest/v1/listings?id=eq.'+id))[0]?.status==='reserved',role+' trade item reserved');
  }else if(suite==='community'){
   const item=await listing('seller'),buyer=sessions.buyer.user.id,seller=sessions.seller.user.id;
   await api('buyer','/rest/v1/saved_listings','POST',{user_id:buyer,listing_id:item.id},201);
   check((await api('buyer','/rest/v1/saved_listings?listing_id=eq.'+item.id)).length===1,'favorites persist');
   check((await api('seller','/rest/v1/saved_listings?listing_id=eq.'+item.id)).length===0,'favorites private');
   const wanted=(await api('buyer','/rest/v1/wanted_posts','POST',{user_id:buyer,title:marker,details:marker,game:'one_piece',budget:50},201,{Prefer:'return=representation'}))[0];
   check((await api(null,'/rest/v1/wanted_posts?id=eq.'+wanted.id)).length===1,'wanted post browse');
   const message=(await api('buyer','/rest/v1/collector_messages','POST',{sender_id:buyer,recipient_id:seller,listing_id:item.id,body:marker},201,{Prefer:'return=representation'}))[0];
   check((await api('seller','/rest/v1/collector_messages?id=eq.'+message.id))[0]?.body===marker,'recipient inbox');
   check((await api(null,'/rest/v1/collector_messages?id=eq.'+message.id)).length===0,'anonymous messages denied');
   await api('seller','/rest/v1/collector_messages?id=eq.'+message.id,'PATCH',{read_at:new Date().toISOString()},204);checks.push('message read marker saved');
   check((await api('seller','/rest/v1/collector_notifications?source_id=eq.'+message.id)).length===1,'message notification delivered');
   await api('seller','/rest/v1/collector_messages?id=eq.'+message.id,'PATCH',{body:'tamper'},'denied');checks.push('message content immutable');
   const photo=seller+'/bot-'+crypto.randomUUID()+'.png';photos.push(photo);
   const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
   await api('seller','/storage/v1/object/listing-images/'+photo,'POST',bytes,200,{'Content-Type':'image/png'});checks.push('real photo uploaded');
   await api(null,'/storage/v1/object/public/listing-images/'+photo);checks.push('photo retrieved');
   check((await api(null,'/rest/v1/profiles?id=eq.'+seller))[0]?.username,'public profile username present');
  }else throw Error('Unknown feature suite');
 }catch(e){error=e.message}
 finally{
  if(sessions.seller){
   try{if(photos.length)await api('seller','/storage/v1/object/listing-images','DELETE',{prefixes:photos});await api('seller','/rest/v1/rpc/cleanup_staging_fixture','POST',{p_marker:marker},204);checks.push('exact fixture cleanup')}catch(e){error=(error?error+'; ':'')+'Cleanup failed: '+e.message}
  }
 }
 const report={user_id:sessions.seller?.user.id,suite:'scheduled-staging-'+suite,passed:!error,checks,error};
 if(sessions.seller)try{await api('seller','/rest/v1/staging_test_runs','POST',report,201)}catch(e){report.passed=false;report.error='Report persistence failed: '+e.message}
 console.log(JSON.stringify({event:'staging-features',suite,passed:report.passed,checks:checks.length,error:report.error}));return report;
}
