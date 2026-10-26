export default {
 async scheduled(controller,env,ctx) { ctx.waitUntil(runStagingHealth(env)); },
 async fetch(request,env) {
  const url=new URL(request.url);
  const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'};
  if(url.hostname!=='deckplay-hq-staging.cstivers56.workers.dev')return new Response('Staging host required',{status:403,headers});
  if(!env.STAGING_ACCESS_PASSWORD)return new Response('Staging access is not configured',{status:503,headers});
  // Hash before comparison; never expose the secret in a response or a URL.
  const expected='Basic '+btoa('deckplay:'+env.STAGING_ACCESS_PASSWORD);
  const digest=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
  const a=await digest(request.headers.get('Authorization')||''),b=await digest(expected);
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  if(diff)return new Response('Private DeckPlay testing environment',{status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="DeckPlay staging", charset="UTF-8"'}});
  if(url.pathname==='/__checks'&&request.method==='POST')return Response.json(await runStagingHealth(env),{headers});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
  const file=assets[url.pathname==='/'?'/index.html':url.pathname];
  if(!file)return new Response('Page not found',{status:404,headers});
  return new Response(request.method==='HEAD'?null:file.body,{headers:{...headers,'Content-Type':file.type}});
 }
};
