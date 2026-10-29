/* Owner-only detail edits. Existing reservation state stays server-owned. */
window.listingEditor=(()=>{
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="editListingModal" role="dialog" aria-modal="true" aria-labelledby="editListingHeading"><div class="dialog"><button class="close" type="button" data-close-editor aria-label="Close listing editor">×</button><h2 id="editListingHeading">Edit listing details</h2><p class="muted">Update your title, exact disclosures, asking price and offer preferences. Add, replace, reorder or remove listing photos. Reserved or sold items cannot be edited here.</p><form id="editListingForm"><label for="editListingTitle">Item name</label><input id="editListingTitle" required maxlength="120"><label for="editListingDescription">Description / exact item details</label><textarea id="editListingDescription" maxlength="12000" rows="7"></textarea><p class="file-help">Keep card numbers, decklists, printing, condition and flaws accurate. Existing offers may need a new proposal after details change.</p><label for="editListingPrice">Asking price ($)</label><input id="editListingPrice" type="number" min="0.01" max="100000" step="0.01" required><label class="check-row"><input id="editListingOffers" type="checkbox"> Allow price offers</label><label class="check-row"><input id="editListingTrades" type="checkbox"> Open to trade offers</label><div id="editListingClassification"></div><div id="editListingPhotos"></div><p id="editListingStatus" class="status" role="status" aria-live="polite"></p><div class="dialog-actions"><button class="primary" type="submit" id="saveListingEdits">Save changes</button><button class="ghost" type="button" data-close-editor>Cancel</button></div></form></div></div>`);
 const modal=document.getElementById('editListingModal'),form=document.getElementById('editListingForm'),status=document.getElementById('editListingStatus');
 const classification=createListingEditorClassification(document.getElementById('editListingClassification'),status);
 const photos=createListingEditorPhotos(document.getElementById('editListingPhotos'),status);
 let version=0,record=null,busy=false;
 const lock=value=>{busy=value;for(const el of form.elements)el.disabled=value;document.getElementById('saveListingEdits').textContent=value?'Saving…':'Save changes';photos.setBusy(value);classification.setBusy(value)};
 function reset(){version++;record=null;form.reset();photos.reset();classification.reset();status.textContent='';lock(false);closeModal('editListingModal')}
 async function open(id){
  if(!currentUser)return;const owner=currentUser.id,epoch=listingAccountVersion,request=++version;
  const valid=()=>currentUser?.id===owner&&listingAccountVersion===epoch&&version===request;
  record=null;form.reset();photos.reset();classification.reset();lock(true);status.textContent='Loading current listing…';openModal('editListingModal');
  try{
   const {data,error}=await supabaseClient.from('listings').select('id,seller_id,title,description,price,accepts_trades,accepts_price_offers,updated_at,status,image_urls,category,tcg_game,collectible_subcategory,product_type,condition').eq('id',id).eq('seller_id',owner).eq('status','active').maybeSingle();
   if(!valid())return;if(error)throw error;if(!data||data.seller_id!==owner||data.status!=='active'||!data.updated_at)throw Error('This listing is no longer available to edit. Refresh your listings.');
   record={...data,owner,epoch};photos.reset(data.image_urls||[]);classification.reset(data);document.getElementById('editListingTitle').value=data.title;document.getElementById('editListingDescription').value=classification.strip(data.description);document.getElementById('editListingPrice').value=Number(data.price).toFixed(2);document.getElementById('editListingOffers').checked=data.accepts_price_offers!==false;document.getElementById('editListingTrades').checked=!!data.accepts_trades;status.textContent='';lock(false);document.getElementById('editListingTitle').focus();
  }catch(error){if(valid()){status.textContent=error.message||'Could not load this listing. Close and try again.';document.querySelectorAll('[data-close-editor]').forEach(el=>el.disabled=false)}}
 }
 modal.addEventListener('click',e=>{if(e.target.closest('[data-close-editor]')||e.target===modal){if(!busy||!record)reset()}});
 document.getElementById('grid').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-listing]');if(edit){const item=items.find(x=>x.id===edit.dataset.editListing);if(item?.sellerId===currentUser?.id&&item.databaseId)void open(item.databaseId)}});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!record||!currentUser)return;
  const saved=record,request=version;
  const valid=()=>currentUser?.id===saved.owner&&listingAccountVersion===saved.epoch&&version===request;
  if(!valid())return;
  const price=Number(document.getElementById('editListingPrice').value),title=document.getElementById('editListingTitle').value.trim();
  if(!title||!Number.isFinite(price)||price<0.01||price>100000||Math.abs(price*100-Math.round(price*100))>0.00001){status.textContent='Enter an item name and a price with no more than two decimal places.';return}
  const changes={updated_at:new Date().toISOString(),title,description:document.getElementById('editListingDescription').value.trim()||null,price,accepts_price_offers:document.getElementById('editListingOffers').checked,accepts_trades:document.getElementById('editListingTrades').checked};
  try{const attributes=classification.values(document.getElementById('editListingDescription').value);if(attributes)Object.assign(changes,attributes);else changes.description=classification.preserve(saved.description,changes.description)}catch(error){status.textContent=error.message;return}
  lock(true);status.textContent='Saving listing…';
  try{
   const uploaded=await photos.upload(saved.owner,valid);if(!valid())return;if(uploaded)changes.image_urls=uploaded;
   let update=supabaseClient.from('listings').update(changes).eq('id',saved.id).eq('seller_id',saved.owner).eq('status','active').eq('updated_at',saved.updated_at);
   for(const key of ['title','description','price','accepts_price_offers','accepts_trades','category','tcg_game','collectible_subcategory','product_type','condition'])if(saved[key]!==undefined)update=saved[key]==null?update.is(key,null):update.eq(key,saved[key]);
   if(saved.image_urls)update=update.eq('image_urls','{'+saved.image_urls.map(url=>JSON.stringify(url)).join(',')+'}');
   const {data,error}=await update.select('id').maybeSingle();
   if(!valid())return;if(error)throw error;if(!data)throw Error('This listing changed or was reserved. Your edits are kept here; copy them, then reopen the listing to review the latest details.');
   reset();toast('Listing details updated');await loadListings();void window.sellerOverview?.refresh();
  }catch(error){if(valid())status.textContent=error.message||'Save could not be confirmed. Your edits are kept. Reopen the listing before trying again.'}
  finally{if(valid())lock(false)}
 });
 return {open,reset};
})();
