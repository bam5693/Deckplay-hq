/* Optimistic favorites stay scoped to the exact account session that started them. */
window.favoriteActions=(()=>{
 const pending=new Set(),pendingDesired=new Map();const key=id=>JSON.stringify([currentUser?.id,listingAccountVersion,String(id)]);
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
 async function toggle(id){
  const owner=currentUser?.id,epoch=listingAccountVersion;if(!owner){toast('Sign in to save items');openModal('authModal');return}
  const requestKey=key(id);if(pending.has(requestKey))return;
  const valid=()=>currentUser?.id===owner&&listingAccountVersion===epoch;
  const wasSaved=saved.has(id),item=items.find(x=>String(x.id)===String(id));
  // Stale cards can remain clickable after their seller is blocked.
  if(item?.sellerId&&blockedCollectorIds.has(item.sellerId)){
   toast('This collector is blocked. Remove older saves from your Saved profile or unblock them in Settings.');return;
  }
  // Avoid a misleading optimistic heart when the device reports offline.
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
   toast('You are offline. Reconnect, then try saving this item again.');return;
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
  }catch(error){if(valid()){++savedListingsLoadVersion;wasSaved?saved.add(id):saved.delete(id);toast(error.message||'Could not update saved items. Try again.')}}
  finally{pending.delete(requestKey);pendingDesired.delete(requestKey);if(valid()){++savedListingsLoadVersion;render()}}
 }
 return {toggle,pending:id=>pending.has(key(id)),pendingDesired:()=>[...pendingDesired.values()].filter(change=>change.owner===currentUser?.id&&change.epoch===listingAccountVersion)};
})();
