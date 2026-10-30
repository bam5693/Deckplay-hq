import {reviewWithAI} from '../scripts/ai-leads.mjs';
// Private AI reviewer endpoint: accepts synthetic test evidence only.
// No Supabase binding, no marketplace credentials, no production access.
export default {
 async fetch(request,env){
  if(request.method!=='POST')return new Response('Not found',{status:404});
  const expected=env.REVIEWER_TOKEN;
  const provided=request.headers.get('Authorization');
  if(!expected||!provided||provided!==`Bearer ${expected}`)return new Response('Unauthorized',{status:401});
  const size=Number(request.headers.get('content-length')||0);
  if(size>16000)return new Response('Payload too large',{status:413});
  try{
   const {lead,evidence}=await request.json();
   const result=await reviewWithAI(env.AI,lead,evidence);
   return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(err){
   const message=String(err?.message||'Review failed');
   const invalid=/Unknown reviewer|Evidence must/.test(message);
   return Response.json({error:invalid?'Invalid review request':'AI review unavailable'},{status:invalid?400:503,headers:{'Cache-Control':'no-store'}});
  }
 }
};