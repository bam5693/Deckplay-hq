// Network-first navigation with a fail-closed offline page. Never cache account,
// listing, Inbox, auth or payment-related responses across users or app installs.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DeckPlay HQ is offline</title><style>body{font:16px system-ui,Arial,sans-serif;background:#14213d;color:#f7f8fa;margin:0;min-height:100dvh;display:grid;place-items:center}main{max-width:460px;padding:28px}h1{font-size:25px}a{display:inline-block;padding:12px 18px;border-radius:9px;background:#dfbd78;color:#14213d;font-weight:700;text-decoration:none}p{line-height:1.6}</style></head><body><main><h1>DeckPlay HQ is offline</h1><p>Listings, messages and account actions need a connection. No cached private conversations or old listings are shown.</p><a href="/">Try again when connected</a></main></body></html>`;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 // Only navigations receive a friendly offline page. API calls and resources
 // stay network-only; never replay a stale account-specific response.
 if(request.mode!=='navigate')return;
 event.respondWith(fetch(request).catch(()=>new Response(OFFLINE_HTML,{
  status:503,headers:{
   'Content-Type':'text/html; charset=utf-8',
   'Cache-Control':'no-store',
   'X-Robots-Tag':'noindex,nofollow'
  }
 })));
});
