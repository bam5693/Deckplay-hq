import {readPhotoBody,normalizePhoto,photoHash} from './image.mjs';
const ORIGIN='https://deckplay-hq-staging.cstivers56.workers.dev';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const bucket='conversation-photos';
export function createPhotoHandler({authenticate,jpeg,projectUrl}){
 return async request=>{
  const cors={'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-recipient-id,x-message-id,x-attachment-id','Access-Control-Allow-Methods':'POST,DELETE,OPTIONS','Cache-Control':'no-store'};
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(projectUrl!=='https://prrrzeelltmyugssqnzk.supabase.co')return reply(503,{error:'Photo sharing unavailable'});
  if(request.headers.get('origin')&&request.headers.get('origin')!==ORIGIN)return reply(403,{error:'Origin unavailable'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(!['POST','DELETE'].includes(request.method))return reply(405,{error:'Method unavailable'});
  let auth;try{auth=await authenticate(request.headers.get('authorization')||'')}catch{return reply(401,{error:'Sign in to share photos'})}
  if(!auth?.user?.id)return reply(401,{error:'Sign in to share photos'});
  const {user,client,admin}=auth,storage=admin.storage.from(bucket);
  const rpc=async(c,name,args)=>{const result=await c.rpc(name,args);if(result.error)throw result.error;return result.data};
  try{
   if(new URL(request.url).searchParams.get('action')==='cleanup-fixture'){
    const marker=new URL(request.url).searchParams.get('marker');
    if(request.method!=='DELETE'||!['deckplay-seller@deckplay.test','deckplay-buyer@deckplay.test'].includes(user.email)||!/^TEST ONLY BOT [a-f0-9-]{36}$/.test(marker||''))return reply(403,{error:'Dedicated fixture required'});
    const paths=await rpc(client,'staging_private_photo_fixture_paths',{p_marker:marker});
    if(paths?.length){const {error}=await storage.remove(paths);if(error)throw error}return reply(200,{removed:paths?.length||0});
   }
   const id=request.headers.get('x-attachment-id');if(!UUID.test(id||''))return reply(400,{error:'Invalid photo reference'});
   if(request.method==='DELETE'){
    const a=await rpc(admin,'cancel_unpublished_private_photo',{p_id:id,p_sender:user.id});
    if(!a)return reply(200,{canceled:true});if(a.message_id)return reply(409,{error:'Sent photos cannot be removed'});
    const {error}=await storage.remove([a.object_path]);if(error)throw error;
    // Retain a canceled tombstone to prevent an in-flight upload reviving this ID.
    return reply(200,{canceled:true});
   }
   const recipient=request.headers.get('x-recipient-id'),message=request.headers.get('x-message-id');
   if(!UUID.test(recipient||'')||!UUID.test(message||''))return reply(400,{error:'Invalid conversation reference'});
   await rpc(client,'prepare_private_message_photo',{p_id:id,p_recipient:recipient,p_message:message});
   const source=await readPhotoBody(request),clean=normalizePhoto(source,jpeg),sourceHash=await photoHash(source),hash=await photoHash(clean);
   const a=await rpc(admin,'claim_validated_private_photo',{p_id:id,p_sender:user.id,p_source:sourceHash,p_hash:hash,p_size:clean.length});
   if(a.status==='uploaded'||a.status==='attached')return reply(200,{id:a.id,status:a.status});
   const upload=await storage.upload(a.object_path,clean,{contentType:'image/jpeg',upsert:false,cacheControl:'0'});
   if(upload.error){
    // A concurrent/retried request may have written the exact immutable object.
    const existing=await storage.download(a.object_path);
    if(existing.error||!existing.data||await photoHash(new Uint8Array(await existing.data.arrayBuffer()))!==hash)throw new Error('Photo upload could not be confirmed. Retry the same photo');
   }
   const final=await rpc(admin,'finish_validated_private_photo',{p_id:id,p_sender:user.id});
   if(final.status==='canceled'){await storage.remove([a.object_path]);return reply(409,{error:'Photo was discarded'})}
   return reply(200,{id:a.id,status:final.status});
  }catch(error){
   const text=String(error?.message||'Photo sharing failed. Retry your photo');
   // Only known validation messages are returned; storage/internal details stay private.
   const safe=/^(Conversation unavailable|Sign in required|Start a conversation|Photo upload limit|Photo draft unavailable|This message was already sent|Choose up to three|Photo content cannot change|Upload a JPEG|Photo must be smaller|Choose a photo|Choose a valid JPEG|Photo could not be read|Resize the photo|Photo upload could not be confirmed)/.test(text);
   return reply(400,{error:safe?text:'Photo sharing failed. Retry your photo'});
  }
 };
}
