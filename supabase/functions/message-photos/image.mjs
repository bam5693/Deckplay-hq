export const MAX_PHOTO_BYTES=2*1024*1024;
export async function readPhotoBody(request){
 if(!/^image\/jpeg(?:;|$)/i.test(request.headers.get('content-type')||''))throw new Error('Upload a JPEG photo');
 if(Number(request.headers.get('content-length'))>MAX_PHOTO_BYTES)throw new Error('Photo must be smaller than 2 MB');
 const reader=request.body?.getReader();if(!reader)throw new Error('Choose a photo');
 const chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_PHOTO_BYTES){await reader.cancel();throw new Error('Photo must be smaller than 2 MB')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes;
}
export function normalizePhoto(bytes,jpeg){
 if(!bytes?.length||bytes.length>MAX_PHOTO_BYTES||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new Error('Choose a valid JPEG photo');
 let image;try{image=jpeg.decode(bytes,{useTArray:true,tolerantDecoding:false,maxResolutionInMP:1.5,maxMemoryUsageInMB:64})}catch{throw new Error('Photo could not be read. Choose another image')}
 if(!image.width||!image.height||image.width>1200||image.height>1200||image.width*image.height>1440000)throw new Error('Resize the photo to at most 1200 pixels');
 // Passing only pixels and dimensions deliberately omits decoded EXIF and comments.
 const clean=new Uint8Array(jpeg.encode({data:image.data,width:image.width,height:image.height},85).data);
 if(clean.length>MAX_PHOTO_BYTES)throw new Error('Photo must be smaller than 2 MB');return clean;
}
export async function photoHash(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')}
