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

 
// T7.3 collector shares: an anonymous, currently active listing is required
// before a *public handle* can appear in server-rendered social metadata.
// Never render display_name, bio, location, collection links, email or buyer data.
// This is private staging only; do not let its metadata remove noindex.
async function renderStagingCollectorPreview(html,params,fetcher,publicKey){
 const ids=params.getAll('collector');
 if(ids.length!==1||params.has('listing')||!STAGING_PREVIEW_UUID.test(ids[0])||
    !String(publicKey||'').startsWith('sb_publishable_')||
    !html.includes('noindex,nofollow'))return html;
 const headers={apikey:publicKey,Accept:'application/json'};
 const seller=ids[0];
 const listings=new URL(STAGING_LISTING_PREVIEW_API);
 listings.searchParams.set('select','id');
 listings.searchParams.set('seller_id','eq.'+seller);
 listings.searchParams.set('status','eq.active');
 listings.searchParams.set('limit','1');
 try{
  const exists=await fetcher(listings.href,{
   method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(3500)
  });
  if(!exists.ok)return html;
  const rows=await exists.json();
  if(!Array.isArray(rows)||rows.length!==1||!STAGING_PREVIEW_UUID.test(rows[0]?.id))return html;
  // Only query the specifically allowed public handle, never the whole profile.
  const profile=new URL('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/profiles');
  profile.searchParams.set('select','id,username');
  profile.searchParams.set('id','eq.'+seller);
  profile.searchParams.set('limit','1');
  const result=await fetcher(profile.href,{
   method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(3500)
  });
  if(!result.ok)return html;
  const people=await result.json();
  const owner=Array.isArray(people)?people[0]:null;
  // Keep emails, potentially private display names and untrusted markup out of previews.
  const handle=String(owner?.username||'').trim().replace(/^@/,'');
  if(owner?.id!==seller||!/^[a-z0-9][a-z0-9_.-]{1,31}$/i.test(handle))return html;
  const title='@'+handle+' | DeckPlay HQ';
  const description='Browse @'+handle+'\'s public active collectibles on DeckPlay HQ. No payment or shipping is processed here.';
  let out=html.replace(/<title>[^<]*<\/title>/i,'<title>'+previewEscape(title)+'</title>');
  out=previewMeta(out,'name','description',description);
  out=previewMeta(out,'property','og:title',title);
  out=previewMeta(out,'property','og:description',description);
  out=previewMeta(out,'name','twitter:title',title);
  out=previewMeta(out,'name','twitter:description',description);
  return out;
 }catch(_error){
  // Failing closed is preferable to fabricating seller identity.
  return html;
 }
}
