import {reviewWithAI} from '../scripts/ai-leads.mjs';
import {reviewVision} from '../scripts/vision-review.mjs';
// Private AI reviewer endpoint: accepts synthetic test evidence only.
// No Supabase binding, no marketplace credentials, no production access.
export default {
 async fetch(request,env){
  if(request.method!=='POST')return new Response('Not found',{status:404});
  const expected=env.REVIEWER_TOKEN;
  const provided=request.headers.get('Authorization');
  if(!expected||!provided||provided!==`Bearer ${expected}`)return new Response('Unauthorized',{status:401});
  const size=Number(request.headers.get('content-length')||0);
  if(size>1100000)return new Response('Payload too large',{status:413});
  try{
   const input=await request.json();
   // Opt-in V1 vision only. The endpoint cannot fetch arbitrary URLs or browse the site.
   const result=input.mode==='v1_vision' ? await reviewVision(env.AI,input) : await reviewWithAI(env.AI,input.lead,input.evidence);
   return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(err){
   const message=String(err?.message||'Review failed');
   const invalid=/Unknown reviewer|Evidence must|Invalid reviewer|Not an approved V1 case|Invalid screenshot|Screenshot too large|Invalid customer goal/.test(message);
   return Response.json({error:invalid?'Invalid review request':'AI review unavailable'},{status:invalid?400:503,headers:{'Cache-Control':'no-store'}});
  }
 }
};