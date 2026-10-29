// No stored password, account writes, scheduled jobs, production routes or CI endpoint.
// Every response is gated by the existing private staging authentication service.
export default {
 async fetch(request,env){
  const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'};
  const url=new URL(request.url);
  if(url.hostname!=='deckplay-hq-release-preview.cstivers56.workers.dev')return new Response('Preview host required',{status:403,headers});
  try{
   // Construct fresh headers: never allow an incoming version-override to select an old auth gate.
   const auth=await env.STAGING_GATE.fetch('https://deckplay-hq-staging.cstivers56.workers.dev/',{method:'HEAD',headers:{Authorization:request.headers.get('Authorization')||''},signal:AbortSignal.timeout(10000)});
   if(auth.status!==200){const challenge=auth.headers.get('WWW-Authenticate');return new Response(null,{status:auth.status===401?401:503,headers:{...headers,...(challenge?{'WWW-Authenticate':challenge}:{})}})}
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
   const asset=assets[url.pathname==='/'?'/index.html':url.pathname];
   if(!asset)return new Response('Page not found',{status:404,headers});
   return new Response(request.method==='HEAD'?null:asset.body,{headers:{...headers,'Content-Type':asset.type}});
  }catch{return new Response('Preview authentication unavailable',{status:503,headers})}
 }
};
