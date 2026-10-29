/* Private staging conversation photos. No public listing bucket or persistent browser cache. */
window.privateMessagePhotos=(()=>{
 const drafts=new Map(),enabled=()=>SUPABASE_URL==='https://prrrzeelltmyugssqnzk.supabase.co';let generation=0;
 const current=()=>document.querySelector('#messageInbox .chat-composer');
 const get=id=>drafts.get(id);
 async function api(method,id,recipient,message,body){
  const user=currentUser?.id,{data,error}=await supabaseClient.auth.getSession();if(error||!user||data.session?.user.id!==user)throw Error('Sign in again before sharing photos');
  const headers={apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+data.session.access_token,'x-attachment-id':id};
  if(body){headers['content-type']='image/jpeg';headers['x-recipient-id']=recipient;headers['x-message-id']=message}
  const response=await fetch(SUPABASE_URL+'/functions/v1/message-photos',{method,headers,body,signal:AbortSignal.timeout(45000)});
  let result;try{result=await response.json()}catch{throw Error('Photo response unavailable. Retry your message')}
  if(!response.ok)throw Error(result.error||'Photo sharing unavailable. Retry your message');return result;
 }
 async function convert(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('Choose a JPEG, PNG or WebP photo under 15 MB');
  const image=await createImageBitmap(file);try{
   const scale=Math.min(1,1200/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));if(!blob||blob.size>2097152)throw Error('Photo is too large. Choose a smaller image');return blob;
  }finally{image.close()}
 }
 function update(form=current()){
  if(!form)return;const d=get(form.dataset.chatRecipient),busy=inboxSending.has(currentUser?.id+':'+form.dataset.chatRecipient),frozen=!!d?.payload,preparing=!!d?.preparing;
  const input=form.querySelector('textarea');input.required=!d?.files.length;input.readOnly=busy||frozen;
  const submit=form.querySelector('[type="submit"]');submit.disabled=busy||preparing||(!input.value.trim()&&!d?.files.length);submit.textContent=frozen?'Retry send':preparing?'Preparing photos…':'Send ➤';form.setAttribute('aria-busy',String(busy||preparing));
  form.querySelectorAll('[data-photo-picker],input[type="file"],[data-photo-remove]').forEach(b=>b.disabled=busy||frozen||preparing);const discard=form.querySelector('[data-photo-discard]');if(discard)discard.hidden=!frozen;
  const previews=form.querySelector('.chat-photo-drafts');if(previews)previews.innerHTML=(d?.files||[]).map((f,i)=>`<span><img src="${f.url}" alt="Selected photo ${i+1}"><button type="button" data-photo-remove="${f.id}" aria-label="Remove photo ${i+1}" ${busy||frozen?'disabled':''}>×</button></span>`).join('');
 }
 function mount(form){
  if(!enabled())return;
  const toolbar=document.createElement('div');toolbar.className='chat-photo-tools';toolbar.innerHTML='<button type="button" class="ghost" data-photo-picker="library">Add photos</button><button type="button" class="ghost" data-photo-picker="camera">Camera</button><small>Up to 3 · shared with this collector only</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-photo-input="library"><input type="file" accept="image/jpeg" capture="environment" hidden data-photo-input="camera"><button type="button" class="ghost" data-photo-discard hidden>Discard photo draft</button><div class="chat-photo-drafts"></div>';
  form.append(toolbar);update(form);
  const d=get(form.dataset.chatRecipient);if(d?.payload){form.querySelector('textarea').value=d.caption;form.querySelector('.chat-send-status').textContent='Delivery not confirmed. Retry the same message or discard the photo draft.'}
 }
 async function select(input){
  const form=input.closest('form'),recipient=form.dataset.chatRecipient,owner=currentUser?.id,version=generation;
  let d=get(recipient);if(!d){d={files:[],preparing:0};drafts.set(recipient,d)}if(d.payload)return;
  d.preparing++;const status=form.querySelector('.chat-send-status');status.textContent='Preparing photos…';update(form);
  try{for(const file of input.files){if(d.files.length>=3)throw Error('Choose up to three photos');const blob=await convert(file);if(generation!==version||currentUser?.id!==owner||get(recipient)!==d)return;if(d.payload)throw Error('Wait for this message to finish sending');d.files.push({id:crypto.randomUUID(),blob,url:URL.createObjectURL(blob)})}status.textContent='Photos stay on this device until you send.'}catch(error){status.textContent=error.message}finally{d.preparing--;input.value='';if(version===generation&&current()?.dataset.chatRecipient===recipient)update(current())}
 }
 async function prepare(recipient,caption){
  const d=get(recipient);if(d?.preparing)throw Error('Wait for photo preparation to finish');if(!d?.files.length)return null;
  if(!d.payload){d.caption=caption;d.payload={id:crypto.randomUUID(),sender_id:currentUser.id,recipient_id:recipient,body:caption||'Shared photos',attachment_ids:d.files.map(f=>f.id)}}
  const owner=currentUser.id,version=generation;
  for(const f of d.files){if(owner!==currentUser?.id||version!==generation)throw Error('Account changed');if(!f.uploaded){await api('POST',f.id,recipient,d.payload.id,f.blob);f.uploaded=true}}
  if(owner!==currentUser?.id||version!==generation)throw Error('Account changed');return d.payload;
 }
 function clear(recipient){const d=get(recipient);for(const f of d?.files||[])URL.revokeObjectURL(f.url);drafts.delete(recipient)}
 async function discard(recipient){const d=get(recipient);if(!d)return;clear(recipient);update();for(const f of d.files)if(d.payload)api('DELETE',f.id).catch(()=>{});const form=current();if(form?.dataset.chatRecipient===recipient)form.querySelector('.chat-send-status').textContent='Photo draft discarded. A message already delivered stays in the conversation.'}
 function reset(){generation++;for(const id of drafts.keys())clear(id);}
 function messageHtml(message){return enabled()&&message.attachment_ids?.length?`<div class="chat-private-photos" data-message-photos="${escapeHtml(message.id)}"><button type="button" class="ghost" data-load-message-photos="${escapeHtml(message.id)}">View ${message.attachment_ids.length} private photo${message.attachment_ids.length===1?'':'s'}</button><span role="status"></span></div>`:''}
 async function loadPhotos(button){
  const node=button.closest('[data-message-photos]'),owner=currentUser?.id,version=generation,id=node.dataset.messagePhotos;button.disabled=true;
  const valid=()=>generation===version&&currentUser?.id===owner&&node.isConnected;
  try{
   const {data,error}=await supabaseClient.from('message_photo_attachments').select('id,object_path').eq('message_id',id);if(error||!data?.length)throw Error('Photos could not load. Retry');
   const results=await Promise.all(data.map(async p=>{const r=await supabaseClient.storage.from('conversation-photos').createSignedUrl(p.object_path,60);if(r.error||!r.data?.signedUrl)throw Error('Photos could not load. Retry');return {...p,url:r.data.signedUrl}}));
   if(!valid())return;node.querySelectorAll('a').forEach(a=>a.remove());for(const p of results){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open full photo';const img=document.createElement('img');img.src=p.url;img.alt='Private conversation photo';img.referrerPolicy='no-referrer';a.prepend(img);node.append(a)}button.textContent='Refresh photo access';node.querySelector('[role="status"]').textContent='Photo links expire after one minute. Refresh to reopen.';
  }catch(error){if(valid())node.querySelector('[role="status"]').textContent=error.message}finally{if(valid())button.disabled=false}
 }
 const root=document.getElementById('messageInbox');root.addEventListener('click',e=>{
  const picker=e.target.closest('[data-photo-picker]');if(picker){picker.closest('form').querySelector('[data-photo-input="'+picker.dataset.photoPicker+'"]').click();return}
  const remove=e.target.closest('[data-photo-remove]');if(remove){const recipient=remove.closest('form').dataset.chatRecipient,d=get(recipient);if(!d?.payload){const f=d?.files.find(f=>f.id===remove.dataset.photoRemove);if(f){URL.revokeObjectURL(f.url);d.files=d.files.filter(x=>x!==f);update()}}return}
  if(e.target.closest('[data-photo-discard]')){void discard(e.target.closest('form').dataset.chatRecipient);return}
  const load=e.target.closest('[data-load-message-photos]');if(load)void loadPhotos(load);
 });
 root.addEventListener('change',e=>{if(e.target.matches('[data-photo-input]'))void select(e.target)});
 root.addEventListener('input',e=>{if(e.target.matches('.chat-composer textarea'))update(e.target.closest('form'))});
 return {mount,prepare,clear,reset,update,messageHtml,has:recipient=>!!get(recipient)?.files.length};
})();
