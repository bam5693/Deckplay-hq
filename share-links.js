// Public listing and collector links. Never share private account, Inbox or session URLs.
(function(){
'use strict';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sharedUrl(kind,id){
 if(!['listing','collector'].includes(kind)||!uuid.test(id||''))return '';
 const url=new URL('/',window.location.origin);
 url.searchParams.set(kind,id);
 return url.href;
}
// Update the visible browser tab after a validated public item is resolved.
// Crawlers require server-rendered metadata; this is deliberately not an SEO claim.
function setSharedPageTitle(kind,label){
 const safe=String(label||'').replace(/[\\r\\n\\t]+/g,' ').trim().slice(0,90);
 if(!safe)return;
 document.title=safe+' | DeckPlay HQ';
}
// These tags improve in-browser previews only. Social crawlers need server-side
// public-data rendering and must never be given private account content.
function setListingBrowserMetadata(row){
 const title=String(row.title||'').replace(/[\\r\\n\\t]+/g,' ').trim().slice(0,90);
 if(!title)return;
 const description=String(row.description||'').replace(/\\s+/g,' ').trim().slice(0,155)
   || 'Explore this collectible listing on DeckPlay HQ.';
 const update=(selector,value)=>{
  const node=document.querySelector(selector);
  if(node)node.setAttribute('content',value);
 };
 setSharedPageTitle('listing',title);
 update('meta[name="description"]',description);
 update('meta[property="og:title"]',title+' | DeckPlay HQ');
 update('meta[property="og:description"]',description);
 update('meta[name="twitter:title"]',title+' | DeckPlay HQ');
 update('meta[name="twitter:description"]',description);
}
async function shareLink(kind,id,nativeShare){
 const url=sharedUrl(kind,id);
 if(!url){toast('Only published listings and collector profiles can be shared.');return}
 try{
  if(nativeShare&&typeof navigator.share==='function'){
   await navigator.share({title:kind==='listing'?'DeckPlay listing':'DeckPlay collector',url});
   return;
  }
  if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
   await navigator.clipboard.writeText(url);
   toast('Link copied. Anyone opening it still needs access to this site.');
   return;
  }
  window.prompt('Copy this DeckPlay link:',url);
 }catch(error){
  if(error&&error.name==='AbortError')return;
  // Web Share and clipboard permissions can fail on Android and private browsers.
  // Preserve the public URL so collectors can still copy it manually.
  try {
   window.prompt('Sharing is unavailable. Copy this DeckPlay link:',url);
  }catch(_error){
   toast('Could not share the link. Please retry from your browser.');
  }
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-copy-kind],[data-share-kind],#copyOwnProfileLink');
 if(!button)return;
 const own=button.id==='copyOwnProfileLink';
 const kind=own?'collector':(button.dataset.copyKind||button.dataset.shareKind);
 const id=own?currentUser?.id:(button.dataset.copyId||button.dataset.shareId);
 void shareLink(kind,id,!!button.dataset.shareKind);
});
let attempted=false, opening=false;
function showRetry(message){
 let notice=document.getElementById('deckplaySharedLinkRetry');
 if(!notice){
  notice=document.createElement('aside');
  notice.id='deckplaySharedLinkRetry';
  notice.setAttribute('role','alert');
  notice.style.cssText='padding:16px;margin:16px 0;border:1px solid #aabbd0;border-radius:12px;background:#fff;color:#172033';
  const text=document.createElement('p'),button=document.createElement('button');
  button.type='button';button.className='primary';button.textContent='Retry shared link';
  button.addEventListener('click',()=>{void openSharedLinkOnce()});
  notice.append(text,button);
  (document.querySelector('main')||document.body).prepend(notice);
 }
 notice.querySelector('p').textContent=message;
 notice.hidden=false;
}
function clearRetry(){
 const notice=document.getElementById('deckplaySharedLinkRetry');
 if(notice)notice.remove();
}
async function checkBlocked(sellerId,account,same){
 if(blockedCollectorIds.has(sellerId)){toast('This collector is blocked.');return false}
 if(!account)return true;
 const {data,error}=await supabaseClient.from('user_blocks').select('blocked_id').eq('blocker_id',account).eq('blocked_id',sellerId).maybeSingle();
 if(!same())return false;
 if(error){showRetry('Could not verify blocked collectors. Retry opening this shared link.');return false}
 if(data){toast('This collector is blocked.');return false}
 return true;
}
async function openSharedLinkOnce(){
 if(attempted||opening)return;
 const params=new URLSearchParams(window.location.search);
 const listing=params.get('listing'),collector=params.get('collector');
 if(!listing&&!collector)return;
 if((listing&&collector)||!uuid.test(listing||collector)){attempted=true;toast('This shared link is invalid.');return}
 if(!supabaseClient){showRetry('Marketplace is still loading. Retry opening this shared link.');return}
 opening=true;
 const account=currentUser?.id||null;
 const same=()=>((currentUser?.id||null)===account);
 const id=listing||collector;
 try{
  if(collector){
   if(!await checkBlocked(id,account,same)||!same())return;
   const outcome=await showPublicProfile(id);
   if(!same())return;
   if(outcome==='ready'){attempted=true;clearRetry();return}
   // A failed profile lookup can leave a modal over the Retry button.
   closeModal('publicProfileModal');
   if(outcome==='missing'){
    attempted=true;clearRetry();toast('This collector profile is unavailable.');return;
   }
   showRetry('Collector profile could not load. Check your connection and retry.');
   return;
  }
  const {data,error}=await supabaseClient.from('listings').select('id,title,description,category,tcg_game,collectible_subcategory,price,condition,accepts_trades,accepts_price_offers,image_urls,created_at,seller_id').eq('id',id).eq('status','active').maybeSingle();
  if(!same())return;
  if(error)throw error;
  if(!data||!data.seller_id){attempted=true;clearRetry();toast('This listing is no longer available.');return}
  if(!await checkBlocked(data.seller_id,account,same)||!same())return;
  const {data:profile}=await supabaseClient.from('profiles').select('username,display_name').eq('id',data.seller_id).maybeSingle();
  if(!same())return;
  showMainMarketplace();
  showDetails(marketplaceItemFromRow(data,profile));
  setListingBrowserMetadata(data);
  attempted=true;clearRetry();
 }catch(error){if(same()){
  if(collector)closeModal('publicProfileModal');
  showRetry('Shared link could not be opened. Check your connection and retry.');
 }}
 finally{
  opening=false;
  if(!same()&&!attempted)showRetry('Your account changed. Retry opening this shared link.');
 }
}
window.deckplayOpenSharedLinkOnce=openSharedLinkOnce;
// The auth INITIAL_SESSION callback also invokes this after blocked collectors load.
// This fallback handles a cached session that initialized before this script loaded.
async function afterSession(){
 const params=new URLSearchParams(window.location.search);
 if(!params.has('listing')&&!params.has('collector'))return;
 if(!supabaseClient){showRetry('Marketplace is still loading. Retry opening this shared link.');return}
 try{
  const {data}=await supabaseClient.auth.getSession();
  if((currentUser?.id||null)!==(data?.session?.user?.id||null))return;
  await loadBlockedCollectors();
  await openSharedLinkOnce();
 }catch(error){/* A failed auth initialization must not expose private data. */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void afterSession()},{once:true});
else void afterSession();
})();
