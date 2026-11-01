/* Optimistic favorites stay scoped to the exact account session that started them. */
window.favoriteActions=(()=>{
 const pending=new Set(),pendingDesired=new Map(),unconfirmed=new Map();const key=id=>JSON.stringify([currentUser?.id,listingAccountVersion,String(id)]);
 async function boundedWrite(operation){
  let timeout;
  try{
   const request=operation.abortSignal&&typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'
    ?operation.abortSignal(AbortSignal.timeout(20000)):operation;
   return await Promise.race([request,new Promise((_,reject)=>{
    timeout=setTimeout(()=>reject(Error('Saved-item update timed out. Check your connection and retry.')),20000);
   })]);
  }finally{if(timeout!==undefined)clearTimeout(timeout)}
 }
 async function boundedRead(request){
  let timer;
  try{return await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Saved status check timed out.')),8000)})]);}
  finally{if(timer!==undefined)clearTimeout(timer)}
 }
 async function toggle(id){
  const owner=currentUser?.id,epoch=listingAccountVersion;if(!owner){toast('Sign in to save items');openModal('authModal');return}
  const requestKey=key(id);if(pending.has(requestKey))return;
  // A timed-out write might still commit. The next tap checks the server; it
  // must not silently perform the opposite write on an uncertain favorite.
  if(unconfirmed.has(requestKey)){
   if(typeof navigator!=='undefined'&&navigator.onLine===false){toast('Reconnect to check whether this item was saved.');return}
   pending.add(requestKey);render();
   try{
    const listingId=unconfirmed.get(requestKey);
    const query=supabaseClient.from('saved_listings').select('listing_id').eq('user_id',owner).eq('listing_id',listingId).maybeSingle();
    const {data,error}=await boundedRead(query);
    if(!valid())return;
    if(error||data===undefined||data!==null&&String(data.listing_id)!==String(listingId))throw error||Error('Saved status could not be verified.');
    unconfirmed.delete(requestKey);
    ++savedListingsLoadVersion;
    if(data)saved.add(id);else saved.delete(id);
    toast(data?'Confirmed: this item is saved. Tap again to remove it.':'Confirmed: this item is not saved. Tap again to save it.');
   }catch(error){if(valid())toast('Saved status still unknown. Reconnect and tap again to check before changing it.');}
   finally{pending.delete(requestKey);if(valid())render()}
   return;
  }
  const valid=()=>currentUser?.id===owner&&listingAccountVersion===epoch;
  const wasSaved=saved.has(id),item=items.find(x=>String(x.id)===String(id));
  // A blocked seller cannot gain new saves, but an existing save must remain removable.
  // Never trap a collector's old favorite behind the block that hid its listing.
  if(item?.sellerId&&blockedCollectorIds.has(item.sellerId)&&!wasSaved){
   toast('This collector is blocked. Unblock them in Settings before saving their listings.');return;
  }
  // Avoid a misleading optimistic heart when the device reports offline.
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
   toast('You are offline. Reconnect, then retry this saved-item change.');return;
  }
  pending.add(requestKey);pendingDesired.set(requestKey,{id:String(id),owner,epoch,save:!wasSaved});++savedListingsLoadVersion;wasSaved?saved.delete(id):saved.add(id);render();
  try{
   if(!item?.databaseId)throw Error('This item cannot be saved to your account yet. Try again.');
   {
    const operation=wasSaved?supabaseClient.from('saved_listings').delete().eq('user_id',owner).eq('listing_id',item.databaseId):supabaseClient.from('saved_listings').insert({user_id:owner,listing_id:item.databaseId});
    const {error}=await boundedWrite(operation);
    if(!valid())return;if(error&&!(error.code==='23505'&&!wasSaved))throw error;
   }
   if(!valid())return;toast(wasSaved?'Removed from saved items':'Saved to your account');
  }catch(error){if(valid()){
    ++savedListingsLoadVersion;
    wasSaved?saved.add(id):saved.delete(id);
    if(/timed out/i.test(String(error?.message||''))&&item?.databaseId){
     unconfirmed.set(requestKey,item.databaseId);
     toast('Saved change may have completed. Tap the heart to check its status before changing it again.');
    }else toast(error.message||'Could not update saved items. Try again.');
   }}
  finally{pending.delete(requestKey);pendingDesired.delete(requestKey);if(valid()){++savedListingsLoadVersion;render()}}
 }
 return {toggle,pending:id=>pending.has(key(id)),uncertain:id=>unconfirmed.has(key(id)),
  reconcile:(owner,epoch,rows)=>{
   if(currentUser?.id!==owner||listingAccountVersion!==epoch)return;
   for(const [requestKey,listingId] of unconfirmed){
    const [entryOwner,entryEpoch]=JSON.parse(requestKey);
    if(entryOwner===owner&&entryEpoch===epoch&&!pending.has(requestKey))unconfirmed.delete(requestKey);
   }
  },
  pendingDesired:()=>[...pendingDesired.values()].filter(change=>change.owner===currentUser?.id&&change.epoch===listingAccountVersion)};
})();
