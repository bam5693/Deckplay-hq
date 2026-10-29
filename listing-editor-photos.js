/* Listing images only. Private conversation storage is never used here. */
window.createListingEditorPhotos=(container,status)=>{
 container.innerHTML='<h3>Listing photos</h3><p class="file-help">Keep 1–5 photos. The first photo is the cover. Changes appear after Save changes.</p><div class="listing-photo-actions"><button class="ghost" type="button" data-edit-add>Add photos</button><button class="ghost" type="button" data-edit-camera>Take photo</button></div><input type="file" id="editListingPhotoInput" accept="image/jpeg,image/png,image/webp" multiple hidden><input type="file" id="editListingCameraInput" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><input type="file" id="editListingReplaceInput" accept="image/jpeg,image/png,image/webp" hidden><p data-edit-photo-count role="status"></p><div data-edit-photo-previews class="listing-photo-preview"></div>';
 let entries=[],original=[],locked=false,replaceIndex=null;
 const release=entry=>{if(entry.preview)URL.revokeObjectURL(entry.preview)};
 const dirty=()=>JSON.stringify(entries.map(e=>e.url||e.id))!==JSON.stringify(original);
 function render(){
  const previews=container.querySelector('[data-edit-photo-previews]');previews.replaceChildren();
  entries.forEach((entry,i)=>{
   const tile=document.createElement('div');tile.style.cssText='display:inline-flex;flex-direction:column;gap:5px;margin:5px;max-width:115px';
   const image=document.createElement('img');image.src=entry.preview||safeImageUrl(entry.url);image.alt='Listing photo '+(i+1);image.style.cssText='width:110px;height:105px;object-fit:cover;border-radius:10px';tile.append(image);
   for(const [action,label] of [['cover',i===0?'★ Cover':'Make cover'],['replace','Replace'],['remove','Remove']]){const button=document.createElement('button');button.type='button';button.className='ghost';button.dataset.editPhoto=action;button.dataset.photoIndex=i;button.textContent=label;button.disabled=locked||(action==='cover'&&i===0);tile.append(button)}previews.append(tile);
  });container.querySelector('[data-edit-photo-count]').textContent=entries.length+' of 5 photos';
  container.querySelectorAll('input,button').forEach(el=>{if(!el.hasAttribute('data-edit-photo'))el.disabled=locked});
 }
 function reset(urls=[]){entries.forEach(release);original=[...urls];entries=urls.map(url=>({url}));locked=false;replaceIndex=null;container.querySelectorAll('input').forEach(i=>i.value='');render()}
 function add(files,replace=false){
  if(locked)return;const incoming=[...files];if(!incoming.length)return;
  if(incoming.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>25*1024*1024)){status.textContent='Use JPG, PNG or WebP photos up to 25 MB each.';return}
  if((replace?entries.length:entries.length+incoming.length)>5){status.textContent='Keep no more than five photos. Remove one before adding more.';return}
  const fresh=incoming.map(file=>({id:crypto.randomUUID(),file,preview:URL.createObjectURL(file)}));
  if(replace){if(replaceIndex==null||!entries[replaceIndex]){fresh.forEach(release);return}release(entries[replaceIndex]);entries.splice(replaceIndex,1,fresh[0]);fresh.slice(1).forEach(release)}else entries.push(...fresh);
  status.textContent='Photo changes are ready to save.';render();
 }
 container.addEventListener('click',e=>{
  if(locked)return;
  if(e.target.closest('[data-edit-add]'))container.querySelector('#editListingPhotoInput').click();
  if(e.target.closest('[data-edit-camera]'))container.querySelector('#editListingCameraInput').click();
  const button=e.target.closest('[data-edit-photo]');if(!button)return;const i=Number(button.dataset.photoIndex);if(!entries[i])return;
  if(button.dataset.editPhoto==='remove'){release(entries[i]);entries.splice(i,1)}
  if(button.dataset.editPhoto==='cover')entries.unshift(...entries.splice(i,1));
  if(button.dataset.editPhoto==='replace'){replaceIndex=i;container.querySelector('#editListingReplaceInput').click()}
  render();
 });
 container.addEventListener('change',e=>{if(e.target.type==='file'){add(e.target.files,e.target.id==='editListingReplaceInput');e.target.value=''}});
 async function upload(owner,valid){
  if(!dirty())return null;if(entries.length<1||entries.length>5)throw Error('Keep at least one photo and no more than five.');
  const selection=[...entries];
  const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).join(',');
  for(const entry of selection){
   if(!valid())throw Error('Account or listing changed while preparing photos.');if(entry.url)continue;
   if(!entry.prepared)entry.prepared=await prepareListingPhoto(entry.file);if(!valid())throw Error('Account or listing changed while preparing photos.');
   if(!entry.path)entry.path=owner+'/'+entry.id+'.'+({"image/jpeg":'jpg',"image/png":'png',"image/webp":'webp'}[entry.prepared.type]);
   const bucket=supabaseClient.storage.from('listing-images');const {error}=await bucket.upload(entry.path,entry.prepared,{upsert:false,contentType:entry.prepared.type,cacheControl:'3600'});
   if(!valid())throw Error('Account or listing changed during upload.');
   if(error){
    if(![409,'409'].includes(error.statusCode)&&!String(error.message||'').toLowerCase().includes('already exists'))throw error;
    // A lost response may leave our exact unique upload behind. Verify bytes before reuse.
    const existing=await bucket.download(entry.path);if(existing.error||!existing.data||await hash(existing.data)!==await hash(entry.prepared))throw Error('Photo upload could not be confirmed. Choose the photo again.');
   }
   if(!valid())throw Error('Account or listing changed during upload.');entry.url=bucket.getPublicUrl(entry.path).data.publicUrl;
  }
  return selection.map(e=>e.url);
 }
 return {reset,dirty,upload,setBusy(value){locked=value;render()},urls(){return entries.map(e=>e.url).filter(Boolean)}};
};
