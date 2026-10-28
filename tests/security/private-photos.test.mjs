import {test} from 'node:test';import assert from 'node:assert/strict';import jpeg from 'jpeg-js';
import {normalizePhoto,readPhotoBody,MAX_PHOTO_BYTES} from '../../supabase/functions/message-photos/image.mjs';
import {createPhotoHandler} from '../../supabase/functions/message-photos/handler.mjs';
const encode=(width=2,height=2)=>new Uint8Array(jpeg.encode({width,height,data:new Uint8Array(width*height*4).fill(255)},80).data);
test('private photo normalization decodes pixels and strips comments, EXIF and trailing payloads',()=>{
 const raw=encode(),metadata=Buffer.from('private GPS location'),comment=Buffer.concat([Buffer.from([255,254,0,metadata.length+2]),metadata]);
 const exif=Buffer.concat([Buffer.from('Exif\0\0'),metadata]);const segment=Buffer.concat([Buffer.from([255,225,0,exif.length+2]),exif]);
 const source=Buffer.concat([raw.slice(0,2),comment,segment,raw.slice(2),Buffer.from('<script>trailing private payload</script>')]);
 const clean=normalizePhoto(source,jpeg);assert.equal(jpeg.decode(clean).width,2);assert.equal(Buffer.from(clean).includes(metadata),false);assert.equal(Buffer.from(clean).includes(Buffer.from('<script>')),false);
});
test('private photo rejects corrupt, large and oversize-dimension JPEG input',()=>{
 for(const bytes of [new Uint8Array(),new Uint8Array([255,216,255,0]),new Uint8Array(MAX_PHOTO_BYTES+1),encode(1201,1)])assert.throws(()=>normalizePhoto(bytes,jpeg));
});
test('private photo streaming cap applies without trusting Content-Length',async()=>{
 const request=new Request('https://example.test',{method:'POST',headers:{'content-type':'image/jpeg'},body:new Uint8Array(MAX_PHOTO_BYTES+1)});await assert.rejects(readPhotoBody(request),/smaller/);
 await assert.rejects(readPhotoBody(new Request('https://example.test',{method:'POST',headers:{'content-type':'image/svg+xml'},body:'<svg/>'})),/JPEG/);
});
const origin='https://deckplay-hq-staging.cstivers56.workers.dev',projectUrl='https://prrrzeelltmyugssqnzk.supabase.co';
test('private photo endpoint refuses other projects, origins and unauthenticated users before decoding',async()=>{
 let calls=0;const authenticate=async()=>{calls++;return null};
 let response=await createPhotoHandler({projectUrl:'https://production.supabase.co',authenticate,jpeg})(new Request(origin,{method:'POST'}));assert.equal(response.status,503);assert.equal(calls,0);
 response=await createPhotoHandler({projectUrl,authenticate,jpeg})(new Request(origin,{method:'POST',headers:{origin:'https://evil.test'}}));assert.equal(response.status,403);assert.equal(calls,0);
 response=await createPhotoHandler({projectUrl,authenticate,jpeg})(new Request(origin,{method:'POST'}));assert.equal(response.status,401);assert.equal(calls,1);
});
test('private photo endpoint charges authenticated authorization before reading image content',async()=>{
 const order=[],id='11111111-1111-4111-8111-111111111111';
 const handler=createPhotoHandler({projectUrl,jpeg,authenticate:async()=>({user:{id},client:{rpc:async name=>{order.push(name);return {error:{message:'Conversation unavailable'}}}},admin:{storage:{from:()=>({})}}})});
 const response=await handler(new Request(origin,{method:'POST',headers:{'content-type':'image/jpeg','x-attachment-id':id,'x-message-id':id,'x-recipient-id':id},body:encode()}));assert.deepEqual(order,['prepare_private_message_photo']);assert.equal(response.status,400);
});
test('private photo cancellation refuses deleting delivered attachments',async()=>{
 let removed=false;const id='11111111-1111-4111-8111-111111111111';
 const handler=createPhotoHandler({projectUrl,jpeg,authenticate:async()=>({user:{id},client:{},admin:{rpc:async()=>({data:{message_id:id}}),storage:{from:()=>({remove:async()=>{removed=true;return {}}})}}})});
 const response=await handler(new Request(origin,{method:'DELETE',headers:{'x-attachment-id':id}}));assert.equal(response.status,409);assert.equal(removed,false);
});
