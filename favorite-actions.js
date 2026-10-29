/* Optimistic favorites stay scoped to the exact account session that started them. */
window.favoriteActions=(()=>{
 const pending=new Set();const key=id=>JSON.stringify([currentUser?.id,listingAccountVersion,String(id)]);
 async function toggle(id){
  const owner=currentUser?.id,epoch=listingAccountVersion;if(!owner){toast('Sign in to save items');openModal('authModal');return}
  const requestKey=key(id);if(pending.has(requestKey))return;
  const valid=()=>currentUser?.id===owner&&listingAccountVersion===epoch;
  const wasSaved=saved.has(id),item=items.find(x=>String(x.id)===String(id));
  pending.add(requestKey);++savedListingsLoadVersion;wasSaved?saved.delete(id):saved.add(id);render();
  try{
   if(!item?.databaseId)throw Error('This item cannot be saved to your account yet. Try again.');
   {
    const operation=wasSaved?supabaseClient.from('saved_listings').delete().eq('user_id',owner).eq('listing_id',item.databaseId):supabaseClient.from('saved_listings').insert({user_id:owner,listing_id:item.databaseId});
    const {error}=await (operation.abortSignal?operation.abortSignal(AbortSignal.timeout(20000)):operation);
    if(!valid())return;if(error&&!(error.code==='23505'&&!wasSaved))throw error;
   }
   if(!valid())return;toast(wasSaved?'Removed from saved items':'Saved to your account');
  }catch(error){if(valid()){++savedListingsLoadVersion;wasSaved?saved.add(id):saved.delete(id);toast(error.message||'Could not update saved items. Try again.')}}
  finally{pending.delete(requestKey);if(valid())render()}
 }
 return {toggle,pending:id=>pending.has(key(id))};
})();
