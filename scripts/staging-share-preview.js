// T7.3: server-render only anonymous, active listing preview metadata in private staging.
// This code runs AFTER the staging Basic Auth gate. Never use an owner session or service key.
const STAGING_LISTING_PREVIEW_API='https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/listings';
const STAGING_PREVIEW_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function previewText(input,max=90){
 return String(input||'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
function previewEscape(input){
 return String(input).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[char]);
}
function previewMeta(html,attribute,key,value){
 const start='<meta '+attribute+'="'+key+'" content="';
 const left=html.indexOf(start);
 if(left<0)return html;
 const begin=left+start.length,end=html.indexOf('"',begin);
 if(end<0)return html;
 return html.slice(0,begin)+previewEscape(value)+html.slice(end);
}
async function renderStagingListingPreview(html,params,fetcher,publicKey){
 // Never render search engine previews for invalid, duplicate or mixed links.
 const ids=params.getAll('listing');
 if(ids.length!==1||params.has('collector')||!STAGING_PREVIEW_UUID.test(ids[0])||
    !String(publicKey||'').startsWith('sb_publishable_')||
    !html.includes('noindex,nofollow'))return html;
 const endpoint=new URL(STAGING_LISTING_PREVIEW_API);
 endpoint.searchParams.set('select','id,title,status');
 endpoint.searchParams.set('id','eq.'+ids[0]);
 endpoint.searchParams.set('status','eq.active');
 endpoint.searchParams.set('limit','1');
 try{
  const response=await fetcher(endpoint.href,{
   method:'GET',
   headers:{apikey:publicKey,Accept:'application/json'},
   redirect:'error',
   signal:AbortSignal.timeout(3500)
  });
  if(!response.ok)return html;
  const rows=await response.json();
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row||row.id!==ids[0]||row.status!=='active')return html;
  const title=previewText(row.title);
  if(!title)return html;
  const description=previewText('Explore '+title+' on DeckPlay HQ. View the public listing and contact the collector.',155);
  let out=html.replace(/<title>[^<]*<\/title>/i,'<title>'+previewEscape(title)+' | DeckPlay HQ</title>');
  out=previewMeta(out,'name','description',description);
  out=previewMeta(out,'property','og:title',title+' | DeckPlay HQ');
  out=previewMeta(out,'property','og:description',description);
  out=previewMeta(out,'name','twitter:title',title+' | DeckPlay HQ');
  out=previewMeta(out,'name','twitter:description',description);
  // Deliberately keep private staging's robots noindex and all auth gates.
  return out;
 }catch(_error){
  // Unavailable database or malformed anonymous response: serve generic page.
  return html;
 }
}
